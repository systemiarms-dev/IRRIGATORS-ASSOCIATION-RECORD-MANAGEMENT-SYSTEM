'use server';

import path from 'path';

import { localDb, RECEIPTS_BUCKET } from '@/lib/db/localDb';
import { removeReceiptStorageObject } from '@/lib/storage/receipts';
import { getSupabaseServerClient } from '@/lib/supabase/server';
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
 * Detect the real file type from its leading magic bytes.
 * Returns null when the signature is unknown/unsupported.
 */
function sniffMimeType(buffer: Buffer): string {
  if (buffer.length < 8) return '';
  if (buffer[0] === 0x89 && buffer[1] === 0x50 && buffer[2] === 0x4e && buffer[3] === 0x47) return 'image/png';
  if (buffer[0] === 0xff && buffer[1] === 0xd8) return 'image/jpeg';
  if (buffer[0] === 0x52 && buffer[1] === 0x49 && buffer[2] === 0x46 && buffer[3] === 0x46 && buffer[8] === 0x57 && buffer[9] === 0x45 && buffer[10] === 0x42 && buffer[11] === 0x50) return 'image/webp';
  if (buffer[0] === 0x25 && buffer[1] === 0x50 && buffer[2] === 0x44 && buffer[3] === 0x46) return 'application/pdf';
  return '';
}

/**
 * JPEG and PNG uploads can arrive with slightly different declared MIMEs
 * (e.g. image/pjpeg) or with browser quirks. Accept an exact match, or when
 * both the declared and sniffed types belong to the same media family.
 */
function isImageVariant(declared: string, sniffed: string): boolean {
  const d = (declared || '').toLowerCase();
  const s = (sniffed || '').toLowerCase();
  if (d === s) return true;
  const dFamily = d.split('/')[0];
  const sFamily = s.split('/')[0];
  return d.startsWith('image/') && s.startsWith('image/') && dFamily === sFamily;
}

/**
 * Register a brand-new budget category (user-defined line item) in Supabase.
 * Code is auto-generated so the transaction can pick it up immediately.
 */
export async function createBudgetCategoryAction(input: {
  name: string;
  category_type: 'collection' | 'disbursement';
  association_id?: string;
}): Promise<ActionResponse<BudgetCategory>> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) return UNAUTHORIZED_RESPONSE;

  const name = (input.name || '').trim();
  if (name.length < 2) {
    return { success: false, message: 'Please enter a custom category name (at least 2 characters).' };
  }
  if (!['collection', 'disbursement'].includes(input.category_type)) {
    return { success: false, message: 'Invalid category type.' };
  }

  // Non-super admins/treasurers may only create categories in their own association;
  // super admins must explicitly pick one so a custom category is never orphaned.
  let targetAssoc: string | null = null;
  if (user.role === 'super_admin') {
    if (!input.association_id) {
      return {
        success: false,
        message: 'Please choose the target Irrigators Association before adding a custom category. It cannot be blank when the scope is All Associations (Consolidated).',
      };
    }
    targetAssoc = input.association_id;
  } else {
    targetAssoc = user.association_id || null;
    if (!targetAssoc) {
      return { success: false, message: 'Your account is not linked to an association. Please ask the head admin to link your account, then retry.' };
    }
  }

  try {
    const category: BudgetCategory = {
      id: `cat-${Date.now()}`,
      code: `${input.category_type === 'collection' ? 'REC' : 'DISB'}-CUSTOM-${Date.now()}`,
      name,
      category_type: input.category_type,
      allocated_amount: 0,
      is_active: true,
      association_id: targetAssoc,
    };
    const created = await localDb.createBudgetCategory(category);
    return { success: true, message: 'Custom category added to the chart of accounts.', data: created };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error creating custom category.' };
  }
}

/**
 * Fetch all budget categories for an association directly from Supabase
 */
export async function getBudgetCategoriesAction(associationId?: string): Promise<ActionResponse<BudgetCategory[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  const effectiveAssoc = user.role === 'super_admin' ? associationId : (user.association_id || undefined);
  try {
    const categories = await localDb.getBudgetCategories(effectiveAssoc);
    return { success: true, message: 'Budget categories fetched.', data: categories };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching budget categories.' };
  }
}

/**
 * Fetch transactions list with joined category, member, and receipt details from Supabase
 */
export async function getTransactionsAction(
  associationIdFilter?: string,
  typeFilter?: 'all' | 'collection' | 'disbursement',
  limit = 1000
): Promise<ActionResponse<Transaction[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  let effectiveAssoc = associationIdFilter;
  if (user.role !== 'super_admin') {
    effectiveAssoc = user.association_id || undefined;
  }

  try {
    const txs = await localDb.getTransactions(effectiveAssoc, typeFilter);
    const sliced = txs.slice(0, limit);
    return { success: true, message: 'Transactions fetched successfully.', data: sliced };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching transactions.' };
  }
}

/**
 * Log a new Collection or Disbursement Transaction directly into Supabase
 */
