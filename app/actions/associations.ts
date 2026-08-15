'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, Association } from '@/types';
import { revalidatePath } from 'next/cache';
import { requireUser, requireSuperAdmin, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';
import { hashPassword, generateRandomPassword } from '@/lib/auth/password';
import { isValidPhilippineMobile, normalizePhilippineMobile } from '@/lib/utils/phone';
import { purgeReceiptStorage } from '@/lib/storage/receipts';

/**
 * Fetch registered Irrigators Associations directly from Supabase Cloud.
 * Officers only ever see their own association; super admins see the full registry.
 */
export async function getAssociationsAction(): Promise<ActionResponse<Association[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  try {
    const associations = await localDb.getAssociations();
    const scoped =
      user.role === 'super_admin'
        ? associations
        : associations.filter((a) => a.id === user.association_id);
    return { success: true, message: 'Associations fetched successfully.', data: scoped };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching associations from Supabase.' };
  }
}

/**
 * Fetch single association by ID. Officers may only read their own association.
 */
export async function getAssociationByIdAction(id: string): Promise<ActionResponse<Association>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  try {
    const association = await localDb.getAssociationById(id);
    if (!association) {
      return { success: false, message: 'Association not found.' };
    }
    if (user.role !== 'super_admin' && association.id !== user.association_id) {
      return UNAUTHORIZED_RESPONSE;
    }
    return { success: true, message: 'Association details fetched.', data: association };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching association from Supabase.' };
  }
}

/**
 * Create a new Irrigators Association (Super Admin only)
 * Includes full official NIS IA profile fields
 */
