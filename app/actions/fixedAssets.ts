'use server';

import { localDb } from '@/lib/db/localDb';
import { requireUser, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';
import { hasSystemWideReadScope, canWriteFinancialData, SUPER_ADMIN_FINANCIAL_VIEW_ONLY_MESSAGE } from '@/lib/auth/roles';
import { ActionResponse, FixedAsset } from '@/types';
import { recordDeletion } from '@/lib/financial/deletionLog';
import { revalidatePath } from 'next/cache';

export async function getFixedAssetsAction(
  associationId?: string,
  asOfYear?: number
): Promise<ActionResponse<FixedAsset[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  let targetAssoc = associationId;
  if (!hasSystemWideReadScope(user.role)) {
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

  if (user.role === 'bookkeeper' || user.role === 'auditor') {
    return {
      success: false,
      message: 'You have read-only access. Only the Treasurer can register fixed assets.',
    };
  }
  if (!canWriteFinancialData(user.role)) {
    return user.role === 'super_admin'
      ? { success: false, message: SUPER_ADMIN_FINANCIAL_VIEW_ONLY_MESSAGE }
      : UNAUTHORIZED_RESPONSE;
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

  if (user.role === 'bookkeeper' || user.role === 'auditor') {
    return {
      success: false,
      message: 'You have read-only access. Only the Treasurer can remove fixed assets.',
    };
  }
  if (!canWriteFinancialData(user.role)) {
    return user.role === 'super_admin'
      ? { success: false, message: SUPER_ADMIN_FINANCIAL_VIEW_ONLY_MESSAGE }
      : UNAUTHORIZED_RESPONSE;
  }

  try {
    const scope = user.role !== 'super_admin' ? user.association_id || undefined : undefined;
    const assets = await localDb.getFixedAssets(scope);
    const target = assets.find((asset) => asset.id === id);
    if (!target) {
      return { success: false, message: 'Fixed asset not found.' };
    }

    // Cross-association write protection: officers may only delete assets of their own IA.
    if (user.role !== 'super_admin' && target.association_id && target.association_id !== user.association_id) {
      return UNAUTHORIZED_RESPONSE;
    }

    await localDb.deleteFixedAsset(id);

    // Snapshot the asset for the Treasurer's "Deleted Records" viewer.
    await recordDeletion({
      userId: user.id,
      associationId: target.association_id || user.association_id || null,
      kind: 'fixed_asset',
      entityId: id,
      label: `Removed fixed asset "${target.name}"`,
      snapshot: {
        name: target.name,
        asset_type: target.asset_type,
        date_acquired: target.date_acquired,
        acquisition_cost: Number(target.acquisition_cost || 0),
        depreciation_rate: Number(target.depreciation_rate || 0),
        useful_life_years: Number(target.useful_life_years || 0),
        salvage_value: Number(target.salvage_value || 0),
        net_book_value: target.net_book_value ?? null,
        is_active: target.is_active,
        notes: target.notes || null,
      },
    });

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
