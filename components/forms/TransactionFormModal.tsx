'use client';

import React, { useState } from 'react';
import {
  createTransactionAction,
} from '@/app/actions/transactions';
import { BudgetCategory, TransactionType, Profile, Association } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import {
  PlusCircle,
  X,
  Loader2,
  Wallet,
  Tag,
  MapPin,
  Hash,
  Building2,
  FileText,
  Search,
  Users,
  AlertTriangle,
  CheckCircle2,
  Image as ImageIcon,
} from 'lucide-react';

interface TransactionFormModalProps {
  categories: BudgetCategory[];
  members: Profile[];
  associations?: Association[];
  defaultAssociationId?: string;
  isSuperAdmin?: boolean;
  onSuccess: () => void;
  onClose: () => void;
}

const inputCls =
  'w-full bg-white border border-slate-300 rounded-lg px-3 py-2 text-xs text-slate-800 placeholder:text-slate-400 font-sans focus:outline-none focus:ring-2 focus:ring-emerald-300 focus:border-emerald-400';
const labelCls = 'text-[11px] font-bold text-slate-600';
const CUSTOM_OPTION = '__custom__';

const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024; // 5MB limit for images
const MAX_PDF_SIZE_BYTES = 10 * 1024 * 1024; // 10MB limit for PDFs

