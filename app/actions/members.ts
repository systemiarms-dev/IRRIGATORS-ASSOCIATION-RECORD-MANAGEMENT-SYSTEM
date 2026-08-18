'use server';

import { localDb } from '@/lib/db/localDb';
import { getSupabaseServerClient } from '@/lib/supabase/server';
import { ActionResponse, Profile } from '@/types';
import { revalidatePath } from 'next/cache';
import { requireRole, requireUser, toPublicProfile, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';
import { hashPassword } from '@/lib/auth/password';
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/utils/phone';

/**
 * Best-effort schema self-heal so the 'member' role is always enabled in the
 * profiles table (CHECK constraint). Safe to call repeatedly; no-ops when the
 * helper function does not exist yet (fresh DB that still needs the schema run).
 */
async function ensureMemberRoleSchema(): Promise<void> {
  try {
    const client = getSupabaseServerClient();
    if (!client) return;
    await client.rpc('ensure_iarms_schema');
  } catch {
    // The helper function may not exist yet; the insert below will surface a
    // clear migration message if the CHECK constraint still blocks role 'member'.
  }
}

/**
 * Fetch farmer members (role='member') scoped to an association.
 * - Super Admin: any association (or all).
 * - Officers (admin/treasurer/auditor): strictly their own association.
 */
export async function getMembersAction(associationId?: string): Promise<ActionResponse<Profile[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  try {
    const effectiveAssoc = user.role === 'super_admin' ? associationId : (user.association_id || undefined);
    const members = await localDb.getUsers(effectiveAssoc, 'member');
    return { success: true, message: 'Farmer members retrieved successfully.', data: members };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching farmer members.' };
  }
}

/**
 * Register a new farmer member (role='member') in the association registry.
 * Members are registry-only records - they do not get portal sign-in access.
 */
export async function createMemberAction(formData: FormData): Promise<ActionResponse<Profile>> {
  const admin = await requireRole('admin', 'treasurer');
  if (!admin) return UNAUTHORIZED_RESPONSE;

  const full_name = (formData.get('full_name') as string)?.trim();
  const farm_location = (formData.get('farm_location') as string)?.trim();
  const farm_size_hectares = parseFloat((formData.get('farm_size_hectares') as string) || '0');
  const contact_number = normalizePhilippineMobile((formData.get('contact_number') as string)?.trim() || '');

  if (!full_name || full_name.length < 2) {
    return { success: false, message: 'Member full name is required (at least 2 characters).' };
  }
  if (isNaN(farm_size_hectares) || farm_size_hectares < 0) {
    return { success: false, message: 'Farm size must be a valid number greater than or equal to 0.' };
  }
  if (contact_number && !isValidPhilippineMobile(contact_number)) {
    return { success: false, message: 'Mobile number must be a valid 11-digit Philippine number starting with 09.' };
  }

  let association_id = admin.association_id || null;
  if (admin.role === 'super_admin') {
    association_id = (formData.get('association_id') as string)?.trim() || null;
    if (!association_id) {
      return { success: false, message: 'Please choose the target Irrigators Association for this member.' };
    }
  }
  if (!association_id) {
    return { success: false, message: 'Your account is not linked to an association. Please ask the head admin to link your account, then retry.' };
  }

  try {
    await ensureMemberRoleSchema();

    const assoc = await localDb.getAssociationById(association_id);
    const assocCode = assoc?.code || 'IA';
    const username = `mem_${assocCode.toLowerCase().replace(/[^a-z0-9]/g, '')}_${Date.now().toString().slice(-6)}`;

    const newMember: Profile = {
      id: `user-${Date.now()}`,
      username,
      full_name,
      password: hashPassword(Math.random().toString(36).slice(2) + Date.now().toString(36)),
      role: 'member',
      association_id,
      farm_location: farm_location || null,
      farm_size_hectares: farm_size_hectares || 0,
      contact_number: contact_number || null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    const created = await localDb.createUser(newMember);

    await localDb.addAuditLog({
      user_id: admin.id,
      association_id,
      action: 'MEMBER_CREATED',
      entity_type: 'profiles',
      entity_id: created.id,
      details: `Registered farmer member ${full_name} in association ${assocCode}`,
    });

    revalidatePath('/dashboard/members');
    revalidatePath('/dashboard/treasurer');
    return { success: true, message: `Farmer member ${full_name} registered successfully.`, data: toPublicProfile(created) as Profile };
  } catch (error: any) {
    const msg = (error?.message || '').toLowerCase();
    if (msg.includes('check constraint') || msg.includes('profiles_role_check')) {
      return {
        success: false,
        message: 'The "Farmer Member" role is not yet enabled in your database. Open the Supabase SQL Editor, run the MIGRATION section at the end of supabase_schema.sql, then try again.',
      };
    }
    return { success: false, message: error.message || 'Error registering farmer member.' };
  }
}

/**
 * Update a farmer member's registry details.
 * Only members of the caller's own association can be edited (unless Super Admin).
 */
export async function updateMemberAction(memberId: string, formData: FormData): Promise<ActionResponse<Profile>> {
  const admin = await requireRole('admin', 'treasurer');
  if (!admin) return UNAUTHORIZED_RESPONSE;

  try {
    const member = await localDb.getUserById(memberId);
    if (!member) return { success: false, message: 'Farmer member not found.' };
    if (member.role !== 'member') return { success: false, message: 'This account is not a farmer member record.' };
    if (admin.role !== 'super_admin' && member.association_id !== admin.association_id) {
      return { success: false, message: 'You can only manage farmer members within your own association.' };
    }

    const full_name = (formData.get('full_name') as string)?.trim();
    if (!full_name || full_name.length < 2) {
      return { success: false, message: 'Member full name is required (at least 2 characters).' };
    }

    const farm_location = (formData.get('farm_location') as string)?.trim();
    const farm_size_hectares = parseFloat((formData.get('farm_size_hectares') as string) || '0');
    if (isNaN(farm_size_hectares) || farm_size_hectares < 0) {
      return { success: false, message: 'Farm size must be a valid number greater than or equal to 0.' };
    }
    const contact_number = normalizePhilippineMobile((formData.get('contact_number') as string)?.trim() || '');
    if (contact_number && !isValidPhilippineMobile(contact_number)) {
      return { success: false, message: 'Mobile number must be a valid 11-digit Philippine number starting with 09.' };
    }

    const updated = await localDb.updateUserProfileById(memberId, {
      full_name,
      farm_location: farm_location || null,
      farm_size_hectares: farm_size_hectares || 0,
      contact_number: contact_number || null,
    });
    if (!updated) return { success: false, message: 'Could not update the farmer member record.' };

    await localDb.addAuditLog({
      user_id: admin.id,
      association_id: updated.association_id || null,
      action: 'MEMBER_UPDATED',
      entity_type: 'profiles',
      entity_id: memberId,
      details: `Updated farmer member record for ${updated.full_name}`,
    });

    revalidatePath('/dashboard/members');
    revalidatePath('/dashboard/treasurer');
    return { success: true, message: `Farmer member ${updated.full_name} updated successfully.`, data: toPublicProfile(updated) as Profile };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error updating farmer member.' };
  }
}

/**
 * Remove a farmer member from the registry.
 * Linked transactions keep their records (member_id is SET NULL on delete).
 */
export async function deleteMemberAction(memberId: string): Promise<ActionResponse> {
  const admin = await requireRole('admin', 'treasurer');
  if (!admin) return UNAUTHORIZED_RESPONSE;

  try {
    const member = await localDb.getUserById(memberId);
    if (!member) return { success: false, message: 'Farmer member not found.' };
    if (member.role !== 'member') return { success: false, message: 'This account is not a farmer member record.' };
    if (admin.role !== 'super_admin' && member.association_id !== admin.association_id) {
      return { success: false, message: 'You can only manage farmer members within your own association.' };
    }

    const success = await localDb.deleteUser(memberId);
    if (!success) return { success: false, message: 'Could not remove the farmer member record.' };

    await localDb.addAuditLog({
      user_id: admin.id,
      association_id: member.association_id || null,
      action: 'MEMBER_DELETED',
      entity_type: 'profiles',
      entity_id: memberId,
      details: `Removed farmer member ${member.full_name} from the registry`,
    });

    revalidatePath('/dashboard/members');
    revalidatePath('/dashboard/treasurer');
    return { success: true, message: `Farmer member ${member.full_name} removed from the registry.` };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error removing farmer member.' };
  }
}