'use client';

import React, { useState, useTransition, useCallback, useEffect } from 'react';
import { useLoadOnce } from '@/lib/hooks/useLoadOnce';
import { getReceiptQueueAction, auditVerifyReceiptAction, auditVerifyAllPendingAction } from '@/app/actions/audit';
import { getAssociationsAction } from '@/app/actions/associations';
import { getSelfProfileAction } from '@/app/actions/auth';
import { Receipt, VerificationStatus, Profile, Association, UserRole } from '@/types';
import { getStatusBadgeProps, formatDate, formatBytes, formatPHP, getReceiptImageUrl } from '@/lib/utils/formatters';
import { 
  ShieldCheck, CheckCircle2, AlertTriangle, XCircle, FileText, 
  RefreshCw, Loader2, MessageSquare, Eye, ExternalLink, Tag, CreditCard, 
  User, Calendar, CornerDownRight, Hash, Building2 
} from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function AuditorPage() {
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('pending');
  const [selectedAssocId, setSelectedAssocId] = useState<string>('all');
  const [associations, setAssociations] = useState<Association[]>([]);
  const [userRole, setUserRole] = useState<UserRole>('auditor');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [previewImageReceipt, setPreviewImageReceipt] = useState<Receipt | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [isPending, startTransition] = useTransition();
  const [pendingStatus, setPendingStatus] = useState<VerificationStatus | null>(null);
  const [confirmAll, setConfirmAll] = useState(false);
  const [verifyingAll, setVerifyingAll] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  // Auto-dismiss the action feedback banner
  useEffect(() => {
    if (!actionMsg) return;
    const timer = setTimeout(() => setActionMsg(null), 6000);
    return () => clearTimeout(timer);
  }, [actionMsg]);

  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);

  const loadData = useCallback(async () => {
    setLoading(true);
    try {
      const [rcptRes, assocRes, selfRes] = await Promise.all([
        getReceiptQueueAction('all', selectedAssocId),
        getAssociationsAction(),
        getSelfProfileAction(),
      ]);

      if (rcptRes.success && rcptRes.data) {
        setAllReceipts(rcptRes.data);
      }
      if (assocRes.success && assocRes.data) {
        setAssociations(assocRes.data);
      }
      if (selfRes.success && selfRes.data) {
        setUserRole(selfRes.data.role);
        if (selfRes.data.role !== 'super_admin' && selfRes.data.association_id) {
          setSelectedAssocId(selfRes.data.association_id);
        }
      }
    } catch (err) {
      console.error('Failed to load audit queue:', err);
    } finally {
      setLoading(false);
    }
  }, [selectedAssocId]);

  useLoadOnce(loadData);

  function handleAuditAction(receiptId: string, status: VerificationStatus) {
    if (pendingStatus) return;
    setPendingStatus(status);
    setActionMsg(null);
    startTransition(async () => {
      try {
        const res = await auditVerifyReceiptAction(receiptId, status, auditNotes);
        setSelectedReceipt(null);
        setAuditNotes('');
        if (res.success) {
          setActionMsg({ type: 'success', text: res.message });
        } else {
          setActionMsg({ type: 'error', text: res.message || 'Failed to update receipt status.' });
        }
        await loadData();
      } catch (err: any) {
        setActionMsg({ type: 'error', text: err?.message || 'Unexpected error while updating the receipt.' });
      } finally {
        setPendingStatus(null);
      }
    });
  }

  const receipts = statusFilter === 'all'
    ? allReceipts
    : allReceipts.filter((r) => r.status === statusFilter);

  const counts = {
    pending: allReceipts.filter((r) => r.status === 'pending').length,
    verified: allReceipts.filter((r) => r.status === 'verified').length,
    flagged: allReceipts.filter((r) => r.status === 'flagged').length,
    rejected: allReceipts.filter((r) => r.status === 'rejected').length,
    all: allReceipts.length,
  };

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Association Filter Strip for Super Admin */}
      {userRole === 'super_admin' && (
        <div className="p-3.5 bg-white rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xs font-bold text-slate-700">Filter Audit Queue by Association:</span>
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
                All Associations ({allReceipts.length})
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
                  {assoc.code}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-emerald-50 text-emerald-800 text-[11px] font-extrabold border border-emerald-200">
              Internal Audit &bull; Expense Voucher Verification
            </div>
            <h1 className="text-xl font-black text-slate-900 leading-tight">
              Audit &amp; Receipt Verification Queue
            </h1>
            <p className="text-xs text-slate-500 font-medium">
              Review, verify, flag, or reject uploaded expense receipts and transaction vouchers.
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => {
              if (confirmAll) {
                setConfirmAll(false);
                setVerifyingAll(true);
                setActionMsg(null);
                startTransition(async () => {
                  try {
                    const res = await auditVerifyAllPendingAction(selectedAssocId);
                    setActionMsg(res.success ? { type: 'success', text: res.message } : { type: 'error', text: res.message });
                    if (res.success) await loadData();
                  } catch (err: any) {
                    setActionMsg({ type: 'error', text: err?.message || 'Unexpected error while verifying all pending receipts.' });
                  } finally {
                    setVerifyingAll(false);
                  }
                });
              } else {
                setConfirmAll(true);
                setTimeout(() => setConfirmAll(false), 4000);
              }
            }}
            disabled={counts.pending === 0 || verifyingAll}
            className={`px-3 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-sm disabled:opacity-50 disabled:cursor-not-allowed transition-all ${
              confirmAll
                ? 'bg-rose-600 hover:bg-rose-700 text-white'
                : 'bg-amber-500 hover:bg-amber-600 text-white'
            }`}
          >
            {verifyingAll ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : confirmAll ? (
              <CheckCircle2 className="w-3.5 h-3.5" />
            ) : (
              <ShieldCheck className="w-3.5 h-3.5" />
            )}
            {confirmAll ? 'Confirm — Verify All?' : `Verify All Pending (${counts.pending})`}
          </button>

          <button
            onClick={() => loadData()}
            disabled={loading || verifyingAll}
            className="p-2 px-3 rounded-xl border border-slate-300 text-slate-600 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Refresh Queue</span>
          </button>
        </div>
      </div>

      {/* Action Feedback Banner */}
      {actionMsg && (
        <div
          className={`flex items-center gap-2 p-3 rounded-xl text-xs font-bold ${
            actionMsg.type === 'success'
              ? 'bg-emerald-50 text-emerald-800 border border-emerald-200'
              : 'bg-rose-50 text-rose-700 border border-rose-200'
          }`}
        >
          {actionMsg.type === 'success' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <XCircle className="w-4 h-4 shrink-0" />}
          <span>{actionMsg.text}</span>
        </div>
      )}

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        <button
          onClick={() => setStatusFilter('pending')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            statusFilter === 'pending'
              ? 'bg-amber-500 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Pending Review</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{counts.pending}</span>
        </button>

        <button
          onClick={() => setStatusFilter('verified')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            statusFilter === 'verified'
              ? 'bg-emerald-600 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Verified</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{counts.verified}</span>
        </button>

        <button
          onClick={() => setStatusFilter('flagged')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            statusFilter === 'flagged'
              ? 'bg-orange-600 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Flagged</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{counts.flagged}</span>
        </button>

        <button
          onClick={() => setStatusFilter('rejected')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            statusFilter === 'rejected'
              ? 'bg-rose-600 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>Rejected</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{counts.rejected}</span>
        </button>

        <button
          onClick={() => setStatusFilter('all')}
          className={`px-3.5 py-2 rounded-xl text-xs font-bold flex items-center gap-2 whitespace-nowrap transition-all ${
            statusFilter === 'all'
              ? 'bg-slate-900 text-white shadow-md'
              : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
          }`}
        >
          <span>All Items</span>
          <span className="px-1.5 py-0.2 rounded-full bg-black/20 text-[10px]">{counts.all}</span>
        </button>
      </div>

      {/* Receipts Grid */}
      {loading ? (
        <div className="min-h-[300px] flex flex-col items-center justify-center text-slate-500">
          <Loader2 className="w-8 h-8 animate-spin text-emerald-600 mb-3" />
          <span className="text-xs font-medium">Loading audit queue...</span>
        </div>
      ) : receipts.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-2xl border border-slate-200 text-slate-500 space-y-2">
          <ShieldCheck className="w-10 h-10 mx-auto text-slate-300" />
          <div className="text-sm font-bold">No receipts in &ldquo;{statusFilter}&rdquo; status.</div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {receipts.map((rcpt) => {
            const badge = getStatusBadgeProps(rcpt.status);
            const isPdf = rcpt.content_type?.toLowerCase().includes('pdf') || rcpt.file_name?.toLowerCase().endsWith('.pdf');

            return (
              <div
                key={rcpt.id}
                className="bg-white rounded-2xl border border-slate-200 shadow-sm p-4 space-y-3 flex flex-col justify-between hover:border-emerald-300 transition-colors"
              >
                <div className="space-y-2.5">
                  <div className="flex items-start justify-between gap-2">
                    <div className="space-y-0.5 min-w-0">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {rcpt.file_name}
                      </div>
                      <div className="text-[10px] text-slate-500">
                        {formatBytes(rcpt.file_size)} &bull; {formatDate(rcpt.created_at)}
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border shrink-0 ${badge.className}`}>
                      {badge.label}
                    </span>
                  </div>

                  {/* Transaction Linkage */}
                  {rcpt.transaction && (
                    <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs space-y-1">
                      <div className="flex items-center justify-between text-slate-500 text-[10px]">
                        <span>Tx #{rcpt.transaction.voucher_number || rcpt.transaction.transaction_number?.slice(-8)}</span>
                        <span className={`font-bold ${rcpt.transaction.type === 'collection' ? 'text-emerald-700' : 'text-rose-700'}`}>
                          {formatPHP(rcpt.transaction.amount)}
                        </span>
                      </div>
                      <div className="text-slate-800 font-bold truncate">
                        {rcpt.transaction.category?.name || 'Voucher Expense'}
                      </div>
                      {rcpt.transaction.particulars && (
                        <div className="text-[11px] text-slate-500 italic truncate">
                          {rcpt.transaction.particulars}
                        </div>
                      )}
                    </div>
                  )}

                  {/* Auditor Notes if any */}
                  {rcpt.auditor_notes && (
                    <div className="p-2 rounded-xl bg-amber-50 border border-amber-200 text-[11px] text-amber-800">
                      <strong>Note:</strong> {rcpt.auditor_notes}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <button
                    onClick={() => setPreviewImageReceipt(rcpt)}
                    className="px-3 py-1.5 rounded-lg border border-slate-300 text-slate-700 hover:bg-slate-50 text-xs font-bold flex items-center gap-1.5"
                  >
                    <Eye className="w-3.5 h-3.5" /> View Voucher
                  </button>

                  <button
                    onClick={() => {
                      setSelectedReceipt(rcpt);
                      setAuditNotes(rcpt.auditor_notes || '');
                    }}
                    className="px-3 py-1.5 rounded-lg bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center gap-1.5"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" /> Audit Decision
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Decision Modal */}
      {selectedReceipt && (
        <Dialog open={Boolean(selectedReceipt)} onOpenChange={() => setSelectedReceipt(null)}>
          <DialogContent className="max-w-md p-6 bg-white rounded-2xl" onClose={() => setSelectedReceipt(null)}>
            <DialogHeader>
              <DialogTitle className="text-base font-black text-slate-900">
                Auditor Verification Decision
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Reviewing receipt voucher: {selectedReceipt.file_name}
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-4 pt-2">
              <div className="space-y-1">
                <label className="text-xs font-bold text-slate-700">Auditor Notes / Findings</label>
                <textarea
                  rows={3}
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="e.g. Receipt verified with official dry clearing payroll list."
                  className="w-full text-xs p-3 border rounded-xl border-slate-300 focus:outline-emerald-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-2 pt-2 border-t">
                <button
                  type="button"
                  onClick={() => handleAuditAction(selectedReceipt.id, 'verified')}
                  disabled={pendingStatus !== null}
                  className="py-2.5 px-2 rounded-xl bg-emerald-700 hover:bg-emerald-800 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pendingStatus === 'verified' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CheckCircle2 className="w-3.5 h-3.5" />} Verify
                </button>
                <button
                  type="button"
                  onClick={() => handleAuditAction(selectedReceipt.id, 'flagged')}
                  disabled={pendingStatus !== null}
                  className="py-2.5 px-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pendingStatus === 'flagged' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <AlertTriangle className="w-3.5 h-3.5" />} Flag
                </button>
                <button
                  type="button"
                  onClick={() => handleAuditAction(selectedReceipt.id, 'rejected')}
                  disabled={pendingStatus !== null}
                  className="py-2.5 px-2 rounded-xl bg-rose-700 hover:bg-rose-800 text-white text-xs font-bold flex items-center justify-center gap-1 shadow-sm disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {pendingStatus === 'rejected' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <XCircle className="w-3.5 h-3.5" />} Reject
                </button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      )}

      {/* Lightbox / Preview Modal */}
      {previewImageReceipt && (
        <Dialog open={Boolean(previewImageReceipt)} onOpenChange={() => setPreviewImageReceipt(null)}>
          <DialogContent className="max-w-3xl p-4 bg-slate-950 text-white rounded-2xl max-h-[90vh] overflow-y-auto">
            <DialogHeader className="border-b border-slate-800 pb-2">
              <div className="flex items-center justify-between gap-2">
                <DialogTitle className="text-sm font-bold text-white">
                  Voucher Preview: {previewImageReceipt.file_name}
                </DialogTitle>
                <button
                  onClick={() => setPreviewImageReceipt(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-xs font-bold text-white border border-slate-700 transition-colors"
                >
                  ← Back
                </button>
              </div>
            </DialogHeader>
            <div className="flex items-center justify-center p-4">
              {previewImageReceipt.content_type?.includes('pdf') || previewImageReceipt.file_name?.endsWith('.pdf') ? (
                <iframe
                  src={previewImageReceipt.file_path}
                  className="w-full h-[65vh] rounded-xl border border-slate-800"
                  title="PDF Preview"
                />
              ) : (
                /* eslint-disable-next-line @next/next/no-img-element */
                <img
                  src={previewImageReceipt.file_path}
                  alt={previewImageReceipt.file_name}
                  className="max-h-[70vh] object-contain rounded-xl shadow-2xl"
                />
              )}
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  );
}
