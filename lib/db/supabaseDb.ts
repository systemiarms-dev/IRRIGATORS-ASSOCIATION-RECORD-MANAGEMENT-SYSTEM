import { getSupabaseServerClient } from '@/lib/supabase/server';
import { cached, invalidateCache } from '@/lib/db/cache';
import fs from 'fs';
import path from 'path';
import {
  Association,
  Profile,
  BudgetCategory,
  Transaction,
  Receipt,
  FinancialStatement,
  AuditLog,
  UserRole,
  FixedAsset,
  FundSource,
  AccountClassification,
} from '@/types';
import { hashPassword, isHashedPassword } from '@/lib/auth/password';
import { normalizeStoredPhilippineMobile } from '@/lib/utils/phone';
import { enrichFixedAsset } from '@/lib/utils/fixedAssets';
import { determineFundSource } from '@/lib/utils/fundSources';

/**
 * 100% Cloud-Native Supabase PostgreSQL Database Service
 * Directly interacts with Supabase Cloud tables with bulletproof error handling.
 */
class SupabaseDatabaseService {
  private getClient() {
    const client = getSupabaseServerClient();
    if (!client) {
      throw new Error(
        'Supabase client is not initialized. Please ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY or NEXT_PUBLIC_SUPABASE_ANON_KEY are set in .env.local'
      );
    }
    return client;
  }

  // ==========================================
  // Association Operations
  // ==========================================
  public async getAssociations(): Promise<Association[]> {
    return cached('as:list', async () => {
      const client = this.getClient();
      const { data, error } = await client
        .from('associations')
        .select('*')
        .order('name', { ascending: true });
      if (error) throw new Error(error.message || 'Error fetching associations');
      return ((data || []) as Association[]).map((a) => ({
        ...a,
        contact_number: normalizeStoredPhilippineMobile(a.contact_number),
      }));
    }, 60_000);
  }

  public async getAssociationById(id: string): Promise<Association | undefined> {
    const assocs = await this.getAssociations();
    return assocs.find((a) => a.id === id);
  }

  public async getAssociationByCode(code: string): Promise<Association | undefined> {
    const client = this.getClient();
    const { data, error } = await client
      .from('associations')
      .select('*')
      .ilike('code', code.trim())
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error fetching association by code');
    return (data as Association) || undefined;
  }

  public async createAssociation(association: Association): Promise<Association> {
    const client = this.getClient();
    const { data, error } = await client
      .from('associations')
      .insert(association)
      .select()
      .single();
    if (error) throw new Error(error.message || 'Error creating association');
    invalidateCache('as:');
    return data as Association;
  }