export async function createTransactionAction(payload: CreateTransactionPayload): Promise<ActionResponse<Transaction>> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) return UNAUTHORIZED_RESPONSE;

  // Determine target association - strictly force non-superadmins to their own association,
  // and require super admins to explicitly pick one (never silently fall back to the first one).
  let targetAssociationId = user.association_id;
  if (user.role === 'super_admin') {
    if (!payload.association_id) {
      return {
        success: false,
        message: 'Please choose the target Irrigators Association. It cannot be blank when the scope is All Associations (Consolidated).',
      };
    }
    targetAssociationId = payload.association_id;
  } else if (!targetAssociationId) {
    return { success: false, message: 'Your account is not linked to an association. Please ask the head admin to link your account, then retry.' };
  }

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

  const allCats = await localDb.getBudgetCategories();
  const category = allCats.find((c) => c.id === payload.category_id);
  if (!category || category.category_type !== payload.type) {
    return { success: false, message: 'Invalid budget category for this transaction type.' };
  }

  let member: Profile | undefined;
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
      const found = await localDb.getUserById(payerId);
      if (!found) {
        return { success: false, message: 'Selected member does not exist.' };
      }
      seen.add(payerId);
      selectedMembers.push(found);
    }
    member = selectedMembers[0];
  }

  // Generate dynamic transaction number (e.g. COL-202608-0042)
  const prefix = payload.type === 'collection' ? 'COL' : 'DISB';
  const timestampStr = new Date().toISOString().slice(0, 7).replace('-', '');
  const randomCode = Math.floor(1000 + Math.random() * 9000);
  const transactionNumber = `${prefix}-${timestampStr}-${randomCode}`;

  const newTx: Transaction = {
    id: `tx-${Date.now()}`,
    transaction_number: transactionNumber,
    voucher_number: payload.voucher_number?.trim() || null,
    type: payload.type,
    association_id: targetAssociationId,
    member_id: selectedMembers.length === 1 ? (selectedMembers[0]?.id ?? null) : null,
    member_ids: selectedMembers.length > 0 ? selectedMembers.map((m) => m.id) : null,
    member: member ? toPublicProfile(member) : undefined,
    members: selectedMembers.length > 0 ? selectedMembers.map((m) => toPublicProfile(m)) : undefined,
    category_id: payload.category_id,
    category: category || undefined,
    receipt_id: payload.receipt_id || null,
    amount: payload.amount,
    transaction_date: payload.transaction_date,
    payment_method: payload.payment_method || 'cash',
    reference_number: payload.reference_number?.trim() || null,
    payee_name: payload.payee_name?.trim() || null,
    lateral_section: payload.lateral_section?.trim() || null,
    particulars: payload.particulars?.trim() || null,
    notes: payload.notes?.trim() || null,
    created_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    // Insert only real table columns - joined objects (member/members/category) are not
    // columns in the `transactions` table and would make PostgREST reject the insert.
    const { member: _member, members: _members, category: _category, ...dbRow } = newTx;
    await localDb.createTransaction(dbRow as Transaction);
    revalidatePath('/dashboard/treasurer');
    revalidatePath('/dashboard');
    return { success: true, message: `Transaction ${transactionNumber} logged successfully.`, data: newTx };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error creating transaction in Supabase.' };
  }
}

/**
 * Register uploaded receipt metadata in Supabase
 */
