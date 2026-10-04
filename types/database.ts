// Database and domain types for IARMS multi-association architecture
export type Database = Record<string, any>;

export type UserRole = 'super_admin' | 'admin' | 'bookkeeper' | 'treasurer' | 'auditor' | 'member';
export type VerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected';
export type TransactionType = 'collection' | 'disbursement';
export type StatementType = 'balance_sheet' | 'income_statement' | 'cash_flow' | 'fs1' | 'fs2' | 'fs3' | 'fs4';
export type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer' | 'check' | 'cash_on_hand' | 'bank_regular' | 'bank_cbu';
export type FundSource = 'cash_on_hand' | 'bank_regular' | 'bank_cbu';
export type AccountClassification =
  | 'collection'
  | 'disbursement'
  | 'current_asset'
  | 'non_current_asset'
  | 'current_liability'
  | 'non_current_liability'
  | 'equity';

export interface FixedAsset {
  id: string;
  association_id: string;
  name: string;
  asset_type: 'building' | 'heavy_machinery' | 'light_machinery' | 'it_equipment' | 'other';
  date_acquired: string;
  acquisition_cost: number;
  depreciation_rate: number;
  useful_life_years: number;
  salvage_value: number;
  is_active: boolean;
  notes?: string | null;
  created_at?: string;
  updated_at?: string;
  accumulated_depreciation?: number;
  annual_depreciation?: number;
  net_book_value?: number;
  netBookValue?: number;
}

