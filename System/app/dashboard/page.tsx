'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { getDashboardMetricsAction } from '@/app/actions/dashboard';
import { getSelfProfileAction } from '@/app/actions/auth';
import { UserRole, DashboardMetrics } from '@/types';
import { formatPHP } from '@/lib/utils/formatters';
import FinancialTrendsChart from '@/components/charts/FinancialTrendsChart';
import ExpenseBreakdownChart from '@/components/charts/ExpenseBreakdownChart';
import { Wallet, TrendingUp, TrendingDown, Users, FileText, ArrowRight, Loader2, Landmark, CheckCircle2, BarChart3, PieChart, Coins, ShieldCheck, FileSpreadsheet } from 'lucide-react';

export default function DashboardOverviewPage() {
  const [metrics, setMetrics] = useState<DashboardMetrics | null>(null);
  const [userRole, setUserRole] = useState<UserRole>('admin');
  const [loading, setLoading] = useState(true);

  async function loadMetrics() {
    setLoading(true);
    const [metricsRes, profileRes] = await Promise.all([
      getDashboardMetricsAction(),
      getSelfProfileAction(),
    ]);
    setLoading(false);

    if (profileRes.success && profileRes.data) {
      setUserRole(profileRes.data.role);
    }

    if (metricsRes.success && metricsRes.data) {
      setMetrics(metricsRes.data);
    }
  }

  useEffect(() => {
    loadMetrics();
  }, []);

  if (loading) {
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center text-slate-500">
        <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
        <span className="text-sm font-medium">Loading Executive Analytics Dashboard...</span>
      </div>
    );
  }

  const collections = metrics?.totalCollections || 0;
  const expenses = metrics?.totalExpenses || 0;
  const netCash = metrics?.netCash || 0;



  return (
    <div className="space-y-6">
      {/* Executive Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl bg-white border border-slate-200 shadow-sm flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-emerald-50/80 border border-emerald-200 p-1 flex items-center justify-center shrink-0 shadow-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src="/api/logo?v=latest" alt="NLFIA Logo" className="w-full h-full object-contain filter drop-shadow-xs" />
          </div>
          <div className="space-y-1 min-w-0">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[10px] sm:text-[11px] font-extrabold border border-emerald-200">
              Executive Financial & Operations Dashboard
            </div>
            <h1 className="text-base sm:text-xl font-black tracking-tight text-slate-900 leading-tight">
              NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.
            </h1>
            <p className="text-[11px] sm:text-xs text-slate-500 font-medium">
              Official Irrigation Record & Financial Management System (IARMS) — Ipil, Gonzaga, Cagayan.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3 shrink-0 self-start sm:self-auto w-full sm:w-auto">
          {(userRole === 'admin' || userRole === 'treasurer') && (
            <Link
              href="/dashboard/treasurer"
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <Wallet className="w-4 h-4 text-emerald-400" /> Log Payment / Voucher
            </Link>
          )}
          {userRole === 'auditor' && (
            <Link
              href="/dashboard/auditor"
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-indigo-900 hover:bg-indigo-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <ShieldCheck className="w-4 h-4 text-emerald-400" /> Open Auditor Queue
            </Link>
          )}
          {userRole === 'member' && (
            <Link
              href="/dashboard/statements"
              className="w-full sm:w-auto justify-center px-4 py-2.5 rounded-xl bg-teal-900 hover:bg-teal-800 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <FileSpreadsheet className="w-4 h-4 text-teal-400" /> View Statements
            </Link>
          )}
        </div>
      </div>

      {/* KPI Cards Grid - Crisp Light Theme */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Collections */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Total ISF Collections</span>
            <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-transform group-hover:scale-110">
              <TrendingUp className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight break-words">{formatPHP(collections)}</div>
          <div className="text-[11px] text-emerald-700 font-semibold flex items-center gap-1">
            <CheckCircle2 className="w-3.5 h-3.5" /> Member dues & O&M subsidies
          </div>
        </div>

        {/* Total Expenses */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Operational Expenses</span>
            <div className="w-9 h-9 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 flex items-center justify-center transition-transform group-hover:scale-110">
              <TrendingDown className="w-5 h-5" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 tracking-tight break-words">{formatPHP(expenses)}</div>
          <div className="text-[11px] text-rose-700 font-semibold flex items-center gap-1">
            Canal repair, tax & lateral distribution
          </div>
        </div>

        {/* Net Cash Surplus */}
        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5 group">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Ending Cash Balance</span>
            <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center transition-transform group-hover:scale-110">
              <Wallet className="w-5 h-5" />
            </div>
          </div>
          <div className={`text-2xl font-black tracking-tight break-words ${netCash >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatPHP(netCash)}
          </div>
          <div className="text-[11px] text-slate-500 font-medium">FS1 - FS4 verified liquidity</div>
        </div>

        {/* Role-Specific Action / Status Card */}
        {userRole === 'admin' && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Registered Users</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-transform group-hover:scale-110">
                <Users className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-emerald-700 tracking-tight break-words">
              {metrics?.totalMembers || 0} Accounts / {metrics?.pendingReceipts || 0} Receipts
            </div>
            <Link
              href="/dashboard/admin"
              className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-bold"
            >
              Manage user accounts <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}

        {userRole === 'auditor' && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Auditor Audit Queue</span>
              <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200 flex items-center justify-center transition-transform group-hover:scale-110">
                <ShieldCheck className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-indigo-700 tracking-tight break-words">
              {metrics?.pendingReceipts || 0} Receipts Pending Audit
            </div>
            <Link
              href="/dashboard/auditor"
              className="text-[11px] text-indigo-700 hover:underline flex items-center gap-1 font-bold"
            >
              Verify voucher queue <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}

        {userRole === 'treasurer' && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Treasury Ledger</span>
              <div className="w-9 h-9 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center justify-center transition-transform group-hover:scale-110">
                <Coins className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-slate-900 tracking-tight break-words">
              {metrics?.monthlyTrends?.length || 0} Active Months Logged
            </div>
            <Link
              href="/dashboard/treasurer"
              className="text-[11px] text-emerald-700 hover:underline flex items-center gap-1 font-bold"
            >
              Open financial ledger <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}

        {userRole === 'member' && (
          <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm space-y-3 transition-all hover:shadow-md hover:-translate-y-0.5 group">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-500">Official Statements Access</span>
              <div className="w-9 h-9 rounded-xl bg-teal-50 text-teal-700 border border-teal-200 flex items-center justify-center transition-transform group-hover:scale-110">
                <FileSpreadsheet className="w-5 h-5" />
              </div>
            </div>
            <div className="text-2xl font-black text-teal-700 tracking-tight break-words">
              FS1 - FS4 Statements Ready
            </div>
            <Link
              href="/dashboard/statements"
              className="text-[11px] text-teal-700 hover:underline flex items-center gap-1 font-bold"
            >
              View verified reports <ArrowRight className="w-3 h-3 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        )}
      </div>

      {/* Interactive Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Monthly Trends Area Chart */}
        <div className="lg:col-span-7 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-700 flex items-center justify-center shrink-0">
                <BarChart3 className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Monthly Cash Collection & Disbursement Trends</h3>
                <p className="text-xs text-slate-500 font-medium">Historical cash flow comparison</p>
              </div>
            </div>
          </div>
          <FinancialTrendsChart data={metrics?.monthlyTrends || []} />
        </div>

        {/* Category Expenditure Pie Chart */}
        <div className="lg:col-span-5 bg-white border border-slate-200/90 rounded-2xl p-5 space-y-4 shadow-sm">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-teal-50 border border-teal-200 text-teal-700 flex items-center justify-center shrink-0">
              <PieChart className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-900">Budget Expenditure Breakdown</h3>
              <p className="text-xs text-slate-500 font-medium">Category distribution of association funds</p>
            </div>
          </div>
          <ExpenseBreakdownChart data={metrics?.categoryBreakdown || []} />
        </div>
      </div>

    </div>
  );
}
