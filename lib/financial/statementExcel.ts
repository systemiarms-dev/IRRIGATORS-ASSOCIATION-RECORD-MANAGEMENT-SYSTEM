import type {
  FinancialStatementBreakdown,
  FinancialStatementEdits,
  FS1Data,
  FS2Data,
  FS3Data,
  FS4Data,
} from '@/types';
import { resolveFS4LiabilityLines } from '@/lib/financial/recompute';

/**
 * Builds an Excel-ready payload (metadata + header row + data rows) for the
 * currently open FS1–FS4 report.
 *
 * The row layout deliberately mirrors what the FS view components render on
 * screen — same line labels, same section order, same zero-row filtering — so
 * "Export Excel" always matches what the user is looking at (including any
 * manual/forced edits carried by `edits`).
 */

export type StatementExcelTab = 'FS1' | 'FS2' | 'FS3' | 'FS4';

export type ExcelCell = string | number;

export interface StatementExcelPayload {
  /** Human-readable report title printed into the file header. */
  reportTitle: string;
  /** Association letterhead shown at the top of the spreadsheet. */
  orgName?: string;
  orgSubtitle?: string;
  /** Key/value pairs printed under the letterhead. */
  metadata: Record<string, string | number>;
  headers: string[];
  rows: ExcelCell[][];
}

export interface StatementExcelContext {
  tab: StatementExcelTab;
  breakdown: FinancialStatementBreakdown;
  edits?: FinancialStatementEdits;
  statementNumber?: string;
  statementTitle?: string;
  periodStart?: string;
  periodEnd?: string;
  orgName?: string;
  orgSubtitle?: string;
}

const num = (value: unknown): number => {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
};

const fmtDate = (iso?: string): string => {
  if (!iso) return '';
  const parsed = new Date(iso);
  if (Number.isNaN(parsed.getTime())) return iso;
  return parsed.toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
};

interface RowBuilder {
  rows: ExcelCell[][];
  section: (label: string) => void;
  line: (label: string, ...cells: ExcelCell[]) => void;
  blank: () => void;
}

function createRowBuilder(columnCount: number): RowBuilder {
  const rows: ExcelCell[][] = [];
  const pad = (used: number): ExcelCell[] =>
    Array.from({ length: Math.max(0, columnCount - used) }, () => '');

  return {
    rows,
    section: (label) => {
      rows.push([label, ...pad(1)]);
    },
    line: (label, ...cells) => {
      const normalized = cells.map((cell) => (typeof cell === 'number' ? num(cell) : cell));
      rows.push([label, ...normalized, ...pad(1 + normalized.length)]);
    },
    blank: () => {
      rows.push(pad(0));
    },
  };
}