export async function uploadReceiptMetadataAction(
  filePathOrDataUrl: string,
  fileName: string,
  clientFileSize: number,
  contentType: string,
  associationId?: string
): Promise<ActionResponse<Receipt>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  if (user.role !== 'super_admin' && user.role !== 'admin' && user.role !== 'treasurer') {
    return { success: false, message: 'You do not have permission to upload receipts.' };
  }

  // Determine the receiving association - strictly force non-superadmins to their
  // own association so the receipt lands in the correct association's audit queue.
  // Super admins must explicitly supply one - never silently fall back mid-action.
  let effectiveAssocId = associationId;
  if (user.role !== 'super_admin') {
    effectiveAssocId = user.association_id || effectiveAssocId || undefined;
  }
  if (!effectiveAssocId) {
    return {
      success: false,
      message: 'Please choose the target Irrigators Association. It cannot be blank when the scope is All Associations (Consolidated).',
    };
  }
  if (user.role !== 'super_admin' && user.role === 'admin' && !user.association_id) {
    return { success: false, message: 'Your account is not linked to an association. Please ask the head admin to link your account, then retry.' };
  }

  if (typeof filePathOrDataUrl !== 'string' || filePathOrDataUrl.length === 0) {
    return { success: false, message: 'No file data was provided.' };
  }

  // When the client sends a base64 data URL, persist the actual file (Storage or disk) so the
  // uploads route can serve it later.
  let storedFilePath: string = '';
  if (filePathOrDataUrl.startsWith('data:')) {
    const match = filePathOrDataUrl.match(/^data:([^;]+);base64,(.+)$/i);
    if (!match) {
      return { success: false, message: 'Invalid file data format.' };
    }
    const fileMime = match[1].toLowerCase();
    const ext = ALLOWED_RECEIPT_TYPES[fileMime];
    if (!ext) {
      return { success: false, message: `File type ${fileMime} is not supported. Use JPG, PNG, WEBP, or PDF.` };
    }
    if (clientFileSize > MAX_RECEIPT_SIZE_BYTES) {
      return { success: false, message: 'Receipt file is too large. Maximum allowed size is 10MB.' };
    }

    const base64Data = match[2].replace(/\s+/g, '');
    const buffer = Buffer.from(base64Data, 'base64');

    if (clientFileSize > 0 && buffer.length !== clientFileSize) {
      return { success: false, message: 'Receipt file upload was corrupted. Please try again.' };
    }

    // Validate the real file signature (magic bytes) matches the declared MIME
    // so a mislabeled file cannot bypass the allow-list.
    const sniffedMime = sniffMimeType(buffer);
    if (!sniffedMime || (fileMime !== sniffedMime && !isImageVariant(fileMime, sniffedMime))) {
      return {
        success: false,
        message: `File type mismatch. Detected ${sniffedMime || 'unknown'}, expected ${fileMime}. Use a valid JPG, PNG, WEBP, or PDF file.`,
      };
    }

    const safeName = `${Date.now()}-${path.basename(fileName || 'receipt').replace(/[^a-zA-Z0-9._-]/g, '_')}.${ext}`;
    let uploadedToStorage = false;

    // Persist the file into the Supabase Storage bucket.
    const storageClient = getSupabaseServerClient();
    if (storageClient) {
      try {
        const { data: buckets } = await storageClient.storage.listBuckets();
        if (!buckets?.some((b) => b.name === RECEIPTS_BUCKET)) {
          await storageClient.storage.createBucket(RECEIPTS_BUCKET, { public: false });
        }
      } catch {
        // bucket was already ensured by another call
      }

      const objectKey = `${effectiveAssocId}/${safeName}`;
      const { error: uploadError } = await storageClient.storage
        .from(RECEIPTS_BUCKET)
        .upload(objectKey, new Blob([buffer], { type: fileMime }), {
          contentType: fileMime,
          cacheControl: '3600',
          upsert: false,
        });

      if (!uploadError) {
        storedFilePath = `/uploads/receipts/${objectKey}`;
        uploadedToStorage = true;
      }
    }

    if (!uploadedToStorage) {
      return { success: false, message: 'Receipt storage is unavailable. Please configure Supabase Storage and try again.' };
    }
  } else if (filePathOrDataUrl.startsWith('/uploads/')) {
    storedFilePath = filePathOrDataUrl;
  } else {
    return { success: false, message: 'Unsupported file reference. Upload the file so it is stored securely.' };
  }

  const newReceipt: Receipt = {
    id: `rcpt-${Date.now()}`,
    file_path: storedFilePath,
    file_name: fileName,
    file_size: clientFileSize || 0,
    content_type: contentType || 'image/jpeg',
    uploader_id: user.id,
    association_id: effectiveAssocId,
    status: 'pending',
    auditor_id: null,
    auditor_notes: null,
    verified_at: null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  try {
    await localDb.addReceipt(newReceipt);
    return { success: true, message: 'Receipt uploaded to audit queue.', data: newReceipt };
  } catch (err: any) {
    return { success: false, message: err.message || 'Failed to save receipt to Supabase.' };
  }
}

/**
 * Delete a logged transaction record from Supabase
 */
export async function deleteTransactionAction(id: string): Promise<ActionResponse> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) return UNAUTHORIZED_RESPONSE;

  try {
    const tx = await localDb.getTransactionById(id);
    if (!tx) {
      return { success: false, message: 'Transaction record not found.' };
    }

    // Cross-association write protection: officers may only delete records of their own IA.
    if (user.role !== 'super_admin' && tx.association_id && tx.association_id !== user.association_id) {
      return UNAUTHORIZED_RESPONSE;
    }

    const linkedReceiptId = tx.receipt_id;
    const linkedReceipt = tx.receipt;

    const success = await localDb.deleteTransaction(id);
    if (!success) {
      return { success: false, message: 'Transaction record not found.' };
    }

    let note = '';
    if (linkedReceiptId) {
      try {
        const otherRefs = await localDb.countTransactionsReferencingReceipt(linkedReceiptId, id);
        if (otherRefs === 0) {
          await localDb.deleteReceipt(linkedReceiptId);
        }
      } catch (err: any) {
        note = 'The linked receipt record could not be removed.';
      }
    }

    if (linkedReceipt?.file_path) {
      const removed = await removeReceiptStorageObject(linkedReceipt.file_path);
      if (!removed) {
        note = note ? `${note} The receipt file could not be removed from storage.` : 'The receipt file could not be removed from storage.';
      }
    }

    revalidatePath('/dashboard/treasurer');
    revalidatePath('/dashboard/auditor');
    revalidatePath('/dashboard');
    return { success: true, message: note ? `Transaction record deleted. ${note}` : 'Transaction record deleted successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error deleting transaction from Supabase.' };
  }
}