export async function createAssociationAction(formData: FormData): Promise<ActionResponse<Association>> {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return { success: false, message: 'Only the System Super Administrator can register new associations.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const code = (formData.get('code') as string)?.trim().toUpperCase();
  const old_name = (formData.get('old_name') as string)?.trim() || null;
  const mailing_address = (formData.get('mailing_address') as string)?.trim();
  const president_name = (formData.get('president_name') as string)?.trim();
  const contact_number_raw = normalizePhilippineMobile((formData.get('contact_number') as string)?.trim() || '');
  const contact_number = contact_number_raw || null;

  if (contact_number_raw && !isValidPhilippineMobile(contact_number_raw)) {
    return { success: false, message: 'Contact number must be a valid 11-digit Philippine number starting with 09.' };
  }
  const sec_registration_number = (formData.get('sec_registration_number') as string)?.trim();
  const tin_number = (formData.get('tin_number') as string)?.trim();
  const service_area_ha = parseFloat(formData.get('service_area_ha') as string) || 0;
  const operational_area_ha = parseFloat(formData.get('operational_area_ha') as string) || 0;
  const beneficiaries_male = parseInt(formData.get('beneficiaries_male') as string, 10) || 0;
  const beneficiaries_female = parseInt(formData.get('beneficiaries_female') as string, 10) || 0;
  const tsag_count = parseInt(formData.get('tsag_count') as string, 10) || 1;
  const contract_type = (formData.get('contract_type') as string)?.trim() || 'Modified IMT Contract';
  const contract_effectivity_date = (formData.get('contract_effectivity_date') as string)?.trim() || null;

  if (!name || !code || !mailing_address || !president_name || !sec_registration_number || !tin_number) {
    return { success: false, message: 'Association Name, Code, Address, President, SEC Registration No., and TIN are required.' };
  }

  try {
    const existingCode = await localDb.getAssociationByCode(code);
    if (existingCode) {
      return { success: false, message: `An association with code "${code}" already exists.` };
    }

    const newAssoc: Association = {
      id: `ia-${code.toLowerCase().replace(/[^a-z0-9]/g, '')}-${Date.now().toString().slice(-4)}`,
      code,
      name,
      old_name,
      region: 'Region 02',
      nis_name: 'IARMS',
      mailing_address,
      president_name,
      contact_number,
      sec_registration_number,
      tin_number,
      service_area_ha,
      operational_area_ha,
      beneficiaries_total: beneficiaries_male + beneficiaries_female,
      beneficiaries_male,
      beneficiaries_female,
      tsag_count,
      contract_type,
      contract_effectivity_date,
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    };

    await localDb.createAssociation(newAssoc);

    // Auto-seed default initial accounts for this new association with
    // cryptographically-random passwords (returned once in the message so the
    // creator can hand them out — they are never re-issued).
    const assocCleanCode = code.toLowerCase().replace(/[^a-z0-9]/g, '');
    const adminPassword = generateRandomPassword();
    const treasurerPassword = generateRandomPassword();
    const auditorPassword = generateRandomPassword();
    
    // Head Admin (President)
    await localDb.createUser({
      id: `user-admin-${assocCleanCode}`,
      username: `admin_${assocCleanCode}`,
      password: hashPassword(adminPassword),
      full_name: president_name,
      role: 'admin',
      association_id: newAssoc.id,
      farm_location: mailing_address,
      farm_size_hectares: 2.5,
      contact_number,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      token_version: 0,
    });

    // Treasurer
    await localDb.createUser({
      id: `user-treasurer-${assocCleanCode}`,
      username: `treasurer_${assocCleanCode}`,
      password: hashPassword(treasurerPassword),
      full_name: `Treasurer ${name.split(' ')[0]}`,
      role: 'treasurer',
      association_id: newAssoc.id,
      farm_location: mailing_address,
      farm_size_hectares: 2.0,
      contact_number: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      token_version: 0,
    });

    // Auditor
    await localDb.createUser({
      id: `user-auditor-${assocCleanCode}`,
      username: `auditor_${assocCleanCode}`,
      password: hashPassword(auditorPassword),
      full_name: `Auditor ${name.split(' ')[0]}`,
      role: 'auditor',
      association_id: newAssoc.id,
      farm_location: mailing_address,
      farm_size_hectares: 2.0,
      contact_number: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
      token_version: 0,
    });

    await localDb.addAuditLog({
      user_id: superAdmin.id,
      association_id: newAssoc.id,
      action: 'ASSOCIATION_CREATED',
      entity_type: 'associations',
      entity_id: newAssoc.id,
      details: `Created new association: ${name} (${code}) with default officer accounts`,
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/associations');
    revalidatePath('/dashboard/admin');

    return {
      success: true,
      message: `Association "${name}" created successfully. Initial passwords (one-time): admin_${assocCleanCode}=${adminPassword}, treasurer_${assocCleanCode}=${treasurerPassword}, auditor_${assocCleanCode}=${auditorPassword}. Share these securely and reset on first login.`,
      data: newAssoc,
    };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error creating association.' };
  }
}

/**
 * Update an existing Association
 */
export async function updateAssociationAction(id: string, formData: FormData): Promise<ActionResponse<Association>> {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return { success: false, message: 'Only the System Super Administrator can modify association profiles.' };
  }

  const name = (formData.get('name') as string)?.trim();
  const code = (formData.get('code') as string)?.trim().toUpperCase();
  const old_name = (formData.get('old_name') as string)?.trim() || null;
  const mailing_address = (formData.get('mailing_address') as string)?.trim();
  const president_name = (formData.get('president_name') as string)?.trim();
  const contact_number_raw = normalizePhilippineMobile((formData.get('contact_number') as string)?.trim() || '');
  const contact_number = contact_number_raw || null;

  if (contact_number_raw && !isValidPhilippineMobile(contact_number_raw)) {
    return { success: false, message: 'Contact number must be a valid 11-digit Philippine number starting with 09.' };
  }
  const sec_registration_number = (formData.get('sec_registration_number') as string)?.trim();
  const tin_number = (formData.get('tin_number') as string)?.trim();
  const service_area_ha = parseFloat(formData.get('service_area_ha') as string) || 0;
  const operational_area_ha = parseFloat(formData.get('operational_area_ha') as string) || 0;
  const tsag_count = parseInt(formData.get('tsag_count') as string, 10) || 1;
  const contract_type = (formData.get('contract_type') as string)?.trim() || 'Modified IMT Contract';
  const contract_effectivity_date = (formData.get('contract_effectivity_date') as string)?.trim() || null;

  try {
    // Gender breakdown is no longer editable from the UI — preserve stored values
    // when the form does not send them so an edit cannot wipe existing data.
    const existing = await localDb.getAssociationById(id);
    const beneficiaries_male = formData.has('beneficiaries_male')
      ? parseInt(formData.get('beneficiaries_male') as string, 10) || 0
      : Number(existing?.beneficiaries_male || 0);
    const beneficiaries_female = formData.has('beneficiaries_female')
      ? parseInt(formData.get('beneficiaries_female') as string, 10) || 0
      : Number(existing?.beneficiaries_female || 0);

    const updated = await localDb.updateAssociation(id, {
      name,
      code,
      old_name,
      mailing_address,
      president_name,
      contact_number,
      sec_registration_number,
      tin_number,
      service_area_ha,
      operational_area_ha,
      beneficiaries_total: beneficiaries_male + beneficiaries_female,
      beneficiaries_male,
      beneficiaries_female,
      tsag_count,
      contract_type,
      contract_effectivity_date,
    });

    if (!updated) {
      return { success: false, message: 'Association not found.' };
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/associations');
    return { success: true, message: `Association "${updated.name}" updated successfully.`, data: updated };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error updating association.' };
  }
}

/**
 * Delete an Association (Super Admin only)
 */
export async function deleteAssociationAction(id: string): Promise<ActionResponse> {
  const superAdmin = await requireSuperAdmin();
  if (!superAdmin) {
    return { success: false, message: 'Only the System Super Administrator can delete associations.' };
  }

  try {
    const success = await localDb.deleteAssociation(id);
    if (!success) {
      return { success: false, message: 'Association not found.' };
    }

    // Remove the association's uploaded receipts from storage (folder = association id).
    try {
      await purgeReceiptStorage(id);
    } catch (storageErr: any) {
      console.warn('deleteAssociation: receipt storage cleanup failed:', storageErr);
    }

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/associations');
    return { success: true, message: 'Association and all its records/attachments removed successfully.' };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error deleting association.' };
  }
}
