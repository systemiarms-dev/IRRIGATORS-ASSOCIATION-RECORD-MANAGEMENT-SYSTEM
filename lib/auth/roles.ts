import type { UserRole } from '@/types';

/**
 * Roles that may READ records across every association added to the system.
 *
 * - `super_admin`: system-wide read scope (full oversight). Writing in the
 *   Financial Suite is separately denied — see `canWriteFinancialData`.
 * - `bookkeeper`: the single, system-wide Bookkeeper account. It belongs to no
 *   association and may only view the financial reports and records of every
 *   association — it can never create, edit, delete, or modify any data.
 *
 * Read actions use this to decide whether a caller may honour the requested
 * association filter (including "all"/consolidated scope) or must be pinned to
 * their own association. Write actions must NEVER use this helper — mutations
 * stay guarded by `canWriteFinancialData` / `canDecideAuditQueue`, so the
 * Bookkeeper and Super Admin remain strictly view-only in the Financial Suite.
 */
export function hasSystemWideReadScope(role?: UserRole | null): boolean {
  return role === 'super_admin' || role === 'bookkeeper';
}

/** Roles that are strictly view-only for association data (no create/edit/delete). */
export function isViewOnlyRole(role?: UserRole | null): boolean {
  return role === 'bookkeeper' || role === 'auditor' || role === 'admin';
}

/**
 * Super Admin notice returned by Financial Suite write guards. Kept friendly
 * because the Super Admin legitimately has read access to every association —
 * only the mutations are withheld.
 */
export const SUPER_ADMIN_FINANCIAL_VIEW_ONLY_MESSAGE =
  'The Super Administrator account has view-only access to the Financial Suite. Ask the Treasurer to record, edit, or delete this entry, or the Auditor to approve it.';

/**
 * Head Admin notice returned by Financial Suite write guards: the Head Admin
 * browses the whole suite (and may still compile FS1–FS4 reports) but never
 * mutates ledger data, categories, assets, statements, or the audit queue.
 */
export const HEAD_ADMIN_FINANCIAL_VIEW_ONLY_MESSAGE =
  'The Head Admin account has view-only access to the Financial Suite. Ask the Treasurer to record, edit, or delete this entry, or the Auditor to approve it.';

/**
 * Roles that may CREATE / EDIT / DELETE financial data: budget categories,
 * transactions, receipts, fixed assets, and Financial Statements.
 *
 * - `treasurer`: the officer that records financial data.
 * - `admin` (Head Admin): deliberately EXCLUDED. It keeps read access to the
 *   whole Financial Suite and may still COMPILE FS1–FS4 reports
 *   (see `generateStatementAction`), but it never edits or deletes anything.
 * - `auditor`: excluded — it only decides the Verification & Audit Queue.
 * - `super_admin`: deliberately EXCLUDED. Oversight only: the Super Admin may
 *   browse every association's Financial Suite but may never record, edit, or
 *   delete anything inside it.
 * - `bookkeeper`: always view-only.
 *
 * IMPORTANT: this returns a plain `boolean`, NOT a type predicate. Write guards
 * call it as `if (!canWriteFinancialData(user.role)) { ... }`, which deliberately
 * does not narrow `user.role`, so the downstream `user.role === 'super_admin'`
 * association-selection branches keep compiling.
 */
export function canWriteFinancialData(role?: UserRole | null): boolean {
  return role === 'treasurer';
}

/**
 * Roles that may approve / reject / flag items in the Verification & Audit
 * Queue. The Auditor only — the Head Admin may inspect the queue but not decide
 * it. Same view-only policy for `super_admin` as `canWriteFinancialData`;
 * the Bookkeeper is never permitted.
 */
export function canDecideAuditQueue(role?: UserRole | null): boolean {
  return role === 'auditor';
}
