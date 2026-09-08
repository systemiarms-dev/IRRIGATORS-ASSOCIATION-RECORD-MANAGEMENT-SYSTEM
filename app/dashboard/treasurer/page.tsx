'use client';

import React, { useCallback, useState, useTransition } from 'react';
import { useLoadOnce } from '@/lib/hooks/useLoadOnce';
import { getTransactionsAction, getBudgetCategoriesAction, deleteTransactionAction } from '@/app/actions/transactions';
import { getProfilesAction, clearAllRecordsAction } from '@/app/actions/admin';
import { getAssociationsAction } from '@/app/actions/associations';
import { getSelfProfileAction } from '@/app/actions/auth';
import { Transaction, BudgetCategory, Profile, TransactionType, UserRole, Association } from '@/types';
import { formatPHP, formatDate } from '@/lib/utils/formatters';
import TransactionFormModal from '@/components/forms/TransactionFormModal';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import Link from 'next/link';
import { Wallet, PlusCircle, ArrowUpRight, ArrowDownLeft, FileCheck, RefreshCw, Loader2, Trash2, Printer, Download, Building2, Tag, Search, Eye, AlertTriangle, ExternalLink, BookOpen } from 'lucide-react';
import { exportToExcelCSV, buildExportFilename } from '@/lib/utils/export';

