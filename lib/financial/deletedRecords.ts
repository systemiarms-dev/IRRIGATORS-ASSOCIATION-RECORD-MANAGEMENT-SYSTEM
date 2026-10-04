import type { DeletedRecordKind } from '@/types';

/**
 * Client-safe constants + helpers for the "Deleted Records" viewer.
 *
 * This module must stay free of server-only imports (db clients, fs, ...) so
 * the Treasurer page can import the labels/filters directly in the browser.
 */

/** Audit-log action written by each financial hard delete. */
export const DELETED_RECORD_ACTIONS: Record<DeletedRecordKind, string> = {
  chart_of_account: 'CHART_OF_ACCOUNT_DELETED',
  fixed_asset: 'FIXED_ASSET_DELETED',
  transaction: 'TRANSACTION_DELETED',
  bulk_clear: 'FINANCIAL_RECORDS_CLEARED',
};

/** Reverse lookup: audit-log action -> record kind. */
export const DELETED_RECORD_KIND_BY_ACTION: Record<string, DeletedRecordKind> = Object.fromEntries(
  Object.entries(DELETED_RECORD_ACTIONS).map(([kind, action]) => [action, kind as DeletedRecordKind])
);

export const DELETED_RECORD_KIND_LABELS: Record<DeletedRecordKind, string> = {
  chart_of_account: 'Chart of Account',
  fixed_asset: 'Fixed Asset',
  transaction: 'Ledger Record',
  bulk_clear: 'Bulk Clear',
};

export const DELETED_RECORD_KIND_BADGES: Record<DeletedRecordKind, string> = {
  chart_of_account: 'bg-emerald-100 text-emerald-800 border-emerald-200',
  fixed_asset: 'bg-sky-100 text-sky-800 border-sky-200',
  transaction: 'bg-rose-100 text-rose-800 border-rose-200',
  bulk_clear: 'bg-amber-100 text-amber-800 border-amber-200',
};

export interface ParsedDeletionDetails {
  label: string;
  snapshot: Record<string, unknown>;
}

/**
 * `audit_logs.details` holds `{"label": "...", "snapshot": {...}}` for every
 * deletion recorded by this feature. Older/plain text entries (or anything
 * unparsable) fall back to a readable label with an empty snapshot.
 */
export function parseDeletionDetails(raw: string | null | undefined): ParsedDeletionDetails {
  const text = (raw || '').trim();
  if (text.startsWith('{')) {
    try {
      const parsed = JSON.parse(text);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        const snapshot =
          parsed.snapshot && typeof parsed.snapshot === 'object' && !Array.isArray(parsed.snapshot)
            ? (parsed.snapshot as ParsedDeletionDetails['snapshot'])
            : {};
        return {
          label: typeof parsed.label === 'string' && parsed.label.trim() ? parsed.label : text,
          snapshot,
        };
      }
    } catch {
      // Not JSON — treat it as a plain-text label below.
    }
  }
  return { label: text || 'Deleted record', snapshot: {} };
}

/** `allocated_amount` -> "Allocated Amount" style labels for the detail list. */
export function labelizeFieldName(key: string): string {
  return key
    .replace(/[_-]+/g, ' ')
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/\b\w/g, (char) => char.toUpperCase());
}
