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
} from '@/types';
import { hashPassword, isHashedPassword } from '@/lib/auth/password';
import { normalizeStoredPhilippineMobile } from '@/lib/utils/phone';

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
    if (user.password) {
      user.password = isHashedPassword(user.password) ? user.password : hashPassword(user.password);
    }
    const { data, error } = await client.from('profiles').insert(user).select().single();
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
  public async getBudgetCategories(associationId?: string): Promise<BudgetCategory[]> {
    const all = await cached('bc:list', async () => {
      const client = this.getClient();
      const { data, error } = await client.from('budget_categories').select('*').order('code', { ascending: true });
      if (error) {
        console.warn('Error fetching budget categories from Supabase, returning standard chart:', error.message);
      }
      return (data && data.length > 0 ? data : [
      { id: 'cat-1', code: 'REC-ISF', name: 'Irrigation Service Fee (ISF) Collections', category_type: 'collection', allocated_amount: 100000, is_active: true },
      { id: 'cat-2', code: 'REC-MEM', name: 'Membership Fees & Annual Dues', category_type: 'collection', allocated_amount: 50000, is_active: true },
      { id: 'cat-3', code: 'REC-SUB', name: 'O&M Subsidy & Canal Remuneration', category_type: 'collection', allocated_amount: 150000, is_active: true },
      { id: 'cat-4', code: 'REC-FIN', name: 'Fines, Penalties & Interest', category_type: 'collection', allocated_amount: 20000, is_active: true },
      { id: 'cat-15', code: 'REC-DON', name: 'Donations, Grants & Other Income', category_type: 'collection', allocated_amount: 30000, is_active: true },
      { id: 'cat-5', code: 'DISB-CLEAR', name: 'Canal Clearing, Repair & Maintenance', category_type: 'disbursement', allocated_amount: 80000, is_active: true },
      { id: 'cat-6', code: 'DISB-SUPP', name: 'Office & Field Supplies', category_type: 'disbursement', allocated_amount: 30000, is_active: true },
      { id: 'cat-7', code: 'DISB-HON', name: 'Honorarium, Salaries & Wages', category_type: 'disbursement', allocated_amount: 60000, is_active: true },
      { id: 'cat-8', code: 'DISB-TRAV', name: 'Travel, Meeting & Rep Expenses', category_type: 'disbursement', allocated_amount: 25000, is_active: true },
      { id: 'cat-9', code: 'DISB-TAX', name: 'Registration, Tax & Licenses', category_type: 'disbursement', allocated_amount: 15000, is_active: true },
      { id: 'cat-10', code: 'DISB-SHARE', name: 'Distributed IA Share to Laterals', category_type: 'disbursement', allocated_amount: 20000, is_active: true },
      { id: 'cat-11', code: 'DISB-LATERAL', name: 'Lateral Share Distribution', category_type: 'disbursement', allocated_amount: 35000, is_active: true },
      { id: 'cat-12', code: 'DISB-REPAIR', name: 'Repair & Maintenance', category_type: 'disbursement', allocated_amount: 50000, is_active: true },
      { id: 'cat-13', code: 'DISB-PROF', name: 'Professional Fee', category_type: 'disbursement', allocated_amount: 25000, is_active: true },
      { id: 'cat-14', code: 'DISB-FED', name: 'Federation Share', category_type: 'disbursement', allocated_amount: 30000, is_active: true },
      { id: 'cat-16', code: 'DISB-PISO', name: 'Piso Mula sa Puso', category_type: 'disbursement', allocated_amount: 15000, is_active: true },
    ]) as BudgetCategory[];
    }, 60_000);

    if (associationId && associationId !== 'all') {
      const specific = all.filter((c) => c.association_id === associationId);
      const universal = all.filter((c) => !c.association_id);
      if (specific.length > 0) {
        return [...specific, ...universal];
      }
      return all;
    }
    return all;
  }

  public async createBudgetCategory(category: BudgetCategory): Promise<BudgetCategory> {
    const client = this.getClient();
    const { data, error } = await client.from('budget_categories').insert(category).select().single();
    if (error) throw new Error(error.message || 'Error creating budget category');
    invalidateCache('bc:');
    return data as BudgetCategory;
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

    const { data: txs, error } = await query.order('transaction_date', { ascending: false });
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
    } as Transaction;
  }

  public async createTransaction(transaction: Transaction): Promise<Transaction> {
    const client = this.getClient();
    const { data, error } = await client.from('transactions').insert(transaction).select().single();
    if (error) throw new Error(error.message || 'Error creating transaction in Supabase');
    return data as Transaction;
  }

  public async updateTransaction(id: string, partial: Partial<Transaction>): Promise<Transaction | undefined> {
    const client = this.getClient();
    const { data, error } = await client
      .from('transactions')
      .update({ ...partial, updated_at: new Date().toISOString() })
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
    const { data, error } = await client.from('receipts').insert(receipt).select().single();
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
    const { data, error } = await client
      .from('financial_statements')
      .upsert(statement)
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