export default function TreasurerPage() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [categories, setCategories] = useState<BudgetCategory[]>([]);
  const [members, setMembers] = useState<Profile[]>([]);
  const [associations, setAssociations] = useState<Association[]>([]);
  const [selectedAssocId, setSelectedAssocId] = useState<string>('all');
  const [loading, setLoading] = useState(true);
  const [typeFilter, setTypeFilter] = useState<'all' | 'collection' | 'disbursement'>('all');
  const [showModal, setShowModal] = useState(false);
  const [showClearModal, setShowClearModal] = useState(false);
  const [deleteModalTx, setDeleteModalTx] = useState<Transaction | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [bannerMsg, setBannerMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isClearing, setIsClearing] = useState(false);
  const [userRole, setUserRole] = useState<UserRole>('treasurer');
  const [userAssocId, setUserAssocId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const [previewVoucherTx, setPreviewVoucherTx] = useState<Transaction | null>(null);
  const [voucherImageLoading, setVoucherImageLoading] = useState(true);
  const [voucherImageError, setVoucherImageError] = useState(false);

  const [, startTransition] = useTransition();

  React.useEffect(() => {
    if (previewVoucherTx) {
      setVoucherImageLoading(true);
      setVoucherImageError(false);
    }
  }, [previewVoucherTx]);

  const canWrite = userRole === 'super_admin' || userRole === 'admin' || userRole === 'bookkeeper';

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [txRes, catRes, memRes, assocRes, selfRes] = await Promise.all([
        getTransactionsAction(selectedAssocId, 'all'),
        getBudgetCategoriesAction(selectedAssocId),
        getProfilesAction('member', selectedAssocId),
        getAssociationsAction(),
        getSelfProfileAction(),
      ]);

      if (txRes.success && txRes.data) setTransactions(txRes.data);
      if (catRes.success && catRes.data) setCategories(catRes.data);
      if (memRes.success && memRes.data) setMembers(memRes.data);
      if (assocRes.success && assocRes.data) setAssociations(assocRes.data);
      if (selfRes.success && selfRes.data) {
        setUserRole(selfRes.data.role);
        if (selfRes.data.association_id) {
          setUserAssocId(selfRes.data.association_id);
        }
        if (selfRes.data.role !== 'super_admin' && selfRes.data.association_id) {
          setSelectedAssocId(selfRes.data.association_id);
        }
      }
    } catch (err) {
      console.error('Failed to load treasurer ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAssocId]);

  useLoadOnce(loadData);

  async function handleClearAllRecords() {
    setIsClearing(true);
    const res = await clearAllRecordsAction(selectedAssocId);
    setIsClearing(false);
    setShowClearModal(false);
    if (res.success) {
      setBannerMsg({ type: 'success', text: 'Financial records cleared successfully.' });
      loadData();
    } else {
      setBannerMsg({ type: 'error', text: res.message || 'Failed to clear records.' });
    }
  }

  function handleConfirmDeleteTransaction() {
    if (!deleteModalTx || isDeleting) return;
    setIsDeleting(true);
    setBannerMsg(null);
    startTransition(async () => {
      try {
        const res = await deleteTransactionAction(deleteModalTx.id);
        if (res.success) {
          setDeleteModalTx(null);
          setBannerMsg({ type: 'success', text: `Transaction ${deleteModalTx.transaction_number} deleted successfully.` });
          await loadData();
        } else {
          setBannerMsg({ type: 'error', text: res.message || 'Failed to delete the transaction.' });
        }
      } catch (err: any) {
        setBannerMsg({ type: 'error', text: err?.message || 'Unexpected error while deleting the transaction.' });
      } finally {
        setIsDeleting(false);
      }
    });
  }

  const totalCollections = transactions
    .filter((t) => t.type === 'collection')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const totalDisbursements = transactions
    .filter((t) => t.type === 'disbursement')
    .reduce((acc, curr) => acc + Number(curr.amount), 0);

  const visibleTransactions = transactions
    .filter((t) => typeFilter === 'all' || t.type === typeFilter)
    .filter((t) => {
      if (!searchQuery) return true;
      const q = searchQuery.toLowerCase();
      return (
        t.transaction_number?.toLowerCase().includes(q) ||
        t.voucher_number?.toLowerCase().includes(q) ||
        t.payee_name?.toLowerCase().includes(q) ||
        t.particulars?.toLowerCase().includes(q) ||
        t.notes?.toLowerCase().includes(q) ||
        t.category?.name?.toLowerCase().includes(q) ||
        t.member?.full_name?.toLowerCase().includes(q) ||
        t.members?.some((m) => m.full_name?.toLowerCase().includes(q))
      );
    })
    .filter((t) => {
      if (!dateFrom && !dateTo) return true;
      const txDate = t.transaction_date;
      if (dateFrom && txDate < dateFrom) return false;
      if (dateTo && txDate > dateTo) return false;
      return true;
    });

  function handleExportTransactionsExcel() {
    const scopeCode = selectedAssocId && selectedAssocId !== 'all'
      ? (associations.find((a) => a.id === selectedAssocId)?.code || selectedAssocId)
      : 'Consolidated';
    const filterLabel = typeFilter === 'all' ? 'All' : typeFilter.toUpperCase();
    exportToExcelCSV(
      buildExportFilename(`${scopeCode}_${filterLabel}_Collections_Disbursements_Ledger`),
      `Collection & Disbursement Financial Ledger (${scopeCode}) - ${filterLabel} (NIA Chart of Accounts)`,
      {
        'Scope': selectedAssocId === 'all' ? 'All Associations (Consolidated)' : selectedAssocId,
        'Filter Mode': typeFilter.toUpperCase(),
        'Total Collections': formatPHP(totalCollections),
        'Total Disbursements': formatPHP(totalDisbursements),
        'Net Cash Flow': formatPHP(totalCollections - totalDisbursements),
      },
      ['Tx Number', 'Voucher No', 'Association', 'Type', 'Category', 'Payee / Payer', 'Lateral / Section', 'Particulars', 'Amount (PHP)', 'Date', 'Receipt Status'],
      visibleTransactions.map((t) => [
        t.transaction_number,
        t.voucher_number || 'N/A',
        t.association?.code || 'IA',
        t.type.toUpperCase(),
        t.category?.name || t.category_id || 'General',
        t.payee_name || (t.members && t.members.length > 0 ? t.members.map((m) => m.full_name).join('; ') : t.member?.full_name || 'N/A'),
        t.lateral_section || 'N/A',
        t.particulars || t.notes || 'N/A',
        t.amount,
        formatDate(t.transaction_date),
        !t.receipt_id ? 'No Receipt' :
          t.receipt?.status === 'verified' ? 'Verified' :
          t.receipt?.status === 'flagged' ? 'Flagged' :
          t.receipt?.status === 'rejected' ? 'Rejected' :
          'Pending Review',
      ])
    );
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Association Selector Strip for Super Admin */}
      {userRole === 'super_admin' && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Scope Ledger by Association:</span>
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

      {/* Header Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <Wallet className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
              Double-Entry Financial Ledger &bull; NIA Chart of Accounts
            </div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              Collections &amp; Disbursements Ledger
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Log member ISF collections, operational vouchers, canal clearing, and lateral distribution shares.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {canWrite ? (
            <button
              onClick={() => setShowModal(true)}
              className="px-4 py-2.5 rounded-xl bg-emerald-800 hover:bg-emerald-900 text-white font-bold text-xs transition-all shadow-md flex items-center gap-2 active:scale-95"
            >
              <PlusCircle className="w-4 h-4" /> Log Payment / Voucher
            </button>
          ) : (
            <div className="px-3.5 py-2 rounded-xl bg-amber-50 text-amber-800 border border-amber-200 text-xs font-bold flex items-center gap-1.5 shadow-xs">
              <Eye className="w-4 h-4 text-amber-600" />
              <span>Read &amp; View Only ({userRole === 'auditor' ? 'Auditor' : userRole === 'treasurer' ? 'Treasurer' : 'View Only'})</span>
            </div>
          )}

          <Link
            href="/dashboard/chart-of-accounts"
            className="px-3.5 py-2.5 rounded-xl border border-slate-300 bg-white hover:bg-slate-50 text-slate-700 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-xs"
            title="Manage Chart of Accounts"
          >
            <BookOpen className="w-4 h-4 text-emerald-700" />
            <span>Chart of Accounts</span>
          </Link>

          <button
            onClick={handleExportTransactionsExcel}
            className="px-3 py-2.5 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-50 font-bold text-xs flex items-center gap-1.5 transition-colors"
            title="Export to Excel CSV"
          >
            <Download className="w-4 h-4" />
            <span className="hidden sm:inline">Export CSV</span>
          </button>
        </div>
      </div>

      {bannerMsg && (
        <div className={`p-4 rounded-xl text-xs font-bold border flex items-center gap-2 ${
          bannerMsg.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-800' : 'bg-rose-50 border-rose-200 text-rose-800'
        }`}>
          <span>{bannerMsg.text}</span>
        </div>
      )}

      {/* Summary Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Filtered Collections</div>
          <div className="text-xl font-black text-emerald-700">{formatPHP(totalCollections)}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Filtered Disbursements</div>
          <div className="text-xl font-black text-rose-700">{formatPHP(totalDisbursements)}</div>
        </div>

        <div className="p-4 rounded-2xl bg-white border border-slate-200 shadow-sm space-y-1">
          <div className="text-xs font-bold text-slate-500 uppercase">Net Ledger Balance</div>
          <div className={`text-xl font-black ${totalCollections - totalDisbursements >= 0 ? 'text-emerald-700' : 'text-rose-700'}`}>
            {formatPHP(totalCollections - totalDisbursements)}
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-200/80 border border-slate-300 overflow-x-auto">
          <button
            onClick={() => setTypeFilter('all')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              typeFilter === 'all' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            All Ledger Records ({transactions.length})
          </button>
          <button
            onClick={() => setTypeFilter('collection')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              typeFilter === 'collection' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Collections (Money IN) ({transactions.filter((t) => t.type === 'collection').length})
          </button>
          <button
            onClick={() => setTypeFilter('disbursement')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all whitespace-nowrap ${
              typeFilter === 'disbursement' ? 'bg-rose-700 text-white shadow-sm' : 'text-slate-600 hover:text-slate-900'
            }`}
          >
            Disbursements (Money OUT) ({transactions.filter((t) => t.type === 'disbursement').length})
          </button>
        </div>

        <button
          onClick={() => loadData()}
          disabled={loading}
          className="p-2 rounded-xl border border-slate-300 text-slate-600 hover:bg-white text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search & Date Filters */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
        <div className="flex-1 relative">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search by Tx #, Voucher #, Payee, Particulars..."
            className="w-full text-xs p-2.5 pl-9 border rounded-xl border-slate-300 bg-white"
          />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400" />
        </div>
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">From:</label>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              className="text-xs p-2 border rounded-xl border-slate-300 bg-white"
            />
          </div>
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-bold text-slate-500 whitespace-nowrap">To:</label>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              className="text-xs p-2 border rounded-xl border-slate-300 bg-white"
            />
          </div>
          {(searchQuery || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearchQuery(''); setDateFrom(''); setDateTo(''); }}
              className="px-2.5 py-2 rounded-xl text-xs font-bold text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-300"
            >
              Clear
            </button>
          )}
        </div>
      </div>

      {/* Ledger Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        {loading ? (
          <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-500">
            <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
            <span className="text-xs font-medium">Fetching transaction ledger...</span>
          </div>
        ) : visibleTransactions.length === 0 ? (
          <div className="p-12 text-center text-slate-500 space-y-2">
            <Wallet className="w-10 h-10 mx-auto text-slate-300" />
            <div className="text-sm font-bold">No transactions found.</div>
            <p className="text-xs text-slate-400">Click &ldquo;Log Payment / Voucher&rdquo; to add financial entries.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-slate-800">
              <thead>
                <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 uppercase text-[10px] font-bold tracking-wider">
                  <th className="py-3 px-4 text-left">Date</th>
                  <th className="py-3 px-3 text-left">Voucher #</th>
                  <th className="py-3 px-3 text-left">Association</th>
                  <th className="py-3 px-3 text-left">Category / Particulars</th>
                  <th className="py-3 px-3 text-left">Payee / Payer</th>
                  <th className="py-3 px-3 text-left">Lateral / TSAG</th>
                  <th className="py-3 px-3 text-right">Amount (PHP)</th>
                  <th className="py-3 px-3 text-center">Receipt Status</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium">
                {visibleTransactions.map((tx) => (
                  <tr key={tx.id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-3 px-4 font-mono text-slate-600 whitespace-nowrap">
                      {formatDate(tx.transaction_date)}
                    </td>

                    <td className="py-3 px-3 font-mono font-bold text-slate-800">
                      {tx.voucher_number ? (
                        <span className="px-1.5 py-0.5 rounded bg-slate-100 text-slate-800">
                          {tx.voucher_number}
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px]">{tx.transaction_number.slice(-8)}</span>
                      )}
                    </td>

                    <td className="py-3 px-3 font-bold text-slate-700 whitespace-nowrap">
                      <span className="px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-mono">
                        {tx.association?.code || 'IA'}
                      </span>
                    </td>

                    <td className="py-3 px-3 max-w-[220px]">
                      <div className="font-bold text-slate-900 truncate">
                        {tx.category?.name || 'Uncategorized'}
                      </div>
                      {(tx.particulars || tx.notes) && (
                        <div className="text-[11px] text-slate-500 truncate">
                          {tx.particulars || tx.notes}
                        </div>
                      )}
                    </td>

                    <td className="py-3 px-3 text-slate-700 max-w-[150px] truncate">
                      {tx.payee_name || (tx.members && tx.members.length > 0 ? tx.members.map((m) => m.full_name).join(', ') : tx.member?.full_name || 'N/A')}
                    </td>

                    <td className="py-3 px-3 text-slate-600 whitespace-nowrap">
                      {tx.lateral_section || '—'}
                    </td>

                    <td className={`py-3 px-3 text-right font-mono font-bold whitespace-nowrap ${
                      tx.type === 'collection' ? 'text-emerald-700' : 'text-rose-700'
                    }`}>
                      {tx.type === 'collection' ? '+' : '-'} {formatPHP(tx.amount)}
                    </td>

                    <td className="py-3 px-3 text-center whitespace-nowrap">
                      {!tx.receipt_id ? (
                        <span className="text-slate-400 text-[10px]">No Receipt</span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPreviewVoucherTx(tx)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[10px] font-bold transition-all hover:scale-105 active:scale-95 shadow-xs cursor-pointer focus:outline-none focus:ring-2 focus:ring-emerald-400"
                          title="Click to view receipt voucher"
                        >
                          {tx.receipt?.status === 'verified' ? (
                            <span className="inline-flex items-center gap-1 text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full">
                              <FileCheck className="w-3 h-3 text-emerald-600" /> Verified <Eye className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                            </span>
                          ) : tx.receipt?.status === 'flagged' ? (
                            <span className="inline-flex items-center gap-1 text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                              <FileCheck className="w-3 h-3 text-amber-600" /> Flagged <Eye className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                            </span>
                          ) : tx.receipt?.status === 'rejected' ? (
                            <span className="inline-flex items-center gap-1 text-rose-800 bg-rose-100 px-2 py-0.5 rounded-full">
                              <FileCheck className="w-3 h-3 text-rose-600" /> Rejected <Eye className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-slate-700 bg-slate-100 px-2 py-0.5 rounded-full">
                              <FileCheck className="w-3 h-3 text-slate-500" /> Review <Eye className="w-2.5 h-2.5 ml-0.5 opacity-70" />
                            </span>
                          )}
                        </button>
                      )}
                    </td>

                    <td className="py-3 px-4 text-right whitespace-nowrap">
                      {canWrite ? (
                        <button
                          onClick={() => setDeleteModalTx(tx)}
                          className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                          title="Delete Record"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      ) : (
                        <span className="text-[10px] font-bold text-slate-400 font-mono">View Only</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Transaction Modal */}
      {showModal && (
        <TransactionFormModal
          categories={categories}
          members={members}
          associations={associations}
          defaultAssociationId={userRole === 'super_admin' ? (selectedAssocId !== 'all' ? selectedAssocId : '') : (userAssocId || undefined)}
          isSuperAdmin={userRole === 'super_admin'}
          onClose={() => setShowModal(false)}
          onSuccess={() => {
            setBannerMsg({ type: 'success', text: 'Transaction logged to financial ledger.' });
            loadData();
          }}
        />
      )}

      {/* Delete Confirmation Modal */}
      {deleteModalTx && (
        <Dialog open={Boolean(deleteModalTx)} onOpenChange={() => setDeleteModalTx(null)}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl">
            <DialogHeader>
              <DialogTitle className="text-base font-black text-rose-800">
                Confirm Transaction Deletion
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-600 mt-2">
                Are you sure you want to delete transaction <strong>{deleteModalTx.transaction_number}</strong> for <strong>{formatPHP(deleteModalTx.amount)}</strong>?
              </DialogDescription>
            </DialogHeader>
            <div className="flex items-center justify-end gap-3 pt-4 border-t">
              <button
                type="button"
                onClick={() => setDeleteModalTx(null)}
                className="px-4 py-2 text-xs font-bold rounded-xl border border-slate-300 text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteTransaction}
                disabled={isDeleting}
                className="px-4 py-2 text-xs font-bold rounded-xl bg-rose-700 text-white hover:bg-rose-800 flex items-center gap-2 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {isDeleting ? <Loader2 className="w-4 h-4 animate-spin" /> : <Trash2 className="w-4 h-4" />}
                {isDeleting ? 'Deleting...' : 'Delete Transaction'}
              </button>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Voucher Preview Lightbox Modal */}
      {previewVoucherTx && previewVoucherTx.receipt && (
        <Dialog open={Boolean(previewVoucherTx)} onOpenChange={() => setPreviewVoucherTx(null)}>
          <DialogContent className="max-w-3xl p-4 bg-slate-950 text-white rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-800 pb-2">
              <div className="flex items-center justify-between gap-2">
                <div>
                  <DialogTitle className="text-sm font-bold text-white flex items-center gap-2">
                    <FileCheck className="w-4 h-4 text-emerald-400" />
                    Voucher: {previewVoucherTx.receipt.file_name}
                  </DialogTitle>
                  <DialogDescription className="text-[11px] text-slate-400 mt-0.5">
                    Transaction {previewVoucherTx.transaction_number} &bull; {formatPHP(previewVoucherTx.amount)} &bull; {formatDate(previewVoucherTx.transaction_date)}
                  </DialogDescription>
                </div>
                <button
                  onClick={() => setPreviewVoucherTx(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors"
                >
                  &larr; Close
                </button>
              </div>
            </DialogHeader>

            <div className="flex flex-col items-center justify-center p-4 min-h-[350px] relative">
              {/* Image Loading State */}
              {voucherImageLoading && !voucherImageError && (
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-slate-950/90 z-10 rounded-xl">
                  <Loader2 className="w-10 h-10 animate-spin text-emerald-500" />
                  <div className="text-center space-y-1">
                    <p className="text-xs font-bold text-slate-200">Loading voucher image...</p>
                    <p className="text-[10px] text-slate-400">Fetching high-resolution file from storage</p>
                  </div>
                </div>
              )}

              {/* Image Error State */}
              {voucherImageError && (
                <div className="flex flex-col items-center justify-center p-8 gap-3 text-center z-20">
                  <div className="p-3 rounded-full bg-rose-950/80 text-rose-400 border border-rose-800/60">
                    <AlertTriangle className="w-8 h-8" />
                  </div>
                  <div className="space-y-1">
                    <p className="text-xs font-bold text-rose-300">Unable to display voucher image</p>
                    <p className="text-[10px] text-slate-400 max-w-sm">
                      The file could not be rendered in preview mode. You can try opening it directly in a new browser tab.
                    </p>
                  </div>
                  <a
                    href={previewVoucherTx.receipt.file_path}
                    target="_blank"
                    rel="noreferrer"
                    className="mt-2 px-3.5 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-bold text-emerald-400 border border-slate-700 flex items-center gap-1.5 transition-colors"
                  >
                    <ExternalLink className="w-3.5 h-3.5" /> Open File Link Directly
                  </a>
                </div>
              )}

              {/* Media Display */}
              {!voucherImageError && (
                previewVoucherTx.receipt.content_type?.includes('pdf') || previewVoucherTx.receipt.file_name?.endsWith('.pdf') ? (
                  <iframe
                    src={previewVoucherTx.receipt.file_path}
                    className={`w-full h-[65vh] rounded-xl border border-slate-800 transition-opacity duration-300 ${
                      voucherImageLoading ? 'opacity-0' : 'opacity-100'
                    }`}
                    title="PDF Voucher Preview"
                    onLoad={() => setVoucherImageLoading(false)}
                    onError={() => {
                      setVoucherImageLoading(false);
                      setVoucherImageError(true);
                    }}
                  />
                ) : (
                  /* eslint-disable-next-line @next/next/no-img-element */
                  <img
                    src={previewVoucherTx.receipt.file_path}
                    alt={previewVoucherTx.receipt.file_name}
                    onLoad={() => setVoucherImageLoading(false)}
                    onError={() => {
                      setVoucherImageLoading(false);
                      setVoucherImageError(true);
                    }}
                    className={`max-h-[70vh] object-contain rounded-xl shadow-2xl transition-opacity duration-300 ${
                      voucherImageLoading ? 'opacity-0 hidden' : 'opacity-100 block'
                    }`}
                  />
                )
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