export interface Association {
  id: string;
  code: string;
  name: string;
  old_name?: string | null;
  region: string;
  nis_name: string;
  mailing_address: string;
  president_name: string;
  contact_number: string | null;
  sec_registration_number: string;
  tin_number: string;
  service_area_ha: number;
  operational_area_ha: number;
  beneficiaries_total: number;
  beneficiaries_male: number;
  beneficiaries_female: number;
  tsag_count: number;
  contract_type: string;
  contract_effectivity_date: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Profile {
  id: string;
  username: string;
  email?: string | null;
  password?: string;
  full_name: string;
  role: UserRole;
  association_id?: string | null;
  farm_location: string | null;
  farm_size_hectares: number;
  contact_number: string | null;
  created_at: string;
  updated_at: string;
  token_version?: number;
  association?: Association;
}

export type PublicProfile = Omit<Profile, 'password'>;

export interface Session {
  token_hash: string;
  username: string;
  email?: string | null;
  role: UserRole;
  full_name: string;
  association_id?: string | null;
  created_at: string;
  expires_at: string;
}

export interface BudgetCategory {
  id: string;
  code: string;
  name: string;
  category_type: TransactionType;
  account_classification?: AccountClassification;
  allocated_amount: number;
  description?: string | null;
  association_id?: string | null;
  is_active: boolean;
  created_at?: string;
  updated_at?: string;
}

export interface Receipt {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploader_id: string;
  association_id?: string | null;
  status: VerificationStatus;
  auditor_id: string | null;
  auditor_notes: string | null;
  verified_at: string | null;
  created_at: string;
  updated_at: string;
  uploader?: Profile;
  auditor?: Profile;
  transaction?: any;
}

export interface Transaction {
  id: string;
  transaction_number: string;
  voucher_number?: string | null;
  type: TransactionType;
  association_id: string;
  member_id: string | null;
  member_ids?: string[] | null;
  category_id: string;
  receipt_id: string | null;
  amount: number;
  transaction_date: string;
  payment_method: PaymentMethod;
  fund_source?: FundSource;
  reference_number: string | null;
  payee_name?: string | null;
  lateral_section?: string | null;
  particulars?: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  association?: Association;
  member?: Profile;
  members?: Profile[];
  category?: BudgetCategory;
  receipt?: Receipt;
  creator?: Profile;
}

// Full FS1-FS4 Detailed Data Interface (NIA Standard Compliant)
export interface FS1Data {
  associationName: string;
  address: string;
  secRegNo: string;
  yearCurrent: number;
  yearPrior: number;
  receipts: {
    membershipFees: { current: number; prior: number };
    annualDues: { current: number; prior: number };
    omSubsidy: { current: number; prior: number };
    canalRemuIncentive: { current: number; prior: number };
    finesPenalties: { current: number; prior: number };
    interestEarned: { current: number; prior: number };
    otherIncome: { current: number; prior: number };
    total: { current: number; prior: number };
  };
  disbursements: {
    registrationPermits: { current: number; prior: number };
    travelRep: { current: number; prior: number };
    meetingExpenses: { current: number; prior: number };
    officeSupplies: { current: number; prior: number };
    salariesWages: { current: number; prior: number };
    canalClearingRepair: { current: number; prior: number };
    taxLicenses: { current: number; prior: number };
    otherExpenses: { current: number; prior: number };
    repairMaintenance: { current: number; prior: number };
    distributedIAShare: { current: number; prior: number };
    professionalFee: { current: number; prior: number };
    federationShare: { current: number; prior: number };
    pisoMulaSaPuso: { current: number; prior: number };
    total: { current: number; prior: number };
  };
  netSurplus: { current: number; prior: number };
  membersEquity: {
    fundBalanceBeginning: { current: number; prior: number };
    netSavingsYear: { current: number; prior: number };
    fundBalanceEnd: { current: number; prior: number };
  };
  extraReceipts?: Array<{ label: string; current: number; prior: number }>;
  extraDisbursements?: Array<{ label: string; current: number; prior: number }>;
  officers?: {
    treasurerName: string;
    auditorName: string;
    presidentName: string;
  };
}

export interface FS2Data {
  associationName: string;
  address: string;
  secRegNo: string;
  yearCurrent: number;
  yearPrior: number;
  cashFlows: {
    netSurplus: { current: number; prior: number };
    depreciation: { current: number; prior: number };
    cashBalanceBeginning: { current: number; prior: number };
    cashBalanceEnd: { current: number; prior: number };
  };
  financialCondition: {
    assets: {
      currentAssets: { current: number; prior: number };
      inventorySupplies: { current: number; prior: number };
      officeBuilding: { current: number; prior: number };
      totalAssets: { current: number; prior: number };
    };
    liabilitiesEquity: {
      currentLiabilities: { current: number; prior: number };
      nonCurrentLiabilities: { current: number; prior: number };
      totalLiabilities?: { current: number; prior: number };
      fundBalance?: { current: number; prior: number };
      equityTransactions?: { current: number; prior: number };
      equityLines?: Array<{ code: string; name: string; current: number; prior: number }>;
      membersEquity: { current: number; prior: number };
      totalLiabilitiesEquity: { current: number; prior: number };
    };
  };
  officers: {
    treasurerName: string;
    presidentName: string;
  };
}

export interface FS3Data {
  associationName: string;
  address: string;
  secRegNo: string;
  tinNo: string;
  yearEnding: number;
  cashReceipts: {
    membershipFees: number;
    annualDues: number;
    feesPenalties: number;
    donationsContributions: number;
    interestEarned: number;
    iaSubsidy: number;
    canalRemuneration: number;
    omFee: number;
    otherIncome: number;
    total: number;
  };
  cashDisbursements: {
    registrationPermits: number;
    travelRep: number;
    meetingExpenses: number;
    officeSupplies: number;
    salariesWages: number;
    canalClearingRepair: number;
    snacksMeetings: number;
    collectionExpenses: number;
    miscExpenses: number;
    otherExpenses: number;
    distributedIAShare: number;
    professionalFee: number;
    federationShare: number;
    pisoMulaSaPuso: number;
    total: number;
  };
  extraReceipts?: Array<{ label: string; current: number; prior: number }>;
  extraDisbursements?: Array<{ label: string; current: number; prior: number }>;
  cashBalanceThisYear: number;
  fundBalanceLastReport: number;
  totalCashBalance: number;
  composition: {
    cashOnHandPetty: number;
    undepositedCollections: number;
    cashInBankRegular: number;
    cashInBankCBU: number;
    savingsAccount: number;
    currentAccount: number;
    total: number;
  };
  officers: {
    treasurerName: string;
    auditorName: string;
    presidentName: string;
  };
}

/**
 * One liability line on the FS4 Balance Sheet.
 *
 * Lines are sourced from the Chart of Accounts: every account classified as a
 * Current or Non-Current Liability is listed **by name**, so an account added
 * by the Treasurer shows up on the Balance Sheet automatically. The array is
 * always ordered CURRENT LIABILITIES first, then NON-CURRENT LIABILITIES.
 */
export interface FS4LiabilityLine {
  /** Chart-of-accounts category id (stable key for inline edits). */
  id: string;
  code: string;
  name: string;
  classification: 'current_liability' | 'non_current_liability';
  /** Period ledger balance: money owed on this account. */
  amount: number;
}

export interface FS4Data {
  associationName: string;
  address: string;
  secRegNo: string;
  tinNo: string;
  asOfDate: string;
  assets: {
    cashOnHand: number;
    cashInBank: number;
    receivables: number;
    materialsSuppliesInventory: number;
    officeBuilding: number;
    totalAssets: number;
  };
  liabilities: {
    /** Dynamic account lines — Current Liabilities first, then Non-Current. */
    lines: FS4LiabilityLine[];
    totalLiabilities: number;
    /** @deprecated Legacy fixed rows — permanently removed from the Balance Sheet. */
    notarialPermitFees?: number;
    /** @deprecated Legacy fixed row — permanently removed from the Balance Sheet. */
    honorariumWagesPayable?: number;
    /** @deprecated Legacy fixed row — permanently removed from the Balance Sheet. */
    otherAccountsPayable?: number;
  };
  netWorth: number;
  officer: {
    treasurerName: string;
    treasurerTin: string;
  };
  notaryBlock: {
    province: string;
    municipality: string;
    ctcNo: string;
    ctcIssuedOn: string;
    ctcIssuedAt: string;
  };
}

export interface FinancialStatementBreakdown {
  cash_at_bank: number;
  accounts_receivable: number;
  equipment_assets: number;
  accounts_payable: number;
  retained_earnings: number;
  fs1?: FS1Data;
  fs2?: FS2Data;
  fs3?: FS3Data;
  fs4?: FS4Data;
  categories_summary?: Array<{
    category_id: string;
    category_code: string;
    category_name: string;
    type: TransactionType;
    allocated: number;
    actual: number;
    variance: number;
  }>;
  edits?: FinancialStatementEdits;
}

/**
 * Per-field data-source controls for generated statements.
 *
 * Each key is a concrete field path inside report_data, e.g. `fs1.receipts.membershipFees.current`.
 * - `auto`        (Auto Compute): value comes from the accounting input (transactions); read-only.
 * - `autocorrect` (Auto Correct): value auto-recomputed/derived and fixed; may be a corrected total.
 * - `force`       (Force Edit):   user-pinned manual override that survives regeneration/recompute.
 */
export type FinancialStatementEditMode = 'auto' | 'autocorrect' | 'force';

export interface FinancialStatementEdit {
  mode: FinancialStatementEditMode;
  value?: number | string;
  updatedAt?: string;
}

export interface FinancialStatementEdits {
  [fieldPath: string]: FinancialStatementEdit;
}

export interface StatementFinancialOverrides {
  // FS1 custom receipts overrides
  membershipFeesCurrent?: number;
  membershipFeesPrior?: number;
  annualDuesCurrent?: number;
  annualDuesPrior?: number;
  omSubsidyCurrent?: number;
  omSubsidyPrior?: number;
  canalRemuCurrent?: number;
  canalRemuPrior?: number;
  finesPenaltiesCurrent?: number;
  finesPenaltiesPrior?: number;
  interestEarnedCurrent?: number;
  interestEarnedPrior?: number;
  otherIncomeCurrent?: number;
  otherIncomePrior?: number;