  public async updateAssociation(id: string, partial: Partial<Association>): Promise<Association | undefined> {
    const client = this.getClient();
    const { data, error } = await client
      .from('associations')
      .update({ ...partial, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error updating association');
    invalidateCache('as:');
    invalidateCache('u:');
    invalidateCache('s:');
    return (data as Association) || undefined;
  }

  public async deleteAssociation(id: string): Promise<boolean> {
    const client = this.getClient();
    // Cascade: remove every account belonging to the association, plus its
    // financial records, so no orphaned data or users remain behind.
    await client.from('budget_categories').delete().eq('association_id', id);
    await client.from('transactions').delete().eq('association_id', id);
    await client.from('receipts').delete().eq('association_id', id);
    await client.from('financial_statements').delete().eq('association_id', id);
    await client.from('profiles').delete().eq('association_id', id);
    const { error } = await client.from('associations').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Error deleting association');
    invalidateCache('as:');
    invalidateCache('u:');
    invalidateCache('s:');
    return true;
  }

  // ==========================================
  // Users / Profiles Operations
  // ==========================================
  public async getUsers(associationId?: string | null, roleFilter?: string): Promise<Profile[]> {
    return cached(`u:list:${associationId || 'all'}:${roleFilter || 'all'}`, async () => {
      const client = this.getClient();
      let query = client.from('profiles').select('*');

      if (associationId && associationId !== 'all') {
        query = query.or(`association_id.eq.${associationId},role.eq.super_admin`);
      }
      if (roleFilter && roleFilter !== 'all') {
        query = query.eq('role', roleFilter);
      }

      const usersPromise = query.order('full_name', { ascending: true });
      const assocsPromise = this.getAssociations().catch(() => []);
      const [usersRes, assocs] = await Promise.all([usersPromise, assocsPromise]);
      const { data: users, error } = usersRes;
      if (error) throw new Error(error.message || 'Error fetching users');
      const assocMap = new Map(assocs.map((a) => [a.id, a]));

      return (users || []).map(({ password: _removed, ...publicUser }: any) => ({
        ...publicUser,
        contact_number: normalizeStoredPhilippineMobile(publicUser.contact_number),
        association: publicUser.association_id ? assocMap.get(publicUser.association_id) : undefined,
      })) as Profile[];
    });
  }

  public async getUserById(id: string): Promise<Profile | undefined> {
    const client = this.getClient();
    const { data: user, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error fetching user by ID');
    if (!user) return undefined;

    if (user.association_id) {
      user.association = await this.getAssociationById(user.association_id).catch(() => undefined);
    }
    const { password: _removed, ...publicUser } = user;
    return { ...publicUser, contact_number: normalizeStoredPhilippineMobile((publicUser as any).contact_number) } as Profile;
  }

  /**
   * Full user fetch INCLUDING the password hash. Only call this on flows that
   * must verify a password (login / change-password). Never expose the result
   * to the client.
   */
  public async getUserAuthById(id: string): Promise<Profile | undefined> {
    const client = this.getClient();
    const { data: user, error } = await client
      .from('profiles')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error fetching auth user by ID');
    if (!user) return undefined;

    if (user.association_id) {
      user.association = await this.getAssociationById(user.association_id).catch(() => undefined);
    }
    return user as Profile;
  }

  public async getUserByUsername(identifier: string): Promise<Profile | undefined> {
    const user = await this.getUserAuthByUsername(identifier);
    if (!user) return undefined;
    const { password: _removed, ...publicUser } = user;
    return { ...publicUser, contact_number: normalizeStoredPhilippineMobile((publicUser as any).contact_number) } as Profile;
  }

  /**
   * Username lookup INCLUDING the password hash (auth-only use).
   */
  public async getUserAuthByUsername(identifier: string): Promise<Profile | undefined> {
    const clean = identifier.trim().toLowerCase();
    const client = this.getClient();

    const { data: user, error } = await client
      .from('profiles')
      .select('*')
      .ilike('username', clean)
      .maybeSingle();

    if (error) throw new Error(error.message || 'Error looking up username');
    if (!user) return undefined;

    if (user.association_id) {
      user.association = await this.getAssociationById(user.association_id).catch(() => undefined);
    }
    return user as Profile;
  }

  public async getUserByEmail(identifier: string): Promise<Profile | undefined> {
    return this.getUserByUsername(identifier);
  }

  public async createUser(user: Profile): Promise<Profile> {
    const client = this.getClient();
    if (!user.username) {
      user.username = user.id;
    }
    const effectivePassword = user.password || `member_no_login_${Date.now()}`;
    const hashedPassword = isHashedPassword(effectivePassword) ? effectivePassword : hashPassword(effectivePassword);
    const { association: _assoc, ...cleanUser } = user as any;
    cleanUser.password = hashedPassword;
    const { data, error } = await client.from('profiles').insert(cleanUser).select().single();
    if (error) throw new Error(error.message || 'Error creating user in Supabase');
    invalidateCache('u:');
    invalidateCache('s:');
    return data as Profile;
  }

  public async updateUserRole(id: string, role: Profile['role'], associationId?: string | null): Promise<Profile | undefined> {
    const client = this.getClient();
    const updatePayload: Record<string, any> = { role, updated_at: new Date().toISOString() };
    if (associationId !== undefined) {
      updatePayload.association_id = associationId;
    }
    const { data, error } = await client
      .from('profiles')
      .update(updatePayload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error updating user role');
    invalidateCache('u:');
    invalidateCache('s:');
    return (data as Profile) || undefined;
  }

  public async updateUserPassword(id: string, newPassword: string): Promise<Profile | undefined> {
    const client = this.getClient();
    const hashedPassword = hashPassword(newPassword);
    const { data: current } = await client.from('profiles').select('token_version').eq('id', id).maybeSingle();
    const newVersion = ((current?.token_version as number) || 0) + 1;

    const { data, error } = await client
      .from('profiles')
      .update({
        password: hashedPassword,
        token_version: newVersion,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error updating user password');
    invalidateCache('u:');
    invalidateCache('s:');
    return (data as Profile) || undefined;
  }

  public async updateProfile(usernameOrEmail: string, partial: Partial<Profile>): Promise<Profile | undefined> {
    const user = await this.getUserByUsername(usernameOrEmail);
    if (!user) return undefined;

    const client = this.getClient();
    if (partial.password) {
      partial.password = isHashedPassword(partial.password) ? partial.password : hashPassword(partial.password);
    }
    const { data, error } = await client
      .from('profiles')
      .update({ ...partial, updated_at: new Date().toISOString() })
      .eq('id', user.id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error updating profile');
    invalidateCache('u:');
    invalidateCache('s:');
    return (data as Profile) || undefined;
  }

  public async updateUserProfileById(id: string, partial: Partial<Profile>): Promise<Profile | undefined> {
    const client = this.getClient();
    if (partial.password) {
      partial.password = isHashedPassword(partial.password) ? partial.password : hashPassword(partial.password);
    }
    const { data, error } = await client
      .from('profiles')
      .update({ ...partial, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error updating user profile');
    invalidateCache('u:');
    invalidateCache('s:');
    return (data as Profile) || undefined;
  }

  public async deleteUser(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from('profiles').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Error deleting user');
    invalidateCache('u:');
    invalidateCache('s:');
    return true;
  }

  // ==========================================
  // Budget Categories
  // ==========================================
  // Budget Categories
  // ==========================================
  public async getBudgetCategories(associationId?: string): Promise<BudgetCategory[]> {
    const all = await cached('bc:list', async () => {
      const client = this.getClient();
      const { data, error } = await client.from('budget_categories').select('*').order('code', { ascending: true });
      if (error) {
        console.warn('Error fetching budget categories from Supabase:', error.message);
      }
      return ((data || []) as BudgetCategory[]).map((c) => {
        let classification: AccountClassification | undefined = c.account_classification;
        if (c.description) {
          const match = c.description.match(/\[class:([a-z_]+)\]/);
          if (match && match[1]) {
            classification = match[1] as AccountClassification;
          }
        }
        return {
          ...c,
          account_classification: classification || (c.category_type as any),
        };
      });
    }, 60_000);

    // Filter out fixed asset registry items from standard budget categories (they store JSON metadata with is_asset: true)
    const nonAssets = all.filter((c) => {
      if (c.code.startsWith('AST-') && c.description && c.description.includes('"is_asset":true')) {
        return false;
      }
      return true;
    });

    if (associationId && associationId !== 'all') {
      return nonAssets.filter((c) => c.association_id === associationId);
    }
    return nonAssets;
  }

  public async createBudgetCategory(category: BudgetCategory): Promise<BudgetCategory> {
    const client = this.getClient();
    let description = category.description || null;
    if (category.account_classification && category.account_classification !== category.category_type) {
      const classTag = `[class:${category.account_classification}]`;
      description = description ? `${classTag} ${description}` : classTag;
    }

    // Build payload strictly adhering to budget_categories table schema
    const payload: Record<string, any> = {
      id: category.id,
      code: category.code,
      name: category.name,
      category_type: category.category_type,
      allocated_amount: category.allocated_amount ?? 0,
      description,
      association_id: category.association_id || null,
      is_active: category.is_active ?? true,
    };

    let data: any;
    let error: any;

    // Attempt insertion with account_classification if provided, falling back cleanly if column is not yet in DB
    if (category.account_classification) {
      const tryWithCol = await client.from('budget_categories').insert({
        ...payload,
        account_classification: category.account_classification,
      }).select().single();

      if (tryWithCol.error && tryWithCol.error.message && tryWithCol.error.message.includes('account_classification')) {
        // Schema cache does not have account_classification - insert standard payload (class tag preserved in description)
        const fallback = await client.from('budget_categories').insert(payload).select().single();
        data = fallback.data;
        error = fallback.error;
      } else {
        data = tryWithCol.data;
        error = tryWithCol.error;
      }
    } else {
      const res = await client.from('budget_categories').insert(payload).select().single();
      data = res.data;
      error = res.error;
    }

    if (error) throw new Error(error.message || 'Error creating budget category');
    invalidateCache('bc:');
    return {
      ...data,
      account_classification: category.account_classification || (data.category_type as any),
    } as BudgetCategory;
  }

  public async deleteBudgetCategory(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from('budget_categories').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Error deleting budget category');
    invalidateCache('bc:');
    return true;
  }

  public async updateBudgetCategory(id: string, updates: Partial<BudgetCategory>): Promise<BudgetCategory> {
    const client = this.getClient();
    const { data: existing, error: getErr } = await client.from('budget_categories').select('*').eq('id', id).single();
    if (getErr || !existing) throw new Error('Budget category not found');

    let description = updates.description !== undefined ? updates.description : existing.description;
    
    // Handle classification tag in description
    if (updates.account_classification !== undefined) {
      const cleanDesc = (description || '').replace(/\[class:[a-z_]+\]\s*/g, '').trim();
      if (updates.account_classification && updates.account_classification !== (updates.category_type || existing.category_type)) {
        const classTag = `[class:${updates.account_classification}]`;
        description = cleanDesc ? `${classTag} ${cleanDesc}` : classTag;
      } else {
        description = cleanDesc || null;
      }
    }

    const payload: any = {
      updated_at: new Date().toISOString(),
    };
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.allocated_amount !== undefined) payload.allocated_amount = updates.allocated_amount;
    if (updates.category_type !== undefined) payload.category_type = updates.category_type;
    if (updates.is_active !== undefined) payload.is_active = updates.is_active;
    if (description !== undefined) payload.description = description;

    const { data, error } = await client.from('budget_categories').update(payload).eq('id', id).select().single();
    if (error) throw new Error(error.message || 'Error updating budget category');
    invalidateCache('bc:');

    let classification: AccountClassification = data.category_type as any;
    if (data.description) {
      const match = data.description.match(/\[class:([a-z_]+)\]/);
      if (match && match[1]) {
        classification = match[1] as AccountClassification;
      }
    }

    return {
      ...data,
      account_classification: classification,
    } as BudgetCategory;
  }

  // ==========================================
  // Fixed Asset & Equipment Registry
  // ==========================================
  public async getFixedAssets(associationId?: string, asOfYear: number = new Date().getFullYear()): Promise<FixedAsset[]> {
    const client = this.getClient();
    let query = client.from('budget_categories').select('*').like('code', 'AST-%');
    if (associationId && associationId !== 'all') {
      query = query.eq('association_id', associationId);
    }
    const { data, error } = await query.order('created_at', { ascending: false });
    if (error) {
      console.warn('Error fetching fixed assets:', error.message);
      return [];
    }

    const assets: FixedAsset[] = [];
    for (const row of data || []) {
      try {
        let meta: any = {};
        if (row.description) {
          try {
            meta = JSON.parse(row.description);
          } catch {
            meta = {};
          }
        }
        const asset: FixedAsset = {
          id: row.id,
          association_id: row.association_id,
          name: row.name,
          asset_type: meta.asset_type || 'other',
          date_acquired: meta.date_acquired || (row.created_at ? row.created_at.split('T')[0] : '2025-01-01'),
          acquisition_cost: Number(row.allocated_amount || meta.acquisition_cost || 0),
          depreciation_rate: Number(meta.depreciation_rate || 10),
          useful_life_years: Number(meta.useful_life_years || 10),
          salvage_value: Number(meta.salvage_value || 0),
          is_active: row.is_active ?? true,
          notes: meta.notes || null,
          created_at: row.created_at,
          updated_at: row.updated_at,
        };
        assets.push(enrichFixedAsset(asset, asOfYear));
      } catch (e) {
        console.warn('Failed parsing fixed asset item', row.id, e);
      }
    }
    return assets;
  }

  public async createFixedAsset(assetInput: Omit<FixedAsset, 'id'>): Promise<FixedAsset> {
    const client = this.getClient();
    const id = `ast-${Date.now()}`;
    const cleanCode = `AST-${assetInput.name.toUpperCase().replace(/[^A-Z0-9]+/g, '-').slice(0, 15)}-${Math.floor(1000 + Math.random() * 9000)}`;
    const meta = {
      is_asset: true,
      asset_type: assetInput.asset_type,
      date_acquired: assetInput.date_acquired,
      depreciation_rate: assetInput.depreciation_rate,
      useful_life_years: assetInput.useful_life_years,
      salvage_value: assetInput.salvage_value || 0,
      notes: assetInput.notes || null,
    };

    const row = {
      id,
      code: cleanCode,
      name: assetInput.name,
      category_type: 'disbursement',
      allocated_amount: assetInput.acquisition_cost,
      description: JSON.stringify(meta),
      association_id: assetInput.association_id,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await client.from('budget_categories').insert(row).select().single();
    if (error) throw new Error(error.message || 'Error registering fixed asset');
    invalidateCache('bc:');

    const created: FixedAsset = {
      id: data.id,
      association_id: data.association_id,
      name: data.name,
      asset_type: assetInput.asset_type,
      date_acquired: assetInput.date_acquired,
      acquisition_cost: assetInput.acquisition_cost,
      depreciation_rate: assetInput.depreciation_rate,
      useful_life_years: assetInput.useful_life_years,
      salvage_value: assetInput.salvage_value,
      is_active: true,
      notes: assetInput.notes,
      created_at: data.created_at,
      updated_at: data.updated_at,
    };
    return enrichFixedAsset(created);
  }

  public async deleteFixedAsset(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from('budget_categories').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Error deleting fixed asset');
    invalidateCache('bc:');
    return true;
  }

  // ==========================================
  // Transactions Operations
  // ==========================================
  public async getTransactions(
    associationId?: string,
    typeFilter?: 'all' | 'collection' | 'disbursement'
  ): Promise<Transaction[]> {
    const client = this.getClient();
    let query = client.from('transactions').select('*');

    if (associationId && associationId !== 'all') {
      query = query.eq('association_id', associationId);
    }
    if (typeFilter && typeFilter !== 'all') {
      query = query.eq('type', typeFilter);
    }

    const { data: txs, error } = await query
      .order('transaction_date', { ascending: false })
      .order('created_at', { ascending: false });
    if (error) throw new Error(error.message || 'Error fetching transactions');

    // Join related categories, profiles, receipts, and associations reliably
    const [categories, users, receipts, associations] = await Promise.all([
      this.getBudgetCategories().catch(() => []),
      this.getUsers(associationId).catch(() => []),
      this.getReceipts(associationId).catch(() => []),
      this.getAssociations().catch(() => []),
    ]);

    const catMap = new Map(categories.map((c) => [c.id, c]));
    const userMap = new Map(users.map((u) => [u.id, u]));
    const receiptMap = new Map(receipts.map((r) => [r.id, r]));
    const assocMap = new Map(associations.map((a) => [a.id, a]));

    return (txs || []).map((tx: any) => ({
      ...tx,
      association: tx.association_id ? assocMap.get(tx.association_id) : undefined,
      category: tx.category_id ? catMap.get(tx.category_id) : undefined,
      member: tx.member_id ? userMap.get(tx.member_id) : undefined,
      members: Array.isArray(tx.member_ids)
        ? (tx.member_ids.map((id: string) => userMap.get(id)).filter(Boolean) as Profile[])
        : undefined,
      receipt: tx.receipt_id ? receiptMap.get(tx.receipt_id) : undefined,
      fund_source: determineFundSource(tx),
    })) as Transaction[];
  }

  public async getTransactionById(id: string): Promise<Transaction | undefined> {
    const client = this.getClient();
    const { data: tx, error } = await client
      .from('transactions')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error fetching transaction by ID');
    if (!tx) return undefined;

    const [category, member, receipt] = await Promise.all([
      tx.category_id ? (await this.getBudgetCategories()).find((c) => c.id === tx.category_id) : undefined,
      tx.member_id ? await this.getUserById(tx.member_id) : undefined,
      tx.receipt_id ? await this.getReceiptById(tx.receipt_id) : undefined,
    ]);

    return {
      ...tx,
      association: await this.getAssociationById(tx.association_id).catch(() => undefined),
      category,
      member,
      receipt,
      fund_source: determineFundSource(tx),
    } as Transaction;
  }

  public async createTransaction(transaction: Transaction): Promise<Transaction> {
    const client = this.getClient();
    const {
      association: _assoc,
      member: _member,
      members: _members,
      category: _category,
      receipt: _receipt,
      creator: _creator,
      fund_source: _fund_source,
      ...dbRow
    } = transaction as any;
    const { data, error } = await client.from('transactions').insert(dbRow).select().single();
    if (error) throw new Error(error.message || 'Error creating transaction in Supabase');
    return data as Transaction;
  }

  public async updateTransaction(id: string, partial: Partial<Transaction>): Promise<Transaction | undefined> {
    const client = this.getClient();
    const {
      association: _assoc,
      member: _member,
      members: _members,
      category: _category,
      receipt: _receipt,
      creator: _creator,
      fund_source: _fund_source,
      ...dbRow
    } = partial as any;
    const { data, error } = await client
      .from('transactions')
      .update({ ...dbRow, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error updating transaction');
    return (data as Transaction) || undefined;
  }

  public async deleteTransaction(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from('transactions').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Error deleting transaction');
    return true;
  }

  public async deleteReceipt(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from('receipts').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Error deleting receipt');
    return true;
  }

  public async countTransactionsReferencingReceipt(receiptId: string, excludeTransactionId?: string): Promise<number> {
    const client = this.getClient();
    let query = client.from('transactions').select('id', { count: 'exact', head: true }).eq('receipt_id', receiptId);
    if (excludeTransactionId) {
      query = query.neq('id', excludeTransactionId);
    }
    const { count, error } = await query;
    if (error) throw new Error(error.message || 'Error checking receipt references');
    return count || 0;
  }

  // ==========================================
  // Receipts & Audit Queue
  // ==========================================
  public async getReceipts(associationId?: string, statusFilter?: string): Promise<Receipt[]> {
    const client = this.getClient();
    let query = client.from('receipts').select('*');

    if (associationId && associationId !== 'all') {
      query = query.eq('association_id', associationId);
    }
    if (statusFilter && statusFilter !== 'all') {
      query = query.eq('status', statusFilter);
    }

    const receiptsPromise = query.order('created_at', { ascending: false });
    const usersPromise = this.getUsers(associationId).catch(() => []);
    // Join the linked transaction for each receipt (fetch directly to avoid recursion)
    const txQuery = client.from('transactions').select('*');
    if (associationId && associationId !== 'all') {
      txQuery.eq('association_id', associationId);
    }
    const txsPromise = txQuery;
    const catsPromise = this.getBudgetCategories(associationId).catch(() => []);

    const [receiptsRes, usersResult, txsRes, categories] = await Promise.all([
      receiptsPromise,
      usersPromise,
      txsPromise,
      catsPromise,
    ]);
    const { data: receipts, error } = receiptsRes;
    if (error) throw new Error(error.message || 'Error fetching receipts');
    const { data: txs, error: txError } = txsRes;
    if (txError) throw new Error(txError.message || 'Error fetching linked transactions');
    const userMap = new Map((usersResult || []).map((u) => [u.id, u]));
    const catMap = new Map(categories.map((c) => [c.id, c]));
    const txByReceiptId = new Map<string, any>();
    for (const tx of txs || []) {
      if (tx.receipt_id) {
        txByReceiptId.set(tx.receipt_id, {
          ...tx,
          category: tx.category_id ? catMap.get(tx.category_id) : undefined,
        });
      }
    }

    return (receipts || []).map((rcpt: any) => ({
      ...rcpt,
      uploader: rcpt.uploader_id ? userMap.get(rcpt.uploader_id) : undefined,
      auditor: rcpt.auditor_id ? userMap.get(rcpt.auditor_id) : undefined,
      transaction: rcpt.id ? txByReceiptId.get(rcpt.id) : undefined,
    })) as Receipt[];
  }

  public async getReceiptById(id: string): Promise<Receipt | undefined> {
    const client = this.getClient();
    const { data: rcpt, error } = await client
      .from('receipts')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error fetching receipt');
    if (!rcpt) return undefined;

    const [uploader, auditor] = await Promise.all([
      rcpt.uploader_id ? await this.getUserById(rcpt.uploader_id) : undefined,
      rcpt.auditor_id ? await this.getUserById(rcpt.auditor_id) : undefined,
    ]);

    return {
      ...rcpt,
      uploader,
      auditor,
    } as Receipt;
  }

  public async createReceipt(receipt: Receipt): Promise<Receipt> {
    const client = this.getClient();
    const { uploader: _u, auditor: _a, transaction: _t, ...cleanReceipt } = receipt as any;
    const { data, error } = await client.from('receipts').insert(cleanReceipt).select().single();
    if (error) throw new Error(error.message || 'Error creating receipt in Supabase');
    return data as Receipt;
  }

  public async addReceipt(receipt: Receipt): Promise<Receipt> {
    return this.createReceipt(receipt);
  }

  public async updateReceiptStatus(
    id: string,
    status: Receipt['status'],
    notes?: string,
    auditorId?: string
  ): Promise<Receipt | undefined> {
    const client = this.getClient();
    const payload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) payload.auditor_notes = notes;
    if (auditorId) payload.auditor_id = auditorId;
    if (status === 'verified') payload.verified_at = new Date().toISOString();

    const { data, error } = await client
      .from('receipts')
      .update(payload)
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error updating receipt status');
    return (data as Receipt) || undefined;
  }

  public async updateReceiptsStatus(
    ids: string[],
    status: Receipt['status'],
    notes?: string,
    auditorId?: string
  ): Promise<number> {
    if (!Array.isArray(ids) || ids.length === 0) return 0;
    const client = this.getClient();
    const payload: Record<string, any> = {
      status,
      updated_at: new Date().toISOString(),
    };
    if (notes !== undefined) payload.auditor_notes = notes;
    if (auditorId) payload.auditor_id = auditorId;
    if (status === 'verified') payload.verified_at = new Date().toISOString();

    const { data, error } = await client
      .from('receipts')
      .update(payload)
      .in('id', ids)
      .select();
    if (error) throw new Error(error.message || 'Error bulk-updating receipt status');
    return (data || []).length;
  }

  // ==========================================
  // Financial Statements
  // ==========================================
  public async getFinancialStatements(associationId?: string): Promise<FinancialStatement[]> {
    const client = this.getClient();
    let query = client.from('financial_statements').select('*');

    if (associationId && associationId !== 'all') {
      query = query.eq('association_id', associationId);
    }

    const { data: stmts, error } = await query.order('created_at', { ascending: false });
    if (error) throw new Error(error.message || 'Error fetching financial statements');

    const [assocs, users] = await Promise.all([
      this.getAssociations().catch(() => []),
      this.getUsers(associationId).catch(() => []),
    ]);

    const assocMap = new Map(assocs.map((a) => [a.id, a]));
    const userMap = new Map(users.map((u) => [u.id, u]));

    return (stmts || []).map((stmt: any) => ({
      ...stmt,
      association: stmt.association_id ? assocMap.get(stmt.association_id) : undefined,
      generator: stmt.generated_by ? userMap.get(stmt.generated_by) : undefined,
    })) as FinancialStatement[];
  }

  public async getFinancialStatementById(id: string): Promise<FinancialStatement | undefined> {
    const client = this.getClient();
    const { data: stmt, error } = await client
      .from('financial_statements')
      .select('*')
      .eq('id', id)
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error fetching financial statement');
    if (!stmt) return undefined;

    const [association, generator] = await Promise.all([
      stmt.association_id ? await this.getAssociationById(stmt.association_id) : undefined,
      stmt.generated_by ? await this.getUserById(stmt.generated_by) : undefined,
    ]);

    return {
      ...stmt,
      association,
      generator,
    } as FinancialStatement;
  }

  public async saveFinancialStatement(statement: FinancialStatement): Promise<FinancialStatement> {
    const client = this.getClient();
    const { association: _assoc, generator: _gen, ...cleanStatement } = statement as any;
    const { data, error } = await client
      .from('financial_statements')
      .upsert(cleanStatement)
      .select()
      .single();
    if (error) throw new Error(error.message || 'Error saving financial statement in Supabase');
    return data as FinancialStatement;
  }

  public async createFinancialStatement(statement: FinancialStatement): Promise<FinancialStatement> {
    return this.saveFinancialStatement(statement);
  }

  public async updateFinancialStatement(
    id: string,
    partial: Partial<FinancialStatement>
  ): Promise<FinancialStatement | undefined> {
    const client = this.getClient();
    const { data, error } = await client
      .from('financial_statements')
      .update({ ...partial, updated_at: new Date().toISOString() })
      .eq('id', id)
      .select()
      .maybeSingle();
    if (error) throw new Error(error.message || 'Error updating financial statement');
    return (data as FinancialStatement) || undefined;
  }

  public async deleteFinancialStatement(id: string): Promise<boolean> {
    const client = this.getClient();
    const { error } = await client.from('financial_statements').delete().eq('id', id);
    if (error) throw new Error(error.message || 'Error deleting financial statement');
    return true;
  }

  public async clearAllFinancialRecords(associationId?: string | null): Promise<boolean> {
    const client = this.getClient();
    if (associationId && associationId !== 'all') {
      await client.from('transactions').delete().eq('association_id', associationId);
      await client.from('receipts').delete().eq('association_id', associationId);
      await client.from('financial_statements').delete().eq('association_id', associationId);
    } else {
      await client.from('transactions').delete().neq('id', '0');
      await client.from('receipts').delete().neq('id', '0');
      await client.from('financial_statements').delete().neq('id', '0');
    }
    return true;
  }

  // ==========================================
  // Audit Logs
  // ==========================================
  public async addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): Promise<AuditLog> {
    const client = this.getClient();
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      created_at: new Date().toISOString(),
      ...log,
    };
    const { data, error } = await client.from('audit_logs').insert(newLog).select().single();
    if (error) throw new Error(error.message || 'Error adding audit log');
    return data as AuditLog;
  }

  public async getAuditLogs(associationId?: string, limit = 100): Promise<AuditLog[]> {
    const client = this.getClient();
    let query = client.from('audit_logs').select('*');
    if (associationId && associationId !== 'all') {
      query = query.or(`association_id.is.null,association_id.eq.${associationId}`);
    }
    const { data, error } = await query.order('created_at', { ascending: false }).limit(limit);
    if (error) throw new Error(error.message || 'Error fetching audit logs');
    return (data || []) as AuditLog[];
  }
}

export const supabaseDb = new SupabaseDatabaseService();
export const localDb = supabaseDb;
export const RECEIPTS_DIR = path.join(process.cwd(), 'storage', 'receipts');
export const RECEIPTS_BUCKET = 'receipts';
