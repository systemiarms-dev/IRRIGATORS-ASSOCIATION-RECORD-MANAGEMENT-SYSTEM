// Database and domain types for IARMS multi-association architecture
export type Database = Record<string, any>;

export type UserRole = 'super_admin' | 'admin' | 'treasurer' | 'auditor';
export type VerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected';
export type TransactionType = 'collection' | 'disbursement';
export type StatementType = 'balance_sheet' | 'income_statement' | 'cash_flow' | 'fs1' | 'fs2' | 'fs3' | 'fs4';
export type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer' | 'check';

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
  member_names?: string[] | null;
  category_id: string;
  receipt_id: string | null;
  amount: number;
  transaction_date: string;
  payment_method: PaymentMethod;
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
    notarialPermitFees: number;
    honorariumWagesPayable: number;
    otherAccountsPayable: number;
    totalLiabilities: number;
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

  // FS4 balance sheet liabilities
  notarialPermitFees?: number;
  honorariumWagesPayable?: number;
  otherAccountsPayable?: number;
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
