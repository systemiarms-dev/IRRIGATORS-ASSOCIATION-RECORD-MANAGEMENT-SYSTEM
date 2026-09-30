import type { UserRole } from '@/types';

/**
 * Roles that may READ records across every association added to the system.
 *
 * - `super_admin`: system-wide read/write (full oversight and management).
 * - `bookkeeper`: the single, system-wide Bookkeeper account. It belongs to no
 *   association and may only view the financial reports and records of every
 *   association — it can never create, edit, delete, or modify any data.
 *
 * Read actions use this to decide whether a caller may honour the requested
 * association filter (including "all"/consolidated scope) or must be pinned to
 * their own association. Write actions must NEVER use this helper — mutations
 * stay guarded by the explicit super_admin/admin/treasurer allow-lists, so the
 * Bookkeeper remains strictly view-only.
 */
export function hasSystemWideReadScope(role?: UserRole | null): boolean {
  return role === 'super_admin' || role === 'bookkeeper';
}

/** Roles that are strictly view-only for association data (no create/edit/delete). */
export function isViewOnlyRole(role?: UserRole | null): boolean {
  return role === 'bookkeeper' || role === 'auditor';
}
