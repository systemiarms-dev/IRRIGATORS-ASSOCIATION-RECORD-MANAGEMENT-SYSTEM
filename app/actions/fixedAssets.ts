'use server';

import { localDb } from '@/lib/db/localDb';
import { requireUser, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';
import { ActionResponse, FixedAsset } from '@/types';
import { revalidatePath } from 'next/cache';

export async function getFixedAssetsAction(
  associationId?: string,
  asOfYear?: number
): Promise<ActionResponse<FixedAsset[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  let targetAssoc = associationId;
  if (user.role !== 'super_admin') {
    targetAssoc = user.association_id || undefined;
  }

  try {
    const assets = await localDb.getFixedAssets(targetAssoc, asOfYear);
    return {
      success: true,
      message: 'Fixed assets fetched successfully.',
      data: assets,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error fetching fixed assets registry.',
    };
  }
}

export async function createFixedAssetAction(input: {
  name: string;
  asset_type: FixedAsset['asset_type'];
  date_acquired: string;
  acquisition_cost: number;
  depreciation_rate: number;
  useful_life_years: number;
  salvage_value?: number;
  notes?: string;
  association_id?: string;
}): Promise<ActionResponse<FixedAsset>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  if (user.role === 'treasurer' || user.role === 'auditor') {
    return {
      success: false,
      message: 'You have read-only access. Only bookkeepers and administrators can register fixed assets.',
    };
  }

  let targetAssoc = user.association_id;
  if (user.role === 'super_admin') {
    if (!input.association_id) {
      return {
        success: false,
        message: 'Please choose the target Irrigators Association before registering equipment or asset.',
      };
    }
    targetAssoc = input.association_id;
  } else if (!targetAssoc) {
    return {
      success: false,
      message: 'Your account is not linked to an association. Please contact the administrator.',
    };
  }

  const name = (input.name || '').trim();
  if (name.length < 2) {
    return { success: false, message: 'Please enter an equipment or asset name.' };
  }

  const cost = Number(input.acquisition_cost);
  if (isNaN(cost) || cost <= 0) {
    return { success: false, message: 'Please enter a valid positive acquisition cost in PHP.' };
  }

  const rate = Number(input.depreciation_rate);
  if (isNaN(rate) || rate < 0 || rate > 100) {
    return { success: false, message: 'Please select or enter a valid depreciation percentage (0% - 100%).' };
  }

  try {
    const created = await localDb.createFixedAsset({
      association_id: targetAssoc,
      name,
      asset_type: input.asset_type || 'other',
      date_acquired: input.date_acquired || new Date().toISOString().split('T')[0],
      acquisition_cost: cost,
      depreciation_rate: rate,
      useful_life_years: Number(input.useful_life_years) || 5,
      salvage_value: Number(input.salvage_value) || 0,
      is_active: true,
      notes: input.notes?.trim() || null,
    });

    revalidatePath('/dashboard/chart-of-accounts');
    revalidatePath('/dashboard/statements');

    return {
      success: true,
      message: `Asset "${name}" registered with ${rate}% annual depreciation.`,
      data: created,
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error registering fixed asset in database.',
    };
  }
}

export async function deleteFixedAssetAction(id: string): Promise<ActionResponse> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  if (user.role === 'treasurer' || user.role === 'auditor') {
    return {
      success: false,
      message: 'You have read-only access. Only bookkeepers and administrators can remove fixed assets.',
    };
  }

  try {
    await localDb.deleteFixedAsset(id);
    revalidatePath('/dashboard/chart-of-accounts');
    revalidatePath('/dashboard/statements');
    return {
      success: true,
      message: 'Fixed asset removed from registry successfully.',
    };
  } catch (err: any) {
    return {
      success: false,
      message: err.message || 'Error removing fixed asset.',
    };
  }
}
