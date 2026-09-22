import React, { useState } from 'react';
import { createTransactionAction, uploadReceiptMetadataAction } from '@/app/actions/transactions';
import { BudgetCategory, TransactionType, Profile } from '@/types';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { Alert } from '@/components/ui/alert';
import { PlusCircle, X, Loader2, Wallet, FileText } from 'lucide-react';

interface TransactionFormModalProps {
  categories: BudgetCategory[];
  members: Profile[];
  onSuccess: () => void;
  onClose: () => void;
}

export default function TransactionFormModal({ categories, members, onSuccess, onClose }: TransactionFormModalProps) {
  const [type, setType] = useState<TransactionType>('collection');
  const [amount, setAmount] = useState<string>('');
  const [categoryId, setCategoryId] = useState<string>('');
  const [memberIds, setMemberIds] = useState<string[]>([]);
  const [transactionDate, setTransactionDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [referenceNumber, setReferenceNumber] = useState<string>('');
  const [notes, setNotes] = useState<string>('');

  // Receipt file state
  const [file, setFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  const filteredCategories = categories.filter((c) => c.category_type === type);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setErrorMsg(null);

    const numericAmount = parseFloat(amount);
    if (isNaN(numericAmount) || numericAmount <= 0) {
      setErrorMsg('Please enter a valid positive amount in PHP (₱).');
      return;
    }

    if (!categoryId) {
      setErrorMsg('Please select a budget category.');
      return;
    }

    setLoading(true);

    let receiptId: string | null = null;

    if (file) {
      setUploading(true);
      const base64Url = await new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });

      const receiptRes = await uploadReceiptMetadataAction(base64Url, file.name, file.size, file.type);
      setUploading(false);
      if (!receiptRes.success || !receiptRes.data) {
        setLoading(false);
        setErrorMsg(receiptRes.message || 'Failed to upload the receipt voucher. The transaction was NOT saved — please fix the file and try again.');
        return;
      }
      receiptId = receiptRes.data.id;
    }

    const res = await createTransactionAction({
      type,
      amount: numericAmount,
      category_id: categoryId,
      member_id: type === 'collection' && memberIds.length === 1 ? memberIds[0] || null : null,
      member_ids: type === 'collection' && memberIds.length > 0 ? memberIds : null,
      receipt_id: receiptId,
      payment_method: 'cash',
      transaction_date: transactionDate,
      reference_number: referenceNumber || null,
      notes: notes || null,
    });

    setLoading(false);

    if (!res.success) {
      setErrorMsg(res.message);
      return;
    }

    onSuccess();
    onClose();
  }

  return (
    <Dialog open={true} onOpenChange={(open) => { if (!open) onClose(); }}>
      <DialogContent onClose={onClose} className="bg-slate-900 border-slate-800 text-slate-100 max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <DialogTitle className="text-white">Log Financial Transaction</DialogTitle>
              <DialogDescription className="text-slate-400">Record association ISF collections or operational expenses</DialogDescription>
            </div>
          </div>
        </DialogHeader>

        {errorMsg && (
          <Alert variant="destructive">
            {errorMsg}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-xs">
          {/* Type Toggle */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              type="button"
              onClick={() => { setType('collection'); setCategoryId(''); }}
              className={`py-2 rounded-lg font-semibold transition-all ${
                type === 'collection'
                  ? 'bg-emerald-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Collection (ISF / Dues)
            </button>
            <button
              type="button"
              onClick={() => { setType('disbursement'); setCategoryId(''); }}
              className={`py-2 rounded-lg font-semibold transition-all ${
                type === 'disbursement'
                  ? 'bg-rose-600 text-white shadow-md'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Disbursement (Expenses)
            </button>
          </div>

          {/* Amount in PHP */}
          <div>
            <label className="block font-semibold uppercase text-slate-400 mb-1">
              Amount (PHP ₱) *
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-2.5 text-slate-400 font-bold text-sm">₱</span>
              <input
                type="number"
                step="0.01"
                min="0.01"
                required
                value={amount}
                onKeyDown={(e) => {
                  if (e.key === '-' || e.key === 'e' || e.key === 'E') {
                    e.preventDefault();
                  }
                }}
                onChange={(e) => {
                  const val = e.target.value;
                  if (parseFloat(val) < 0) return;
                  setAmount(val);
                }}
                placeholder="2,500.00"
                className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-8 pr-4 py-2 text-sm text-white font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500/50"
              />
            </div>
          </div>

          {/* Budget Category */}
          <div>
            <label className="block font-semibold uppercase text-slate-400 mb-1">
              Budget Category *
            </label>
            <Select value={categoryId || undefined} onValueChange={setCategoryId}>
              <SelectTrigger className="w-full bg-slate-950 border-slate-800 text-slate-200">
                <SelectValue placeholder="Select Category..." />
              </SelectTrigger>
              <SelectContent className="bg-slate-950 border-slate-800 text-slate-50">
                {filteredCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    [{cat.code}] {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Payer Member (Irrigator Farmer) */}
          {type === 'collection' && (
            <div>
              <div className="flex items-center justify-between">
                <label className="block font-semibold uppercase text-slate-400 mb-1">
                  Payer Member (Irrigator Farmer) <span className="text-slate-500 font-normal normal-case text-[10px]">(optional, select one or more)</span>
                </label>
                {memberIds.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setMemberIds([])}
                    className="flex items-center gap-1 text-[10px] font-bold text-rose-400 hover:text-rose-300 transition-colors mb-1"
                  >
                    <X className="w-3 h-3" /> Unselect ({memberIds.length})
                  </button>
                )}
              </div>
              <div className="w-full bg-slate-950 border border-slate-800 rounded-xl px-2 py-2 max-h-40 overflow-y-auto space-y-1">
                {members.length === 0 && (
                  <div className="text-slate-500 text-xs px-2 py-1">No members registered yet.</div>
                )}
                {members.map((m) => {
                  const selected = memberIds.includes(m.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() =>
                        setMemberIds((prev) =>
                          selected ? prev.filter((id) => id !== m.id) : [...prev, m.id]
                        )
                      }
                      className={`w-full flex items-center gap-2 rounded-lg px-2.5 py-1.5 text-left text-xs font-semibold transition-all border ${
                        selected
                          ? 'bg-emerald-500/15 border-emerald-500/40 text-emerald-300'
                          : 'border-transparent text-slate-300 hover:bg-slate-800/60'
                      }`}
                    >
                      <span
                        className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] shrink-0 transition-colors ${
                          selected ? 'bg-emerald-500 border-emerald-500 text-white' : 'border-slate-600 text-transparent'
                        }`}
                      >
                        ✓
                      </span>
                      <span className="truncate">{m.full_name}</span>
                      <span className="ml-auto text-[10px] text-slate-500 normal-case font-medium truncate">
                        {m.farm_location || 'General'}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {/* Payment Method (Cash only) & Date */}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Payment Method
              </label>
              <div className="flex items-center gap-2 w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs font-semibold">
                <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0"></span>
                Cash (Physical Cash)
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1">
                Transaction Date *
              </label>
              <input
                type="date"
                required
                value={transactionDate}
                onChange={(e) => setTransactionDate(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-100 text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-emerald-500/50 [color-scheme:dark] cursor-pointer"
              />
            </div>
          </div>

          {/* Reference Number */}
          <div>
            <label className="block font-semibold uppercase text-slate-400 mb-1">
              Reference / Official Receipt # <span className="text-slate-500 font-normal normal-case text-[10px]">(optional)</span>
            </label>
            <input
              type="text"
              value={referenceNumber}
              onChange={(e) => setReferenceNumber(e.target.value)}
              placeholder="e.g. OR-991204 or Voucher #104"
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          {/* Upload Receipt File */}
          <div>
            <label className="block font-semibold uppercase text-slate-400 mb-1">
              Upload Receipt / Voucher Image <span className="text-slate-500 font-normal normal-case text-[10px]">(optional, JPG or PNG only)</span>
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept="image/jpeg,image/png,image/jpg"
                onChange={(e) => {
                  const selected = e.target.files?.[0] || null;
                  if (selected && !['image/jpeg', 'image/png', 'image/jpg'].includes(selected.type)) {
                    setErrorMsg('Invalid file type. Only JPG and PNG image files are allowed.');
                    setFile(null);
                    e.target.value = '';
                    return;
                  }
                  setErrorMsg(null);
                  setFile(selected);
                }}
                className="block w-full text-xs text-slate-400 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-semibold file:bg-emerald-500/10 file:text-emerald-400 hover:file:bg-emerald-500/20"
              />
            </div>
            {file && (
              <div className="text-[11px] text-emerald-400 mt-1 flex items-center gap-1">
                <FileText className="w-3.5 h-3.5" /> File selected: {file.name} ({Math.round(file.size / 1024)} KB)
              </div>
            )}
          </div>

          {/* Notes */}
          <div>
            <label className="block font-semibold uppercase text-slate-400 mb-1">
              Transaction Notes <span className="text-slate-500 font-normal normal-case text-[10px]">(optional)</span>
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Operational details, canal lateral location, pump fuel volume, etc."
              className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-slate-200"
            />
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={loading || uploading}
            className="w-full bg-emerald-600 hover:bg-emerald-500 text-white font-semibold py-2.5 rounded-xl shadow-lg shadow-emerald-600/20 transition-all flex items-center justify-center gap-2 text-sm disabled:opacity-50"
          >
            {loading || uploading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <PlusCircle className="w-4 h-4" /> Save Financial Entry
              </>
            )}
          </button>
        </form>
      </DialogContent>
    </Dialog>
  );
}
