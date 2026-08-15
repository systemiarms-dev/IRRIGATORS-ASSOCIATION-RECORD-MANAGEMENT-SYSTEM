import { FinancialStatementBreakdown, FinancialStatementEdits } from '@/types';

/**
 * Derived cells that are auto-computed and must never be pinned by the user
 * (totals, net surplus, equity, cash-flow statements, balance-sheet totals).
 * Lines of the report — not these — are the user-editable inputs.
 */
const LOCKED_DERIVED_PATHS = new Set<string>([
  'fs1.receipts.total.current',
  'fs1.receipts.total.prior',
  'fs1.disbursements.total.current',
  'fs1.disbursements.total.prior',
  'fs1.netSurplus.current',
  'fs1.netSurplus.prior',
  'fs1.membersEquity.netSavingsYear.current',
  'fs1.membersEquity.netSavingsYear.prior',
  'fs1.membersEquity.fundBalanceEnd.current',
  'fs1.membersEquity.fundBalanceEnd.prior',

  'fs2.cashFlows.netSurplus.current',
  'fs2.cashFlows.netSurplus.prior',
  'fs2.cashFlows.cashBalanceBeginning.current',
  'fs2.cashFlows.cashBalanceBeginning.prior',
  'fs2.cashFlows.cashBalanceEnd.current',
  'fs2.cashFlows.cashBalanceEnd.prior',
  'fs2.financialCondition.assets.currentAssets.current',
  'fs2.financialCondition.assets.currentAssets.prior',
  'fs2.financialCondition.assets.totalAssets.current',
  'fs2.financialCondition.assets.totalAssets.prior',
  'fs2.financialCondition.liabilitiesEquity.membersEquity.current',
  'fs2.financialCondition.liabilitiesEquity.membersEquity.prior',
  'fs2.financialCondition.liabilitiesEquity.totalLiabilitiesEquity.current',
  'fs2.financialCondition.liabilitiesEquity.totalLiabilitiesEquity.prior',

  'fs3.cashReceipts.total',
  'fs3.cashDisbursements.total',
  'fs3.cashBalanceThisYear',
  'fs3.fundBalanceLastReport',
  'fs3.totalCashBalance',
  'fs3.composition.total',

  'fs4.assets.cashOnHand',
  'fs4.assets.cashInBank',
  'fs4.assets.totalAssets',
  'fs4.liabilities.totalLiabilities',
  'fs4.netWorth',
]);

const n0 = (v: number | undefined | null) => Number(v || 0);

/** Returns an existing nested object or creates an empty one (guards legacy/partial statements). */
const ensure = (parent: any, key: string): any => {
  if (parent[key] === undefined || parent[key] === null || typeof parent[key] !== 'object') parent[key] = {};
  return parent[key];
};

/** Returns a { current, prior } pair, creating it with zeros when missing. */
const ensurePair = (parent: any, key: string): { current: number; prior: number } => {
  const section = ensure(parent, key);
  if (typeof section.current !== 'number') section.current = 0;
  if (typeof section.prior !== 'number') section.prior = 0;
  return section;
};

/** Reads a { current, prior } pair defensively (never throws). */
const hashPair = (parent: any, key: string): { current: number; prior: number } => {
  const section = parent?.[key];
  if (!section || typeof section !== 'object') return { current: 0, prior: 0 };
  return { current: n0(section.current), prior: n0(section.prior) };
};

/**
 * Recalculates all derived figures across FS1-FS4 after an inline edit.
 *
 * - Line items and the accounting input are the source of truth; totals, net
 *   surplus, equity, cash-flow statements and the balance sheet are recomputed
 *   so every report stays connected.
 * - Manual overrides on editable line items are applied last and never
 *   overwritten; auto-computed (locked) cells always win.
 * - Custom FS1 rows (`extraReceipts` / `extraDisbursements`) are folded into
 *   the totals and into FS3's catch-all lines so the books stay balanced.
 */
