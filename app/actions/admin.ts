'use server';

import { localDb } from '@/lib/db/localDb';
import { purgeReceiptStorage } from '@/lib/storage/receipts';
import { ActionResponse, UserRole, Profile } from '@/types';
import { revalidatePath } from 'next/cache';
import { requireRole, toPublicProfile, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';
import { isValidPassword, hashPassword } from '@/lib/auth/password';
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/utils/phone';

const ROLE_LABELS: Record<string, string> = {
  admin: 'Head Admin',
  treasurer: 'Treasurer',
  auditor: 'Auditor',
};

const OFFICER_ROLES: UserRole[] = ['admin', 'treasurer', 'auditor'];

/**
 * Fetch all profiles filtered by role and association from Supabase.
 * - Super Admin can view all association accounts across all IAs.
 * - Association officers (admin, treasurer, auditor) can view the member/account list
 *   of their own association only (used by the treasurer page for member selection),
 *   and never the super_admin.
 */
export async function getProfilesAction(roleFilter?: UserRole | 'all', associationIdFilter?: string): Promise<ActionResponse<Profile[]>> {
  const admin = await requireRole('admin', 'treasurer', 'auditor');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  try {
    let users: Profile[] = [];

    if (admin.role === 'super_admin') {
      const targetAssoc = associationIdFilter && associationIdFilter !== 'all' ? associationIdFilter : undefined;
      users = await localDb.getUsers(targetAssoc, roleFilter);
      // Exclude super_admin accounts from the association officer management list
      users = users.filter((u) => u.role !== 'super_admin');
    } else {
      // Head Admin / Association Officers: strictly scoped to their own association and strictly NO super_admin
      const assocId = admin.association_id || undefined;
      users = await localDb.getUsers(assocId, roleFilter);
      users = users.filter((u) => u.association_id === admin.association_id && u.role !== 'super_admin');
    }

    return { success: true, message: 'Profiles retrieved successfully.', data: users };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching profiles from Supabase.' };
  }
}

/**
 * Change user role and association assignment.
 * Head Admin can only modify accounts in their own association and cannot grant super_admin or modify super_admin.
 */
export async function updateUserRoleAction(userId: string, newRole: UserRole, associationId?: string): Promise<ActionResponse> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  try {
    const user = await localDb.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User profile not found.' };
    }

    if (user.id === admin.id) {
      return { success: false, message: 'You cannot change your own role.' };
    }

    // Role and Scope Enforcement
    if (admin.role !== 'super_admin') {
      if (user.role === 'super_admin') {
        return { success: false, message: 'You do not have permission to modify a Super Administrator account.' };
      }
      if (user.role === 'admin') {
        return { success: false, message: 'Only the System Super Administrator can manage Head Admin accounts.' };
      }
      if (user.association_id !== admin.association_id) {
        return { success: false, message: 'You can only manage officer accounts within your own association.' };
      }
      if (newRole === 'super_admin') {
        return { success: false, message: 'Only the System Super Administrator can assign the Super Admin role.' };
      }
    }

    const effectiveAssocId = admin.role === 'super_admin' ? (associationId || user.association_id) : admin.association_id;

    // Each association is limited to exactly ONE Head Admin, ONE Treasurer, and ONE Auditor.
    if (OFFICER_ROLES.includes(newRole)) {
      if (!effectiveAssocId) {
        return { success: false, message: 'Please choose the target association before assigning this role.' };
      }
      const holders = await localDb.getUsers(effectiveAssocId, newRole);
      const conflict = holders.find((h) => h.id !== userId);
      if (conflict) {
        return {
          success: false,
          message: `Each association is limited to one ${ROLE_LABELS[newRole]}. ${conflict.full_name} already holds this role in this association.`,
        };
      }
    }

    await localDb.updateUserRole(userId, newRole, effectiveAssocId);

    await localDb.addAuditLog({
      user_id: admin.id,
      association_id: effectiveAssocId || null,
      action: 'USER_ROLE_CHANGED',
      entity_type: 'profiles',
      entity_id: userId,
      details: `Updated user ${user.full_name} role to ${newRole} (Association: ${effectiveAssocId || 'N/A'})`,
    });

    revalidatePath('/dashboard/admin');
    revalidatePath('/', 'layout');
    return { success: true, message: `User role updated to ${newRole}.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error updating user role in Supabase.' };
  }
}

/**
 * Delete a user account.
 * Head Admin can only delete accounts in their own association and cannot delete super_admin.
 */
export async function deleteUserAccountAction(userId: string): Promise<ActionResponse> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  try {
    const user = await localDb.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User profile not found.' };
    }

    if (user.id === admin.id) {
      return { success: false, message: 'You cannot delete your own account.' };
    }

    // Role and Scope Enforcement
    if (admin.role !== 'super_admin') {
      if (user.role === 'super_admin') {
        return { success: false, message: 'You do not have permission to delete a Super Administrator account.' };
      }
      if (user.role === 'admin') {
        return { success: false, message: 'Only the System Super Administrator can delete a Head Admin account.' };
      }
      if (user.association_id !== admin.association_id) {
        return { success: false, message: 'You can only manage accounts within your own association.' };
      }
    }

    await localDb.deleteUser(userId);

    await localDb.addAuditLog({
      user_id: admin.id,
      association_id: user.association_id || null,
      action: 'USER_ACCOUNT_DELETED',
      entity_type: 'profiles',
      entity_id: userId,
      details: `Deleted account for ${user.full_name} (${user.username})`,
    });

    revalidatePath('/dashboard/admin');
    return { success: true, message: 'User account removed successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error deleting user in Supabase.' };
  }
}

/**
 * Reset a user's password.
 * Head Admin can only reset passwords for accounts in their own association (auditor, treasurer, admin) and never super_admin.
 */
export async function resetUserPasswordAction(userId: string, newPassword: string): Promise<ActionResponse> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  if (!isValidPassword(newPassword.trim())) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  try {
    const targetUser = await localDb.getUserById(userId);
    if (!targetUser) {
      return { success: false, message: 'User profile not found.' };
    }

    // Role and Scope Enforcement
    if (admin.role !== 'super_admin') {
      if (targetUser.role === 'super_admin') {
        return { success: false, message: 'You do not have permission to reset a Super Administrator password.' };
      }
      if (targetUser.role === 'admin') {
        return { success: false, message: 'Only the System Super Administrator can reset a Head Admin password.' };
      }
      if (targetUser.association_id !== admin.association_id) {
        return { success: false, message: 'You can only reset passwords for accounts in your own association.' };
      }
    }

    const updatedUser = await localDb.updateUserPassword(userId, newPassword.trim());
    if (!updatedUser) {
      return { success: false, message: 'User profile not found.' };
    }

    await localDb.addAuditLog({
      user_id: admin.id,
      association_id: updatedUser.association_id || null,
      action: 'USER_PASSWORD_RESET',
      entity_type: 'profiles',
      entity_id: userId,
      details: `Reset password for user ${updatedUser.full_name} (${updatedUser.username})`,
    });

    revalidatePath('/dashboard/admin');
    return { success: true, message: `Password for ${updatedUser.full_name} has been reset successfully.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error resetting password in Supabase.' };
  }
}

