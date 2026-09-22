'use client';

import React, { useEffect, useState, useTransition } from 'react';
import { getReceiptQueueAction, auditVerifyReceiptAction } from '@/app/actions/audit';
import { Receipt, VerificationStatus, Profile } from '@/types';
import { getStatusBadgeProps, formatDate, formatBytes, formatPHP, getReceiptImageUrl } from '@/lib/utils/formatters';
import { ShieldCheck, CheckCircle2, AlertTriangle, XCircle, FileText, RefreshCw, Loader2, MessageSquare, Eye, ExternalLink, Tag, CreditCard, User, Calendar, CornerDownRight, Hash } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';

export default function AuditorPage() {
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState<VerificationStatus | 'all'>('pending');
  const [selectedReceipt, setSelectedReceipt] = useState<Receipt | null>(null);
  const [previewImageReceipt, setPreviewImageReceipt] = useState<Receipt | null>(null);
  const [auditNotes, setAuditNotes] = useState('');
  const [isPending, startTransition] = useTransition();

  const [allReceipts, setAllReceipts] = useState<Receipt[]>([]);

  async function loadReceipts() {
    setLoading(true);
    const res = await getReceiptQueueAction('all');
    setLoading(false);
    if (res.success && res.data) {
      setAllReceipts(res.data);
    }
  }

  useEffect(() => {
    loadReceipts();
  }, []);

  function handleAuditAction(receiptId: string, status: VerificationStatus) {
    startTransition(async () => {
      await auditVerifyReceiptAction(receiptId, status, auditNotes);
      setSelectedReceipt(null);
      setAuditNotes('');
      await loadReceipts();
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

  function escapeHtml(value: string): string {
    return value
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  function openImageInNewTab(imageSrc: string, fileName: string) {
    const win = window.open('', '_blank');
    if (win) {
      const safeTitle = escapeHtml(fileName);
      const safeSrc = escapeHtml(imageSrc);
      win.document.write(`
        <!DOCTYPE html>
        <html>
          <head>
            <title>${safeTitle} - IARMS Voucher Viewer</title>
            <meta name="viewport" content="width=device-width, initial-scale=1.0">
            <style>
              body { margin: 0; padding: 20px; background: #0f172a; display: flex; flex-direction: column; align-items: center; justify-content: center; min-height: 100vh; font-family: system-ui, sans-serif; box-sizing: border-box; }
              .container { text-align: center; max-width: 100%; }
              h1 { color: #f8fafc; font-size: 15px; margin-bottom: 12px; font-weight: 700; }
              img { max-width: 95vw; max-height: 85vh; object-fit: contain; border-radius: 12px; box-shadow: 0 25px 50px -12px rgba(0,0,0,0.6); border: 1px solid #334155; }
            </style>
          </head>
          <body>
            <div class="container">
              <h1>NANGURISAN LAYA FARMERS IA — Receipt Voucher: ${safeTitle}</h1>
              <img src="${safeSrc}" alt="${safeTitle}" />
            </div>
          </body>
        </html>
      `);
      win.document.close();
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in duration-300">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white p-4 sm:p-6 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-200 text-indigo-800 flex items-center justify-center shrink-0 shadow-xs">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <div>
            <h1 className="text-xl font-black tracking-tight text-slate-900 leading-tight">
              Verification & Audit Queue
            </h1>
            <p className="text-xs text-slate-500 font-medium mt-0.5">
              Inspect uploaded financial vouchers, cross-examine ledger entries, and verify legitimacy.
            </p>
          </div>
        </div>

        <button
          onClick={loadReceipts}
          disabled={loading || isPending}
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-slate-900 text-white text-xs font-bold hover:bg-slate-800 transition-all shadow-md active:scale-95 self-start sm:self-auto"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
          Refresh Queue
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/80 overflow-x-auto">
        {(['pending', 'verified', 'flagged', 'rejected', 'all'] as const).map((status) => (
          <button
            key={status}
            onClick={() => setStatusFilter(status)}
            className={`px-4 py-2 rounded-xl text-xs font-black capitalize transition-all shrink-0 ${
              statusFilter === status
                ? 'bg-indigo-700 text-white shadow-md shadow-indigo-900/20'
                : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
            }`}
          >
            {status} ({counts[status]})
          </button>
        ))}
      </div>

      {/* Grid of Receipts for Audit */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 max-h-[650px] overflow-y-auto pr-1">
        {loading ? (
          <div className="col-span-full text-center py-16 text-slate-400">
            <Loader2 className="w-8 h-8 animate-spin mx-auto mb-3 text-indigo-600" />
            Loading voucher verification queue...
          </div>
        ) : receipts.length === 0 ? (
          <div className="col-span-full text-center py-16 text-slate-500 bg-white border border-slate-200/90 rounded-2xl shadow-sm">
            No receipt vouchers found matching status filter &quot;{statusFilter}&quot;.
          </div>
        ) : (
          receipts.map((receipt) => {
            const badge = getStatusBadgeProps(receipt.status);
            const tx = receipt.transaction;
            const isCollection = tx?.type === 'collection';

            return (
              <div
                key={receipt.id}
                className="p-5 rounded-2xl bg-white border border-slate-200/90 flex flex-col justify-between space-y-4 hover:shadow-md hover:border-indigo-300 transition-all shadow-sm"
              >
                <div className="space-y-3.5">
                  {/* Status Bar */}
                  <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                    <span className={`px-3 py-1 text-xs font-black rounded-full uppercase tracking-wider shadow-2xs ${badge.className}`}>
                      {badge.label}
                    </span>
                    <span className="text-xs text-slate-500 font-bold flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" /> {formatDate(receipt.created_at)}
                    </span>
                  </div>

                  {/* Attached Transaction Details Section */}
                  {tx ? (
                    <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <span className="font-mono text-xs font-black text-indigo-900 flex items-center gap-1">
                          <Hash className="w-3.5 h-3.5 text-indigo-600" /> {tx.transaction_number}
                        </span>
                        <span className={`px-2.5 py-0.5 text-[10px] font-extrabold rounded-full uppercase ${isCollection ? 'bg-emerald-100 text-emerald-800' : 'bg-rose-100 text-rose-800'}`}>
                          {tx.type}
                        </span>
                      </div>

                      <div className="flex items-baseline justify-between pt-1">
                        <span className="text-[11px] text-slate-500 font-bold uppercase tracking-wider">Ledger Amount</span>
                        <span className={`text-lg font-black ${isCollection ? 'text-emerald-800' : 'text-rose-800'}`}>
                          {formatPHP(Number(tx.amount))}
                        </span>
                      </div>

                      <div className="space-y-1 pt-1 border-t border-slate-200/60 text-[11px]">
                        {tx.category && (
                          <div className="flex items-start gap-1.5 text-slate-700">
                            <Tag className="w-3.5 h-3.5 text-slate-400 shrink-0 mt-0.5" />
                            <span className="font-bold">[{tx.category.code}]</span> {tx.category.name}
                          </div>
                        )}

                        <div className="flex items-center justify-between text-slate-600">
                          <span className="flex items-center gap-1.5">
                            <CreditCard className="w-3.5 h-3.5 text-slate-400" /> Method: <strong className="text-slate-800 uppercase">{tx.payment_method}</strong>
                          </span>
                          {tx.reference_number && (
                            <span className="font-mono bg-white px-2 py-0.5 rounded border border-slate-200 text-slate-700 font-bold">
                              OR #{tx.reference_number}
                            </span>
                          )}
                        </div>

                        {(tx.members || []).length > 0 || tx.member ? (
                          <div className="flex items-start gap-1.5 text-slate-600">
                            <User className="w-3.5 h-3.5 text-slate-400 mt-0.5 shrink-0" /> Payer:
                            <div className="flex flex-wrap gap-1">
                              {(tx.members && tx.members.length > 0
                            ? tx.members
                            : tx.member
                              ? [tx.member]
                              : []
                          ).map((m: Profile, i: number, arr: Profile[]) => (
                                <strong key={m.id ?? i} className="text-slate-800 font-bold">
                                  {m.full_name} ({m.farm_location || 'General'}){i < arr.length - 1 ? ',' : ''}
                                </strong>
                              ))}
                            </div>
                          </div>
                        ) : null}

                        {tx.notes && (
                          <div className="text-slate-500 italic pt-0.5">
                            &quot;{tx.notes}&quot;
                          </div>
                        )}
                      </div>
                    </div>
                  ) : (
                    <div className="p-3 rounded-xl bg-amber-50 border border-amber-200 text-amber-900 text-xs font-medium">
                      ⚠️ Standalone Receipt Voucher (No transaction attached)
                    </div>
                  )}

                  {/* Uploaded File Voucher Info & Thumbnail Preview */}
                  <div className="flex items-center gap-3 bg-white p-2.5 rounded-xl border border-slate-200">
                    <button
                      onClick={() => setPreviewImageReceipt(receipt)}
                      className="w-16 h-16 rounded-xl bg-slate-100 border border-slate-200 flex items-center justify-center shrink-0 overflow-hidden relative group cursor-pointer hover:border-indigo-500 transition-all"
                      title="Click to zoom image"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getReceiptImageUrl(receipt)}
                        alt={receipt.file_name}
                        className="w-full h-full object-cover group-hover:scale-110 transition-transform"
                      />
                      <div className="absolute inset-0 bg-slate-900/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center text-white">
                        <Eye className="w-5 h-5" />
                      </div>
                    </button>

                    <div className="min-w-0 flex-1 space-y-0.5">
                      <div className="font-extrabold text-slate-900 text-xs truncate">{receipt.file_name}</div>
                      <div className="text-[11px] text-slate-500 font-mono">{formatBytes(receipt.file_size)}</div>
                      <div className="text-[11px] text-slate-600 font-semibold pt-0.5">
                        Uploaded by: <span className="text-indigo-900 font-bold">{receipt.uploader?.full_name || 'Treasurer'}</span> ({receipt.uploader?.role || 'Officer'})
                      </div>
                    </div>

                    <button
                      onClick={() => setPreviewImageReceipt(receipt)}
                      className="px-2.5 py-1.5 rounded-lg bg-indigo-50 text-indigo-700 hover:bg-indigo-100 text-xs font-bold transition-all shrink-0 flex items-center gap-1"
                    >
                      <Eye className="w-3.5 h-3.5" /> View
                    </button>
                  </div>

                  {receipt.auditor_notes && (
                    <div className="p-3 rounded-xl bg-slate-50 border border-slate-200/80 text-xs text-slate-700 space-y-1">
                      <div className="text-[10px] font-black text-indigo-800 uppercase tracking-wider flex items-center gap-1">
                        <MessageSquare className="w-3 h-3 text-indigo-700" /> Auditor Findings / Notes:
                      </div>
                      <p className="italic font-medium">{receipt.auditor_notes}</p>
                    </div>
                  )}
                </div>

                {/* Audit Action Buttons */}
                <div className="pt-2 border-t border-slate-100 flex items-center gap-2">
                  <button
                    onClick={() => setPreviewImageReceipt(receipt)}
                    className="flex-1 py-2.5 px-3 rounded-xl border border-slate-300 text-slate-700 hover:bg-slate-100 text-xs font-bold transition-all flex items-center justify-center gap-1.5"
                  >
                    <Eye className="w-4 h-4 text-indigo-600" /> Preview Voucher
                  </button>

                  <button
                    onClick={() => {
                      setSelectedReceipt(receipt);
                      setAuditNotes(receipt.auditor_notes || '');
                    }}
                    className="flex-1 py-2.5 px-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-all flex items-center justify-center gap-1.5 shadow-xs active:scale-95"
                  >
                    <ShieldCheck className="w-4 h-4 text-emerald-400" /> Audit Verification
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Image Preview Modal Popup */}
      <Dialog open={!!previewImageReceipt} onOpenChange={(open) => !open && setPreviewImageReceipt(null)}>
        <DialogContent className="max-w-3xl bg-slate-900 border-slate-800 text-white p-6 space-y-4">
          <DialogHeader>
            <div className="flex items-center justify-between w-full pr-6">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-indigo-400" />
                <div>
                  <DialogTitle className="text-white text-base">Receipt Voucher Image Viewer</DialogTitle>
                  <DialogDescription className="text-slate-400 text-xs">
                    {previewImageReceipt?.file_name} ({formatBytes(previewImageReceipt?.file_size || 0)})
                  </DialogDescription>
                </div>
              </div>
            </div>
          </DialogHeader>

          {previewImageReceipt && (
            <div className="space-y-4">
              <div className="relative w-full max-h-[60vh] bg-slate-950 rounded-2xl border border-slate-800 overflow-hidden flex items-center justify-center p-2">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={getReceiptImageUrl(previewImageReceipt)}
                  alt={previewImageReceipt.file_name}
                  className="max-h-[55vh] w-auto object-contain rounded-xl shadow-2xl"
                />
              </div>

              {/* Transaction Cross-Check Summary */}
              {previewImageReceipt.transaction && (
                <div className="p-4 rounded-xl bg-slate-800/90 border border-slate-700/90 flex flex-wrap items-center justify-between gap-3 text-xs">
                  <div>
                    <span className="text-slate-400">Transaction Ref: </span>
                    <strong className="text-indigo-300 font-mono">{previewImageReceipt.transaction.transaction_number}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Ledger Amount: </span>
                    <strong className="text-emerald-400 text-sm font-black">{formatPHP(Number(previewImageReceipt.transaction.amount))}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">OR #: </span>
                    <strong className="text-white">{previewImageReceipt.transaction.reference_number || 'N/A'}</strong>
                  </div>
                  <div>
                    <span className="text-slate-400">Uploader: </span>
                    <strong className="text-white">{previewImageReceipt.uploader?.full_name}</strong>
                  </div>
                </div>
              )}

              <div className="flex items-center justify-between pt-2 border-t border-slate-800">
                <button
                  onClick={() => openImageInNewTab(getReceiptImageUrl(previewImageReceipt), previewImageReceipt.file_name)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-indigo-300 text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer"
                >
                  <ExternalLink className="w-4 h-4" /> Open Image in Full Tab
                </button>

                <button
                  onClick={() => {
                    setSelectedReceipt(previewImageReceipt);
                    setAuditNotes(previewImageReceipt.auditor_notes || '');
                    setPreviewImageReceipt(null);
                  }}
                  className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold transition-all flex items-center gap-1.5 shadow-md shadow-indigo-600/20"
                >
                  <ShieldCheck className="w-4 h-4" /> Proceed to Audit Action
                </button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Audit Decision Modal */}
      {selectedReceipt && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-200">
          <div className="w-full max-w-lg bg-white border border-slate-200 rounded-3xl shadow-2xl p-6 space-y-5 text-slate-900 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-indigo-700" /> Audit Verification Review
              </h3>
              <button
                onClick={() => setSelectedReceipt(null)}
                className="text-slate-400 hover:text-slate-700 text-xs font-bold px-2 py-1 rounded-lg hover:bg-slate-100 transition-colors"
              >
                Close
              </button>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/90 space-y-1.5">
                <div className="text-slate-600 font-medium">File Name: <span className="text-slate-900 font-bold">{selectedReceipt.file_name}</span></div>
                {selectedReceipt.transaction && (
                  <>
                    <div className="text-slate-600 font-medium">Transaction #: <span className="font-mono text-indigo-700 font-bold">{selectedReceipt.transaction.transaction_number}</span></div>
                    <div className="text-slate-600 font-medium">Amount: <span className="text-emerald-800 font-black">{formatPHP(Number(selectedReceipt.transaction.amount))}</span></div>
                  </>
                )}
                <div className="text-slate-600 font-medium">Uploaded By: <span className="text-slate-900 font-bold">{selectedReceipt.uploader?.full_name}</span></div>
              </div>

              <div>
                <label className="block font-black uppercase text-[10px] tracking-wider text-slate-500 mb-1.5">
                  Auditor Verification Notes / Discrepancy Findings
                </label>
                <textarea
                  rows={3}
                  value={auditNotes}
                  onChange={(e) => setAuditNotes(e.target.value)}
                  placeholder="e.g. Receipt verified matching Official Receipt #991332. Amount correct."
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-3 text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition-all text-xs"
                />
              </div>

              <div className="grid grid-cols-3 gap-2.5 pt-2">
                <button
                  onClick={() => handleAuditAction(selectedReceipt.id, 'verified')}
                  disabled={isPending}
                  className="py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 active:scale-95"
                >
                  <CheckCircle2 className="w-4 h-4" /> Verify
                </button>
                <button
                  onClick={() => handleAuditAction(selectedReceipt.id, 'flagged')}
                  disabled={isPending}
                  className="py-2.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-amber-600/20 active:scale-95"
                >
                  <AlertTriangle className="w-4 h-4" /> Flag
                </button>
                <button
                  onClick={() => handleAuditAction(selectedReceipt.id, 'rejected')}
                  disabled={isPending}
                  className="py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-all flex items-center justify-center gap-1.5 shadow-md shadow-rose-600/20 active:scale-95"
                >
                  <XCircle className="w-4 h-4" /> Reject
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
