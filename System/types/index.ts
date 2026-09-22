import { Profile, BudgetCategory, Transaction, Receipt, FinancialStatement, VerificationStatus, UserRole, PaymentMethod, TransactionType, StatementType } from './database';

export * from './database';

export interface DashboardMetrics {
  totalCollections: number;
  totalExpenses: number;
  netCash: number;
  pendingReceipts: number;
  totalMembers: number;
  activeBudgetUtilizationPercentage: number;
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
  searchQuery?: string;
}

export interface TransactionFilters {
  type?: TransactionType | 'all';
  categoryId?: string;
  startDate?: string;
  endDate?: string;
  memberId?: string;
  searchQuery?: string;
}

export interface VerificationQueueFilters {
  status?: VerificationStatus | 'all';
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
  type: TransactionType;
  member_id?: string | null;
  member_ids?: string[] | null;
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
  title: string;
  statement_type: StatementType;
  period_start: string;
  period_end: string;
  publish_immediately?: boolean;
}
