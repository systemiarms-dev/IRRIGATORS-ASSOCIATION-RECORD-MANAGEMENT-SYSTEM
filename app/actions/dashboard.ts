'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, DashboardMetrics, AssociationMetricSummary } from '@/types';
import { requireUser, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';

/**
 * Compute real-time KPI metrics and analytics charts data directly from Supabase Cloud.
 * Supports consolidated multi-association view for Super Admin and association-scoped view for officers.
 */
export async function getDashboardMetricsAction(associationIdFilter?: string): Promise<ActionResponse<DashboardMetrics>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  // Determine effective association filter based on user role and input
  let effectiveAssocId = associationIdFilter;
  if (user.role !== 'super_admin') {
    effectiveAssocId = user.association_id || undefined;
  }

  try {
    const [allAssocs, txs, users, receipts] = await Promise.all([
      localDb.getAssociations(),
      localDb.getTransactions(effectiveAssocId),
      localDb.getUsers(effectiveAssocId),
      localDb.getReceipts(effectiveAssocId),
    ]);

    const pendingReceipts = receipts.filter((r) => r.status === 'pending').length;
    const totalMembersCount = users.length;

    let totalCollections = 0;
    let totalExpenses = 0;

    const monthlyMap: Record<string, { collections: number; expenses: number }> = {};
    const categoryMap: Record<string, { categoryName: string; categoryCode: string; amount: number; allocated: number; type: 'collection' | 'disbursement' }> = {};

    (txs || []).forEach((tx) => {
      const amt = Number(tx.amount);
      const date = new Date(tx.transaction_date);
      const monthKey = isNaN(date.getTime()) ? 'Jan' : date.toLocaleString('en-US', { month: 'short' });

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

    // Compute breakdown per association for Super Admin
    let associationSummaries: AssociationMetricSummary[] = [];
    if (user.role === 'super_admin' && (!effectiveAssocId || effectiveAssocId === 'all')) {
      const perAssocData = await Promise.all(
        allAssocs.map(async (assoc) => {
          const [assocTxs, assocUsers, assocReceipts] = await Promise.all([
            localDb.getTransactions(assoc.id),
            localDb.getUsers(assoc.id),
            localDb.getReceipts(assoc.id),
          ]);

          let c = 0;
          let e = 0;
          assocTxs.forEach((t) => {
            if (t.type === 'collection') c += Number(t.amount || 0);
            else e += Number(t.amount || 0);
          });

          return {
            associationId: assoc.id,
            associationName: assoc.name,
            code: assoc.code,
            totalCollections: c,
            totalExpenses: e,
            netCash: c - e,
            totalMembers: assocUsers.length,
            pendingReceipts: assocReceipts.filter((r) => r.status === 'pending').length,
          };
        })
      );
      associationSummaries = perAssocData;
    }

    const metrics: DashboardMetrics = {
      totalCollections,
      totalExpenses,
      netCash: totalCollections - totalExpenses,
      pendingReceipts,
      totalMembers: totalMembersCount,
      activeBudgetUtilizationPercentage: totalCollections > 0 ? Math.round((totalExpenses / totalCollections) * 100) : 0,
      associationSummaries,
      monthlyTrends,
      categoryBreakdown,
    };

    return { success: true, message: 'Dashboard metrics calculated.', data: metrics };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error calculating dashboard metrics from Supabase.' };
  }
}
