'use client';

import React, { useState, useCallback } from 'react';
import { useLoadOnce } from '@/lib/hooks/useLoadOnce';
import Link from 'next/link';
import { getDashboardMetricsAction } from '@/app/actions/dashboard';
import { getAssociationsAction } from '@/app/actions/associations';
import { getSelfProfileAction } from '@/app/actions/auth';
import { UserRole, DashboardMetrics, Association } from '@/types';
import { formatPHP } from '@/lib/utils/formatters';
import FinancialTrendsChart from '@/components/charts/FinancialTrendsChart';
import ExpenseBreakdownChart from '@/components/charts/ExpenseBreakdownChart';
import { 
  Wallet, TrendingUp, TrendingDown, FileText, ArrowRight, 
  Loader2, Landmark, CheckCircle2, BarChart3, PieChart, Coins, 
  ShieldCheck, FileSpreadsheet, Building2, Layers, Filter, Receipt 
} from 'lucide-react';

export default function DashboardOverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssocId, setSelectedAssocId] = useState<string>('all');
  const [userRole, setUserRole] = useState<UserRole>('super_admin');
  const [userAssocName, setUserAssocName] = useState<string>('');
  const [loading, setLoading] = useState(true);

  const loadData = useCallback(async (assocId: string) => {
    setLoading(true);
    try {
      const [metricsRes, assocRes, profileRes] = await Promise.all([
        getDashboardMetricsAction(assocId),
        getAssociationsAction(),
        getSelfProfileAction(),
      ]);

      if (profileRes.success && profileRes.data) {
        setUserRole(profileRes.data.role);
        if (profileRes.data.association) {
          setUserAssocName(profileRes.data.association.name);
        }
        if (profileRes.data.role !== 'super_admin' && profileRes.data.association_id) {
          setSelectedAssocId(profileRes.data.association_id);
        }
      }

      if (assocRes.success && assocRes.data) {
        setAssociations(assocRes.data);
      }

      if (metricsRes.success && metricsRes.data) {
        setMetrics(metricsRes.data);
      }
    } catch (err) {
      console.error('Failed to load dashboard metrics:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCurrent = useCallback(() => {
    loadData(selectedAssocId);
  }, [loadData, selectedAssocId]);

  useLoadOnce(loadCurrent);

  const collections = metrics?.totalCollections || 0;
  const expenses = metrics?.totalExpenses || 0;
  const netCash = metrics?.netCash || 0;

  // Selected association metadata
  const currentAssoc = associations.find((a) => a.id === selectedAssocId);
  const activeTitle = selectedAssocId === 'all'
    ? (userRole === 'super_admin' ? 'IRRIGATORS ASSOCIATION RECORD MANAGEMENT SYSTEM' : (userAssocName || 'NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.'))
    : (currentAssoc?.name || 'IRRIGATORS ASSOCIATION');

  return (
    <div className="space-y-6">
      {/* Association Selector Strip for Super Admin */}
      {userRole === 'super_admin' && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Filter Dashboard by Association:</span>
          </div>

          <div className="flex flex-wrap items-center gap-1.5">
            <button
              onClick={() => setSelectedAssocId('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                selectedAssocId === 'all'
                  ? 'bg-emerald-800 text-white shadow-sm'
                  : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
              }`}
            >
              All Associations (Consolidated)
            </button>
            {associations.map((assoc) => (
              <button
                key={assoc.id}
                onClick={() => setSelectedAssocId(assoc.id)}
                className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all ${
                  selectedAssocId === assoc.id
                    ? 'bg-emerald-800 text-white shadow-sm'
                    : 'bg-slate-100 text-slate-700 hover:bg-slate-200'
                }`}
              >
                {assoc.code} &bull; {assoc.name.split(' ')[0]}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Executive Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex items-center justify-center shrink-0 shadow-xs text-emerald-800">
            <BarChart3 className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] sm:text-[11px] font-extrabold border border-emerald-200">
              Executive Financial &amp; Operations Dashboard
            </div>
            <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 leading-tight">
              {activeTitle}
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              National Irrigation Administration (NIA) Region 02 &bull; Gonzaga, Cagayan
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto w-full sm:w-auto">
          {(userRole === 'super_admin' || userRole === 'admin' || userRole === 'treasurer') && (
            <Link
              href="/dashboard/treasurer"
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Wallet className="w-4 h-4 text-emerald-400" /> Log Payment / Voucher
            </Link>
          )}
          {(userRole === 'super_admin' || userRole === 'auditor') && (
            <Link
              href="/dashboard/auditor"
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Open Auditor Queue
            </Link>
          )}
        </div>
      </div>

      {loading ? (
        <div className="min-h-[400px] flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          <span className="text-sm font-medium">Loading Executive Analytics Dashboard...</span>
        </div>
      ) : (
        <>
          {/* Key KPI Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Collections</span>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <TrendingUp className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{formatPHP(collections)}</div>
              <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
                <span>Member ISF &amp; Subsidies Inflow</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Total Disbursements</span>
                <div className="p-2 rounded-xl bg-rose-50 text-rose-700">
                  <TrendingDown className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{formatPHP(expenses)}</div>
              <div className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
                <span>Canal Clearing &amp; Operations</span>
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Ending Net Cash</span>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <Wallet className="w-4 h-4" />
                </div>
              </div>
              <div className={`text-2xl font-black ${netCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
                {formatPHP(netCash)}
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                {netCash >= 0 ? 'Surplus Balance' : 'Deficit Balance'}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-2">
              <div className="flex items-center justify-between text-slate-500">
                <span className="text-xs font-bold uppercase tracking-wider">Pending Vouchers</span>
                <div className="p-2 rounded-xl bg-amber-100 text-amber-700">
                  <Receipt className="w-4 h-4" />
                </div>
              </div>
              <div className="text-2xl font-black text-slate-900">{metrics?.pendingReceipts || 0}</div>
              <div className="text-[11px] text-slate-500 font-medium">
                Vouchers pending audit
              </div>
            </div>
          </div>

          {/* Association Breakdown Table (For Super Admin Consolidated View) */}
          {userRole === 'super_admin' && selectedAssocId === 'all' && metrics?.associationSummaries && metrics.associationSummaries.length > 0 && (
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div className="min-w-0">
                  <h3 className="text-sm font-black text-slate-900">
                    IARMS &bull; Association Financial Summary
                  </h3>
                  <p className="text-xs text-slate-500">Live breakdown by individual irrigators association</p>
                </div>
                <Link
                  href="/dashboard/associations"
                  className="self-start sm:self-auto text-xs font-bold text-emerald-700 hover:text-emerald-800 flex items-center gap-1 shrink-0"
                >
                  <span>Manage IAs</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>

              <div className="-mx-5 px-5 overflow-x-auto">
                <table className="w-full min-w-[640px] text-xs text-slate-800">
                  <thead>
                    <tr className="border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold">
                      <th className="py-2.5 text-left whitespace-nowrap">Association</th>
                      <th className="py-2.5 text-right whitespace-nowrap">Collections</th>
                      <th className="py-2.5 text-right whitespace-nowrap">Disbursements</th>
                      <th className="py-2.5 text-right whitespace-nowrap">Net Cash Flow</th>
                      <th className="py-2.5 text-right whitespace-nowrap">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {metrics.associationSummaries.map((summary) => (
                      <tr key={summary.associationId} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 font-bold text-slate-900 min-w-[180px]">
                          <span className="inline-block px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono mr-2">
                            {summary.code}
                          </span>
                          {summary.associationName}
                        </td>
                        <td className="py-3 text-right font-mono text-emerald-700 font-bold whitespace-nowrap">
                          {formatPHP(summary.totalCollections)}
                        </td>
                        <td className="py-3 text-right font-mono text-rose-700 font-bold whitespace-nowrap">
                          {formatPHP(summary.totalExpenses)}
                        </td>
                        <td className="py-3 text-right font-mono font-black whitespace-nowrap">
                          {formatPHP(summary.netCash)}
                        </td>
                        <td className="py-3 text-right whitespace-nowrap">
                          <button
                            onClick={() => setSelectedAssocId(summary.associationId)}
                            className="px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold text-[11px]"
                          >
                            Filter View
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Highcharts Visual Analytics Section */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Monthly Cash Inflow vs. Outflow</h3>
                  <p className="text-xs text-slate-500">12-Month Comparative Trends</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-50 text-emerald-700">
                  <BarChart3 className="w-4 h-4" />
                </div>
              </div>
              <FinancialTrendsChart data={metrics?.monthlyTrends || []} />
            </div>

            <div className="p-5 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-3">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-sm font-black text-slate-900">Expense Breakdown by NIA Category</h3>
                  <p className="text-xs text-slate-500">Operational Allocation &amp; Utilization</p>
                </div>
                <div className="p-2 rounded-xl bg-emerald-100 text-emerald-800">
                  <PieChart className="w-4 h-4" />
                </div>
              </div>
              <ExpenseBreakdownChart data={metrics?.categoryBreakdown || []} />
            </div>
          </div>
        </>
      )}
    </div>
  );
}