/** Build FS1 — Comparative Statement of Cash Receipts & Disbursements. */
function buildFS1(bd: FinancialStatementBreakdown, edits: FinancialStatementEdits | undefined): StatementExcelPayload | null {
  const d: FS1Data | undefined = bd.fs1;
  if (!d) return null;

  const forced = (p: string) => edits?.[`fs1.${p}`]?.mode === 'force';
  const r = d.receipts || ({} as FS1Data['receipts']);
  const disb = d.disbursements || ({} as FS1Data['disbursements']);
  const eq = d.membersEquity || ({} as FS1Data['membersEquity']);

  const b = createRowBuilder(3);
  b.section('RECEIPTS');

  const receiptLines: Array<{ key: keyof FS1Data['receipts']; label: string }> = [
    { key: 'membershipFees', label: 'Membership Fees' },
    { key: 'annualDues', label: 'Annual Dues' },
    { key: 'omSubsidy', label: 'O&M Subsidy' },
    { key: 'canalRemuIncentive', label: 'Canal Remu. Incentive' },
    { key: 'finesPenalties', label: 'Fines & Penalties' },
    { key: 'interestEarned', label: 'Interest Earned (Bank)' },
    { key: 'otherIncome', label: 'Other Income' },
  ];
  for (const { key, label } of receiptLines) {
    const value = r[key] as { current?: number; prior?: number } | undefined;
    const current = num(value?.current);
    const prior = num(value?.prior);
    if (current !== 0 || prior !== 0 || forced(`receipts.${key}.current`) || forced(`receipts.${key}.prior`)) {
      b.line(label, current, prior);
    }
  }
  for (const x of d.extraReceipts || []) {
    if (!String(x.label || '').trim()) continue;
    b.line(String(x.label), num(x.current), num(x.prior));
  }
  b.line('TOTAL RECEIPTS', num(r.total?.current), num(r.total?.prior));

  b.blank();
  b.section('less: DISBURSEMENT');
  const disbursementLines: Array<{ key: keyof FS1Data['disbursements']; label: string }> = [
    { key: 'registrationPermits', label: 'Registration, Permit & Notarial fees' },
    { key: 'travelRep', label: 'Travel, Meeting and Rep. Expenses' },
    { key: 'meetingExpenses', label: 'IA Meeting Expenses' },
    { key: 'officeSupplies', label: 'Office Equipment/Supplies' },
    { key: 'salariesWages', label: 'Honorarium/Salaries/Wages' },
    { key: 'canalClearingRepair', label: 'Canal Clearing, Repair and Maint. Expenses' },
    { key: 'professionalFee', label: 'Professional Fee (Audited FS Processing)' },
    { key: 'federationShare', label: 'Federation Share (IA Fed Share)' },
    { key: 'pisoMulaSaPuso', label: 'Piso Mula sa Puso Contribution' },
    { key: 'taxLicenses', label: 'Tax & Licenses' },
    { key: 'otherExpenses', label: 'Other Expenses / Miscellaneous' },
    { key: 'repairMaintenance', label: 'Repair and Maintenance' },
    { key: 'distributedIAShare', label: 'Distributed IA Share to Laterals (Danak / Barakibak)' },
  ];
  for (const { key, label } of disbursementLines) {
    const value = disb[key] as { current?: number; prior?: number } | undefined;
    const current = num(value?.current);
    const prior = num(value?.prior);
    if (current !== 0 || prior !== 0 || forced(`disbursements.${key}.current`) || forced(`disbursements.${key}.prior`)) {
      b.line(label, current, prior);
    }
  }
  for (const x of d.extraDisbursements || []) {
    if (!String(x.label || '').trim()) continue;
    b.line(String(x.label), num(x.current), num(x.prior));
  }
  b.line('TOTAL DISBURSEMENT', num(disb.total?.current), num(disb.total?.prior));

  b.blank();
  b.line('NET SURPLUS (DEFICIT)', num(d.netSurplus?.current), num(d.netSurplus?.prior));

  b.blank();
  b.section('MEMBERS EQUITY');
  b.line('Fund Balance, Beginning', num(eq.fundBalanceBeginning?.current), num(eq.fundBalanceBeginning?.prior));
  b.line('Net Savings this year', num(eq.netSavingsYear?.current), num(eq.netSavingsYear?.prior));
  b.line('Fund Balance, End', num(eq.fundBalanceEnd?.current), num(eq.fundBalanceEnd?.prior));

  return {
    reportTitle: `Comparative Statement of Cash Receipts & Disbursements (FS1) — Years ${d.yearPrior} & ${d.yearCurrent}`,
    orgName: d.associationName,
    orgSubtitle: [d.address, d.secRegNo ? `SEC Reg. No. ${d.secRegNo}` : ''].filter(Boolean).join(' • '),
    metadata: {
      Report: 'FS1 — Cash Receipts & Disbursements',
      'Year (Current)': d.yearCurrent,
      'Year (Prior)': d.yearPrior,
      Address: d.address || '',
      'SEC Reg. No.': d.secRegNo || '',
    },
    headers: ['Particulars', `${d.yearCurrent} (Current)`, `${d.yearPrior} (Prior)`],
    rows: b.rows,
  };
}

