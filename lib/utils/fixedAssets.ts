import { FixedAsset } from '@/types';

export interface DepreciationOption {
  label: string;
  rate: number;
  years: number;
  type: FixedAsset['asset_type'];
}

export const PRESET_DEPRECIATION_OPTIONS: DepreciationOption[] = [
  { label: '5% per year (Buildings / Warehouses - 20 yrs)', rate: 5, years: 20, type: 'building' },
  { label: '10% per year (Heavy Machinery / Tractors - 10 yrs)', rate: 10, years: 10, type: 'heavy_machinery' },
  { label: '20% per year (Water Pumps, Light Machinery - 5 yrs)', rate: 20, years: 5, type: 'light_machinery' },
  { label: '33.3% per year (Computers & IT Equipment - 3 yrs)', rate: 33.33, years: 3, type: 'it_equipment' },
  { label: 'Custom Depreciation Rate (User Defined)', rate: 0, years: 0, type: 'other' },
];

export interface DepreciationCalculationResult {
  annualDepreciation: number;
  yearsInService: number;
  accumulatedDepreciation: number;
  netBookValue: number;
}

/**
 * Computes straight-line depreciation for a fixed asset as of a specific reporting year.
 */
export function calculateAssetDepreciation(
  cost: number,
  rate: number,
  dateAcquired: string,
  salvageValue: number = 0,
  asOfYear: number = new Date().getFullYear()
): DepreciationCalculationResult {
  const safeCost = Math.max(0, Number(cost) || 0);
  const safeSalvage = Math.max(0, Math.min(safeCost, Number(salvageValue) || 0));
  const safeRate = Math.max(0, Math.min(100, Number(rate) || 0));

  const acqYear = parseInt((dateAcquired || '').split('-')[0], 10) || asOfYear;
  const depreciableCost = Math.max(0, safeCost - safeSalvage);
  const annualDepreciation = (depreciableCost * safeRate) / 100;

  // Years in service since acquisition (minimum 0)
  const yearsInService = Math.max(0, asOfYear - acqYear);
  const accumulatedDepreciation = Math.min(depreciableCost, annualDepreciation * yearsInService);
  const netBookValue = Math.max(0, safeCost - accumulatedDepreciation);

  return {
    annualDepreciation: Math.round(annualDepreciation * 100) / 100,
    yearsInService,
    accumulatedDepreciation: Math.round(accumulatedDepreciation * 100) / 100,
    netBookValue: Math.round(netBookValue * 100) / 100,
  };
}

/**
 * Decorates raw FixedAsset items with computed current-year depreciation values.
 */
export function enrichFixedAsset(
  asset: FixedAsset,
  asOfYear: number = new Date().getFullYear()
): FixedAsset {
  const result = calculateAssetDepreciation(
    asset.acquisition_cost,
    asset.depreciation_rate,
    asset.date_acquired,
    asset.salvage_value,
    asOfYear
  );

  return {
    ...asset,
    annual_depreciation: result.annualDepreciation,
    accumulated_depreciation: result.accumulatedDepreciation,
    netBookValue: result.netBookValue,
    // also keep snake_case version
    net_book_value: result.netBookValue,
  };
}
