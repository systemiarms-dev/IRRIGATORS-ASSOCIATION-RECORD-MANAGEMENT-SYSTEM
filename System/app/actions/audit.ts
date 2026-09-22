'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, Receipt, VerificationStatus } from '@/types';
import { revalidatePath } from 'next/cache';
import { requireUser, requireRole, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';

/**
 * Fetch receipts queue for Auditor verification
 */
export async function getReceiptQueueAction(statusFilter?: VerificationStatus | 'all'): Promise<ActionResponse<Receipt[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  let receipts = localDb.getReceipts();
  const transactions = localDb.getTransactions();
  const users = localDb.getUsers();

  const populated = receipts.map((r) => {
    const uploader = users.find((u) => u.id === r.uploader_id);
    const transaction = transactions.find((t) => t.receipt_id === r.id);
    return {
      ...r,
      uploader: uploader || r.uploader,
      transaction,
    };
  });

  if (statusFilter && statusFilter !== 'all') {
    return {
      success: true,
      message: 'Receipt verification queue fetched.',
      data: populated.filter((r) => r.status === statusFilter),
    };
  }

  return { success: true, message: 'Receipt verification queue fetched.', data: populated };
}

/**
 * Update audit verification status (Verified, Flagged, Rejected) and attach auditor notes
 */
export async function auditVerifyReceiptAction(
  receiptId: string,
  newStatus: VerificationStatus,
  notes?: string
): Promise<ActionResponse> {
  const user = await requireRole('admin', 'auditor');
  if (!user) return UNAUTHORIZED_RESPONSE;

  if (!['pending', 'verified', 'flagged', 'rejected'].includes(newStatus)) {
    return { success: false, message: 'Invalid verification status.' };
  }

  const updated = localDb.updateReceiptStatus(receiptId, newStatus, notes);

  if (!updated) {
    return { success: false, message: 'Receipt record not found.' };
  }

  // Record Audit log entry
  localDb.addAuditLog({
    user_id: user.id,
    action: `RECEIPT_AUDIT_${newStatus.toUpperCase()}`,
    entity_type: 'receipts',
    entity_id: receiptId,
    details: `Updated receipt verification status to ${newStatus}`,
  });

  revalidatePath('/dashboard/auditor');
  revalidatePath('/dashboard');
  return { success: true, message: `Receipt status marked as ${newStatus}.` };
}