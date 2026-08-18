'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, FinancialStatement, StatementType, FinancialStatementBreakdown, FS1Data, FS2Data, FS3Data, FS4Data, StatementFinancialOverrides, FinancialStatementEdits } from '@/types';
import { revalidatePath } from 'next/cache';
import { requireUser, requireRole, UNAUTHORIZED_RESPONSE } from '@/lib/auth/session';

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];

/** Format a YYYY-MM-DD date into e.g. "December 31, 2026". */
function formatAsOfDate(isoDate: string): string {
  if (!isoDate) return '';
  const [, month, day] = isoDate.split('-').map(Number);
  const year = isoDate.split('-')[0];
  if (!month || !day || !year) return isoDate;
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

/**
 * Fetch list of generated financial statements for an association
 */
export async function getFinancialStatementsAction(associationIdFilter?: string): Promise<ActionResponse<FinancialStatement[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  let effectiveAssoc = associationIdFilter;
  if (user.role !== 'super_admin') {
    effectiveAssoc = user.association_id || undefined;
  }

  try {
    const data = await localDb.getFinancialStatements(effectiveAssoc);
    return { success: true, message: 'Financial statements retrieved.', data };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching statements.' };
  }
}

/**
 * Automated & Fully Editable Financial Statement Generator (FS1, FS2, FS3, FS4 NIA Standard)
 */
export async function generateStatementAction(
  title: string,
  statementType: StatementType,
  periodStart: string,
  periodEnd: string,
  publishImmediately = true,
  associationId?: string,
  officers?: {
    associationName?: string;
    address?: string;
    presidentName?: string;
    treasurerName?: string;
    auditorName?: string;
    treasurerTin?: string;
    secRegNo?: string;
    associationTin?: string;
  },
  overrides?: StatementFinancialOverrides
): Promise<ActionResponse<FinancialStatement>> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) {
    return UNAUTHORIZED_RESPONSE;
  }

  try {
    let targetAssociationId = user.association_id;
  if (user.role === 'super_admin' && associationId) {
    targetAssociationId = associationId;
  }
  if (!targetAssociationId) {
    const assocs = await localDb.getAssociations();
    targetAssociationId = assocs[0] ? assocs[0].id : 'ia-nangurisan';
  }
  const targetAssoc = await localDb.getAssociationById(targetAssociationId);

  const assocName = officers?.associationName?.trim() || targetAssoc?.name || 'NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.';
  const assocAddress = officers?.address?.trim() || targetAssoc?.mailing_address || 'STA. CRUZ, GONZAGA, CAGAYAN';
  const president = officers?.presidentName?.trim() || targetAssoc?.president_name || 'MEYNARD A. TOMANENG';
  const treasurer = officers?.treasurerName?.trim() || 'RIC UNDAY';
  const auditor = officers?.auditorName?.trim() || 'ARTUR GUIANG';
  const treasurerTin = officers?.treasurerTin?.trim() || '440-615-026-000';
  const secRegNo = officers?.secRegNo?.trim() || targetAssoc?.sec_registration_number || 'CN202060557';
  const associationTin = officers?.associationTin?.trim() || targetAssoc?.tin_number || '769-207-601-000';

  if (periodStart > periodEnd) {
    return {
      success: false,
      message: 'Invalid period range: Period Start date cannot be later than Period End date.',
    };
  }

  const startYear = parseInt(periodStart.split('-')[0], 10);
  const endYear = parseInt(periodEnd.split('-')[0], 10);
  if (startYear !== endYear) {
    return {
      success: false,
      message: `Financial statements must be compiled within a single reporting year (${startYear} vs ${endYear}).`,
    };
  }

  // 1. Fetch live transactions for the association within range directly from Supabase
  const allTxs = await localDb.getTransactions(targetAssociationId);
  const currentTxs = allTxs.filter((t) => t.transaction_date >= periodStart && t.transaction_date <= periodEnd);

  const currentYearNum = parseInt(periodEnd.split('-')[0], 10) || new Date().getFullYear();
  const priorYearNum = currentYearNum - 1;
  const priorPeriodStart = `${priorYearNum}-01-01`;
  const priorPeriodEnd = `${priorYearNum}-12-31`;
  const priorTxs = allTxs.filter((t) => t.transaction_date >= priorPeriodStart && t.transaction_date <= priorPeriodEnd);

  // NIA Category mapping
  const RECEIPT_LINE_BY_CODE: Record<string, keyof FS1Data['receipts']> = {
    'REC-ISF': 'omSubsidy',
    'REC-MEM': 'membershipFees',
    'REC-SUB': 'omSubsidy',
    'REC-FIN': 'finesPenalties',
    'REC-DON': 'otherIncome',
  };

  const DISBURSEMENT_LINE_BY_CODE: Record<string, keyof FS1Data['disbursements']> = {
    'DISB-TRAV': 'travelRep',
    'DISB-CLEAR': 'canalClearingRepair',
    'DISB-PROF': 'professionalFee',
    'DISB-FED': 'federationShare',
    'DISB-PISO': 'pisoMulaSaPuso',
    'DISB-MISC': 'otherExpenses',
    'DISB-LATERAL': 'distributedIAShare',
    'DISB-REPAIR': 'repairMaintenance',
    'DISB-SUPP': 'officeSupplies',
    'DISB-HON': 'salariesWages',
    'DISB-TAX': 'taxLicenses',
  };

  function sumByCategory(txList: any[], codeMatch: (code: string) => boolean): number {
    return (txList || [])
      .filter((t) => t.category && codeMatch(t.category.code))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }

  const KNOWN_REC_CODES = ['REC-ISF', 'REC-MEM', 'REC-SUB', 'REC-FIN', 'REC-DON'];
  const KNOWN_DISB_CODES = ['DISB-TRAV', 'DISB-CLEAR', 'DISB-PROF', 'DISB-FED', 'DISB-PISO', 'DISB-MISC', 'DISB-LATERAL', 'DISB-REPAIR', 'DISB-SUPP', 'DISB-HON', 'DISB-TAX'];

  /**
   * Group custom / user-defined categories (codes outside the NIA chart) into
   * named FS1 extra lines so they always appear on the generated report.
   * The transaction type is checked explicitly so a receipt can never land
   * on the disbursement side (or vice versa), regardless of code prefix.
   */
  function buildExtraLines(
    currentList: any[],
    priorList: any[],
    expectedType: 'collection' | 'disbursement',
    isKnown: (code: string) => boolean
  ): Array<{ label: string; current: number; prior: number }> {
    const map = new Map<string, { label: string; current: number; prior: number }>();
    const add = (tx: any, isCurrent: boolean) => {
      if (tx.type !== expectedType) return;
      if (!tx.category || !tx.category.code || isKnown(tx.category.code)) return;
      const label = (tx.category.name || '').trim() || tx.category.code;
      if (!label) return;
      const entry = map.get(label) || { label, current: 0, prior: 0 };
      if (isCurrent) entry.current += Number(tx.amount || 0);
      else entry.prior += Number(tx.amount || 0);
      map.set(label, entry);
    };
    for (const t of currentList || []) add(t, true);
    for (const t of priorList || []) add(t, false);
    return Array.from(map.values());
  }

  const extraReceipts = buildExtraLines(currentTxs, priorTxs, 'collection', (c) => KNOWN_REC_CODES.includes(c));
  const extraDisbursements = buildExtraLines(currentTxs, priorTxs, 'disbursement', (c) => KNOWN_DISB_CODES.includes(c));

  // Calculate live values
  let liveCollections = currentTxs.filter((t) => t.type === 'collection').reduce((s, t) => s + Number(t.amount || 0), 0);
  let liveDisbursements = currentTxs.filter((t) => t.type === 'disbursement').reduce((s, t) => s + Number(t.amount || 0), 0);
  let priorCollections = priorTxs.filter((t) => t.type === 'collection').reduce((s, t) => s + Number(t.amount || 0), 0);
  let priorDisbursements = priorTxs.filter((t) => t.type === 'disbursement').reduce((s, t) => s + Number(t.amount || 0), 0);

  // Apply overrides if provided (Full editable capability)
  const r = {
    membershipFees: {
      current: overrides?.membershipFeesCurrent ?? sumByCategory(currentTxs, (c) => c === 'REC-MEM'),
      prior: overrides?.membershipFeesPrior ?? sumByCategory(priorTxs, (c) => c === 'REC-MEM'),
    },
    annualDues: {
      current: overrides?.annualDuesCurrent ?? 0,
      prior: overrides?.annualDuesPrior ?? 0,
    },
    omSubsidy: {
      current: overrides?.omSubsidyCurrent ?? sumByCategory(currentTxs, (c) => c === 'REC-ISF' || c === 'REC-SUB'),
      prior: overrides?.omSubsidyPrior ?? sumByCategory(priorTxs, (c) => c === 'REC-ISF' || c === 'REC-SUB'),
    },
    canalRemuIncentive: {
      current: overrides?.canalRemuCurrent ?? 0,
      prior: overrides?.canalRemuPrior ?? 0,
    },
    finesPenalties: {
      current: overrides?.finesPenaltiesCurrent ?? sumByCategory(currentTxs, (c) => c === 'REC-FIN'),
      prior: overrides?.finesPenaltiesPrior ?? sumByCategory(priorTxs, (c) => c === 'REC-FIN'),
    },
    interestEarned: {
      current: overrides?.interestEarnedCurrent ?? 0,
      prior: overrides?.interestEarnedPrior ?? 0,
    },
    otherIncome: {
      current: overrides?.otherIncomeCurrent ?? sumByCategory(currentTxs, (c) => c === 'REC-DON'),
      prior: overrides?.otherIncomePrior ?? sumByCategory(priorTxs, (c) => c === 'REC-DON'),
    },
    total: { current: 0, prior: 0 },
  };

  r.total.current = Object.values(r)
    .filter((v: any) => typeof v.current === 'number')
    .reduce((sum: number, v: any) => sum + v.current, 0);
  r.total.prior = Object.values(r)
    .filter((v: any) => typeof v.prior === 'number')
    .reduce((sum: number, v: any) => sum + v.prior, 0);

  const d = {
    registrationPermits: {
      current: overrides?.registrationPermitsCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-TAX'),
      prior: overrides?.registrationPermitsPrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-TAX'),
    },
    travelRep: {
      current: overrides?.travelRepCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-TRAV'),
      prior: overrides?.travelRepPrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-TRAV'),
    },
    meetingExpenses: {
      current: overrides?.meetingExpensesCurrent ?? 0,
      prior: overrides?.meetingExpensesPrior ?? 0,
    },
    officeSupplies: {
      current: overrides?.officeSuppliesCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-SUPP'),
      prior: overrides?.officeSuppliesPrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-SUPP'),
    },
    salariesWages: {
      current: overrides?.salariesWagesCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-HON'),
      prior: overrides?.salariesWagesPrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-HON'),
    },
    canalClearingRepair: {
      current: overrides?.canalClearingRepairCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-CLEAR'),
      prior: overrides?.canalClearingRepairPrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-CLEAR'),
    },
    taxLicenses: {
      current: overrides?.taxLicensesCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-TAX'),
      prior: overrides?.taxLicensesPrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-TAX'),
    },
    otherExpenses: {
      current: overrides?.otherExpensesCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-MISC'),
      prior: overrides?.otherExpensesPrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-MISC'),
    },
    repairMaintenance: {
      current: overrides?.repairMaintenanceCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-REPAIR'),
      prior: overrides?.repairMaintenancePrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-REPAIR'),
    },
    distributedIAShare: {
      current: overrides?.distributedIAShareCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-LATERAL'),
      prior: overrides?.distributedIASharePrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-LATERAL'),
    },
    professionalFee: {
      current: overrides?.professionalFeeCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-PROF'),
      prior: overrides?.professionalFeePrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-PROF'),
    },
    federationShare: {
      current: overrides?.federationShareCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-FED'),
      prior: overrides?.federationSharePrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-FED'),
    },
    pisoMulaSaPuso: {
      current: overrides?.pisoMulaSaPusoCurrent ?? sumByCategory(currentTxs, (c) => c === 'DISB-PISO'),
      prior: overrides?.pisoMulaSaPusoPrior ?? sumByCategory(priorTxs, (c) => c === 'DISB-PISO'),
    },
    total: { current: 0, prior: 0 },
  };

  d.total.current = Object.values(d)
    .filter((v: any) => typeof v.current === 'number')
    .reduce((sum: number, v: any) => sum + v.current, 0);
  d.total.prior = Object.values(d)
    .filter((v: any) => typeof v.prior === 'number')
    .reduce((sum: number, v: any) => sum + v.prior, 0);

  // Fold custom-category lines into the totals so the books stay balanced
  r.total.current += extraReceipts.reduce((s, x) => s + x.current, 0);
  r.total.prior += extraReceipts.reduce((s, x) => s + x.prior, 0);
  d.total.current += extraDisbursements.reduce((s, x) => s + x.current, 0);
  d.total.prior += extraDisbursements.reduce((s, x) => s + x.prior, 0);

  const netSurplusCurrent = r.total.current - d.total.current;
  const netSurplusPrior = r.total.prior - d.total.prior;

  const fundBalanceBeginningCurrent = netSurplusPrior;
  const fundBalanceEndCurrent = fundBalanceBeginningCurrent + netSurplusCurrent;
  const fundBalanceBeginningPrior = 0;
  const fundBalanceEndPrior = fundBalanceBeginningPrior + netSurplusPrior;

  // Build FS1 Model
  const fs1: FS1Data = {
    associationName: assocName,
    address: assocAddress,
    secRegNo,
    yearCurrent: currentYearNum,
    yearPrior: priorYearNum,
    receipts: r,
    disbursements: d,
    extraReceipts,
    extraDisbursements,
    netSurplus: { current: netSurplusCurrent, prior: netSurplusPrior },
    membersEquity: {
      fundBalanceBeginning: { current: fundBalanceBeginningCurrent, prior: fundBalanceBeginningPrior },
      netSavingsYear: { current: netSurplusCurrent, prior: netSurplusPrior },
      fundBalanceEnd: { current: fundBalanceEndCurrent, prior: fundBalanceEndPrior },
    },
    officers: {
      treasurerName: treasurer,
      auditorName: auditor,
      presidentName: president,
    },
  };

  // Build FS2 Model (Interconnected)
  const fs2: FS2Data = {
    associationName: assocName,
    address: assocAddress,
    secRegNo,
    yearCurrent: currentYearNum,
    yearPrior: priorYearNum,
    cashFlows: {
      netSurplus: { current: fs1.netSurplus.current, prior: fs1.netSurplus.prior },
      depreciation: { current: 0, prior: 0 },
      cashBalanceBeginning: { current: fundBalanceBeginningCurrent, prior: fundBalanceBeginningPrior },
      cashBalanceEnd: { current: fundBalanceEndCurrent, prior: fundBalanceEndPrior },
    },
    financialCondition: {
      assets: {
        currentAssets: { current: fundBalanceEndCurrent, prior: fundBalanceEndPrior },
        inventorySupplies: { current: overrides?.materialsSuppliesInventory ?? 0, prior: 0 },
        officeBuilding: { current: overrides?.officeBuilding ?? 0, prior: 0 },
        totalAssets: {
          current: fundBalanceEndCurrent + (overrides?.materialsSuppliesInventory ?? 0) + (overrides?.officeBuilding ?? 0),
          prior: fundBalanceEndPrior,
        },
      },
      liabilitiesEquity: {
        currentLiabilities: {
          current: (overrides?.notarialPermitFees ?? 0) + (overrides?.honorariumWagesPayable ?? 0) + (overrides?.otherAccountsPayable ?? 0),
          prior: 0,
        },
        nonCurrentLiabilities: { current: 0, prior: 0 },
        membersEquity: { current: fundBalanceEndCurrent, prior: fundBalanceEndPrior },
        totalLiabilitiesEquity: {
          current: fundBalanceEndCurrent + (overrides?.notarialPermitFees ?? 0) + (overrides?.honorariumWagesPayable ?? 0) + (overrides?.otherAccountsPayable ?? 0),
          prior: fundBalanceEndPrior,
        },
      },
    },
    officers: {
      treasurerName: treasurer,
      presidentName: president,
    },
  };

  // Build FS3 Model (Interconnected)
  const hasCashOverrides = overrides && (
    overrides.cashOnHand !== undefined ||
    overrides.undepositedCollections !== undefined ||
    overrides.cashInBankRegular !== undefined ||
    overrides.cashInBankCBU !== undefined ||
    overrides.savingsAccount !== undefined ||
    overrides.currentAccount !== undefined
  );

  const composition = hasCashOverrides
    ? {
        cashOnHandPetty: Number(overrides.cashOnHand || 0),
        undepositedCollections: Number(overrides.undepositedCollections || 0),
        cashInBankRegular: Number(overrides.cashInBankRegular || 0),
        cashInBankCBU: Number(overrides.cashInBankCBU || 0),
        savingsAccount: Number(overrides.savingsAccount || 0),
        currentAccount: Number(overrides.currentAccount || 0),
      }
    : {
        cashOnHandPetty: Math.round(fundBalanceEndCurrent * 0.15),
        undepositedCollections: 0,
        cashInBankRegular: Math.round(fundBalanceEndCurrent * 0.55),
        cashInBankCBU: Math.round(fundBalanceEndCurrent * 0.3),
        savingsAccount: 0,
        currentAccount: 0,
      };

  const fs3: FS3Data = {
    associationName: assocName,
    address: assocAddress,
    secRegNo,
    tinNo: associationTin,
    yearEnding: currentYearNum,
    cashReceipts: {
      membershipFees: fs1.receipts.membershipFees.current,
      annualDues: fs1.receipts.annualDues.current,
      feesPenalties: fs1.receipts.finesPenalties.current,
      donationsContributions: 0,
      interestEarned: fs1.receipts.interestEarned.current,
      iaSubsidy: fs1.receipts.omSubsidy.current,
      canalRemuneration: fs1.receipts.canalRemuIncentive.current,
      omFee: 0,
      otherIncome: fs1.receipts.otherIncome.current + extraReceipts.reduce((s, x) => s + x.current, 0),
      total: fs1.receipts.total.current,
    },
    cashDisbursements: {
      registrationPermits: fs1.disbursements.registrationPermits.current,
      travelRep: fs1.disbursements.travelRep.current,
      meetingExpenses: fs1.disbursements.meetingExpenses.current,
      officeSupplies: fs1.disbursements.officeSupplies.current,
      salariesWages: fs1.disbursements.salariesWages.current,
      canalClearingRepair: fs1.disbursements.canalClearingRepair.current,
      snacksMeetings: 0,
      collectionExpenses: 0,
      miscExpenses: fs1.disbursements.otherExpenses.current,
      otherExpenses: extraDisbursements.reduce((s, x) => s + x.current, 0),
      distributedIAShare: fs1.disbursements.distributedIAShare.current,
      professionalFee: fs1.disbursements.professionalFee.current,
      federationShare: fs1.disbursements.federationShare.current,
      pisoMulaSaPuso: fs1.disbursements.pisoMulaSaPuso.current,
      total: fs1.disbursements.total.current,
    },
    cashBalanceThisYear: fs1.netSurplus.current,
    fundBalanceLastReport: fundBalanceBeginningCurrent,
    totalCashBalance: fundBalanceEndCurrent,
    composition: { ...composition, total: fundBalanceEndCurrent },
    officers: {
      treasurerName: treasurer,
      auditorName: auditor,
      presidentName: president,
    },
  };

  // Build FS4 Model (Interconnected)
  const cashOnHand = fs3.composition.cashOnHandPetty + fs3.composition.undepositedCollections;
  const cashInBank =
    fs3.composition.cashInBankRegular +
    fs3.composition.cashInBankCBU +
    fs3.composition.savingsAccount +
    fs3.composition.currentAccount;

  const receivables = Number(overrides?.receivables || 0);
  const materialsSuppliesInventory = Number(overrides?.materialsSuppliesInventory || 0);
  const officeBuilding = Number(overrides?.officeBuilding || 0);
  const totalAssets = cashOnHand + cashInBank + receivables + materialsSuppliesInventory + officeBuilding;

  const notarialPermitFees = Number(overrides?.notarialPermitFees || 0);
  const honorariumWagesPayable = Number(overrides?.honorariumWagesPayable || 0);
  const otherAccountsPayable = Number(overrides?.otherAccountsPayable || 0);
  const totalLiabilities = notarialPermitFees + honorariumWagesPayable + otherAccountsPayable;
  const netWorth = totalAssets - totalLiabilities;

  const fs4: FS4Data = {
    associationName: assocName,
    address: assocAddress,
    secRegNo,
    tinNo: associationTin,
    asOfDate: formatAsOfDate(periodEnd),
    assets: {
      cashOnHand,
      cashInBank,
      receivables,
      materialsSuppliesInventory,
      officeBuilding,
      totalAssets,
    },
    liabilities: {
      notarialPermitFees,
      honorariumWagesPayable,
      otherAccountsPayable,
      totalLiabilities,
    },
    netWorth,
    officer: {
      treasurerName: treasurer,
      treasurerTin: treasurerTin,
    },
    notaryBlock: {
      province: 'Cagayan',
      municipality: 'Gonzaga',
      ctcNo: '___________',
      ctcIssuedOn: '___________',
      ctcIssuedAt: 'Gonzaga',
    },
  };

  const reportData: FinancialStatementBreakdown = {
    cash_at_bank: cashInBank,
    accounts_receivable: receivables,
    equipment_assets: materialsSuppliesInventory + officeBuilding,
    accounts_payable: totalLiabilities,
    retained_earnings: netWorth,
    fs1,
    fs2,
    fs3,
    fs4,
    categories_summary: [],
  };

  const statementNumber = `FS-${targetAssoc?.code || 'IA'}-${currentYearNum}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newStatement: FinancialStatement = {
    id: `stmt-${Date.now()}`,
    statement_number: statementNumber,
    title: title || `${assocName} Financial Statements (${currentYearNum})`,
    association_id: targetAssociationId,
    statement_type: statementType,
    period_start: periodStart,
    period_end: periodEnd,
    total_collections: r.total.current,
    total_disbursements: d.total.current,
    net_cash_flow: netSurplusCurrent,
    report_data: reportData,
    is_published: publishImmediately,
    generated_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  await localDb.createFinancialStatement(newStatement);

  revalidatePath('/dashboard/statements');
  return {
    success: true,
    message: `Statement ${statementNumber} compiled successfully for ${assocName}.`,
    data: newStatement,
  };
  } catch (error: any) {
    console.error('Error generating financial statement:', error);
    return {
      success: false,
      message: error?.message || 'Error generating financial statement. Please check your data and try again.',
    };
  }
}

/**
 * Update an existing generated financial statement with custom edits across FS1-FS4
 */
export async function updateFinancialStatementAction(
  id: string,
  updatedData: {
    title?: string;
    fs1?: FS1Data;
    fs2?: FS2Data;
    fs3?: FS3Data;
    fs4?: FS4Data;
    edits?: FinancialStatementEdits;
    officers?: {
      presidentName?: string;
      treasurerName?: string;
      auditorName?: string;
      treasurerTin?: string;
      secRegNo?: string;
      associationTin?: string;
      associationName?: string;
      address?: string;
    };
  }
): Promise<ActionResponse<FinancialStatement>> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) return UNAUTHORIZED_RESPONSE;

  const stmt = await localDb.getFinancialStatementById(id);
  if (!stmt) {
    return { success: false, message: 'Financial statement record not found.' };
  }

  // Cross-association write protection: officers may only edit their own IA's statements.
  if (user.role !== 'super_admin' && stmt.association_id && stmt.association_id !== user.association_id) {
    return UNAUTHORIZED_RESPONSE;
  }

  const existingReport = stmt.report_data || {};
  const currentFS1 = updatedData.fs1 || existingReport.fs1;
  const currentFS2 = updatedData.fs2 || existingReport.fs2;
  const currentFS3 = updatedData.fs3 || existingReport.fs3;
  const currentFS4 = updatedData.fs4 || existingReport.fs4;

  const patch: Partial<FinancialStatement> = {
    title: updatedData.title || stmt.title,
    report_data: {
      ...existingReport,
      fs1: currentFS1,
      fs2: currentFS2,
      fs3: currentFS3,
      fs4: currentFS4,
      edits: updatedData.edits ?? existingReport.edits,
    },
    total_collections: currentFS1?.receipts?.total?.current ?? stmt.total_collections,
    total_disbursements: currentFS1?.disbursements?.total?.current ?? stmt.total_disbursements,
    net_cash_flow: currentFS1?.netSurplus?.current ?? stmt.net_cash_flow,
  };

  const updated = await localDb.updateFinancialStatement(id, patch);

  revalidatePath('/dashboard/statements');
  return {
    success: true,
    message: `Financial statement ${stmt.statement_number} updated successfully.`,
    data: updated,
  };
}

/**
 * Rename financial statement
 */
export async function renameFinancialStatementAction(id: string, newTitle: string): Promise<ActionResponse<FinancialStatement>> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) return UNAUTHORIZED_RESPONSE;

  if (!newTitle || newTitle.trim().length === 0) {
    return { success: false, message: 'Statement title cannot be empty.' };
  }

  const stmt = await localDb.getFinancialStatementById(id);
  if (!stmt) {
    return { success: false, message: 'Financial statement not found.' };
  }

  // Cross-association write protection: officers may only rename their own IA's statements.
  if (user.role !== 'super_admin' && stmt.association_id && stmt.association_id !== user.association_id) {
    return UNAUTHORIZED_RESPONSE;
  }

  const updated = await localDb.updateFinancialStatement(id, { title: newTitle.trim() });
  if (!updated) {
    return { success: false, message: 'Financial statement not found.' };
  }

  revalidatePath('/dashboard/statements');
  return { success: true, message: 'Financial statement renamed successfully.', data: updated };
}

/**
 * Delete a financial statement
 */
export async function deleteFinancialStatementAction(id: string): Promise<ActionResponse> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) return UNAUTHORIZED_RESPONSE;

  const stmt = await localDb.getFinancialStatementById(id);
  if (!stmt) {
    return { success: false, message: 'Statement record not found.' };
  }

  // Cross-association write protection: officers may only delete their own IA's statements.
  if (user.role !== 'super_admin' && stmt.association_id && stmt.association_id !== user.association_id) {
    return UNAUTHORIZED_RESPONSE;
  }

  const success = await localDb.deleteFinancialStatement(id);
  if (!success) {
    return { success: false, message: 'Statement record not found.' };
  }

  revalidatePath('/dashboard/statements');
  return { success: true, message: 'Financial statement deleted successfully.' };
}