/**
 * Update a user account's profile details (name, contact, farm info).
 * Head Admin can only edit Treasurer/Auditor accounts within their own association.
 * Head Admin accounts can only be edited by the System Super Administrator.
 * The calling user cannot edit their own account here (use Account Settings).
 */
export async function updateUserProfileAction(userId: string, formData: FormData): Promise<ActionResponse<Profile>> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  try {
    const user = await localDb.getUserById(userId);
    if (!user) {
      return { success: false, message: 'User profile not found.' };
    }

    if (user.id === admin.id) {
      return { success: false, message: 'Edit your own account details in Account Settings instead.' };
    }

    // Role and Scope Enforcement
    if (admin.role !== 'super_admin') {
      if (user.role === 'super_admin') {
        return { success: false, message: 'You do not have permission to edit a Super Administrator account.' };
      }
      if (user.role === 'admin') {
        return { success: false, message: 'Only the System Super Administrator can edit Head Admin accounts.' };
      }
      if (user.association_id !== admin.association_id) {
        return { success: false, message: 'You can only edit accounts within your own association.' };
      }
    }

    const full_name = (formData.get('full_name') as string)?.trim();
    if (!full_name) {
      return { success: false, message: 'Full Name is required.' };
    }

    const contact_number = normalizePhilippineMobile((formData.get('contact_number') as string)?.trim() || '');
    if (contact_number && !isValidPhilippineMobile(contact_number)) {
      return { success: false, message: 'Mobile number must be a valid 11-digit Philippine number starting with 09.' };
    }

    const updatedUser = await localDb.updateUserProfileById(userId, {
      full_name,
      contact_number: contact_number || null,
      farm_location: (formData.get('farm_location') as string)?.trim() || null,
      farm_size_hectares: parseFloat(formData.get('farm_size_hectares') as string) || 0,
    });
    if (!updatedUser) {
      return { success: false, message: 'User profile not found.' };
    }

    await localDb.addAuditLog({
      user_id: admin.id,
      association_id: updatedUser.association_id || null,
      action: 'USER_PROFILE_UPDATED',
      entity_type: 'profiles',
      entity_id: userId,
      details: `Updated account details for ${updatedUser.full_name} (${updatedUser.username})`,
    });

    revalidatePath('/dashboard/admin');
    return { success: true, message: `Account for ${updatedUser.full_name} updated successfully.`, data: toPublicProfile(updatedUser) };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error updating user profile in Supabase.' };
  }
}

