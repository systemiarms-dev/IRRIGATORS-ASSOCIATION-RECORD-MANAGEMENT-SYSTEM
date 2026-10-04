import { localDb } from '@/lib/db/localDb';
import type { DeletedRecordKind } from '@/types';
import { DELETED_RECORD_ACTIONS } from '@/lib/financial/deletedRecords';

export type DeletionSnapshot = Record<string, unknown>;

interface RecordDeletionInput {
  userId: string;
  associationId?: string | null;
  kind: DeletedRecordKind;
  entityId?: string | null;
  /** Readable one-liner shown in the Deleted Records list. */
  label: string;
  /** Field-by-field copy of the row as it looked before it was removed. */
  snapshot?: DeletionSnapshot;
}

/**
 * Writes the audit-log entry that feeds the Treasurer's "Deleted Records"
 * viewer. Server-only (touches the database) — never import this from a
 * client component; use `lib/financial/deletedRecords` constants instead.
 *
 * Failures are swallowed on purpose: the row is already gone, and a missing
 * audit entry must never roll back or fail the user's delete action.
 */
export async function recordDeletion(input: RecordDeletionInput): Promise<void> {
  try {
    await localDb.addAuditLog({
      user_id: input.userId,
      association_id: input.associationId ?? null,
      action: DELETED_RECORD_ACTIONS[input.kind],
      entity_type: input.kind === 'transaction' ? 'transactions' : 'budget_categories',
      entity_id: input.entityId || null,
      details: JSON.stringify({ label: input.label, snapshot: input.snapshot || {} }),
    });
  } catch (error) {
    console.error('Failed to record deletion in audit log:', error);
  }
}
