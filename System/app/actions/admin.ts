'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, UserRole, Profile } from '@/types';
import { revalidatePath } from 'next/cache';
import { requireRole, toPublicProfile, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';
import { isValidPassword, hashPassword } from '@/lib/auth/password';

/**
 * Fetch all profiles filtered by role (admin only).
 */
export async function getProfilesAction(roleFilter?: UserRole | 'all'): Promise<ActionResponse<Profile[]>> {
  const admin = await requireRole('admin', 'treasurer', 'auditor');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  let users = localDb.getUsers();

  if (roleFilter && roleFilter !== 'all') {
    users = users.filter((u) => u.role === roleFilter);
  }

  return { success: true, message: 'Profiles retrieved successfully.', data: users };
}

/**
 * Change user role (admin only)
 */
export async function updateUserRoleAction(userId: string, newRole: UserRole): Promise<ActionResponse> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

if (!['treasurer', 'auditor', 'member'].includes(newRole)) {
    return { success: false, message: 'Admin role cannot be assigned to other users.' };
  }

  const user = localDb.getUserById(userId);
  if (!user) {
    return { success: false, message: 'User not found.' };
  }

  // Never allow an admin to change their own role (prevents self-lockout / privilege loss)
  if (user.id === admin.id) {
    return { success: false, message: 'You cannot change your own role.' };
  }

  localDb.updateUserRole(userId, newRole);

  localDb.addAuditLog({
    user_id: admin.id,
    action: 'USER_ROLE_CHANGED',
    entity_type: 'profiles',
    entity_id: userId,
    details: `Updated user role to ${newRole}`,
  });

  revalidatePath('/dashboard/admin');
  revalidatePath('/', 'layout');
  return { success: true, message: `User role updated to ${newRole}.` };
}

/**
 * Delete a user account (admin only)
 */
export async function deleteUserAccountAction(userId: string): Promise<ActionResponse> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  const user = localDb.getUserById(userId);
  if (!user) {
    return { success: false, message: 'User not found.' };
  }

  if (user.id === admin.id) {
    return { success: false, message: 'You cannot delete your own account.' };
  }

  if (localDb.hasTransactionsForMember(userId)) {
    return { success: false, message: 'This user has linked transactions and cannot be deleted.' };
  }

  localDb.deleteUser(userId);

  localDb.addAuditLog({
    user_id: admin.id,
    action: 'USER_ACCOUNT_DELETED',
    entity_type: 'profiles',
    entity_id: userId,
    details: `Deleted account for ${user.full_name} (${user.email})`,
  });

  revalidatePath('/dashboard/admin');
  return { success: true, message: 'User account removed successfully.' };
}

/**
 * Reset a user's password (admin only). Resets revoke the old signed sessions
 * indirectly because the next account lookup happens against the DB.
 */
export async function resetUserPasswordAction(userId: string, newPassword: string): Promise<ActionResponse> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  if (!isValidPassword(newPassword.trim())) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  const updatedUser = localDb.updateUserPassword(userId, newPassword.trim());
  if (!updatedUser) {
    return { success: false, message: 'User profile not found.' };
  }

  localDb.addAuditLog({
    user_id: admin.id,
    action: 'USER_PASSWORD_RESET',
    entity_type: 'profiles',
    entity_id: userId,
    details: `Reset password for user ${updatedUser.full_name} (${updatedUser.email})`,
  });

  revalidatePath('/dashboard/admin');
  return { success: true, message: `Password for ${updatedUser.full_name} has been reset successfully.` };
}

/**
 * Admin action to create a new user account directly
 */
export async function createAccountAction(formData: FormData): Promise<ActionResponse<Profile>> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  const full_name = (formData.get('full_name') as string)?.trim();
  const email = (formData.get('email') as string)?.trim();
  const password = (formData.get('password') as string)?.trim();
  const role = (formData.get('role') as UserRole) || 'member';
  const farm_location = (formData.get('farm_location') as string)?.trim();
  const farm_size_hectares = Number(formData.get('farm_size_hectares')) || 0;
  const contact_number = (formData.get('contact_number') as string)?.trim();

  if (!full_name || !email || !password) {
    return { success: false, message: 'Full Name, Username, and Password are required.' };
  }

  if (!isValidPassword(password)) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

if (!['treasurer', 'auditor', 'member'].includes(role)) {
    return { success: false, message: 'Admin role cannot be assigned to new users.' };
  }

  const existingUser = localDb.getUserByEmail(email);
  if (existingUser) {
    return { success: false, message: 'An account with this Username already exists.' };
  }

const newUser: Profile = {
    id: `user-${Date.now()}`,
    full_name,
    email,
    password: hashPassword(password),
    role,
    farm_location: farm_location || null,
    farm_size_hectares: farm_size_hectares || 0,
    contact_number: contact_number || null,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  localDb.createUser(newUser);

  localDb.addAuditLog({
    user_id: admin.id,
    action: 'USER_ACCOUNT_CREATED_BY_ADMIN',
    entity_type: 'profiles',
    entity_id: newUser.id,
    details: `Created new ${role} account for ${full_name} (${email})`,
  });

  revalidatePath('/dashboard/admin');
  return { success: true, message: `Account for ${full_name} (${email}) has been created successfully.`, data: toPublicProfile(newUser) };
}

/**
 * Clear all transaction, receipt, and financial statement records (admin only)
 */
export async function clearAllRecordsAction(): Promise<ActionResponse> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  try {
    localDb.clearAllFinancialRecords();
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/treasurer');
    revalidatePath('/dashboard/auditor');
    revalidatePath('/dashboard/statements');
    revalidatePath('/dashboard');
    return { success: true, message: 'All transactions, receipts, and financial statements have been deleted successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to clear database records.' };
  }
}
