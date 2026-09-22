// Placeholder Database type for Supabase client compatibility
export type Database = Record<string, any>;

export type UserRole = 'admin' | 'treasurer' | 'auditor' | 'member';
export type VerificationStatus = 'pending' | 'verified' | 'flagged' | 'rejected';
export type TransactionType = 'collection' | 'disbursement';
export type StatementType = 'balance_sheet' | 'income_statement' | 'cash_flow' | 'fs1' | 'fs2' | 'fs3' | 'fs4';
export type PaymentMethod = 'cash' | 'gcash' | 'bank_transfer' | 'check';

export interface Profile {
  id: string;
  email: string;
  password?: string;
  full_name: string;
  role: UserRole;
  farm_location: string | null;
  farm_size_hectares: number;
  contact_number: string | null;
  created_at: string;
  updated_at: string;
  /** Incremented on every password change; signed into session tokens so old sessions are revoked immediately. */
  token_version?: number;
}

// Profile shape that is safe to send to clients (never carries a password).
export type PublicProfile = Omit<Profile, 'password'>;

// Server-side session record (only used by tools that need server session state).
export interface Session {
  token_hash: string;
  email: string;
  role: UserRole;
  full_name: string;
  created_at: string;
  expires_at: string;
}

export interface BudgetCategory {
  id: string;
  code: string;
  name: string;
  category_type: TransactionType;
  allocated_amount: number;
  description: string | null;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface Receipt {
  id: string;
  file_path: string;
  file_name: string;
  file_size: number;
  content_type: string;
  uploader_id: string;
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
  type: TransactionType;
  member_id: string | null;
  member_ids?: string[] | null;
  category_id: string;
  receipt_id: string | null;
  amount: number;
  transaction_date: string;
  payment_method: PaymentMethod;
  reference_number: string | null;
  notes: string | null;
  created_by: string;
  created_at: string;
  updated_at: string;
  member?: Profile;
  members?: Profile[];
  category?: BudgetCategory;
  receipt?: Receipt;
  creator?: Profile;
}

// Full FS1-FS4 Detailed Data Interface
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
    total: { current: number; prior: number };
  };
  netSurplus: { current: number; prior: number };
  membersEquity: {
    fundBalanceBeginning: { current: number; prior: number };
    netSavingsYear: { current: number; prior: number };
    fundBalanceEnd: { current: number; prior: number };
  };
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
  categories_summary: Array<{
    category_id: string;
    category_code: string;
    category_name: string;
    type: TransactionType;
    allocated: number;
    actual: number;
    variance: number;
  }>;
}

// Optional overrides entered by the treasurer when compiling or editing a
// statement. When omitted, cash position and balance sheet lines fall back to
// the auto-allocation (ledger-derived). When any field is provided, the report
// uses the treasurer's figures so FS3/FS4 reflect real bank/cash positions.
export interface StatementFinancialOverrides {
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
  generator?: Profile;
}