/** Build FS2 — Statement of Cash Flows + Comparative Statement of Financial Condition. */
function buildFS2(bd: FinancialStatementBreakdown, edits: FinancialStatementEdits | undefined): StatementExcelPayload | null {
  const d: FS2Data | undefined = bd.fs2;
  if (!d) return null;

  const cf = d.cashFlows;
  const fc = d.financialCondition;
  const le = fc.liabilitiesEquity;

  const totalLiabilitiesPrior =
    le.totalLiabilities?.prior ?? num(le.currentLiabilities?.prior) + num(le.nonCurrentLiabilities?.prior);
  const totalLiabilitiesCurrent =
    le.totalLiabilities?.current ?? num(le.currentLiabilities?.current) + num(le.nonCurrentLiabilities?.current);

  const b = createRowBuilder(3);
  b.section('CASH FLOWS FROM OPERATING ACTIVITIES');
  b.line('Net Surplus for the Year', num(cf.netSurplus?.current), num(cf.netSurplus?.prior));
  b.line('Depreciation of Non-Current Assets', num(cf.depreciation?.current), num(cf.depreciation?.prior));
  b.line('Add: Cash Balance Beginning', num(cf.cashBalanceBeginning?.current), num(cf.cashBalanceBeginning?.prior));
  b.line('Cash Balance at the End of the Year', num(cf.cashBalanceEnd?.current), num(cf.cashBalanceEnd?.prior));

  b.blank();
  b.section('COMPARATIVE STATEMENT OF FINANCIAL CONDITION — ASSETS');
  b.line('Current Asset', num(fc.assets.currentAssets?.current), num(fc.assets.currentAssets?.prior));
  b.line('Non-Current Assets', num(fc.assets.officeBuilding?.current), num(fc.assets.officeBuilding?.prior));
  b.line('Total Assets', num(fc.assets.totalAssets?.current), num(fc.assets.totalAssets?.prior));

  b.blank();
  b.section("LIABILITIES & MEMBER'S EQUITY");
  b.line('Current Liabilities', num(le.currentLiabilities?.current), num(le.currentLiabilities?.prior));
  b.line('Non-Current Liabilities', num(le.nonCurrentLiabilities?.current), num(le.nonCurrentLiabilities?.prior));
  b.line('Total Liabilities', num(totalLiabilitiesCurrent), num(totalLiabilitiesPrior));

  if (le.equityLines && le.equityLines.length > 0) {
    b.line("Member's Equity", 0, 0);
    b.line('Retained Surplus / Fund Balance', num(le.fundBalance?.current), num(le.fundBalance?.prior));
    for (const line of le.equityLines) {
      b.line(line.name || line.code, num(line.current), num(line.prior));
    }
    b.line("Total Member's Equity", num(le.membersEquity?.current), num(le.membersEquity?.prior));
  } else {
    b.line("Member's Equity", num(le.membersEquity?.current), num(le.membersEquity?.prior));
  }
  b.line("Total Liabilities & Member's Equity", num(le.totalLiabilitiesEquity?.current), num(le.totalLiabilitiesEquity?.prior));

  return {
    reportTitle: `Statement of Cash Flows & Financial Condition (FS2) — Years ${d.yearPrior} & ${d.yearCurrent}`,
    orgName: d.associationName,
    orgSubtitle: [d.address, d.secRegNo ? `SEC Reg. No. ${d.secRegNo}` : ''].filter(Boolean).join(' • '),
    metadata: {
      Report: 'FS2 — Cash Flows & Financial Condition',
      'Year (Current)': d.yearCurrent,
      'Year (Prior)': d.yearPrior,
      Address: d.address || '',
      'SEC Reg. No.': d.secRegNo || '',
    },
    headers: ['Particulars', `${d.yearCurrent} (Current)`, `${d.yearPrior} (Prior)`],
    rows: b.rows,
  };
}