/**
 * Create a new user account directly in Supabase.
 * Head Admin can only create accounts in their own association and cannot create super_admin accounts.
 */
export async function createAccountAction(formData: FormData): Promise<ActionResponse<Profile>> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  const full_name = (formData.get('full_name') as string)?.trim();
  const username = (formData.get('username') as string || formData.get('email') as string)?.trim();
  const password = (formData.get('password') as string)?.trim();
  let role = (formData.get('role') as UserRole) || 'treasurer';
  let association_id = (formData.get('association_id') as string)?.trim() || admin.association_id || 'ia-nangurisan';
  const farm_location = (formData.get('farm_location') as string)?.trim();
  const farm_size_hectares = Number(formData.get('farm_size_hectares')) || 0;
  const contact_number = normalizePhilippineMobile((formData.get('contact_number') as string)?.trim() || '');

  if (contact_number && !isValidPhilippineMobile(contact_number)) {
    return { success: false, message: 'Mobile number must be a valid 11-digit Philippine number starting with 09.' };
  }

  if (!full_name || !username || !password) {
    return { success: false, message: 'Full Name, Username, and Password are required.' };
  }

  if (!isValidPassword(password)) {
    return { success: false, message: 'Password must be at least 6 characters long.' };
  }

  // Role and Scope Enforcement
  if (admin.role !== 'super_admin') {
    if (role === 'super_admin') {
      return { success: false, message: 'Only Super Administrators can create Super Admin accounts.' };
    }
    if (role === 'admin') {
      return { success: false, message: 'Only the System Super Administrator can create Head Admin accounts.' };
    }
    // Force association to be Head Admin's association
    association_id = admin.association_id || association_id;
  }

  try {
    // Each association is limited to exactly ONE Head Admin, ONE Treasurer, and ONE Auditor.
    if (OFFICER_ROLES.includes(role)) {
      const holders = await localDb.getUsers(association_id, role);
      if (holders.length > 0) {
        return {
          success: false,
          message: `Each association is limited to one ${ROLE_LABELS[role]}. ${holders[0].full_name} already holds this role in this association.`,
        };
      }
    }

    const existingUser = await localDb.getUserByUsername(username);
    if (existingUser) {
      return { success: false, message: 'An account with this Username already exists.' };
    }

    const newUser: Profile = {
      id: `user-${Date.now()}`,
      username,
      full_name,
      password: hashPassword(password),
      role,
      association_id: role === 'super_admin' ? null : association_id,
      farm_location: farm_location || null,
      farm_size_hectares: farm_size_hectares || 0,
      contact_number: contact_number || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await localDb.createUser(newUser);

    await localDb.addAuditLog({
      user_id: admin.id,
      association_id: newUser.association_id,
      action: 'USER_ACCOUNT_CREATED_BY_ADMIN',
      entity_type: 'profiles',
      entity_id: newUser.id,
      details: `Created new ${role} account for ${full_name} (${username}) in association ${association_id}`,
    });

    revalidatePath('/dashboard/admin');
    return {
      success: true,
      message: `Account for ${full_name} (@${username}) created successfully.`,
      data: toPublicProfile(newUser),
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error creating account in Supabase.' };
  }
}

/**
 * Clear financial records in Supabase
 */
export async function clearAllRecordsAction(associationId?: string): Promise<ActionResponse> {
  const admin = await requireRole('admin');
  if (!admin) {
    return UNAUTHORIZED_RESPONSE;
  }

  const effectiveAssoc = admin.role === 'super_admin' ? associationId : admin.association_id;
  if (admin.role !== 'super_admin' && !admin.association_id) {
    return { success: false, message: 'Your account is not linked to an association.' };
  }

  try {
    await localDb.clearAllFinancialRecords(effectiveAssoc);
    await purgeReceiptStorage(effectiveAssoc);
    revalidatePath('/dashboard/admin');
    revalidatePath('/dashboard/treasurer');
    revalidatePath('/dashboard/auditor');
    revalidatePath('/dashboard/statements');
    revalidatePath('/dashboard');
    return { success: true, message: 'Financial records cleared successfully from Supabase.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Failed to clear database records in Supabase.' };
  }
}
