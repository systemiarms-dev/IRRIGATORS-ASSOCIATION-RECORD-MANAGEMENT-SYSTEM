'use server';

import { localDb } from '@/lib/db/localDb';
import { ActionResponse, FinancialStatement, StatementType, FinancialStatementBreakdown, FS1Data, FS2Data, FS3Data, FS4Data, StatementFinancialOverrides } from '@/types';
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
 * Fetch list of generated financial statements
 */
export async function getFinancialStatementsAction(): Promise<ActionResponse<FinancialStatement[]>> {
  const user = await requireUser();
  if (!user) return UNAUTHORIZED_RESPONSE;

  try {
    const data = localDb.getFinancialStatements();
    return { success: true, message: 'Financial statements retrieved.', data };
  } catch (error: any) {
    return { success: false, message: error.message || 'Error fetching statements.' };
  }
}

/**
 * Automated Financial Statement Generator (Supports FS1, FS2, FS3, FS4 NIA standard reporting formats)
 */
export async function generateStatementAction(
  title: string,
  statementType: StatementType,
  periodStart: string,
  periodEnd: string,
  publishImmediately = true,
  officers?: {
    presidentName?: string;
    treasurerName?: string;
    auditorName?: string;
    treasurerTin?: string;
    secRegNo?: string;
    associationTin?: string;
  },
  overrides?: StatementFinancialOverrides
): Promise<ActionResponse<FinancialStatement>> {
  // Enforce Role-Based Access Control (RBAC) against the verified session
  const user = await requireRole('admin', 'treasurer');
  if (!user) {
    return UNAUTHORIZED_RESPONSE;
  }

  const president = officers?.presidentName?.trim() || 'MEYNARD TOMANENG';
  const treasurer = officers?.treasurerName?.trim() || 'RIC UNDAY';
  const auditor = officers?.auditorName?.trim() || 'ARTUR GUIANG';
  const treasurerTin = officers?.treasurerTin?.trim() || '440-615-026-000';
  const secRegNo = officers?.secRegNo?.trim() || 'CN202060557';
  const associationTin = officers?.associationTin?.trim() || '769-207-601-000';
  // 0. Validate Date Range
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
      message: `Financial statements must be compiled within a single reporting year. Period Start (${startYear}) and Period End (${endYear}) must belong to the same calendar year (e.g., ${startYear}-01-01 to ${startYear}-12-31).`,
    };
  }

  // 1. Fetch current year transactions within range
  const allTxs = localDb.getTransactions();
  const currentTxs = allTxs.filter((t) => t.transaction_date >= periodStart && t.transaction_date <= periodEnd);

  // Calculate prior year range (e.g. 2026 -> 2025)
  const currentYearNum = parseInt(periodEnd.split('-')[0], 10) || new Date().getFullYear();
  const priorYearNum = currentYearNum - 1;
  const priorPeriodStart = `${priorYearNum}-01-01`;
  const priorPeriodEnd = `${priorYearNum}-12-31`;

  const priorTxs = allTxs.filter((t) => t.transaction_date >= priorPeriodStart && t.transaction_date <= priorPeriodEnd);

  // Deterministic category → FS line mapping.
  // Each seeded budget category maps to exactly ONE statement line so a
  // transaction is never double-counted or mis-placed by fuzzy keyword matching.
  const RECEIPT_LINE_BY_CATEGORY_ID: Record<string, keyof FS1Data['receipts']> = {
    'cat-1': 'omSubsidy', // REC-ISF Irrigation Service Fee
    'cat-2': 'membershipFees', // REC-MEM Membership Fees & Annual Dues
    'cat-3': 'omSubsidy', // REC-SUB O&M Subsidy & Canal Remuneration
    'cat-4': 'finesPenalties', // REC-FIN Fines, Penalties & Interest
  };
  const DISBURSEMENT_LINE_BY_CATEGORY_ID: Record<string, keyof FS1Data['disbursements']> = {
    'cat-5': 'canalClearingRepair', // DISB-CLEAR Canal Clearing, Repair & Maintenance
    'cat-6': 'officeSupplies', // DISB-SUPP Office & Field Supplies
    'cat-7': 'salariesWages', // DISB-HON Honorarium, Salaries & Wages
    'cat-8': 'travelRep', // DISB-TRAV Travel, Meeting & Rep Expenses
    'cat-9': 'registrationPermits', // DISB-TAX Registration, Tax & Licenses
    'cat-10': 'distributedIAShare', // DISB-SHARE Distributed IA Share to Laterals
  };

  function receiptLineFor(tx: any): keyof FS1Data['receipts'] {
    return RECEIPT_LINE_BY_CATEGORY_ID[tx.category_id] || 'otherIncome';
  }

  function disbursementLineFor(tx: any): keyof FS1Data['disbursements'] {
    return DISBURSEMENT_LINE_BY_CATEGORY_ID[tx.category_id] || 'otherExpenses';
  }

  function accumulateLines(
    txList: any[],
    lineFor: (t: any) => string
  ): Record<string, number> {
    const totals: Record<string, number> = {};
    (txList || []).forEach((tx: any) => {
      const line = lineFor(tx);
      totals[line] = (totals[line] || 0) + Number(tx.amount || 0);
    });
    return totals;
  }

  // Totals for current year
  let totalCollections = 0;
  let totalDisbursements = 0;

  (currentTxs || []).forEach((tx: any) => {
    const amt = Number(tx.amount || 0);
    if (tx.type === 'collection') {
      totalCollections += amt;
    } else {
      totalDisbursements += amt;
    }
  });

  // Totals for prior year
  let priorCollections = 0;
  let priorDisbursements = 0;

  (priorTxs || []).forEach((tx: any) => {
    const amt = Number(tx.amount || 0);
    if (tx.type === 'collection') {
      priorCollections += amt;
    } else {
      priorDisbursements += amt;
    }
  });

  const netCashFlow = totalCollections - totalDisbursements;
  const priorNetSurplus = priorCollections - priorDisbursements;

  const fundBalanceBeginningCurrent = priorNetSurplus;
  const fundBalanceEndCurrent = fundBalanceBeginningCurrent + netCashFlow;

  const fundBalanceBeginningPrior = 0;
  const fundBalanceEndPrior = fundBalanceBeginningPrior + priorNetSurplus;

  // Real Category Breakdown: deterministic, every transaction counted exactly once
  const receiptLinesCurrent = accumulateLines(currentTxs.filter(t => t.type === 'collection'), receiptLineFor);
  const receiptLinesPrior = accumulateLines(priorTxs.filter(t => t.type === 'collection'), receiptLineFor);
  const disbursementLinesCurrent = accumulateLines(currentTxs.filter(t => t.type === 'disbursement'), disbursementLineFor);
  const disbursementLinesPrior = accumulateLines(priorTxs.filter(t => t.type === 'disbursement'), disbursementLineFor);

  const getR = (line: keyof FS1Data['receipts']) => ({
    current: receiptLinesCurrent[line] || 0,
    prior: receiptLinesPrior[line] || 0,
  });

  const getD = (line: keyof FS1Data['disbursements']) => ({
    current: disbursementLinesCurrent[line] || 0,
    prior: disbursementLinesPrior[line] || 0,
  });

  // Build FS1 Model with REAL totals
  const fs1: FS1Data = {
    associationName: 'NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.',
    address: 'IPIL, GONZAGA CAGAYAN',
    secRegNo: secRegNo,
    yearCurrent: currentYearNum,
    yearPrior: priorYearNum,
    receipts: {
      membershipFees: getR('membershipFees'),
      annualDues: getR('annualDues'),
      omSubsidy: getR('omSubsidy'),
      canalRemuIncentive: getR('canalRemuIncentive'),
      finesPenalties: getR('finesPenalties'),
      interestEarned: getR('interestEarned'),
      otherIncome: getR('otherIncome'),
      total: { current: totalCollections, prior: priorCollections },
    },
    disbursements: {
      registrationPermits: getD('registrationPermits'),
      travelRep: getD('travelRep'),
      meetingExpenses: getD('meetingExpenses'),
      officeSupplies: getD('officeSupplies'),
      salariesWages: getD('salariesWages'),
      canalClearingRepair: getD('canalClearingRepair'),
      taxLicenses: getD('taxLicenses'),
      otherExpenses: getD('otherExpenses'),
      repairMaintenance: getD('repairMaintenance'),
      distributedIAShare: getD('distributedIAShare'),
      total: { current: totalDisbursements, prior: priorDisbursements },
    },
    netSurplus: { current: netCashFlow, prior: priorNetSurplus },
    membersEquity: {
      fundBalanceBeginning: { current: fundBalanceBeginningCurrent, prior: fundBalanceBeginningPrior },
      netSavingsYear: { current: netCashFlow, prior: priorNetSurplus },
      fundBalanceEnd: { current: fundBalanceEndCurrent, prior: fundBalanceEndPrior },
    },
    officers: {
      treasurerName: treasurer,
      auditorName: auditor,
      presidentName: president,
    },
  };

  // Build FS2 Model
  const fs2: FS2Data = {
    associationName: 'NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.',
    address: 'IPIL, GONZAGA CAGAYAN',
    secRegNo: secRegNo,
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
        inventorySupplies: { current: 0, prior: 0 },
        totalAssets: { current: fundBalanceEndCurrent, prior: fundBalanceEndPrior },
      },
      liabilitiesEquity: {
        currentLiabilities: { current: 0, prior: 0 },
        nonCurrentLiabilities: { current: 0, prior: 0 },
        membersEquity: { current: fundBalanceEndCurrent, prior: fundBalanceEndPrior },
        totalLiabilitiesEquity: { current: fundBalanceEndCurrent, prior: fundBalanceEndPrior },
      },
    },
    officers: {
      treasurerName: treasurer,
      presidentName: president,
    },
  };

  // Build FS3 Model
  const hasCashOverrides =
    overrides &&
    (overrides.cashOnHand !== undefined ||
      overrides.undepositedCollections !== undefined ||
      overrides.cashInBankRegular !== undefined ||
      overrides.cashInBankCBU !== undefined ||
      overrides.savingsAccount !== undefined ||
      overrides.currentAccount !== undefined);

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

  const compositionTotal = Object.values(composition).reduce((sum, v) => sum + (Number.isFinite(v) ? v : 0), 0);
  if (hasCashOverrides && Math.abs(compositionTotal - fundBalanceEndCurrent) > 0.01) {
    return {
      success: false,
      message: `Cash composition must total the fund balance of ₱${fundBalanceEndCurrent.toLocaleString()}. The entered figures total ₱${compositionTotal.toLocaleString()}. Please adjust the cash on hand / bank figures or leave them blank to use the automatic allocation.`,
    };
  }

  const fs3: FS3Data = {
    associationName: 'NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.',
    address: 'Ipil, Gonzaga, Cagayan',
    secRegNo: secRegNo,
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
      otherIncome: fs1.receipts.otherIncome.current,
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
      miscExpenses: 0,
      otherExpenses: fs1.disbursements.otherExpenses.current,
      distributedIAShare: fs1.disbursements.distributedIAShare.current,
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

  // Build FS4 Model
  const balanceSheetOverrides = overrides && {
    hasAssets:
      overrides.receivables !== undefined ||
      overrides.materialsSuppliesInventory !== undefined ||
      overrides.officeBuilding !== undefined,
    hasLiabilities:
      overrides.notarialPermitFees !== undefined ||
      overrides.honorariumWagesPayable !== undefined ||
      overrides.otherAccountsPayable !== undefined,
  };

  const cashOnHand = fs3.composition.cashOnHandPetty + fs3.composition.undepositedCollections;
  const cashInBank =
    fs3.composition.cashInBankRegular +
    fs3.composition.cashInBankCBU +
    fs3.composition.savingsAccount +
    fs3.composition.currentAccount;

  const receivables = balanceSheetOverrides ? Number(overrides.receivables || 0) : 0;
  const materialsSuppliesInventory = balanceSheetOverrides ? Number(overrides.materialsSuppliesInventory || 0) : 0;
  const officeBuilding = balanceSheetOverrides ? Number(overrides.officeBuilding || 0) : 0;
  const totalAssets = cashOnHand + cashInBank + receivables + materialsSuppliesInventory + officeBuilding;

  const liabilities = balanceSheetOverrides
    ? {
        notarialPermitFees: Number(overrides.notarialPermitFees || 0),
        honorariumWagesPayable: Number(overrides.honorariumWagesPayable || 0),
        otherAccountsPayable: Number(overrides.otherAccountsPayable || 0),
        totalLiabilities: 0,
      }
    : { notarialPermitFees: 0, honorariumWagesPayable: 0, otherAccountsPayable: 0, totalLiabilities: 0 };
  liabilities.totalLiabilities = liabilities.notarialPermitFees + liabilities.honorariumWagesPayable + liabilities.otherAccountsPayable;

  const netWorth = totalAssets - liabilities.totalLiabilities;

  const fs4: FS4Data = {
    associationName: 'NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.',
    address: 'Ipil, Gonzaga, Cagayan',
    secRegNo: secRegNo,
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
    liabilities,
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
    accounts_payable: liabilities.totalLiabilities,
    retained_earnings: netWorth,
    fs1,
    fs2,
    fs3,
    fs4,
    categories_summary: [],
  };

  const statementNumber = `FS-${currentYearNum}-${Math.floor(1000 + Math.random() * 9000)}`;

  const newStatement: FinancialStatement = {
    id: `stmt-${Date.now()}`,
    statement_number: statementNumber,
    title: title || `Official Irrigator Association Financial Statements (${currentYearNum})`,
    statement_type: statementType,
    period_start: periodStart,
    period_end: periodEnd,
    total_collections: totalCollections,
    total_disbursements: totalDisbursements,
    net_cash_flow: netCashFlow,
    report_data: reportData,
    is_published: publishImmediately,
    generated_by: user.id,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  localDb.createFinancialStatement(newStatement);

  revalidatePath('/dashboard/statements');
  return {
    success: true,
    message: `Statement ${statementNumber} compiled successfully with live transaction data.`,
    data: newStatement,
  };
}

/**
 * Update an existing generated financial statement (officers / signatory
 * details and cash composition / balance sheet overrides) without
 * regenerating ledger-driven figures.
 */
export async function updateFinancialStatementAction(
  id: string,
  officers?: {
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

  const existing = localDb.getFinancialStatementById(id);
  if (!existing) {
    return { success: false, message: 'Financial statement report not found.' };
  }

  const rd = existing.report_data;
  const fs1 = (rd.fs1 || {}) as FS1Data;
  const fs2 = (rd.fs2 || {}) as FS2Data;
  const fs3 = (rd.fs3 || {}) as FS3Data;
  const fs4 = (rd.fs4 || {}) as FS4Data;

  if (!fs1.officers) fs1.officers = { presidentName: '', treasurerName: '', auditorName: '' };
  if (!fs2.officers) fs2.officers = { treasurerName: '', presidentName: '' };
  if (!fs3.officers) fs3.officers = { presidentName: '', treasurerName: '', auditorName: '' };
  if (!fs4.officer) fs4.officer = { treasurerName: '', treasurerTin: '' };
  if (!fs4.assets) fs4.assets = { cashOnHand: 0, cashInBank: 0, receivables: 0, materialsSuppliesInventory: 0, officeBuilding: 0, totalAssets: 0 };
  if (!fs4.liabilities) fs4.liabilities = { notarialPermitFees: 0, honorariumWagesPayable: 0, otherAccountsPayable: 0, totalLiabilities: 0 };
  if (!fs3.composition) fs3.composition = { cashOnHandPetty: 0, undepositedCollections: 0, cashInBankRegular: 0, cashInBankCBU: 0, savingsAccount: 0, currentAccount: 0, total: 0 };

  // Recompute fund balance source-of-truth used by composition validation.
  const fundBalanceEnd = fs1?.membersEquity?.fundBalanceEnd?.current ?? existing.net_cash_flow;

  // --- Apply officer / signatory edits ---
  if (officers?.presidentName !== undefined) {
    fs1.officers.presidentName = officers.presidentName;
    fs3.officers.presidentName = officers.presidentName;
  }
  if (officers?.treasurerName !== undefined) {
    fs1.officers.treasurerName = officers.treasurerName;
    fs2.officers.treasurerName = officers.treasurerName;
    fs3.officers.treasurerName = officers.treasurerName;
    fs4.officer.treasurerName = officers.treasurerName;
  }
  if (officers?.auditorName !== undefined) {
    fs1.officers.auditorName = officers.auditorName;
    fs3.officers.auditorName = officers.auditorName;
  }
  if (officers?.treasurerTin !== undefined) {
    fs4.officer.treasurerTin = officers.treasurerTin;
  }
  if (officers?.secRegNo !== undefined) {
    fs1.secRegNo = officers.secRegNo;
    fs2.secRegNo = officers.secRegNo;
    fs3.secRegNo = officers.secRegNo;
    fs4.secRegNo = officers.secRegNo;
  }
  if (officers?.associationTin !== undefined) {
    fs3.tinNo = officers.associationTin;
    fs4.tinNo = officers.associationTin;
  }

  // --- Apply cash composition / balance sheet overrides ---
  const hasCashOverrides =
    overrides &&
    (overrides.cashOnHand !== undefined ||
      overrides.undepositedCollections !== undefined ||
      overrides.cashInBankRegular !== undefined ||
      overrides.cashInBankCBU !== undefined ||
      overrides.savingsAccount !== undefined ||
      overrides.currentAccount !== undefined);

  const hasAssetOverrides =
    overrides &&
    (overrides.receivables !== undefined ||
      overrides.materialsSuppliesInventory !== undefined ||
      overrides.officeBuilding !== undefined);

  const hasLiabilityOverrides =
    overrides &&
    (overrides.notarialPermitFees !== undefined ||
      overrides.honorariumWagesPayable !== undefined ||
      overrides.otherAccountsPayable !== undefined);

  if (hasCashOverrides) {
    const nextComposition = {
      cashOnHandPetty: Number(overrides.cashOnHand || 0),
      undepositedCollections: Number(overrides.undepositedCollections || 0),
      cashInBankRegular: Number(overrides.cashInBankRegular || 0),
      cashInBankCBU: Number(overrides.cashInBankCBU || 0),
      savingsAccount: Number(overrides.savingsAccount || 0),
      currentAccount: Number(overrides.currentAccount || 0),
    };
    const cashFieldsUnchanged =
      Object.keys(nextComposition).every(
        (key) => Number((fs3.composition as Record<string, number>)[key] || 0) === nextComposition[key as keyof typeof nextComposition]
      );
    if (!cashFieldsUnchanged) {
      const sum = Object.values(nextComposition).reduce((acc, v) => acc + (Number.isFinite(v) ? v : 0), 0);
      if (Math.abs(sum - fundBalanceEnd) > 0.01) {
        return {
          success: false,
          message: `Cash composition must total the fund balance of ₱${fundBalanceEnd.toLocaleString()}. The entered figures total ₱${sum.toLocaleString()}.`,
        };
      }
      fs3.composition = { ...nextComposition, total: fundBalanceEnd };
    }
  }

  if (hasAssetOverrides) {
    fs4.assets.receivables = Number(overrides.receivables || 0);
    fs4.assets.materialsSuppliesInventory = Number(overrides.materialsSuppliesInventory || 0);
    fs4.assets.officeBuilding = Number(overrides.officeBuilding || 0);
  }
  if (hasLiabilityOverrides) {
    fs4.liabilities.notarialPermitFees = Number(overrides.notarialPermitFees || 0);
    fs4.liabilities.honorariumWagesPayable = Number(overrides.honorariumWagesPayable || 0);
    fs4.liabilities.otherAccountsPayable = Number(overrides.otherAccountsPayable || 0);
  }

  // Re-derive FS4 totals (cash is read from the updated composition).
  fs4.assets.cashOnHand = fs3.composition.cashOnHandPetty + fs3.composition.undepositedCollections;
  fs4.assets.cashInBank =
    fs3.composition.cashInBankRegular +
    fs3.composition.cashInBankCBU +
    fs3.composition.savingsAccount +
    fs3.composition.currentAccount;
  fs4.assets.totalAssets =
    fs4.assets.cashOnHand + fs4.assets.cashInBank + fs4.assets.receivables + fs4.assets.materialsSuppliesInventory + fs4.assets.officeBuilding;
  fs4.liabilities.totalLiabilities =
    fs4.liabilities.notarialPermitFees + fs4.liabilities.honorariumWagesPayable + fs4.liabilities.otherAccountsPayable;
  fs4.netWorth = fs4.assets.totalAssets - fs4.liabilities.totalLiabilities;

  // Keep the dashboard summary fields in sync.
  rd.cash_at_bank = fs4.assets.cashInBank;
  rd.accounts_receivable = fs4.assets.receivables;
  rd.equipment_assets = fs4.assets.materialsSuppliesInventory + fs4.assets.officeBuilding;
  rd.accounts_payable = fs4.liabilities.totalLiabilities;
  rd.retained_earnings = fs4.netWorth;

  // Persist any fallback sections that were materialized during the edit.
  rd.fs1 = fs1;
  rd.fs2 = fs2;
  rd.fs3 = fs3;
  rd.fs4 = fs4;

  const updated = localDb.updateFinancialStatement(id, { report_data: rd });

  revalidatePath('/dashboard/statements');
  revalidatePath('/dashboard');
  return {
    success: true,
    message: `Statement ${existing.statement_number} updated successfully.`,
    data: updated,
  };
}

/**
 * Rename a generated financial statement report title
 */
export async function renameFinancialStatementAction(id: string, newTitle: string): Promise<ActionResponse<FinancialStatement>> {
  const user = await requireRole('admin', 'treasurer');
  if (!user) {
    return UNAUTHORIZED_RESPONSE;
  }

  const cleanTitle = (newTitle || '').trim();
  if (!cleanTitle) {
    return { success: false, message: 'Please enter a report title.' };
  }
  if (cleanTitle.length > 200) {
    return { success: false, message: 'Report title is too long (maximum 200 characters).' };
  }

  const existing = localDb.getFinancialStatementById(id);
  if (!existing) {
    return { success: false, message: 'Financial statement report not found.' };
  }

  const updated = localDb.updateFinancialStatement(id, { title: cleanTitle });

  revalidatePath('/dashboard/statements');
  revalidatePath('/dashboard');
  return {
    success: true,
    message: `Statement ${existing.statement_number} renamed successfully.`,
    data: updated,
  };
}

/**
 * Delete a generated financial statement report
 */
export async function deleteFinancialStatementAction(id: string): Promise<ActionResponse> {
  const user = await requireRole('admin');
  if (!user) {
    return UNAUTHORIZED_RESPONSE;
  }

  const success = localDb.deleteFinancialStatement(id);
  if (!success) {
    return { success: false, message: 'Financial statement report not found.' };
  }

  revalidatePath('/dashboard/statements');
  revalidatePath('/dashboard');
  return { success: true, message: 'Financial statement deleted successfully.' };
}
