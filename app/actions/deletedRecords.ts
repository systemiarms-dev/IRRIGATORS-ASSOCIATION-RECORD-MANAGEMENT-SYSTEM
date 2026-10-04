'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, AuditLog, DeletedRecordEntry, DeletedRecordKind, Transaction } from '@/types';
import { requireUser, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';
import { revalidatePath } from 'next/cache';
import {
  DELETED_RECORD_ACTIONS,
  DELETED_RECORD_KIND_BY_ACTION,
  DELETED_RECORD_KIND_LABELS,
  labelizeFieldName,
  parseDeletionDetails,
} from '@/lib/financial/deletedRecords';

/** How many audit-log rows are inspected per request (deletions are rare). */
const AUDIT_LOG_SCAN_LIMIT = 250;

const snapString = (value: unknown): string =>
  value === null || value === undefined ? '' : String(value).trim();

const snapNumber = (value: unknown): number | null => {
  if (value === null || value === undefined || value === '') return null;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : null;
};

const joinParts = (...parts: Array<string | null | undefined>): string =>
  parts.filter((part): part is string => Boolean(part && part.trim())).join(' • ');

function buildTitle(kind: DeletedRecordKind, label: string, snapshot: Record<string, unknown>): string {
  if (kind === 'transaction') {
    const txNumber = snapString(snapshot.transaction_number);
    const voucher = snapString(snapshot.voucher_number);
    if (txNumber) return voucher ? `${txNumber} / ${voucher}` : txNumber;
  }
  if (kind === 'chart_of_account') {
    const code = snapString(snapshot.code);
    const name = snapString(snapshot.name);
    if (code && name) return `${code} — ${name}`;
    if (name) return name;
    if (code) return code;
  }
  if (kind === 'fixed_asset') {
    const name = snapString(snapshot.name);
    if (name) return name;
  }
  return label;
}

function buildSummary(kind: DeletedRecordKind, snapshot: Record<string, unknown>): string {
  if (kind === 'transaction') {
    const type = snapString(snapshot.type);
    return joinParts(
      type ? (type === 'collection' ? 'Collection (Money IN)' : 'Disbursement (Money OUT)') : null,
      snapString(snapshot.category) || snapString(snapshot.category_id) || null,
      snapString(snapshot.payee_name) || null,
      snapString(snapshot.transaction_date) || null,
      snapString(snapshot.particulars) || snapString(snapshot.notes) || null
    );
  }

  if (kind === 'chart_of_account') {
    const type = snapString(snapshot.category_type);
    const classification = snapString(snapshot.account_classification);
    const inactive = snapshot.is_active === false || snapshot.is_active === 'false';
    return joinParts(
      type ? (type === 'collection' ? 'Collection account' : 'Disbursement account') : null,
      classification ? labelizeFieldName(classification) : null,
      inactive ? 'Was Inactive' : null
    );
  }

  if (kind === 'fixed_asset') {
    const assetType = snapString(snapshot.asset_type);
    return joinParts(
      assetType ? labelizeFieldName(assetType) : null,
      snapString(snapshot.date_acquired) ? `Acquired ${snapString(snapshot.date_acquired)}` : null
    );
  }

  return 'All ledger records, receipts, and statements in scope were removed in one action.';
}

function buildAmount(kind: DeletedRecordKind, snapshot: Record<string, unknown>): number | null {
  if (kind === 'transaction') return snapNumber(snapshot.amount);
  if (kind === 'chart_of_account') {
    const allocated = snapNumber(snapshot.allocated_amount);
    return allocated && allocated !== 0 ? allocated : null;
  }
  if (kind === 'fixed_asset') return snapNumber(snapshot.acquisition_cost);
  return null;
}

function toDeletedRecordEntry(log: AuditLog, deletedByName: string): DeletedRecordEntry | null {
  const kind = DELETED_RECORD_KIND_BY_ACTION[log.action];
  if (!kind) return null;

  const { label, snapshot } = parseDeletionDetails(log.details);
  const snap: Record<string, unknown> = snapshot;

  return {
    id: log.id,
    kind,
    action: log.action,
    entity_id: log.entity_id || null,
    association_id: log.association_id || null,
    title: buildTitle(kind, label, snap),
    summary: buildSummary(kind, snap) || DELETED_RECORD_KIND_LABELS[kind],
    amount: buildAmount(kind, snap),
    deleted_by: log.user_id,
    deleted_by_name: deletedByName,
    deleted_at: log.created_at,
    details: label,
    snapshot,
  };
}

/**
 * Fetch the deleted LEDGER records (Collections & Disbursements) so the
 * Treasurer can inspect and restore them.
 *
 * The viewer belongs to the Treasurer alone — every other role is refused
 * server-side, and the scope stays limited to the Treasurer's own association
 * (plus association-wide entries logged with a null scope).
 */
export async function getDeletedRecordsAction(): Promise<ActionResponse<DeletedRecordEntry[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;
  if (user.role !== 'treasurer') {
    return {
      success: false,
      message: 'Only the Treasurer can view deleted records.',
      data: [],
    };
  }

  const effectiveAssoc = user.association_id || undefined;

  try {
    const logs = await localDb.getAuditLogs(effectiveAssoc, AUDIT_LOG_SCAN_LIMIT);

    // Ledger records only — Chart of Accounts / asset / bulk entries stay out.
    const entries = logs
      .filter((log) => log.action === DELETED_RECORD_ACTIONS.transaction)
      .map((log) => ({ log, entry: toDeletedRecordEntry(log, '') }))
      .filter((row): row is { log: AuditLog; entry: DeletedRecordEntry } => Boolean(row.entry))
      .sort((a, b) => (a.log.created_at < b.log.created_at ? 1 : -1));

    // Resolve who deleted each record (one lookup per distinct user).
    const userIds = [...new Set(entries.map(({ log }) => log.user_id).filter(Boolean))];
    const profiles = await Promise.all(
      userIds.map((id) => localDb.getUserById(id).catch(() => undefined))
    );
    const nameById = new Map(
      userIds.map((id, index) => [id, profiles[index]?.full_name || profiles[index]?.username || 'System User'])
    );

    return {
      success: true,
      message: `${entries.length} deleted ledger record${entries.length === 1 ? '' : 's'} found.`,
      data: entries.map(({ log, entry }) => ({
        ...entry,
        deleted_by_name: nameById.get(log.user_id) || 'Unknown user',
      })),
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching deleted records.' };
  }
}

const snapText = (value: unknown): string | null => {
  if (value === null || value === undefined) return null;
  const text = String(value).trim();
  return text ? text : null;
};

const snapIdList = (value: unknown): string[] | null => {
  if (Array.isArray(value)) {
    const ids = value.map((item) => String(item)).filter(Boolean);
    return ids.length > 0 ? ids : null;
  }
  const text = snapText(value);
  if (!text) return null;
  const ids = text.split(',').map((item) => item.trim()).filter(Boolean);
  return ids.length > 0 ? ids : null;
};

/**
 * Put a deleted ledger record back into the Collections & Disbursements
 * ledger, then retire its Deleted Records entry.
 *
 * The restore is rebuilt from the snapshot captured at deletion time and every
 * foreign key is re-checked first: a member, category, receipt or association
 * that no longer exists cannot silently break the ledger.
 */
export async function restoreDeletedRecordAction(
  auditLogId: string
): Promise<ActionResponse<Transaction>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;
  if (user.role !== 'treasurer') {
    return { success: false, message: 'Only the Treasurer can restore deleted records.' };
  }

  try {
    const log = await localDb.getAuditLogById(auditLogId);
    if (!log || log.action !== DELETED_RECORD_ACTIONS.transaction) {
      return { success: false, message: 'Deleted record not found. It may have already been restored.' };
    }

    const { snapshot } = parseDeletionDetails(log.details);
    const associationId = snapText(snapshot.association_id) || (log.association_id ? String(log.association_id) : null);
    const categoryId = snapText(snapshot.category_id);
    const transactionNumber = snapText(snapshot.transaction_number);
    const transactionDate = snapText(snapshot.transaction_date);
    const amount = Number(snapshot.amount);

    if (!associationId || !categoryId || !transactionNumber || !transactionDate || !Number.isFinite(amount) || amount <= 0) {
      return {
        success: false,
        message: 'This deleted record does not hold enough information to be restored.',
      };
    }

    // Cross-association protection: a Treasurer restores only their own IA's rows.
    if (user.association_id && associationId !== user.association_id) {
      return UNAUTHORIZED_RESPONSE;
    }

    const association = await localDb.getAssociationById(associationId).catch(() => undefined);
    if (!association) {
      return { success: false, message: 'The association linked to this record no longer exists.' };
    }

    const categories = await localDb.getBudgetCategories(associationId);
    if (!categories.some((category) => category.id === categoryId)) {
      return {
        success: false,
        message: 'The Chart of Accounts entry used by this record no longer exists. Recreate the account first, then restore this record.',
      };
    }

    // Re-check the ledger so a reused transaction number never corrupts it.
    const currentRows = await localDb.getTransactions(associationId);
    const idTaken = currentRows.some((row) => row.id === snapshot.id);
    if (currentRows.some((row) => row.transaction_number === transactionNumber)) {
      return {
        success: false,
        message: `Transaction number ${transactionNumber} is already used by another ledger record. Restore is not possible.`,
      };
    }

    const memberId = snapText(snapshot.member_id);
    const memberExists = memberId
      ? Boolean(await localDb.getUserById(memberId).catch(() => undefined))
      : false;

    const createdBy = snapText(snapshot.created_by);
    const creatorExists = createdBy
      ? Boolean(await localDb.getUserById(createdBy).catch(() => undefined))
      : false;

    const receiptId = snapText(snapshot.receipt_id);
    let restoredReceiptId: string | null = null;
    if (receiptId) {
      restoredReceiptId = (await localDb.getReceiptById(receiptId).catch(() => undefined))?.id || null;
    }

    const restoredRow = {
      id: idTaken ? `tx-${Date.now()}` : snapText(snapshot.id) || `tx-${Date.now()}`,
      transaction_number: transactionNumber,
      voucher_number: snapText(snapshot.voucher_number),
      type: snapshot.type === 'disbursement' ? ('disbursement' as const) : ('collection' as const),
      association_id: associationId,
      // Deleted payers/creators are unlinked instead of failing the insert.
      member_id: memberId && memberExists ? memberId : null,
      member_ids: snapIdList(snapshot.member_ids),
      category_id: categoryId,
      receipt_id: restoredReceiptId,
      amount,
      transaction_date: transactionDate,
      payment_method: snapText(snapshot.payment_method) || 'cash',
      reference_number: snapText(snapshot.reference_number),
      payee_name: snapText(snapshot.payee_name),
      lateral_section: snapText(snapshot.lateral_section),
      particulars: snapText(snapshot.particulars),
      notes: snapText(snapshot.notes),
      created_by: createdBy && creatorExists ? createdBy : user.id,
      created_at: snapText(snapshot.created_at) || new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await localDb.createTransaction(restoredRow as unknown as Transaction);

    // The row is back in the ledger — drop it from Deleted Records.
    await localDb.deleteAuditLog(auditLogId);

    revalidatePath('/dashboard/treasurer');
    revalidatePath('/dashboard/auditor');
    revalidatePath('/dashboard/statements');
    revalidatePath('/dashboard');

    const restored = (await localDb.getTransactionById(restoredRow.id)) || undefined;
    const receiptNote = receiptId && !restoredReceiptId
      ? ' The receipt image attached to it was removed with the record and could not be restored.'
      : '';

    return {
      success: true,
      message: `Ledger record ${transactionNumber} restored successfully.${receiptNote}`,
      data: restored,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error restoring the deleted ledger record.' };
  }
}

/**
 * Throw away a Deleted Records entry for good: the snapshot (and with it the
 * only way to bring the ledger record back) is erased permanently. The ledger
 * row itself is already gone — this simply retires its restoration ticket.
 */
export async function permanentlyDeleteRecordAction(auditLogId: string): Promise<ActionResponse> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;
  if (user.role !== 'treasurer') {
    return { success: false, message: 'Only the Treasurer can permanently delete records.' };
  }

  try {
    const log = await localDb.getAuditLogById(auditLogId);
    if (!log || log.action !== DELETED_RECORD_ACTIONS.transaction) {
      return { success: false, message: 'Deleted record not found.' };
    }

    // Cross-association protection: a Treasurer purges only their own IA's rows.
    if (user.association_id && log.association_id && log.association_id !== user.association_id) {
      return UNAUTHORIZED_RESPONSE;
    }

    const { snapshot } = parseDeletionDetails(log.details);
    const transactionNumber = snapText(snapshot.transaction_number) || log.entity_id || 'this record';

    await localDb.deleteAuditLog(auditLogId);

    revalidatePath('/dashboard/treasurer');
    revalidatePath('/dashboard/auditor');
    revalidatePath('/dashboard/statements');
    revalidatePath('/dashboard');

    return {
      success: true,
      message: `Ledger record ${transactionNumber} was permanently deleted and can no longer be restored.`,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error permanently deleting the record.' };
  }
}
