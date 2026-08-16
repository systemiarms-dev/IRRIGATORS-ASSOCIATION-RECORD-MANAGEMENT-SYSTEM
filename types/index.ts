import { Profile, BudgetCategory, Transaction, Receipt, FinancialStatement, VerificationStatus, UserRole, PaymentMethod, TransactionType, StatementType, Association } from './database';

export * from './database';

export interface AssociationMetricSummary {
  associationId: string;
  associationName: string;
  code: string;
  totalCollections: number;
  totalExpenses: number;
  netCash: number;
  totalMembers: number;
  pendingReceipts: number;
}

export interface DashboardMetrics {
  totalCollections: number;
  totalExpenses: number;
  netCash: number;
  pendingReceipts: number;
  totalMembers: number;
  activeBudgetUtilizationPercentage: number;
  associationSummaries?: AssociationMetricSummary[];
  monthlyTrends: Array<{
    month: string;
    collections: number;
    expenses: number;
  }>;
  categoryBreakdown: Array<{
    categoryName: string;
    categoryCode: string;
    amount: number;
    allocated: number;
    type: TransactionType;
  }>;
}

export interface UserAccountFilters {
  role?: UserRole | 'all';
  associationId?: string | 'all';
  searchQuery?: string;
}

export interface TransactionFilters {
  type?: TransactionType | 'all';
  associationId?: string | 'all';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  memberId?: string;
  searchQuery?: string;
}

export interface VerificationQueueFilters {
  status?: VerificationStatus | 'all';
  associationId?: string | 'all';
  uploaderId?: string;
  startDate?: string;
  endDate?: string;
}

// Action Response Wrapper
export type ActionResponse<T = undefined> = {
  success: boolean;
  message: string;
  data?: T;
  error?: string;
};

// Form Input Payloads
export interface CreateTransactionPayload {
  association_id?: string;
  type: TransactionType;
  voucher_number?: string | null;
  payee_name?: string | null;
  lateral_section?: string | null;
  particulars?: string | null;
  member_id?: string | null;
  member_ids?: string[] | null;
  member_names?: string[] | null;
  category_id: string;
  receipt_id?: string | null;
  amount: number;
  transaction_date: string;
  payment_method: PaymentMethod;
  reference_number?: string | null;
  notes?: string | null;
}

export interface AuditVerificationPayload {
  receipt_id: string;
  status: VerificationStatus;
  auditor_notes?: string | null;
}

export interface GenerateStatementPayload {
  association_id?: string;
  title: string;
  statement_type: StatementType;
  period_start: string;
  period_end: string;
  publish_immediately?: boolean;
}

export interface CreateAssociationPayload {
  code: string;
  name: string;
  old_name?: string | null;
  region?: string;
  nis_name?: string;
  mailing_address: string;
  president_name: string;
  contact_number?: string | null;
  sec_registration_number: string;
  tin_number: string;
  service_area_ha: number;
  operational_area_ha: number;
  beneficiaries_total: number;
  beneficiaries_male: number;
  beneficiaries_female: number;
  tsag_count: number;
  contract_type?: string;
  contract_effectivity_date?: string | null;
}