export default function TransactionFormModal({
  categories,
  members,
  associations = [],
  defaultAssociationId,
  isSuperAdmin = false,
  onSuccess,
  onClose,
}: TransactionFormModalProps) {
  const [selectedAssocId, setSelectedAssocId] = useState<string>(defaultAssociationId || '');
  const [type, setType] = useState<TransactionType>('disbursement');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [customCategory, setCustomCategory] = useState<string>('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [memberSearch, setMemberSearch] = useState<string>('');
  const [memberPickerOpen, setMemberPickerOpen] = useState<boolean>(false);
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [voucherNumber, setVoucherNumber] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [lateralSection, setLateralSection] = useState<string>('');
  const [particulars, setParticulars] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  const [file, setFile] = useState<File | null>(null);
  const [receiptName, setReceiptName] = useState<string>('');
  const [fileUploadError, setFileUploadError] = useState<{
    fileName: string;
    actualSize: string;
    limitSize: string;
    isImage: boolean;
    reason: 'size' | 'type';
  } | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredCategories = (categories && categories.length > 0 ? categories : []).filter((c) => c.category_type === type);
  const isCustomCategory = categoryId === CUSTOM_OPTION;
  const filteredMembers = members.filter((m) => !m.association_id || m.association_id === selectedAssocId);

  const selectedMembers = filteredMembers.filter((m) => memberIds.includes(m.id));
  const searchedMembers = memberSearch.trim()
    ? filteredMembers.filter((m) =>
        (m.full_name || '').toLowerCase().includes(memberSearch.trim().toLowerCase()) ||
        (m.farm_location || '').toLowerCase().includes(memberSearch.trim().toLowerCase())
      )
    : filteredMembers;

  function toggleMember(id: string) {
    setMemberIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid positive amount in PHP (₱).');
      return;
    }

    if (isSuperAdmin && !selectedAssocId) {
      setErrorMsg('Please choose the target Irrigators Association. It cannot be blank when the scope is All Associations (Consolidated).');
      return;
    }

    if (!categoryId) {
      setErrorMsg('Please select a NIA Budget Category (Chart of Accounts).');
      return;
    }

    if (isCustomCategory && !customCategory.trim()) {
      setErrorMsg('Please type the name of the custom category.');
      return;
    }

    setLoading(true);

    try {
      let finalCategoryId = categoryId;
      let finalParticulars = particulars ? particulars.trim() : '';

      if (isCustomCategory) {
        // Map to standard miscellaneous line item without cluttering the budget_categories table
        const fallbackCat = filteredCategories.find((c) =>
          type === 'collection'
            ? (c.code === 'REC-DON' || c.code === 'REC-OTHER' || c.name.toLowerCase().includes('other') || c.name.toLowerCase().includes('donations'))
            : (c.code === 'DISB-MISC' || c.code === 'DISB-OTHER' || c.name.toLowerCase().includes('miscellaneous') || c.name.toLowerCase().includes('other') || c.code === 'DISB-REPAIR')
        ) || filteredCategories[0];

        if (fallbackCat) {
          finalCategoryId = fallbackCat.id;
        }

        const customNote = customCategory.trim();
        if (customNote) {
          finalParticulars = finalParticulars ? `[${customNote}] ${finalParticulars}` : `[${customNote}]`;
        }
      }

      let receiptId: string | null = null;
      if (file) {
        setUploading(true);

        // Use custom receipt name if provided, otherwise keep original filename
        const ext = file.name.split('.').pop() || '';
        const uploadName = receiptName.trim()
          ? `${receiptName.trim()}.${ext}`
          : file.name;

        const uploadFormData = new FormData();
        uploadFormData.append('file', file);
        uploadFormData.append('fileName', uploadName);
        if (selectedAssocId) {
          uploadFormData.append('associationId', selectedAssocId);
        }

        const resUpload = await fetch('/api/upload-receipt', {
          method: 'POST',
          body: uploadFormData,
        });

        let receiptRes: any;
        try {
          receiptRes = await resUpload.json();
        } catch {
          receiptRes = { success: false, message: 'Invalid response from upload server.' };
        }

        setUploading(false);
        if (!resUpload.ok || !receiptRes.success || !receiptRes.data) {
          setErrorMsg(receiptRes.message || 'Failed to upload the receipt voucher. Please try a different file.');
          return;
        }
        receiptId = receiptRes.data.id;
      }

      const res = await createTransactionAction({
        association_id: selectedAssocId,
        type,
        amount: numericAmount,
        category_id: finalCategoryId,
        voucher_number: voucherNumber || null,
        payee_name: payeeName || null,
        lateral_section: lateralSection || null,
        particulars: finalParticulars || null,
        member_id: type === 'collection' && memberIds.length === 1 ? memberIds[0] || null : null,
        member_ids: type === 'collection' && memberIds.length > 0 ? memberIds : null,
        receipt_id: receiptId,
        payment_method: 'cash',
        transaction_date: transactionDate,
        reference_number: referenceNumber || null,
      });

      if (!res.success) {
        setErrorMsg(res.message);
        return;
      }

      onSuccess();
      onClose();
    } catch (err: any) {
      setErrorMsg(err?.message || 'Unexpected error while saving the transaction. Please try again.');
    } finally {
      setUploading(false);
      setLoading(false);
    }
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent onClose={onClose} className="max-w-2xl p-4 sm:p-5 max-h-[92vh] overflow-y-auto relative">
        {/* Busy overlay: blocks all interaction while uploading or saving */}
        {(uploading || loading) && (
          <div className="absolute inset-0 z-50 bg-white/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-3">
            <Loader2 className="w-9 h-9 animate-spin text-emerald-700" />
            <span className="text-xs font-bold text-emerald-800">
              {uploading ? 'Uploading receipt voucher...' : 'Saving transaction to ledger...'}
            </span>
            <span className="text-[10px] text-slate-500 font-medium">Please wait, do not close this window.</span>
          </div>
        )}
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-xl bg-emerald-800 text-white shadow-md shrink-0">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-base font-black text-emerald-900">
                Log New Financial Transaction / Voucher
              </DialogTitle>
              <DialogDescription className="mt-0.5">
                NIA Standard Chart of Accounts &amp; Official Irrigators Association Ledger
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold">
            {errorMsg}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-3.5 pt-1">
          {/* Association / Type */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {isSuperAdmin ? (
              <div className="space-y-1">
                <label className={labelCls}>
                  Target Irrigators Association {associations.length > 0 ? '* required' : ''}
                </label>
                <select
                  value={selectedAssocId}
                  onChange={(e) => setSelectedAssocId(e.target.value)}
                  className={`${inputCls} ${selectedAssocId === '' && associations.length > 0 ? 'text-slate-400' : ''}`}
                >
                  {selectedAssocId === '' && (
                    <option value="">-- Select an Irrigation Association --</option>
                  )}
                  {associations.map((a) => (
                    <option key={a.id} value={a.id} className="text-slate-800">
                      {a.name} ({a.code})
                    </option>
                  ))}
                </select>
                {associations.length === 0 && (
                  <p className="text-xs text-rose-600 font-semibold">
                    No irrigators association is registered yet. Create one first before logging a transaction.
                  </p>
                )}
              </div>
            ) : (
              <div className="p-2 rounded-lg bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs font-semibold truncate">
                <Building2 className="w-4 h-4 text-emerald-700 shrink-0" />
                <span className="text-slate-400 font-medium">Association:</span>
                <span className="text-emerald-800 font-bold font-sans truncate">
                  {associations.find((a) => a.id === selectedAssocId)?.name || 'Your Association'}
                </span>
              </div>
            )}

            <div className="space-y-1">
              <label className={labelCls}>Transaction Date *</label>
              <input type="date" required value={transactionDate} onChange={(e) => setTransactionDate(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-100 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => { setType('collection'); setCategoryId(''); }}
              className={`py-2 px-3 rounded-md text-xs font-bold transition-all ${
                type === 'collection' ? 'bg-emerald-700 text-white shadow-sm' : 'text-slate-500 hover:text-emerald-800'
              }`}
            >
              Money IN (Collection)
            </button>
            <button
              type="button"
              onClick={() => { setType('disbursement'); setCategoryId(''); }}
              className={`py-2 px-3 rounded-md text-xs font-bold transition-all ${
                type === 'disbursement' ? 'bg-rose-600 text-white shadow-sm' : 'text-slate-500 hover:text-rose-700'
              }`}
            >
              Money OUT (Disbursement / Expense)
            </button>
          </div>

          {/* Amount */}
          <div className="space-y-1">
            <label className={labelCls}>Amount in PHP (₱) *</label>
            <div className="relative">
              <span className="absolute left-3 top-2 text-xs font-bold text-emerald-700">₱</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                inputMode="decimal"
                placeholder="0.00"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                className={`${inputCls} pl-7 font-bold text-emerald-900`}
              />
            </div>
          </div>

          {/* Budget Category — one single Chart of Accounts picker */}
          <div className="space-y-1">
            <label className={labelCls}>NIA Budget Category (Chart of Accounts) *</label>
            <select
              value={categoryId}
              onChange={(e) => {
                setCategoryId(e.target.value);
                setCustomCategory('');
              }}
              className={inputCls}
            >
              <option value="">-- Select Budget Line Item --</option>
              {filteredCategories.map((c) => (
                <option key={c.id} value={c.id}>
                  [{c.code}] {c.name}
                </option>
              ))}
              <option value={CUSTOM_OPTION}>-- Custom / Other (one-time note below) --</option>
            </select>
            {isCustomCategory && (
              <div className="pt-1.5 space-y-1.5">
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Barangay Share, Paluwagan Dues, Special Canal Clearing"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className={inputCls}
                />
                <p className="text-[11px] text-amber-800 bg-amber-50 p-2 rounded-lg border border-amber-200 font-medium">
                  <strong>One-time transaction note:</strong> This custom description is saved with this transaction (in particulars) and will not clutter the permanent dropdown. To add permanent categories for this association, use the <strong>Chart of Accounts</strong>.
                </p>
              </div>
            )}
          </div>

          {/* Optional Details */}
          <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 space-y-2.5">
            <div className="text-[11px] font-bold text-emerald-800 uppercase tracking-wider flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5" /> Voucher &amp; Particular Details (Optional)
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold">Voucher / OR No.</label>
                <input type="text" placeholder="e.g. 001, 011" value={voucherNumber} onChange={(e) => setVoucherNumber(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1 sm:col-span-2">
                <label className="text-[11px] text-slate-500 font-semibold">Payee / Payer Entity</label>
                <input type="text" placeholder="e.g. D.A. Technician, BIR, SMC NIA, RBGI Bank" value={payeeName} onChange={(e) => setPayeeName(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1"><MapPin className="w-3 h-3" /> Lateral / TSAG Section</label>
                <input type="text" placeholder="e.g. Danak Lateral, Zone 1" value={lateralSection} onChange={(e) => setLateralSection(e.target.value)} className={inputCls} />
              </div>
              <div className="space-y-1">
                <label className="text-[11px] text-slate-500 font-semibold flex items-center gap-1"><Hash className="w-3 h-3" /> Check / Deposit Ref No.</label>
                <input type="text" placeholder="e.g. CHK-98402, Cash Deposit" value={referenceNumber} onChange={(e) => setReferenceNumber(e.target.value)} className={inputCls} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[11px] text-slate-500 font-semibold">Particulars / Description</label>
              <input type="text" placeholder="e.g. 2nd Canal Clearing Dry (meryenda), Processing Fee of Audited FS" value={particulars} onChange={(e) => setParticulars(e.target.value)} className={inputCls} />
            </div>
          </div>

          {/* Multi-Member Selection for Collections */}
          {type === 'collection' && filteredMembers.length > 0 && (
            <div className="space-y-1.5">
              <label className={labelCls}>Payer Farmer-Member (Optional)</label>

              {/* Selected Member Chips */}
              {selectedMembers.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-emerald-50/70 border border-emerald-200">
                  {selectedMembers.map((m) => (
                    <span
                      key={m.id}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-700 text-white text-[10px] font-bold"
                    >
                      {m.full_name}
                      <button
                        type="button"
                        onClick={() => toggleMember(m.id)}
                        className="hover:text-emerald-200 transition-colors"
                        aria-label={`Remove ${m.full_name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Searchable Member Picker */}
              <div className="relative">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={memberSearch}
                    onChange={(e) => {
                      setMemberSearch(e.target.value);
                      setMemberPickerOpen(true);
                    }}
                    onFocus={() => setMemberPickerOpen(true)}
                    placeholder={selectedMembers.length > 0
                      ? 'Add more members...'
                      : 'Search a member or leave blank for General / Non-Member Payment'}
                    className={`${inputCls} pl-9`}
                  />
                </div>

                {memberPickerOpen && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setMemberPickerOpen(false)} />
                    <div className="absolute z-40 mt-1 w-full bg-white border border-slate-200 rounded-xl shadow-xl max-h-52 overflow-y-auto">
                      {searchedMembers.length === 0 ? (
                        <div className="px-3.5 py-3 text-xs text-slate-400 font-medium">
                          No members match &ldquo;{memberSearch}&rdquo;.
                        </div>
                      ) : (
                        searchedMembers.map((m) => {
                          const isSelected = memberIds.includes(m.id);
                          return (
                            <label
                              key={m.id}
                              className={`flex items-center gap-2.5 px-3.5 py-2.5 cursor-pointer transition-colors border-b border-slate-100 last:border-b-0 ${
                                isSelected ? 'bg-emerald-50' : 'hover:bg-slate-50'
                              }`}
                            >
                              <input
                                type="checkbox"
                                checked={isSelected}
                                onChange={() => toggleMember(m.id)}
                                className="w-3.5 h-3.5 accent-emerald-700 shrink-0"
                              />
                              <div className="min-w-0">
                                <div className="text-xs font-bold text-slate-800 truncate">{m.full_name}</div>
                                <div className="text-[10px] text-slate-400 font-medium truncate">
                                  {m.farm_location || 'Member'}
                                </div>
                              </div>
                            </label>
                          );
                        })
                      )}
                    </div>
                  </>
                )}
              </div>

              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Users className="w-3 h-3 shrink-0" />
                Select multiple members if several farmers paid together. Leave blank for General / Non-Member payment.
              </p>
            </div>
          )}

          {/* Receipt / Voucher Attachment */}
          <div className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-1.5">
              <label className={`${labelCls} flex items-center gap-1.5`}>
                <FileText className="w-3.5 h-3.5 text-emerald-700" />
                <span>Receipt / Official Voucher (Optional)</span>
              </label>
              <div className="flex items-center gap-1.5 text-[10px]">
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-800 border border-emerald-200 font-bold">
                  <ImageIcon className="w-3 h-3 text-emerald-600" /> Images &le; 5MB
                </span>
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-slate-100 text-slate-600 border border-slate-200 font-semibold">
                  PDF &le; 10MB
                </span>
              </div>
            </div>

            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              disabled={uploading || loading}
              onChange={(e) => {
                const selected = e.target.files?.[0] || null;
                setReceiptName('');
                setFileUploadError(null);

                if (!selected) {
                  setFile(null);
                  return;
                }

                const ALLOWED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'application/pdf'];
                const ALLOWED_EXTS = ['jpg', 'jpeg', 'png', 'webp', 'pdf'];

                const ext = (selected.name.split('.').pop() || '').toLowerCase();
                const typeOk = ALLOWED_TYPES.includes(selected.type) || ALLOWED_EXTS.includes(ext);
                if (!typeOk) {
                  setFile(null);
                  setFileUploadError({
                    fileName: selected.name,
                    actualSize: (selected.size / (1024 * 1024)).toFixed(2) + ' MB',
                    limitSize: 'JPG, PNG, WebP, PDF only',
                    isImage: false,
                    reason: 'type',
                  });
                  e.target.value = '';
                  return;
                }

                const isImage = selected.type.startsWith('image/') || ['jpg', 'jpeg', 'png', 'webp'].includes(ext);
                const maxAllowed = isImage ? MAX_IMAGE_SIZE_BYTES : MAX_PDF_SIZE_BYTES;
                const maxAllowedLabel = isImage ? '5 MB' : '10 MB';

                if (selected.size > maxAllowed) {
                  const actualMB = (selected.size / (1024 * 1024)).toFixed(2) + ' MB';
                  setFile(null);
                  setFileUploadError({
                    fileName: selected.name,
                    actualSize: actualMB,
                    limitSize: maxAllowedLabel,
                    isImage,
                    reason: 'size',
                  });
                  e.target.value = '';
                  return;
                }

                setFileUploadError(null);
                setFile(selected);
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            />

            {/* Oversized / Format Error Notification Banner */}
            {fileUploadError && (
              <div className="p-3.5 rounded-xl bg-rose-50 border-2 border-rose-300 text-rose-900 shadow-sm animate-in fade-in slide-in-from-top-1 duration-200">
                <div className="flex items-start gap-2.5">
                  <div className="p-1.5 rounded-full bg-rose-100 text-rose-700 shrink-0 mt-0.5">
                    <AlertTriangle className="w-4 h-4" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <h4 className="text-xs font-black text-rose-900 flex items-center gap-1.5">
                        {fileUploadError.reason === 'size'
                          ? `File Too Large • Upload Blocked (${fileUploadError.isImage ? 'Image' : 'Document'})`
                          : 'Unsupported File Format'}
                      </h4>
                      <button
                        type="button"
                        onClick={() => setFileUploadError(null)}
                        className="text-rose-400 hover:text-rose-800 p-0.5 transition-colors"
                        aria-label="Dismiss notification"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>

                    {fileUploadError.reason === 'size' ? (
                      <div className="mt-1.5 space-y-2">
                        <p className="text-[11px] text-rose-800 leading-snug">
                          The selected {fileUploadError.isImage ? 'image' : 'file'}{' '}
                          <strong className="font-bold text-rose-950">&ldquo;{fileUploadError.fileName}&rdquo;</strong> exceeds the allowable upload size.
                        </p>
                        <div className="flex flex-wrap items-center gap-2 pt-0.5">
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-rose-200 text-rose-950 text-[10px] font-bold border border-rose-300">
                            Your File: {fileUploadError.actualSize} (Too Large)
                          </span>
                          <span className="text-rose-400 font-black text-xs">&gt;</span>
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-emerald-100 text-emerald-800 text-[10px] font-bold border border-emerald-300">
                            Allowed Limit: Max {fileUploadError.limitSize}
                          </span>
                        </div>
                        <p className="text-[10px] text-rose-700 font-medium">
                          💡 <strong>Tip:</strong> Please compress the image, choose a lower camera resolution, or crop unnecessary edges before attaching.
                        </p>
                      </div>
                    ) : (
                      <p className="text-[11px] text-rose-800 mt-1">
                        File &ldquo;{fileUploadError.fileName}&rdquo; is not supported. Please choose a JPG, PNG, WebP image or PDF document.
                      </p>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* Valid File Attached Card */}
            {file && (
              <div className="p-2.5 rounded-xl bg-emerald-50/80 border border-emerald-200 space-y-2 animate-in fade-in slide-in-from-top-1 duration-150">
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-2 min-w-0">
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span className="font-bold text-emerald-900 truncate">{file.name}</span>
                    <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-900 font-bold shrink-0">
                      {(file.size / (1024 * 1024)).toFixed(2)} MB • OK
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      setFile(null);
                      setReceiptName('');
                    }}
                    className="text-slate-400 hover:text-rose-600 p-1"
                    title="Remove file"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-bold text-slate-600">Voucher / Receipt Display Name (optional)</label>
                  <input
                    type="text"
                    value={receiptName}
                    onChange={(e) => setReceiptName(e.target.value)}
                    placeholder={file.name.replace(/\.[^.]+$/, '')}
                    className="w-full text-xs p-2 bg-white border rounded-lg border-slate-300 focus:ring-2 focus:ring-emerald-300 focus:outline-none"
                  />
                  <p className="text-[10px] text-slate-500 font-medium">
                    Leave blank to keep original filename. File extension is preserved automatically.
                  </p>
                </div>
              </div>
            )}

            {!file && !fileUploadError && (
              <p className="text-[10px] text-slate-400 font-medium">
                No voucher uploaded — the record shows &ldquo;Pending Voucher&rdquo; and nothing is auto-created until you attach a file.
              </p>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-200">
            <button
              type="button"
              onClick={onClose}
              disabled={loading || uploading}
              className="px-4 py-2 text-xs font-bold rounded-lg border border-slate-300 text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || uploading}
              className="px-5 py-2 text-xs font-bold rounded-lg bg-emerald-800 hover:bg-emerald-900 text-white shadow-md active:scale-95 transition-all disabled:opacity-50 flex items-center gap-2"
            >
              {loading || uploading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Saving Transaction...</span>
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  <span>Save to Ledger</span>
                </>
              )}
            </button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}