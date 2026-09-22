/**
 * 100% Offline Portable Local File Database Engine
 * Irrigator Association Record Management System (IARMS)
 *
 * Persists data locally to `iarms_local_data.json` on the Host Server PC.
 * Seeded with exact official NIA Financial Statement records (FS1, FS2, FS3, FS4) for:
 * NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC. (IPIL, GONZAGA CAGAYAN)
 */

import fs from 'fs';
import path from 'path';
import { Profile, Transaction, BudgetCategory, Receipt, FinancialStatement, Session } from '@/types';
import { hashPassword, isHashedPassword } from '@/lib/auth/password';

const DB_FILE_PATH = path.join(process.cwd(), 'iarms_local_data.json');
const DB_BACKUP_PATH = path.join(process.cwd(), 'iarms_local_data.json.bak');
const DATA_DIR = path.join(process.cwd(), '.data');
const BACKUPS_DIR = path.join(DATA_DIR, 'backups');
const UPLOADS_DIR = path.join(DATA_DIR, 'uploads', 'receipts');

export const RECEIPTS_DIR = UPLOADS_DIR;

export interface AuditLog {
  id: string;
  user_id: string;
  action: string;
  entity_type: string;
  entity_id?: string;
  details: string;
  created_at: string;
}

export interface LocalDatabaseSchema {
  users: Profile[];
  categories: BudgetCategory[];
  transactions: Transaction[];
  receipts: Receipt[];
  financial_statements: FinancialStatement[];
  audit_logs: AuditLog[];
  sessions: Session[];
}