  // FS1 custom disbursements overrides
  registrationPermitsCurrent?: number;
  registrationPermitsPrior?: number;
  travelRepCurrent?: number;
  travelRepPrior?: number;
  meetingExpensesCurrent?: number;
  meetingExpensesPrior?: number;
  officeSuppliesCurrent?: number;
  officeSuppliesPrior?: number;
  salariesWagesCurrent?: number;
  salariesWagesPrior?: number;
  canalClearingRepairCurrent?: number;
  canalClearingRepairPrior?: number;
  taxLicensesCurrent?: number;
  taxLicensesPrior?: number;
  otherExpensesCurrent?: number;
  otherExpensesPrior?: number;
  repairMaintenanceCurrent?: number;
  repairMaintenancePrior?: number;
  distributedIAShareCurrent?: number;
  distributedIASharePrior?: number;
  professionalFeeCurrent?: number;
  professionalFeePrior?: number;
  federationShareCurrent?: number;
  federationSharePrior?: number;
  pisoMulaSaPusoCurrent?: number;
  pisoMulaSaPusoPrior?: number;

  // FS3 composition of cash balance
  cashOnHand?: number;
  undepositedCollections?: number;
  cashInBankRegular?: number;
  cashInBankCBU?: number;
  savingsAccount?: number;
  currentAccount?: number;

  // FS4 balance sheet assets
  receivables?: number;
  materialsSuppliesInventory?: number;
  officeBuilding?: number;
}

export interface FinancialStatement {
  id: string;
  statement_number: string;
  title: string;
  association_id: string;
  statement_type: StatementType;
  period_start: string;
  period_end: string;
  total_collections: number;
  total_disbursements: number;
  net_cash_flow: number;
  report_data: FinancialStatementBreakdown;
  is_published: boolean;
  generated_by: string;
  created_at: string;
  updated_at: string;
  association?: Association;
  generator?: Profile;
}

export interface AuditLog {
  id: string;
  user_id: string;
  association_id?: string | null;
  action: string;
  entity_type: string;
  entity_id?: string | null;
  details: string;
  created_at: string;
}

/**
 * Categories of removed rows surfaced by the Treasurer's "Deleted Records"
 * viewer. Every hard delete in the financial modules writes an audit-log row
 * with a JSON snapshot of the record, so the entry survives the row itself.
 */
export type DeletedRecordKind = 'chart_of_account' | 'fixed_asset' | 'transaction' | 'bulk_clear';

export interface DeletedRecordEntry {
  /** Audit-log row id backing this entry. */
  id: string;
  kind: DeletedRecordKind;
  /** Audit-log action name (e.g. TRANSACTION_DELETED). */
  action: string;
  entity_id?: string | null;
  association_id?: string | null;
  /** Headline of the removed record (Tx #, account code + name, asset name...). */
  title: string;
  /** One-line context: type, category, payee, date... */
  summary: string;
  /** Money attached to the record, when it has one. */
  amount: number | null;
  deleted_by: string;
  deleted_by_name: string;
  deleted_at: string;
  /** Human-readable description stored on the audit log. */
  details: string;
  /** Field-by-field snapshot of the row at the moment it was deleted. */
  snapshot: Record<string, unknown> | null;
}