/** Build FS3 — Cash Statement (single amount column). */
function buildFS3(bd: FinancialStatementBreakdown, edits: FinancialStatementEdits | undefined): StatementExcelPayload | null {
  const d: FS3Data | undefined = bd.fs3;
  if (!d) return null;

  const forced = (p: string) => edits?.[`fs3.${p}`]?.mode === 'force';
  const r = d.cashReceipts;
  const disb = d.cashDisbursements;
  const c = d.composition;

  // Same legacy-bundling guard as FS3View so the export matches the screen.
  const extraReceiptList = (d.extraReceipts || []).filter((x) => num(x.current) !== 0);
  const extraReceiptsSum = extraReceiptList.reduce((acc, x) => acc + num(x.current), 0);
  const isLegacyBundledIncome =
    extraReceiptList.length > 0 && Math.abs(num(r?.otherIncome) - extraReceiptsSum) < 0.01;
  const effectiveOtherIncome =
    isLegacyBundledIncome && !forced('cashReceipts.otherIncome') ? 0 : num(r?.otherIncome);

  const extraDisbursementList = (d.extraDisbursements || []).filter((x) => num(x.current) !== 0);
  const extraDisbursementsSum = extraDisbursementList.reduce((acc, x) => acc + num(x.current), 0);
  const isLegacyBundledExpense =
    extraDisbursementList.length > 0 && Math.abs(num(disb?.otherExpenses) - extraDisbursementsSum) < 0.01;
  const effectiveOtherExpenses =
    isLegacyBundledExpense && !forced('cashDisbursements.otherExpenses') ? 0 : num(disb?.otherExpenses);

  const b = createRowBuilder(2);
  b.section('A. CASH RECEIPTS:');

  const receiptLines = [
    { label: 'Membership Fees', value: num(r?.membershipFees), path: 'cashReceipts.membershipFees' },
    { label: 'Annual or Seasonal Dues', value: num(r?.annualDues), path: 'cashReceipts.annualDues' },
    { label: 'Fees and Penalties', value: num(r?.feesPenalties), path: 'cashReceipts.feesPenalties' },
    { label: 'Donations/Contributions', value: num(r?.donationsContributions), path: 'cashReceipts.donationsContributions' },
    { label: 'Interest Earned (Bank)', value: num(r?.interestEarned), path: 'cashReceipts.interestEarned' },
    { label: 'Operation Compensation (IA Subsidy)', value: num(r?.iaSubsidy), path: 'cashReceipts.iaSubsidy' },
    { label: 'Canal Remuneration', value: num(r?.canalRemuneration), path: 'cashReceipts.canalRemuneration' },
    { label: 'O and M Fee', value: num(r?.omFee), path: 'cashReceipts.omFee' },
    { label: 'Other Income', value: effectiveOtherIncome, path: 'cashReceipts.otherIncome' },
  ].filter((item) => item.value !== 0 || forced(item.path));

  let lineNo = 1;
  for (const item of receiptLines) {
    b.line(`${lineNo++} ${item.label}`, item.value);
  }
  for (const x of extraReceiptList) {
    b.line(`${lineNo++} ${String(x.label || 'Additional Receipt')}`, num(x.current));
  }
  b.line('Total Receipts', num(r?.total));

  b.blank();
  b.section('B. CASH DISBURSEMENTS:');
  const disbursementLines = [
    { label: 'Registration, Permit & Notarial fees', value: num(disb?.registrationPermits), path: 'cashDisbursements.registrationPermits' },
    { label: 'Travel and Rep. Expenses', value: num(disb?.travelRep), path: 'cashDisbursements.travelRep' },
    { label: 'Meeting Expenses', value: num(disb?.meetingExpenses), path: 'cashDisbursements.meetingExpenses' },
    { label: 'Office Equipment/Supplies', value: num(disb?.officeSupplies), path: 'cashDisbursements.officeSupplies' },
    { label: 'Honorarium/Salaries/Wages', value: num(disb?.salariesWages), path: 'cashDisbursements.salariesWages' },
    { label: 'Canal Clearing, Repair and Maintenance Expenses', value: num(disb?.canalClearingRepair), path: 'cashDisbursements.canalClearingRepair' },
    { label: 'Snacks (Meetings)', value: num(disb?.snacksMeetings), path: 'cashDisbursements.snacksMeetings' },
    { label: 'Collection Expenses', value: num(disb?.collectionExpenses), path: 'cashDisbursements.collectionExpenses' },
    { label: 'Misc. Expenses', value: num(disb?.miscExpenses), path: 'cashDisbursements.miscExpenses' },
    { label: 'Other Expenses', value: effectiveOtherExpenses, path: 'cashDisbursements.otherExpenses' },
    { label: 'Distributed IA Share to Laterals', value: num((disb as any)?.distributedIAShare), path: 'cashDisbursements.distributedIAShare' },
    { label: 'Professional Fee', value: num((disb as any)?.professionalFee), path: 'cashDisbursements.professionalFee' },
    { label: 'Federation Share', value: num((disb as any)?.federationShare), path: 'cashDisbursements.federationShare' },
    { label: 'Piso Mula sa Puso', value: num((disb as any)?.pisoMulaSaPuso), path: 'cashDisbursements.pisoMulaSaPuso' },
  ].filter((item) => item.value !== 0 || forced(item.path));

  lineNo = 1;
  for (const item of disbursementLines) {
    b.line(`${lineNo++} ${item.label}`, item.value);
  }
  for (const x of extraDisbursementList) {
    b.line(`${lineNo++} ${String(x.label || 'Additional Expense')}`, num(x.current));
  }
  b.line('Total Disbursement (Expenses)', num(disb?.total));

  b.blank();
  b.line('C. Cash Balance this year', num(d.cashBalanceThisYear));
  b.line('D. Add: Fund Balance last report', num(d.fundBalanceLastReport));
  b.line('E. Total Cash Balance as of this year', num(d.totalCashBalance));

  b.blank();
  b.section('F. Composition of Cash Balance (where the cash is):');
  b.line('Cash on Hand-Petty Cash', num(c?.cashOnHandPetty));
  b.line('Undeposited/Unremitted Collections', num(c?.undepositedCollections));
  b.line('Cash in Bank (Regular Fund)', num(c?.cashInBankRegular));
  b.line('Cash in Bank (CBU account)', num(c?.cashInBankCBU));
  b.line('Total Cash Balance', num(c?.total));

  return {
    reportTitle: `Cash Statement (FS3) — Year Ending December 31, ${d.yearEnding}`,
    orgName: d.associationName,
    orgSubtitle: [d.address, d.secRegNo ? `SEC Reg. No. ${d.secRegNo}` : '', d.tinNo ? `TIN ${d.tinNo}` : ''].filter(Boolean).join(' • '),
    metadata: {
      Report: 'FS3 — Cash Statement',
      'Year Ending': d.yearEnding,
      Address: d.address || '',
      'SEC Reg. No.': d.secRegNo || '',
      TIN: d.tinNo || '',
    },
    headers: ['Particulars', 'Amount (PHP)'],
    rows: b.rows,
  };
}