export function recomputeBreakdown(rd: FinancialStatementBreakdown): FinancialStatementBreakdown {
  const next: FinancialStatementBreakdown = JSON.parse(JSON.stringify(rd));

  const fs1 = next.fs1;
  const fs2 = next.fs2;
  const fs3 = next.fs3;
  const fs4 = next.fs4;
  const edits = next.edits;

  const forced = collectForcedPaths(edits);
  const pinned = (p: string) => forced.has(p);

  applyForcedPins(next, edits);

  if (fs1) {
    const r = fs1.receipts as any;
    const d = fs1.disbursements as any;
    const extraR = fs1.extraReceipts || [];
    const extraD = fs1.extraDisbursements || [];

    if (!pinned('fs1.receipts.total.current') || !pinned('fs1.receipts.total.prior')) {
      r.total = r.total || { current: 0, prior: 0 };
      if (!pinned('fs1.receipts.total.current')) {
        r.total.current = 0;
        for (const k of Object.keys(r)) if (k !== 'total') r.total.current += n0(r[k].current);
        for (const x of extraR) r.total.current += n0(x.current);
      }
      if (!pinned('fs1.receipts.total.prior')) {
        r.total.prior = 0;
        for (const k of Object.keys(r)) if (k !== 'total') r.total.prior += n0(r[k].prior);
        for (const x of extraR) r.total.prior += n0(x.prior);
      }
    }

    if (!pinned('fs1.disbursements.total.current') || !pinned('fs1.disbursements.total.prior')) {
      d.total = d.total || { current: 0, prior: 0 };
      if (!pinned('fs1.disbursements.total.current')) {
        d.total.current = 0;
        for (const k of Object.keys(d)) if (k !== 'total') d.total.current += n0(d[k].current);
        for (const x of extraD) d.total.current += n0(x.current);
      }
      if (!pinned('fs1.disbursements.total.prior')) {
        d.total.prior = 0;
        for (const k of Object.keys(d)) if (k !== 'total') d.total.prior += n0(d[k].prior);
        for (const x of extraD) d.total.prior += n0(x.prior);
      }
    }

    if (!pinned('fs1.netSurplus.current')) fs1.netSurplus.current = r.total.current - d.total.current;
    if (!pinned('fs1.netSurplus.prior')) fs1.netSurplus.prior = r.total.prior - d.total.prior;

    const eq = ensure(fs1, 'membersEquity');
    const netSavingsYear = ensurePair(eq, 'netSavingsYear');
    const fundBalanceBeginning = ensurePair(eq, 'fundBalanceBeginning');
    const fundBalanceEnd = ensurePair(eq, 'fundBalanceEnd');
    if (!pinned('fs1.membersEquity.netSavingsYear.current')) netSavingsYear.current = fs1.netSurplus.current;
    if (!pinned('fs1.membersEquity.netSavingsYear.prior')) netSavingsYear.prior = fs1.netSurplus.prior;
    if (!pinned('fs1.membersEquity.fundBalanceEnd.current')) {
      fundBalanceEnd.current = fundBalanceBeginning.current + fs1.netSurplus.current;
    }
    if (!pinned('fs1.membersEquity.fundBalanceEnd.prior')) {
      fundBalanceEnd.prior = fundBalanceBeginning.prior + fs1.netSurplus.prior;
    }
  }

  if (fs1 && fs2) {
    const cf = ensure(fs2, 'cashFlows');
    const cfNetSurplus = ensurePair(cf, 'netSurplus');
    const cfBalanceBeginning = ensurePair(cf, 'cashBalanceBeginning');
    const cfBalanceEnd = ensurePair(cf, 'cashBalanceEnd');

    const fc = ensure(fs2, 'financialCondition');
    const assets = ensure(fc, 'assets');
    const currentAssets = ensurePair(assets, 'currentAssets');
    const inventorySupplies = ensurePair(assets, 'inventorySupplies');
    const officeBuilding = ensurePair(assets, 'officeBuilding');

    const le = ensure(fc, 'liabilitiesEquity');
    const leMembersEquity = ensurePair(le, 'membersEquity');
    const currentLiabilities = ensurePair(le, 'currentLiabilities');
    const nonCurrentLiabilities = ensurePair(le, 'nonCurrentLiabilities');

    const fundBalanceBeginning = hashPair(fs1.membersEquity, 'fundBalanceBeginning');
    const fundBalanceEnd = hashPair(fs1.membersEquity, 'fundBalanceEnd');

    if (!pinned('fs2.cashFlows.netSurplus.current')) cfNetSurplus.current = fs1.netSurplus.current;
    if (!pinned('fs2.cashFlows.netSurplus.prior')) cfNetSurplus.prior = fs1.netSurplus.prior;
    if (!pinned('fs2.cashFlows.cashBalanceBeginning.current')) cfBalanceBeginning.current = fundBalanceBeginning.current;
    if (!pinned('fs2.cashFlows.cashBalanceBeginning.prior')) cfBalanceBeginning.prior = fundBalanceBeginning.prior;
    if (!pinned('fs2.cashFlows.cashBalanceEnd.current')) cfBalanceEnd.current = fundBalanceEnd.current;
    if (!pinned('fs2.cashFlows.cashBalanceEnd.prior')) cfBalanceEnd.prior = fundBalanceEnd.prior;

    if (!pinned('fs2.financialCondition.assets.currentAssets.current')) currentAssets.current = fundBalanceEnd.current;
    if (!pinned('fs2.financialCondition.assets.currentAssets.prior')) currentAssets.prior = fundBalanceEnd.prior;
    if (!pinned('fs2.financialCondition.assets.totalAssets.current')) {
      assets.totalAssets = assets.totalAssets || { current: 0, prior: 0 };
      assets.totalAssets.current =
        currentAssets.current + inventorySupplies.current + officeBuilding.current;
    }
    if (!pinned('fs2.financialCondition.assets.totalAssets.prior')) {
      assets.totalAssets.prior =
        currentAssets.prior + inventorySupplies.prior + officeBuilding.prior;
    }

    if (!pinned('fs2.financialCondition.liabilitiesEquity.membersEquity.current')) leMembersEquity.current = fundBalanceEnd.current;
    if (!pinned('fs2.financialCondition.liabilitiesEquity.membersEquity.prior')) leMembersEquity.prior = fundBalanceEnd.prior;
    if (!pinned('fs2.financialCondition.liabilitiesEquity.totalLiabilitiesEquity.current')) {
      le.totalLiabilitiesEquity = le.totalLiabilitiesEquity || { current: 0, prior: 0 };
      le.totalLiabilitiesEquity.current =
        currentLiabilities.current + nonCurrentLiabilities.current + leMembersEquity.current;
    }
    if (!pinned('fs2.financialCondition.liabilitiesEquity.totalLiabilitiesEquity.prior')) {
      le.totalLiabilitiesEquity.prior =
        currentLiabilities.prior + nonCurrentLiabilities.prior + leMembersEquity.prior;
    }
  }

  if (fs1 && fs3) {
    const r = fs1.receipts as any;
    const d = fs1.disbursements as any;
    const extraR = fs1.extraReceipts || [];
    const extraD = fs1.extraDisbursements || [];
    const cr = ensure(fs3, 'cashReceipts');
    if (!pinned('fs3.cashReceipts.membershipFees')) cr.membershipFees = n0(r.membershipFees?.current);
    if (!pinned('fs3.cashReceipts.annualDues')) cr.annualDues = n0(r.annualDues?.current);
    if (!pinned('fs3.cashReceipts.feesPenalties')) cr.feesPenalties = n0(r.finesPenalties?.current);
    if (!pinned('fs3.cashReceipts.interestEarned')) cr.interestEarned = n0(r.interestEarned?.current);
    if (!pinned('fs3.cashReceipts.iaSubsidy')) cr.iaSubsidy = n0(r.omSubsidy?.current);
    if (!pinned('fs3.cashReceipts.canalRemuneration')) cr.canalRemuneration = n0(r.canalRemuIncentive?.current);
    if (!pinned('fs3.cashReceipts.otherIncome')) {
      cr.otherIncome = n0(r.otherIncome?.current) + extraR.reduce((s, x) => s + n0(x.current), 0);
    }
    if (!pinned('fs3.cashReceipts.total')) {
      cr.total =
        n0(cr.membershipFees) +
        n0(cr.annualDues) +
        n0(cr.feesPenalties) +
        n0(cr.donationsContributions) +
        n0(cr.interestEarned) +
        n0(cr.iaSubsidy) +
        n0(cr.canalRemuneration) +
        n0(cr.omFee) +
        n0(cr.otherIncome);
    }

    const cd = ensure(fs3, 'cashDisbursements');
    if (!pinned('fs3.cashDisbursements.registrationPermits')) cd.registrationPermits = n0(d.registrationPermits?.current);
    if (!pinned('fs3.cashDisbursements.travelRep')) cd.travelRep = n0(d.travelRep?.current);
    if (!pinned('fs3.cashDisbursements.meetingExpenses')) cd.meetingExpenses = n0(d.meetingExpenses?.current);
    if (!pinned('fs3.cashDisbursements.officeSupplies')) cd.officeSupplies = n0(d.officeSupplies?.current);
    if (!pinned('fs3.cashDisbursements.salariesWages')) cd.salariesWages = n0(d.salariesWages?.current);
    if (!pinned('fs3.cashDisbursements.canalClearingRepair')) cd.canalClearingRepair = n0(d.canalClearingRepair?.current);
    if (!pinned('fs3.cashDisbursements.miscExpenses')) cd.miscExpenses = n0(d.otherExpenses?.current);
    if (!pinned('fs3.cashDisbursements.distributedIAShare')) cd.distributedIAShare = n0(d.distributedIAShare?.current);
    if (!pinned('fs3.cashDisbursements.professionalFee')) cd.professionalFee = n0(d.professionalFee?.current);
    if (!pinned('fs3.cashDisbursements.federationShare')) cd.federationShare = n0(d.federationShare?.current);
    if (!pinned('fs3.cashDisbursements.pisoMulaSaPuso')) cd.pisoMulaSaPuso = n0(d.pisoMulaSaPuso?.current);
    if (!pinned('fs3.cashDisbursements.otherExpenses')) {
      cd.otherExpenses = extraD.reduce((s, x) => s + n0(x.current), 0);
    }
    if (!pinned('fs3.cashDisbursements.total')) {
      cd.total =
        n0(cd.registrationPermits) +
        n0(cd.travelRep) +
        n0(cd.meetingExpenses) +
        n0(cd.officeSupplies) +
        n0(cd.salariesWages) +
        n0(cd.canalClearingRepair) +
        n0(cd.snacksMeetings) +
        n0(cd.collectionExpenses) +
        n0(cd.miscExpenses) +
        n0(cd.otherExpenses) +
        n0(cd.distributedIAShare) +
        n0(cd.professionalFee) +
        n0(cd.federationShare) +
        n0(cd.pisoMulaSaPuso);
    }

    const fundBalanceBeginning = hashPair(fs1.membersEquity, 'fundBalanceBeginning');
    const fundBalanceEnd = hashPair(fs1.membersEquity, 'fundBalanceEnd');
    if (!pinned('fs3.cashBalanceThisYear')) fs3.cashBalanceThisYear = fs1.netSurplus.current;
    if (!pinned('fs3.fundBalanceLastReport')) fs3.fundBalanceLastReport = fundBalanceBeginning.current;
    if (!pinned('fs3.totalCashBalance')) fs3.totalCashBalance = fundBalanceEnd.current;
    if (!pinned('fs3.composition.total')) ensure(fs3, 'composition').total = fundBalanceEnd.current;
  }

  if (fs3 && fs4) {
    const c = ensure(fs3, 'composition');
    const assets = ensure(fs4, 'assets');
    if (!pinned('fs4.assets.cashOnHand')) assets.cashOnHand = n0(c.cashOnHandPetty) + n0(c.undepositedCollections);
    if (!pinned('fs4.assets.cashInBank')) {
      assets.cashInBank =
        n0(c.cashInBankRegular) + n0(c.cashInBankCBU) + n0(c.savingsAccount) + n0(c.currentAccount);
    }
    if (!pinned('fs4.assets.totalAssets')) {
      assets.totalAssets =
        n0(assets.cashOnHand) +
        n0(assets.cashInBank) +
        n0(assets.receivables) +
        n0(assets.materialsSuppliesInventory) +
        n0(assets.officeBuilding);
    }

    const l = ensure(fs4, 'liabilities');
    if (!pinned('fs4.liabilities.totalLiabilities')) {
      l.totalLiabilities =
        n0(l.notarialPermitFees) + n0(l.honorariumWagesPayable) + n0(l.otherAccountsPayable);
    }

    if (!pinned('fs4.netWorth')) fs4.netWorth = n0(assets.totalAssets) - n0(l.totalLiabilities);

    if (!pinned('cash_at_bank')) next.cash_at_bank = n0(assets.cashInBank);
    if (!pinned('accounts_receivable')) next.accounts_receivable = n0(assets.receivables);
    if (!pinned('equipment_assets')) next.equipment_assets = n0(assets.materialsSuppliesInventory) + n0(assets.officeBuilding);
    if (!pinned('accounts_payable')) next.accounts_payable = n0(l.totalLiabilities);
    if (!pinned('retained_earnings')) next.retained_earnings = n0(fs4.netWorth);
  }

  return next;
}

