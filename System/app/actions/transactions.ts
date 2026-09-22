'use server';

import fs from 'fs';
import path from 'path';

import { localDb, RECEIPTS_DIR } from '@/lib/db/localDb';
import { ActionResponse, CreateTransactionPayload, Transaction, BudgetCategory, Receipt, Profile } from '@/types';
import { revalidatePath } from 'next/cache';
import { requireUser, requireRole, toPublicProfile, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';

const MAX_RECEIPT_SIZE_BYTES = 10 * 1024 * 1024; // 10MB
const ALLOWED_RECEIPT_TYPES: Record<string, string> = {
  'image/jpeg': 'jpg',
  'image/png': 'png',
  'image/webp': 'webp',
  'application/pdf': 'pdf',
};

/**
 * Fetch all budget categories
 */
export async function getBudgetCategoriesAction(): Promise<ActionResponse<BudgetCategory[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  const categories = localDb.getBudgetCategories();
  return { success: true, message: 'Budget categories fetched.', data: categories };
}

/**
 * Fetch transactions list with joined category, member, and receipt details
 */
export async function getTransactionsAction(
  typeFilter?: 'all' | 'collection' | 'disbursement',
  limit = 1000
): Promise<ActionResponse<Transaction[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  let txs = localDb.getTransactions();

  if (typeFilter && typeFilter !== 'all') {
    txs = txs.filter((t) => t.type === typeFilter);
  }

  // The ledger view scrolls, so no silent truncation of older records.
  const sliced = txs.slice(0, limit);

  return { success: true, message: 'Transactions fetched successfully.', data: sliced };
}

/**
 * Log a new Collection or Disbursement Transaction
 */
export async function createTransactionAction(payload: CreateTransactionPayload): Promise<ActionResponse<Transaction>> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) return UNAUTHORIZED_RESPONSE;

  // Server-side validation
  if (!payload || typeof payload.amount !== 'number' || !isFinite(payload.amount) || payload.amount <= 0) {
    return { success: false, message: 'Please enter a valid positive amount in PHP (₱).' };
  }

  if (!payload.category_id) {
    return { success: false, message: 'Please select a budget category.' };
  }

  if (!['collection', 'disbursement'].includes(payload.type)) {
    return { success: false, message: 'Invalid transaction type.' };
  }

  const category = localDb.getBudgetCategories().find((c) => c.id === payload.category_id);
  if (!category || category.category_type !== payload.type) {
    return { success: false, message: 'Invalid budget category for this transaction type.' };
  }

  let member;
  const payerIdList: string[] = Array.isArray(payload.member_ids) && payload.member_ids.length > 0
    ? payload.member_ids
    : payload.member_id
      ? [payload.member_id]
      : [];
  let selectedMembers: Profile[] = [];
  if (payerIdList.length > 0) {
    const seen = new Set<string>();
    for (const payerId of payerIdList) {
      if (!payerId || seen.has(payerId)) continue;
      const found = localDb.getUserById(payerId);
      if (!found) {
        return { success: false, message: 'Selected member does not exist.' };
      }
      seen.add(payerId);
      selectedMembers.push(found);
    }
    member = selectedMembers[0];
  }

  if (payload.receipt_id) {
    const receiptExists = localDb.getReceipts().some((r) => r.id === payload.receipt_id);
    if (!receiptExists) {
      return { success: false, message: 'Selected receipt does not exist.' };
    }
  }

  // Generate dynamic transaction number (e.g. COL-202608-0042)
  const prefix = payload.type === 'collection' ? 'COL' : 'DISB';
  const timestampStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const transactionNumber = `${prefix}-${timestampStr}-${randomCode}`;

  const newTx: Transaction = {
    id: `tx-${Date.now()}`,
    transaction_number: transactionNumber,
    type: payload.type,
    member_id: selectedMembers.length === 1 ? (selectedMembers[0]?.id ?? null) : null,
    member_ids: selectedMembers.length > 0 ? selectedMembers.map((m) => m.id) : null,
    member: member ? toPublicProfile(member) : undefined,
    members: selectedMembers.length > 0 ? selectedMembers.map((m) => toPublicProfile(m)) : undefined,
    category_id: payload.category_id,
    category: category || undefined,
    receipt_id: payload.receipt_id || null,
    amount: payload.amount,
    transaction_date: payload.transaction_date,
    payment_method: 'cash',
    reference_number: payload.reference_number || null,
    notes: payload.notes || null,
    created_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  localDb.createTransaction(newTx);

  revalidatePath('/dashboard/treasurer');
  revalidatePath('/dashboard');
  return { success: true, message: `Transaction ${transactionNumber} logged successfully.`, data: newTx };
}