/** Build FS4 — Balance Sheet (single amount column). */
function buildFS4(bd: FinancialStatementBreakdown): StatementExcelPayload | null {
  const d: FS4Data | undefined = bd.fs4;
  if (!d) return null;

  const a = d.assets;
  const l = d.liabilities;
  const n = d.notaryBlock;

  const b = createRowBuilder(2);
  b.section('I. ASSETS');
  b.line('CASH ON HAND', num(a.cashOnHand));
  b.line('CASH IN BANK', num(a.cashInBank));
  b.line('RECEIVABLES : (CASH ADVANCE, LOANS, ETC)', num(a.receivables));
  b.line('NON-CURRENT ASSETS (FARM TOOLS & EQUIPMENT)', num(a.materialsSuppliesInventory));
  b.line('IA OFFICE BUILDING', num(a.officeBuilding));
  b.line('TOTAL ASSETS', num(a.totalAssets));

  b.blank();
  b.section('II. LIABILITIES');
  // Dynamic liability accounts from the Chart of Accounts: Current Liabilities
  // first, then Non-Current Liabilities (mirrors what FS4View renders).
  const liabLines = resolveFS4LiabilityLines(l).filter((x) => x && typeof x === 'object');
  const pushLiabilityGroup = (title: string, group: typeof liabLines) => {
    if (group.length === 0) return;
    b.line(title, '');
    for (const line of group) b.line(line.name || line.code, num(line.amount));
  };
  pushLiabilityGroup('CURRENT LIABILITIES', liabLines.filter((x) => x.classification === 'current_liability'));
  pushLiabilityGroup('NON-CURRENT LIABILITIES', liabLines.filter((x) => x.classification !== 'current_liability'));
  b.line('TOTAL LIABILITIES', num(l.totalLiabilities));

  b.blank();
  b.section('III. NET WORTH (Assets less Liabilities)');
  b.line('NET WORTH', num(d.netWorth));
  b.blank();
  b.line('Certification', 'I HEREBY CERTIFY THAT the foregoing information is true and correct.');
  b.line('IA Treasurer (TIN ID No.)', `${d.officer?.treasurerName || ''}${d.officer?.treasurerTin ? ` — ${d.officer.treasurerTin}` : ''}`);
  b.line('Province', n?.province || '');
  b.line('Municipality', n?.municipality || '');
  b.line('CTC No.', n?.ctcNo || '');

  return {
    reportTitle: `Balance Sheet (FS4) — As of ${d.asOfDate}`,
    orgName: d.associationName,
    orgSubtitle: [d.address, d.secRegNo ? `SEC Reg. No. ${d.secRegNo}` : '', d.tinNo ? `TIN ${d.tinNo}` : ''].filter(Boolean).join(' • '),
    metadata: {
      Report: 'FS4 — Balance Sheet',
      'As of': d.asOfDate,
      Address: d.address || '',
      'SEC Reg. No.': d.secRegNo || '',
      TIN: d.tinNo || '',
    },
    headers: ['Particulars', 'Amount (PHP)'],
    rows: b.rows,
  };
}

export function buildStatementExcelPayload(ctx: StatementExcelContext): StatementExcelPayload | null {
  const { tab, breakdown, edits } = ctx;

  let payload: StatementExcelPayload | null = null;
  if (tab === 'FS1') payload = buildFS1(breakdown, edits);
  else if (tab === 'FS2') payload = buildFS2(breakdown, edits);
  else if (tab === 'FS3') payload = buildFS3(breakdown, edits);
  else payload = buildFS4(breakdown);

  if (!payload) return null;

  const statementMeta: Record<string, string | number> = {};
  if (ctx.statementNumber) statementMeta['Statement No.'] = ctx.statementNumber;
  if (ctx.statementTitle) statementMeta['Statement Title'] = ctx.statementTitle;
  if (ctx.periodStart || ctx.periodEnd) {
    statementMeta['Reporting Period'] = `${fmtDate(ctx.periodStart) || 'N/A'} to ${fmtDate(ctx.periodEnd) || 'N/A'}`;
  }

  return {
    ...payload,
    orgName: ctx.orgName || payload.orgName,
    orgSubtitle: ctx.orgSubtitle || payload.orgSubtitle,
    metadata: { ...statementMeta, ...payload.metadata },
  };
}
