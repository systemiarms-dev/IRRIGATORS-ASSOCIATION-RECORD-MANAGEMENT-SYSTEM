'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, DashboardMetrics } from '@/types';
import { requireUser, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';

/**
 * Compute real-time KPI metrics and analytics charts data for the dashboard
 */
export async function getDashboardMetricsAction(): Promise<ActionResponse<DashboardMetrics>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  const txs = localDb.getTransactions();
  const users = localDb.getUsers();
  const pendingReceipts = localDb.getReceipts().filter((r) => r.status === 'pending').length;

  const totalMembersCount = users.length;

  let totalCollections = 0;
  let totalExpenses = 0;

  const monthlyMap: Record<string, { collections: number; expenses: number }> = {};
  const categoryMap: Record<string, { categoryName: string; categoryCode: string; amount: number; allocated: number; type: 'collection' | 'disbursement' }> = {};

  (txs || []).forEach((tx) => {
    const amt = Number(tx.amount);
    const date = new Date(tx.transaction_date);
    const monthKey = date.toLocaleString('en-US', { month: 'short' });

    if (!monthlyMap[monthKey]) {
      monthlyMap[monthKey] = { collections: 0, expenses: 0 };
    }

    if (tx.type === 'collection') {
      totalCollections += amt;
      monthlyMap[monthKey].collections += amt;
    } else {
      totalExpenses += amt;
      monthlyMap[monthKey].expenses += amt;
    }

    if (tx.category) {
      const code = tx.category.code;
      if (!categoryMap[code]) {
        categoryMap[code] = {
          categoryName: tx.category.name,
          categoryCode: code,
          amount: 0,
          allocated: Number(tx.category.allocated_amount),
          type: tx.category.category_type,
        };
      }
      categoryMap[code].amount += amt;
    }
  });

  // Prepare monthly trends array for all 12 months of the year
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
  const monthlyTrends = months.map((m) => ({
    month: m,
    collections: monthlyMap[m]?.collections || 0,
    expenses: monthlyMap[m]?.expenses || 0,
  }));

  const categoryBreakdown = Object.values(categoryMap);

  const metrics: DashboardMetrics = {
    totalCollections,
    totalExpenses,
    netCash: totalCollections - totalExpenses,
    pendingReceipts,
    totalMembers: totalMembersCount,
    activeBudgetUtilizationPercentage: totalCollections > 0 ? Math.round((totalExpenses / totalCollections) * 100) : 0,
    monthlyTrends,
    categoryBreakdown,
  };

  return { success: true, message: 'Dashboard metrics calculated.', data: metrics };
}