function isLocked(path: string): boolean {
  return LOCKED_DERIVED_PATHS.has(path);
}

function collectForcedPaths(edits?: FinancialStatementEdits): Set<string> {
  const set = new Set<string>();
  if (!edits) return set;
  for (const [path, rec] of Object.entries(edits)) {
    if (rec && rec.mode === 'force' && rec.value !== undefined && rec.value !== null && !isLocked(path)) set.add(path);
  }
  return set;
}

function applyForcedPins(next: FinancialStatementBreakdown, edits?: FinancialStatementEdits): void {
  if (!edits) return;
  for (const [path, rec] of Object.entries(edits)) {
    if (!rec || rec.mode !== 'force' || rec.value === undefined || rec.value === null || isLocked(path)) continue;
    setPath(next, path, typeof rec.value === 'string' && rec.value.trim() !== '' && !isNaN(Number(rec.value)) ? Number(rec.value) : rec.value);
  }
}

function setPath(root: any, path: string, value: number | string): void {
  const parts = path.split('.');
  let cursor: any = root;
  for (let i = 0; i < parts.length - 1; i++) {
    const key = parts[i];
    if (cursor[key] === undefined || cursor[key] === null || typeof cursor[key] !== 'object') {
      cursor[key] = {};
    }
    cursor = cursor[key];
  }
  const leaf = parts[parts.length - 1];
  if (typeof cursor[leaf] === 'number' || typeof value === 'number') {
    cursor[leaf] = Number(value);
  } else {
    cursor[leaf] = value;
  }
}