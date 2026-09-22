'use client';

import React, { useCallback, useEffect, useState, useTransition } from 'react';
import { getTransactionsAction, getBudgetCategoriesAction, deleteTransactionAction } from '@/app/actions/transactions';
import { getProfilesAction, clearAllRecordsAction } from '@/app/actions/admin';
import { getSelfProfileAction } from '@/app/actions/auth';
import { Transaction, BudgetCategory, Profile, TransactionType, UserRole } from '@/types';
import { formatPHP, formatDate } from '@/lib/utils/formatters';
import TransactionFormModal from '@/components/forms/TransactionFormModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Alert } from '@/components/ui/alert';
import { Wallet, PlusCircle, ArrowUpRight, ArrowDownLeft, FileCheck, RefreshCw, Loader2, Trash2, Printer, Download } from 'lucide-react';
import { exportToExcelCSV, exportToPDFPrint } from '@/lib/utils/export';

export default function TreasurerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'collection' | 'disbursement'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [deleteModalTx, setDeleteModalTx] = useState<Transaction | null>(null);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('admin');

  const [isPending, startTransition] = useTransition();

  async function handleClearAllRecords() {
    setIsClearing(true);
    const res = await clearAllRecordsAction();
    setIsClearing(false);
    setShowClearModal(false);
    if (res.success) {
      setBannerMsg({ type: 'success', text: 'All transactions, receipts, and financial statements have been deleted successfully.' });
      loadData();
    } else {
      setBannerMsg({ type: 'error', text: res.message || 'Failed to clear records.' });
    }
  }

  const loadData = useCallback(async () => {
    setLoading(true);
    const [txRes, catRes, memRes, selfRes] = await Promise.all([
      getTransactionsAction(typeFilter),
      getBudgetCategoriesAction(),
      getProfilesAction('member'),
      getSelfProfileAction(),
    ]);

    setLoading(false);
    if (txRes.success && txRes.data) setTransactions(txRes.data);
    if (catRes.success && catRes.data) setCategories(catRes.data);
    if (memRes.success && memRes.data) setMembers(memRes.data);
    if (selfRes.success && selfRes.data) setUserRole(selfRes.data.role);
  }, [typeFilter]);

  function handleConfirmDeleteTransaction() {
    if (!deleteModalTx) return;
    startTransition(async () => {
      await deleteTransactionAction(deleteModalTx.id);
      setDeleteModalTx(null);
      setBannerMsg({ type: 'success', text: `Transaction record ${deleteModalTx.transaction_number} deleted successfully.` });
      await loadData();
    });
  }

  useEffect(() => {
    loadData();
  }, [loadData]);

  const totalCollections = transactions
    .filter((t) => t.type === 'collection')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalDisbursements = transactions
    .filter((t) => t.type === 'disbursement')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  function handleExportTransactionsExcel() {
    exportToExcelCSV(
      'Treasurer_Financial_Ledger',
      'Collection & Disbursement Financial Ledger',
      {
        'Filter Mode': typeFilter.toUpperCase(),
        'Total Collections': formatPHP(totalCollections),
        'Total Disbursements': formatPHP(totalDisbursements),
        'Net Cash Flow': formatPHP(totalCollections - totalDisbursements),
      },
      ['Tx Number', 'Type', 'Category', 'Payer / Notes', 'Amount (PHP)', 'Transaction Date', 'Voucher Status'],
      transactions.map((t) => [
        t.transaction_number,
        t.type.toUpperCase(),
        t.category?.name || t.category_id || 'General',
        t.members && t.members.length > 0 ? t.members.map((m) => m.full_name).join('; ') : t.member?.full_name || t.notes || 'N/A',
        t.amount,
        formatDate(t.transaction_date),
        t.receipt_id ? 'Voucher Uploaded' : 'Pending Voucher',
      ])
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {bannerMsg && (
        <Alert variant={bannerMsg.type === 'error' ? 'destructive' : 'default'} className="mb-4">
          <div className="flex items-center justify-between w-full">
            <span>{bannerMsg.text}</span>
            <button onClick={() => setBannerMsg(null)} className="text-xs font-bold underline ml-4">Dismiss</button>
          </div>
        </Alert>
      )}

      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-6 rounded-2xl border border-slate-200 shadow-sm print:hidden">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
              Collection & Disbursement Management
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Log ISF member fee payments, operational disbursements, and receipt vouchers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 self-start sm:self-auto">
          <button
            onClick={() => exportToPDFPrint()}
            className="px-3.5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-xs active:scale-95 whitespace-nowrap"
            title="Print / Export PDF"
          >
            <Printer className="w-4 h-4" /> Print PDF
          </button>

          <button
            onClick={handleExportTransactionsExcel}
            className="px-3.5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
            title="Export to Excel CSV"
          >
            <Download className="w-4 h-4" /> Export Excel
          </button>

          <button
            onClick={loadData}
            disabled={loading}
            className="p-2.5 rounded-xl bg-white border border-slate-300 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all shadow-xs active:scale-95"
            title="Refresh Financial Records"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {userRole === 'admin' && (
            <button
              onClick={() => setShowClearModal(true)}
              className="px-3.5 py-2.5 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 text-xs font-black transition-all flex items-center gap-1.5 active:scale-95 whitespace-nowrap"
              title="Delete all financial transaction, receipt, and statement records"
            >
              <Trash2 className="w-4 h-4 text-rose-600" /> Delete All Records
            </button>
          )}

          <button
            onClick={() => setShowModal(true)}
            className="px-4 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-md shadow-emerald-600/20 transition-all flex items-center gap-2 active:scale-95 whitespace-nowrap"
          >
            <PlusCircle className="w-4 h-4" /> Log Transaction
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="p-5 rounded-2xl bg-emerald-50/80 border border-emerald-200/90 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-emerald-900 font-black uppercase tracking-wider">Total Collections (ISF & Dues)</div>
            <div className="text-2xl sm:text-3xl font-black text-emerald-900 mt-1 break-words">{formatPHP(totalCollections)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-100/80 text-emerald-700 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-rose-50/80 border border-rose-200/90 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-rose-900 font-black uppercase tracking-wider">Total Operational Expenses</div>
            <div className="text-2xl sm:text-3xl font-black text-rose-900 mt-1 break-words">{formatPHP(totalDisbursements)}</div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-rose-100/80 text-rose-700 flex items-center justify-center shrink-0">
            <ArrowDownLeft className="w-6 h-6" />
          </div>
        </div>

        <div className="p-5 rounded-2xl bg-white border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="text-[11px] text-slate-500 font-black uppercase tracking-wider">Net Cash Flow</div>
            <div className={`text-2xl sm:text-3xl font-black mt-1 break-words ${totalCollections - totalDisbursements >= 0 ? 'text-emerald-800' : 'text-rose-800'}`}>
              {formatPHP(totalCollections - totalDisbursements)}
            </div>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
            <Wallet className="w-6 h-6" />
          </div>
        </div>
      </div>

      {/* Transactions Table & Category Breakdown */}
      <div className="bg-white border border-slate-200/90 rounded-2xl overflow-hidden shadow-sm">
        <div className="p-3 sm:p-4 border-b border-slate-200/90 bg-slate-50/60">
          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={() => setTypeFilter('all')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                typeFilter === 'all' ? 'bg-slate-900 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              All Records ({transactions.length})
            </button>
            <button
              onClick={() => setTypeFilter('collection')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                typeFilter === 'collection' ? 'bg-emerald-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Collections Only
            </button>
            <button
              onClick={() => setTypeFilter('disbursement')}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-extrabold transition-all ${
                typeFilter === 'disbursement' ? 'bg-rose-700 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
              }`}
            >
              Disbursements Only
            </button>
          </div>
        </div>

        <div className="overflow-x-auto max-h-[500px] overflow-y-auto print:max-h-none print:overflow-visible print:overflow-x-visible">
          <table className="w-full text-left text-sm text-slate-700">
            <thead className="bg-slate-900 text-white text-xs font-bold uppercase tracking-wider border-b border-slate-800 sticky top-0 z-10 print:static">
              <tr>
                <th className="px-6 py-4">Tx Code / Date</th>
                <th className="px-6 py-4">Type</th>
                <th className="px-6 py-4">Category</th>
                <th className="px-6 py-4">Payer / Details</th>
                <th className="px-6 py-4">Amount (PHP)</th>
                <th className="px-6 py-4">Receipt Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    <Loader2 className="w-6 h-6 animate-spin mx-auto mb-2 text-emerald-600" />
                    Loading financial records...
                  </td>
                </tr>
              ) : transactions.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-slate-400">
                    No transactions recorded matching the selected filter.
                  </td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="px-6 py-4">
                      <div className="font-mono text-xs font-bold text-emerald-800">{tx.transaction_number}</div>
                      <div className="text-xs text-slate-500 font-medium">{formatDate(tx.transaction_date)}</div>
                    </td>
                    <td className="px-6 py-4">
                      <span
                        className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider shadow-2xs ${
                          tx.type === 'collection'
                            ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                            : 'bg-rose-50 text-rose-800 border border-rose-200'
                        }`}
                      >
                        {tx.type}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      <div className="font-bold text-slate-900">{tx.category?.name || 'General Category'}</div>
                      <div className="text-slate-400 font-mono text-[11px]">{tx.category?.code}</div>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {tx.members && tx.members.length > 0 ? (
                        <div className="flex flex-wrap gap-1 max-w-xs">
                          {tx.members.map((m) => (
                            <span key={m.id} className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-900 border border-emerald-200 font-bold text-[11px]">
                              {m.full_name}
                            </span>
                          ))}
                        </div>
                      ) : tx.member ? (
                        <div className="font-bold text-slate-900">{tx.member.full_name}</div>
                      ) : (
                        <div className="text-slate-500 font-medium">Walk-in / Operational</div>
                      )}
                      {tx.reference_number && (
                        <div className="text-[11px] text-slate-400 font-mono">Ref: {tx.reference_number}</div>
                      )}
                    </td>
                    <td className="px-6 py-4 font-mono font-bold text-sm">
                      <span className={tx.type === 'collection' ? 'text-emerald-800' : 'text-rose-700'}>
                        {tx.type === 'collection' ? '+' : '-'} {formatPHP(Number(tx.amount))}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-xs">
                      {tx.receipt ? (
                        <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 text-xs font-bold">
                          <FileCheck className="w-3.5 h-3.5" /> Attached ({tx.receipt.status})
                        </span>
                      ) : (
                        <span className="text-slate-400 font-medium">No voucher file</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        onClick={() => setDeleteModalTx(tx)}
                        title="Delete Record"
                        className="p-2 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-xl transition-all"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <TransactionFormModal
          categories={categories}
          members={members}
          onSuccess={loadData}
          onClose={() => setShowModal(false)}
        />
      )}

      {/* Clear All Records Modal */}
      <Dialog open={showClearModal} onOpenChange={setShowClearModal}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Delete All Financial Records?</DialogTitle>
                <DialogDescription>Purge all transactions, receipts, and FS reports</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <Alert variant="destructive">
            Warning: This action will permanently delete all collections, disbursements, uploaded receipts, and generated financial statements from the database. Registered user accounts will not be deleted.
          </Alert>

          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setShowClearModal(false)}
              className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleClearAllRecords}
              disabled={isClearing}
              className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2"
            >
              {isClearing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
              Yes, Delete All Records
            </button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Delete Transaction Record Modal */}
      <Dialog open={!!deleteModalTx} onOpenChange={(open) => !open && setDeleteModalTx(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2.5">
              <div className="p-2 rounded-xl bg-rose-100 text-rose-800 border border-rose-200">
                <Trash2 className="w-5 h-5" />
              </div>
              <div>
                <DialogTitle>Delete Financial Record?</DialogTitle>
                <DialogDescription>Permanently remove transaction from ledger</DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {deleteModalTx && (
            <div className="space-y-3">
              <Alert variant="destructive">
                Are you sure you want to delete transaction <strong>{deleteModalTx.transaction_number}</strong> ({formatPHP(deleteModalTx.amount)})? Associated receipt vouchers will also be deleted.
              </Alert>

              <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setDeleteModalTx(null)}
                  className="px-4 py-2 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={handleConfirmDeleteTransaction}
                  disabled={isPending}
                  className="px-5 py-2 rounded-xl bg-rose-600 hover:bg-rose-700 text-white text-xs font-extrabold transition-all shadow-md active:scale-95 flex items-center gap-2"
                >
                  {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                  Yes, Delete Record
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