// Initial Seed Categories matching NIA Official standard line items
const INITIAL_CATEGORIES: BudgetCategory[] = [
  { id: 'cat-1', code: 'REC-ISF', name: 'Irrigation Service Fee (ISF) Collections', category_type: 'collection', allocated_amount: 100000, description: 'Member ISF payments', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-2', code: 'REC-MEM', name: 'Membership Fees & Annual Dues', category_type: 'collection', allocated_amount: 50000, description: 'IA Member registration and annual dues', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-3', code: 'REC-SUB', name: 'O&M Subsidy & Canal Remuneration', category_type: 'collection', allocated_amount: 150000, description: 'NIA Operations & Maintenance subsidies', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-4', code: 'REC-FIN', name: 'Fines, Penalties & Interest', category_type: 'collection', allocated_amount: 20000, description: 'Delinquency penalties and bank interest', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-5', code: 'DISB-CLEAR', name: 'Canal Clearing, Repair & Maintenance', category_type: 'disbursement', allocated_amount: 80000, description: 'Operational desilting and clearing of irrigation canals', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-6', code: 'DISB-SUPP', name: 'Office & Field Supplies', category_type: 'disbursement', allocated_amount: 30000, description: 'Stationery, fuel, and operational tools', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-7', code: 'DISB-HON', name: 'Honorarium, Salaries & Wages', category_type: 'disbursement', allocated_amount: 60000, description: 'Monthly allowance and personnel wages', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-8', code: 'DISB-TRAV', name: 'Travel, Meeting & Rep Expenses', category_type: 'disbursement', allocated_amount: 25000, description: 'Transport allowances and IA assembly expenses', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-9', code: 'DISB-TAX', name: 'Registration, Tax & Licenses', category_type: 'disbursement', allocated_amount: 15000, description: 'LGU permits, BIR taxes, legal jurats', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
  { id: 'cat-10', code: 'DISB-SHARE', name: 'Distributed IA Share to Laterals', category_type: 'disbursement', allocated_amount: 20000, description: 'Federation and lateral incentive distribution', is_active: true, created_at: new Date().toISOString(), updated_at: new Date().toISOString() },
];

// Seed Officers matching official document images.
// Passwords are seeded via hashPassword() at boot; these defaults must be changed
// immediately after first deployment (see LAN_OFFLINE_GUIDE.md).
const INITIAL_USERS: Profile[] = [
  {
    id: 'user-admin-1',
    email: 'admin@iarms.org',
    password: hashPassword('admin123'),
    full_name: 'MEYNARD TOMANENG',
    role: 'admin',
    farm_location: 'Ipil, Gonzaga, Cagayan',
    farm_size_hectares: 3.5,
    contact_number: '+63 917 123 4567',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-treasurer-1',
    email: 'treasurer@iarms.org',
    password: hashPassword('treasurer123'),
    full_name: 'RIC UNDAY',
    role: 'treasurer',
    farm_location: 'Ipil, Gonzaga, Cagayan',
    farm_size_hectares: 2.0,
    contact_number: '+63 918 987 6543',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
  {
    id: 'user-auditor-1',
    email: 'auditor@iarms.org',
    password: hashPassword('auditor123'),
    full_name: 'ARTUR GUIANG',
    role: 'auditor',
    farm_location: 'Ipil, Gonzaga, Cagayan',
    farm_size_hectares: 4.2,
    contact_number: '+63 919 456 7890',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  },
];

// Clean Initial Transactions Array (Production Real Data Mode)
const INITIAL_TRANSACTIONS: Transaction[] = [];

// Clean Initial Financial Statements Array (Production Real Data Mode)
const INITIAL_FINANCIAL_STATEMENTS: FinancialStatement[] = [];

class LocalDatabase {
  private data: LocalDatabaseSchema;
  private lastLoadedMtime = 0;

  constructor() {
    this.data = this.loadDatabase();
  }

  private syncFromDisk(): void {
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const stats = fs.statSync(DB_FILE_PATH);
        if (stats.mtimeMs > this.lastLoadedMtime) {
          const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
          const raw = JSON.parse(fileContent) as LocalDatabaseSchema;
          if (raw && Array.isArray(raw.users) && Array.isArray(raw.transactions)) {
            this.data = raw;
            this.lastLoadedMtime = stats.mtimeMs;
          }
        }
      }
    } catch (err) {
      console.error('Error syncing local database from disk:', err);
    }
  }

  private loadDatabase(): LocalDatabaseSchema {
    let parsed: LocalDatabaseSchema | null = null;
    try {
      if (fs.existsSync(DB_FILE_PATH)) {
        const fileContent = fs.readFileSync(DB_FILE_PATH, 'utf-8');
        const raw = JSON.parse(fileContent) as LocalDatabaseSchema;
        if (raw && Array.isArray(raw.users) && Array.isArray(raw.transactions)) {
          parsed = raw;
          const stats = fs.statSync(DB_FILE_PATH);
          this.lastLoadedMtime = stats.mtimeMs;
        }
      }
    } catch (err) {
      console.error('Error loading existing local database, fallback to initial seed:', err);
    }

    const initialData: LocalDatabaseSchema = parsed || {
      users: INITIAL_USERS,
      categories: INITIAL_CATEGORIES,
      transactions: INITIAL_TRANSACTIONS,
      receipts: [],
      financial_statements: INITIAL_FINANCIAL_STATEMENTS,
      audit_logs: [
        {
          id: 'log-1',
          user_id: 'user-admin-1',
          action: 'SYSTEM_INITIALIZED',
          entity_type: 'system',
          details: 'Initialized Nangurisan Laya Farmers IA offline database instance',
          created_at: new Date().toISOString(),
        },
      ],
      sessions: [],
    };

    if (!parsed || this.migrateLegacyData(initialData)) {
      this.saveDatabase(initialData);
    }
    return initialData;
  }

  /**
   * One-time migration for data created before hashing was introduced:
   * re-hashes any plaintext passwords and ensures the sessions array exists.
   */
  private migrateLegacyData(data: LocalDatabaseSchema): boolean {
    let changed = false;

    if (!Array.isArray(data.sessions)) {
      data.sessions = [];
      changed = true;
    }

    for (const user of data.users) {
      if (user.password && !isHashedPassword(user.password)) {
        user.password = hashPassword(user.password);
        changed = true;
      }
      if (user.token_version == null) {
        user.token_version = 0;
        changed = true;
      }
    }

    return changed;
  }

  /**
   * Atomic write: write to a temp file then rename over the real file,
   * keeping a rolling backup and a daily snapshot. Prevents corruption
   * on crash and gives recoverable history.
   */
  private saveDatabase(dataToSave?: LocalDatabaseSchema): void {
    try {
      const data = dataToSave || this.data;
      const json = JSON.stringify(data, null, 2);

      if (fs.existsSync(DB_FILE_PATH)) {
        fs.copyFileSync(DB_FILE_PATH, DB_BACKUP_PATH);
      }

      const tmpPath = `${DB_FILE_PATH}.tmp`;
      fs.writeFileSync(tmpPath, json, 'utf-8');
      fs.renameSync(tmpPath, DB_FILE_PATH);

      if (fs.existsSync(DB_FILE_PATH)) {
        this.lastLoadedMtime = fs.statSync(DB_FILE_PATH).mtimeMs;
      }

      const today = new Date().toISOString().slice(0, 10);
      const snapshotPath = path.join(BACKUPS_DIR, `iarms_local_data-${today}.json`);
      if (!fs.existsSync(snapshotPath)) {
        fs.mkdirSync(BACKUPS_DIR, { recursive: true });
        fs.writeFileSync(snapshotPath, json, 'utf-8');
      }
    } catch (err) {
      console.error('Error saving local JSON database:', err);
    }
  }

  // --- Users Operations ---

  /**
   * Returns profiles WITHOUT password hashes (safe to send to clients).
   */
  public getUsers(): Profile[] {
    this.syncFromDisk();
    return this.data.users.map(({ password: _removed, ...publicUser }) => publicUser);
  }

  /**
   * Internal only. Returns the full profile INCLUDING the password hash.
   * Used solely by the auth module.
   */
  public getUserById(id: string): Profile | undefined {
    this.syncFromDisk();
    return this.data.users.find((u) => u.id === id);
  }

  /**
   * Internal only. Returns the full profile INCLUDING the password hash.
   */
  public getUserByEmail(identifier: string): Profile | undefined {
    this.syncFromDisk();
    const clean = identifier.trim().toLowerCase();
    return this.data.users.find(
      (u) =>
        u.email.toLowerCase() === clean ||
        u.email.toLowerCase().split('@')[0] === clean ||
        u.full_name.toLowerCase() === clean
    );
  }

  public createUser(user: Profile): Profile {
    this.syncFromDisk();
    if (user.password) {
      user.password = isHashedPassword(user.password) ? user.password : hashPassword(user.password);
    }
    this.data.users.push(user);
    this.saveDatabase();
    return user;
  }

  public updateUserRole(id: string, role: Profile['role']): Profile | undefined {
    this.syncFromDisk();
    const user = this.data.users.find((u) => u.id === id);
    if (user) {
      user.role = role;
      // Role changes apply immediately on database level without invalidating the token.
      // Active sessions stay alive and update their role dynamically upon navigation/refresh.
      user.updated_at = new Date().toISOString();
      this.saveDatabase();
    }
    return user;
  }

  public updateUserPassword(id: string, newPassword: string): Profile | undefined {
    const user = this.data.users.find((u) => u.id === id);
    if (user) {
      user.password = hashPassword(newPassword);
      user.token_version = (user.token_version || 0) + 1;
      user.updated_at = new Date().toISOString();
      this.saveDatabase();
    }
    return user;
  }

  public updateProfile(email: string, partial: Partial<Profile>): Profile | undefined {
    const user = this.data.users.find((u) => u.email === email);
    if (user) {
      if (partial.password) {
        partial.password = isHashedPassword(partial.password) ? partial.password : hashPassword(partial.password);
      }
      Object.assign(user, partial);
      user.updated_at = new Date().toISOString();
      this.saveDatabase();
    }
    return user;
  }

  public deleteUser(id: string): boolean {
    const idx = this.data.users.findIndex((u) => u.id === id);
    if (idx === -1) return false;
    this.data.users.splice(idx, 1);
    this.saveDatabase();
    return true;
  }

  // --- Categories Operations ---
  public getCategories(): BudgetCategory[] {
    return this.data.categories || [];
  }

  public getBudgetCategories(): BudgetCategory[] {
    return this.getCategories();
  }

  // --- Receipts & Audit Operations ---
  public getReceipts(): Receipt[] {
    return this.data.receipts || [];
  }

  public addReceipt(receipt: Receipt): Receipt {
    if (!this.data.receipts) this.data.receipts = [];
    this.data.receipts.unshift(receipt);
    this.saveDatabase();
    return receipt;
  }

  public updateReceiptStatus(id: string, status: Receipt['status'], notes?: string): Receipt | undefined {
    if (!this.data.receipts) this.data.receipts = [];
    const receipt = this.data.receipts.find((r) => r.id === id);
    if (receipt) {
      receipt.status = status;
      if (notes) receipt.auditor_notes = notes;
      receipt.updated_at = new Date().toISOString();
      this.saveDatabase();
    }
    return receipt;
  }

  public deleteReceipt(id: string): boolean {
    if (!this.data.receipts) return false;
    const idx = this.data.receipts.findIndex((r) => r.id === id);
    if (idx !== -1) {
      const receipt = this.data.receipts[idx];
      if (receipt.file_path) {
        try {
          const fileName = path.basename(receipt.file_path);
          const absolutePath = path.join(UPLOADS_DIR, fileName);
          if (fs.existsSync(absolutePath)) {
            fs.unlinkSync(absolutePath);
          }
        } catch (err) {
          console.error('Error deleting receipt image file from disk:', err);
        }
      }
      this.data.receipts.splice(idx, 1);
      this.saveDatabase();
      return true;
    }
    return false;
  }

  // --- Transactions Operations ---
  public getTransactions(): (Transaction & { category?: BudgetCategory; receipt?: Receipt })[] {
    return this.data.transactions.map((tx) => ({
      ...tx,
      category: this.data.categories.find((c) => c.id === tx.category_id),
      receipt: tx.receipt_id ? (this.data.receipts || []).find((r) => r.id === tx.receipt_id) : undefined,
    }));
  }

  public createTransaction(tx: Transaction): Transaction {
    this.data.transactions.unshift(tx);
    this.saveDatabase();
    return tx;
  }

  public deleteTransaction(id: string): boolean {
    const idx = this.data.transactions.findIndex((t) => t.id === id);
    if (idx !== -1) {
      const tx = this.data.transactions[idx];
      // Automatically remove associated uploaded receipt from Audit & Verification Queue
      if (tx.receipt_id) {
        this.deleteReceipt(tx.receipt_id);
      }
      this.data.transactions.splice(idx, 1);
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public hasTransactionsForMember(memberId: string): boolean {
    return this.data.transactions.some((t) => t.member_id === memberId || (Array.isArray(t.member_ids) && t.member_ids.includes(memberId)));
  }

  // --- Financial Statements Operations ---
  public getFinancialStatements(): FinancialStatement[] {
    return this.data.financial_statements;
  }

  public createFinancialStatement(stmt: FinancialStatement): FinancialStatement {
    this.data.financial_statements.unshift(stmt);
    this.saveDatabase();
    return stmt;
  }

  public getFinancialStatementById(id: string): FinancialStatement | undefined {
    return this.data.financial_statements.find((s) => s.id === id);
  }

  public updateFinancialStatement(id: string, patch: Partial<FinancialStatement>): FinancialStatement | undefined {
    const idx = this.data.financial_statements.findIndex((s) => s.id === id);
    if (idx === -1) return undefined;
    this.data.financial_statements[idx] = {
      ...this.data.financial_statements[idx],
      ...patch,
      id,
      updated_at: new Date().toISOString(),
    };
    this.saveDatabase();
    return this.data.financial_statements[idx];
  }

  public deleteFinancialStatement(id: string): boolean {
    const idx = this.data.financial_statements.findIndex((s) => s.id === id);
    if (idx !== -1) {
      this.data.financial_statements.splice(idx, 1);
      this.saveDatabase();
      return true;
    }
    return false;
  }

  public clearAllFinancialRecords(): void {
    // Delete all receipt image files from the private uploads folder
    try {
      if (fs.existsSync(UPLOADS_DIR)) {
        const files = fs.readdirSync(UPLOADS_DIR);
        for (const file of files) {
          try {
            fs.unlinkSync(path.join(UPLOADS_DIR, file));
          } catch (e) {
            console.error('Error unlinking receipt file:', e);
          }
        }
      }
    } catch (err) {
      console.error('Error purging receipt upload files:', err);
    }

    this.data.transactions = [];
    this.data.receipts = [];
    this.data.financial_statements = [];
    this.data.audit_logs.unshift({
      id: `log-${Date.now()}`,
      user_id: 'user-admin-1',
      action: 'DATABASE_CLEARED',
      entity_type: 'system',
      details: 'All transaction records, receipts, and financial statements were purged by administrator.',
      created_at: new Date().toISOString(),
    });
    this.saveDatabase();
  }

  // --- Audit Logs ---
  public addAuditLog(log: Omit<AuditLog, 'id' | 'created_at'>): AuditLog {
    const newLog: AuditLog = {
      ...log,
      id: `log-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      created_at: new Date().toISOString(),
    };
    this.data.audit_logs.unshift(newLog);
    this.saveDatabase();
    return newLog;
  }

  public getAuditLogs(): AuditLog[] {
    return this.data.audit_logs;
  }
}

// Global Singleton Instance
export const localDb = new LocalDatabase();