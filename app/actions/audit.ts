'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, Receipt, VerificationStatus } from '@/types';
import { revalidatePath } from 'next/cache';
import { requireUser, requireRole, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';

/**
 * Bulk-verify all pending receipts currently visible in the auditor queue.
 * Super Admin applies to the selected association scope (or all when 'all');
 * other roles are always scoped to their own association.
 */
export async function auditVerifyAllPendingAction(
  associationIdFilter?: string,
  notes?: string
): Promise<ActionResponse<{ verified: number }>> {
  const user = await requireRole('admin', 'auditor');
  if (!user) return UNAUTHORIZED_RESPONSE;

  let effectiveAssoc = associationIdFilter;
  if (user.role !== 'super_admin') {
    effectiveAssoc = user.association_id || undefined;
  }

  try {
    const pendingReceipts = await localDb.getReceipts(effectiveAssoc, 'pending');
    if (pendingReceipts.length === 0) {
      return { success: false, message: 'There are no pending receipts in this scope to verify.' };
    }

    const pendingIds = pendingReceipts.map((r) => r.id).filter((id): id is string => Boolean(id));
    const count = await localDb.updateReceiptsStatus(
      pendingIds,
      'verified',
      notes?.trim() || undefined,
      user.id
    );

    await localDb.addAuditLog({
      user_id: user.id,
      association_id: user.association_id || null,
      action: 'RECEIPT_AUDIT_VERIFIED_BULK',
      entity_type: 'receipts',
      entity_id: pendingIds.slice(0, 50).join(','),
      details: `Bulk verified ${count} pending receipt(s)${notes?.trim() ? ` with note: ${notes.trim()}` : ''}`,
    });

    revalidatePath('/dashboard/auditor');
    revalidatePath('/dashboard');
    return { success: true, message: `Verified ${count} pending receipt${count === 1 ? '' : 's'}.`, data: { verified: count } };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error bulk-verifying pending receipts.' };
  }
}

/**
 * Fetch receipts queue for Auditor verification directly from Supabase
 */
export async function getReceiptQueueAction(
  statusFilter?: VerificationStatus | 'all',
  associationIdFilter?: string
): Promise<ActionResponse<Receipt[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  let effectiveAssoc = associationIdFilter;
  if (user.role !== 'super_admin') {
    effectiveAssoc = user.association_id || undefined;
  }

  try {
    const receipts = await localDb.getReceipts(effectiveAssoc, statusFilter);
    return { success: true, message: 'Receipt verification queue fetched.', data: receipts };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching receipts queue from Supabase.' };
  }
}

/**
 * Update audit verification status (Verified, Flagged, Rejected) in Supabase
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

  try {
    const receipt = await localDb.getReceiptById(receiptId);
    if (!receipt) {
      return { success: false, message: 'Receipt record not found.' };
    }

    // Cross-association write protection: officers may only audit receipts of their own IA.
    if (user.role !== 'super_admin' && receipt.association_id && receipt.association_id !== user.association_id) {
      return UNAUTHORIZED_RESPONSE;
    }

    const updated = await localDb.updateReceiptStatus(receiptId, newStatus, notes, user.id);

    if (!updated) {
      return { success: false, message: 'Receipt record not found.' };
    }

    await localDb.addAuditLog({
      user_id: user.id,
      association_id: updated.association_id || null,
      action: `RECEIPT_AUDIT_${newStatus.toUpperCase()}`,
      entity_type: 'receipts',
      entity_id: receiptId,
      details: `Updated receipt verification status to ${newStatus}`,
    });

    revalidatePath('/dashboard/auditor');
    revalidatePath('/dashboard');
    return { success: true, message: `Receipt status marked as ${newStatus}.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error updating receipt status in Supabase.' };
  }
}