/**
 * Register uploaded receipt metadata & save the file into the private uploads folder.
 * Server-side size and MIME validation is enforced here.
 */
export async function uploadReceiptMetadataAction(
  filePathOrDataUrl: string,
  fileName: string,
  clientFileSize: number,
  contentType: string
): Promise<ActionResponse<Receipt>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  if (user.role !== 'admin' && user.role !== 'treasurer') {
    return { success: false, message: 'You do not have permission to upload receipts.' };
  }

  if (typeof filePathOrDataUrl !== 'string' || filePathOrDataUrl.length === 0) {
    return { success: false, message: 'No file data was provided.' };
  }

  if (!filePathOrDataUrl.startsWith('data:image/') && !filePathOrDataUrl.startsWith('data:application/pdf')) {
    return { success: false, message: 'Invalid file type. Only JPG, PNG, WebP images and PDF files are allowed.' };
  }

  const mimeMatch = filePathOrDataUrl.match(/^data:([a-z]+\/[a-z0-9.+-]+);base64,/);
  let mimeType = mimeMatch ? mimeMatch[1] : '';
  if (!mimeType || !ALLOWED_RECEIPT_TYPES[mimeType]) {
    mimeType = contentType && ALLOWED_RECEIPT_TYPES[contentType] ? contentType : 'application/octet-stream';
  }

  const extension = ALLOWED_RECEIPT_TYPES[mimeType] || path.extname(fileName).slice(1).toLowerCase();
  if (!['jpg', 'png', 'webp', 'pdf'].includes(extension)) {
    return { success: false, message: 'Invalid file type. Only JPG, PNG, WebP and PDF files are allowed.' };
  }

  let fileBuffer: Buffer;
  try {
    const base64Clean = filePathOrDataUrl.split(',')[1] || '';
    fileBuffer = Buffer.from(base64Clean, 'base64');
  } catch {
    return { success: false, message: 'The uploaded file data is corrupted.' };
  }

  // Coerce MIME: a real pdf buffer must pass through the pdf branch
  const normalizedMime = extension === 'pdf' ? 'application/pdf' : `image/${extension === 'jpg' ? 'jpeg' : extension}`;

  if (fileBuffer.length === 0) {
    return { success: false, message: 'The uploaded file is empty.' };
  }

  if (fileBuffer.length > MAX_RECEIPT_SIZE_BYTES) {
    return { success: false, message: 'File is too large. Maximum allowed size is 10MB.' };
  }

  try {
    if (!fs.existsSync(RECEIPTS_DIR)) {
      fs.mkdirSync(RECEIPTS_DIR, { recursive: true });
    }

    const cleanFileName = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extension}`;
    fs.writeFileSync(path.join(RECEIPTS_DIR, cleanFileName), fileBuffer);
    const savedPath = `/uploads/receipts/${cleanFileName}`;

    const newReceipt: Receipt = {
      id: `rcpt-${Date.now()}`,
      file_path: savedPath,
      file_name: fileName || cleanFileName,
      file_size: fileBuffer.length,
      content_type: normalizedMime,
      uploader_id: user.id,
      status: 'pending',
      auditor_id: null,
      auditor_notes: null,
      verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    localDb.addReceipt(newReceipt);

    return { success: true, message: 'Receipt uploaded to audit queue.', data: newReceipt };
  } catch (err) {
    console.error('Error writing receipt file:', err);
    return { success: false, message: 'Failed to save the uploaded receipt. Please try again.' };
  }
}

/**
 * Delete a logged transaction record
 */
export async function deleteTransactionAction(id: string): Promise<ActionResponse> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) return UNAUTHORIZED_RESPONSE;

  const success = localDb.deleteTransaction(id);
  if (!success) {
    return { success: false, message: 'Transaction record not found.' };
  }

  revalidatePath('/dashboard/treasurer');
  revalidatePath('/dashboard/auditor');
  revalidatePath('/dashboard');
  return { success: true, message: 'Transaction record deleted successfully.' };
}