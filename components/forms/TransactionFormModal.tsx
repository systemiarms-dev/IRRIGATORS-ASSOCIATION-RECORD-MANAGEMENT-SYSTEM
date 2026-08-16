'use client';

import React, { useState } from 'react';
import {
  createTransactionAction,
  uploadReceiptMetadataAction,
  createBudgetCategoryAction,
} from '@/app/actions/transactions';
import { BudgetCategory, TransactionType, Profile, Association } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { PlusCircle, X, Loader2, Wallet, Tag, MapPin, Hash, Building2, FileText, Search, Users } from 'lucide-react';

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
  const [memberNames, setMemberNames] = useState<string[]>([]);
  const [memberNameInput, setMemberNameInput] = useState<string>('');
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);

  const [voucherNumber, setVoucherNumber] = useState<string>('');
  const [payeeName, setPayeeName] = useState<string>('');
  const [lateralSection, setLateralSection] = useState<string>('');
  const [particulars, setParticulars] = useState<string>('');
  const [referenceNumber, setReferenceNumber] = useState<string>('');

  const [file, setFile] = useState<File | null>(null);
  const [receiptName, setReceiptName] = useState<string>('');
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

  function addMemberName() {
    const name = memberNameInput.trim();
    if (name.length < 2) return;
    if (memberNames.some((n) => n.toLowerCase() === name.toLowerCase())) {
      setMemberNameInput('');
      return;
    }
    setMemberNames((prev) => [...prev, name]);
    setMemberNameInput('');
  }

  function removeMemberName(name: string) {
    setMemberNames((prev) => prev.filter((n) => n !== name));
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
      if (isCustomCategory) {
        const ccRes = await createBudgetCategoryAction({
          name: customCategory.trim(),
          category_type: type,
          association_id: isSuperAdmin ? selectedAssocId : undefined,
        });
        if (!ccRes.success || !ccRes.data) {
          setErrorMsg(ccRes.message || 'Failed to create the custom category. Please try again.');
          return;
        }
        finalCategoryId = ccRes.data.id;
      }

      let receiptId: string | null = null;
      if (file) {
        setUploading(true);
        const base64Url = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = () => resolve(reader.result as string);
          reader.onerror = () => reject(new Error('Could not read the selected file. Please try a different file.'));
          reader.readAsDataURL(file);
        });

        // Use custom receipt name if provided, otherwise keep original filename
        const ext = file.name.split('.').pop() || '';
        const uploadName = receiptName.trim()
          ? `${receiptName.trim()}.${ext}`
          : file.name;

        const receiptRes = await uploadReceiptMetadataAction(base64Url, uploadName, file.size, file.type, selectedAssocId);
        setUploading(false);
        if (!receiptRes.success || !receiptRes.data) {
          setErrorMsg(receiptRes.message || 'Failed to upload the receipt voucher. Please fix the file and try again.');
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
        particulars: particulars || null,
        member_id: type === 'collection' && memberIds.length === 1 ? memberIds[0] || null : null,
        member_ids: type === 'collection' && memberIds.length > 0 ? memberIds : null,
        member_names: type === 'collection' && memberNames.length > 0 ? memberNames : null,
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
      <DialogContent onClose={onClose} className="max-w-2xl p-4 sm:p-5 max-h-[92vh] overflow-y-auto">
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
              <option value={CUSTOM_OPTION}>-- Custom / Other (type new line below) --</option>
            </select>
            {isCustomCategory && (
              <div className="pt-1.5 space-y-1.5">
                <input
                  type="text"
                  autoFocus
                  placeholder="e.g. Barangay Share, Paluwagan Dues"
                  value={customCategory}
                  onChange={(e) => setCustomCategory(e.target.value)}
                  className={inputCls}
                />
                {customCategory.trim() && (
                  <p className="text-[11px] text-slate-500 font-medium">
                    A new {type === 'collection' ? 'collection' : 'disbursement'} line will be created on save — no
                    duplicate entry.
                  </p>
                )}
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

              {/* Named (Not On List) Member Chips */}
              {memberNames.length > 0 && (
                <div className="flex flex-wrap gap-1.5 p-2 rounded-lg bg-indigo-50/70 border border-indigo-200">
                  {memberNames.map((name) => (
                    <span
                      key={name}
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-indigo-700 text-white text-[10px] font-bold"
                    >
                      {name}
                      <button
                        type="button"
                        onClick={() => removeMemberName(name)}
                        className="hover:text-indigo-200 transition-colors"
                        aria-label={`Remove ${name}`}
                      >
                        <X className="w-3 h-3" />
                      </button>
                    </span>
                  ))}
                </div>
              )}

              {/* Type-In a Member Name Not On The List */}
              <div className="flex items-center gap-2">
                <div className="relative flex-1">
                  <Users className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-slate-400 pointer-events-none" />
                  <input
                    type="text"
                    value={memberNameInput}
                    onChange={(e) => setMemberNameInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        addMemberName();
                      }
                    }}
                    placeholder="Type a member name not on the list, press Enter"
                    className={`${inputCls} pl-9`}
                  />
                </div>
                <button
                  type="button"
                  onClick={addMemberName}
                  disabled={memberNameInput.trim().length < 2}
                  className="px-3 py-2 rounded-lg bg-indigo-700 hover:bg-indigo-800 text-white text-xs font-bold disabled:opacity-40 transition-colors shrink-0"
                >
                  Add
                </button>
              </div>

              <p className="text-[10px] text-slate-400 font-medium flex items-center gap-1">
                <Users className="w-3 h-3 shrink-0" />
                Select members from the list, or type a name not on the list. Leave blank for General / Non-Member payment.
              </p>
            </div>
          )}

          {/* Receipt / Voucher Attachment */}
          <div className="space-y-1.5">
            <label className={`${labelCls} flex items-center justify-between gap-2`}>
              <span className="flex items-center gap-1"><FileText className="w-3.5 h-3.5 text-emerald-700" /> Receipt / Official Voucher (Optional)</span>
              <span className="text-[10px] text-slate-400 font-medium">JPG, PNG, WebP, PDF &le; 10MB</span>
            </label>
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp,application/pdf"
              onChange={(e) => {
                setFile(e.target.files?.[0] || null);
                setReceiptName('');
              }}
              className="w-full text-xs text-slate-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-700 file:text-white hover:file:bg-emerald-800 cursor-pointer"
            />
            {file && (
              <div className="mt-2 space-y-1">
                <label className="text-[10px] font-bold text-slate-500">Receipt Name (optional)</label>
                <input
                  type="text"
                  value={receiptName}
                  onChange={(e) => setReceiptName(e.target.value)}
                  placeholder={file.name.replace(/\.[^.]+$/, '')}
                  className="w-full text-xs p-2 border rounded-lg border-slate-300"
                />
                <p className="text-[10px] text-slate-400 font-medium">
                  Leave blank to keep original name. Extension (.jpg, .png, etc.) is preserved automatically.
                </p>
              </div>
            )}
            <p className="text-[10px] text-slate-400 font-medium">
              {file ? `Voucher attached: ${receiptName.trim() ? receiptName.trim() + '.' + file.name.split('.').pop() : file.name}` : 'No voucher uploaded — the record shows "Pending Voucher" and nothing is auto-created until you attach a file.'}
            </p>
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