const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const envContent = fs.readFileSync(path.resolve(__dirname, '../.env.local'), 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k] = v.join('=').replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

const MONTH_NAMES = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
function formatAsOfDate(isoDate) {
  if (!isoDate) return '';
  const [, month, day] = isoDate.split('-').map(Number);
  const year = isoDate.split('-')[0];
  if (!month || !day || !year) return isoDate;
  return `${MONTH_NAMES[month - 1]} ${day}, ${year}`;
}

async function generateNLFIAStatement() {
  const ASSOC_ID = 'ia-nangurisan';
  const periodStart = '2026-01-01';
  const periodEnd = '2026-12-31';

  // 1. Fetch Association
  const { data: assoc } = await supabase.from('associations').select('*').eq('id', ASSOC_ID).single();

  // 2. Fetch All Transactions for NLFIA
  const { data: allTxs } = await supabase
    .from('transactions')
    .select('*, category:budget_categories(*)')
    .eq('association_id', ASSOC_ID);

  console.log(`Fetched ${allTxs?.length || 0} transactions for NLFIA.`);

  const currentTxs = (allTxs || []).filter(t => t.transaction_date >= periodStart && t.transaction_date <= periodEnd);
  const priorTxs = (allTxs || []).filter(t => t.transaction_date >= '2025-01-01' && t.transaction_date <= '2025-12-31');

  // Fixed Assets
  const { data: fixedAssets } = await supabase.from('fixed_assets').select('*').eq('association_id', ASSOC_ID);
  const totalAnnualDepreciation = (fixedAssets || []).reduce((sum, a) => sum + (Number(a.annual_depreciation) || 0), 0);
  const totalNetBookValue = (fixedAssets || []).reduce((sum, a) => sum + (Number(a.net_book_value || a.acquisition_cost) || 0), 0);

  function sumByCategory(txList, expectedType, codeMatch) {
    return (txList || [])
      .filter(t => t.type === expectedType && t.category && codeMatch(t.category.code))
      .reduce((sum, t) => sum + Number(t.amount || 0), 0);
  }

  const KNOWN_REC_CODES = ['REC-ISF', 'REC-MEM', 'REC-SUB', 'REC-FIN', 'REC-DON'];
  const KNOWN_DISB_CODES = ['DISB-TRAV', 'DISB-CLEAR', 'DISB-PROF', 'DISB-FED', 'DISB-PISO', 'DISB-MISC', 'DISB-LATERAL', 'DISB-SHARE', 'DISB-REPAIR', 'DISB-SUPP', 'DISB-HON', 'DISB-TAX'];

  const normCode = (code) => {
    if (!code) return '';
    return code.trim().toUpperCase().replace(/^[A-Z0-9]+-(REC-|DISB-|AST-|LIAB-)/, '$1');
  };

  function buildExtraLines(currentList, priorList, expectedType, isKnown) {
    const map = new Map();
    const add = (tx, isCurrent) => {
      if (tx.type !== expectedType) return;
      if (tx.category?.code && isKnown(normCode(tx.category.code))) return;
      const label = (tx.category?.name || '').trim() || (tx.category?.code || '').trim() || (tx.particulars || '').trim() || 'Other / Miscellaneous';
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

  const extraReceipts = buildExtraLines(currentTxs, priorTxs, 'collection', c => KNOWN_REC_CODES.includes(c));
  const extraDisbursements = buildExtraLines(currentTxs, priorTxs, 'disbursement', c => KNOWN_DISB_CODES.includes(c));

  // FS1 Inflows
  const r = {
    membershipFees: {
      current: sumByCategory(currentTxs, 'collection', c => c === 'REC-MEM' || c.endsWith('REC-MEM')),
      prior: sumByCategory(priorTxs, 'collection', c => c === 'REC-MEM' || c.endsWith('REC-MEM')),
    },
    annualDues: {
      current: sumByCategory(currentTxs, 'collection', c => c === 'REC-DUE' || c.endsWith('REC-DUE')),
      prior: sumByCategory(priorTxs, 'collection', c => c === 'REC-DUE' || c.endsWith('REC-DUE')),
    },
    omSubsidy: {
      current: sumByCategory(currentTxs, 'collection', c => c === 'REC-ISF' || c === 'REC-SUB' || c.endsWith('REC-ISF') || c.endsWith('REC-SUB')),
      prior: sumByCategory(priorTxs, 'collection', c => c === 'REC-ISF' || c === 'REC-SUB' || c.endsWith('REC-ISF') || c.endsWith('REC-SUB')),
    },
    canalRemuIncentive: {
      current: sumByCategory(currentTxs, 'collection', c => c === 'REC-REMU' || c.endsWith('REC-REMU')),
      prior: 0,
    },
    finesPenalties: {
      current: sumByCategory(currentTxs, 'collection', c => c === 'REC-FIN' || c.endsWith('REC-FIN')),
      prior: sumByCategory(priorTxs, 'collection', c => c === 'REC-FIN' || c.endsWith('REC-FIN')),
    },
    interestEarned: {
      current: sumByCategory(currentTxs, 'collection', c => c === 'REC-INT' || c.endsWith('REC-INT')),
      prior: 0,
    },
    otherIncome: {
      current: sumByCategory(currentTxs, 'collection', c => c === 'REC-DON' || c.endsWith('REC-DON')),
      prior: sumByCategory(priorTxs, 'collection', c => c === 'REC-DON' || c.endsWith('REC-DON')),
    },
    total: { current: 0, prior: 0 },
  };

  r.total.current = Object.values(r).filter(v => typeof v.current === 'number').reduce((s, v) => s + v.current, 0) + extraReceipts.reduce((s, x) => s + x.current, 0);
  r.total.prior = Object.values(r).filter(v => typeof v.prior === 'number').reduce((s, v) => s + v.prior, 0) + extraReceipts.reduce((s, x) => s + x.prior, 0);

  // FS1 Outflows
  const d = {
    registrationPermits: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-TAX' || c.endsWith('DISB-TAX')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-TAX' || c.endsWith('DISB-TAX')),
    },
    travelRep: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-TRAV' || c.endsWith('DISB-TRAV')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-TRAV' || c.endsWith('DISB-TRAV')),
    },
    meetingExpenses: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-MEET' || c.endsWith('DISB-MEET')),
      prior: 0,
    },
    officeSupplies: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-SUPP' || c.endsWith('DISB-SUPP')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-SUPP' || c.endsWith('DISB-SUPP')),
    },
    salariesWages: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-HON' || c.endsWith('DISB-HON')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-HON' || c.endsWith('DISB-HON')),
    },
    canalClearingRepair: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-CLEAR' || c.endsWith('DISB-CLEAR')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-CLEAR' || c.endsWith('DISB-CLEAR')),
    },
    taxLicenses: {
      current: 0,
      prior: 0,
    },
    otherExpenses: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-MISC' || c.endsWith('DISB-MISC')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-MISC' || c.endsWith('DISB-MISC')),
    },
    repairMaintenance: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-REPAIR' || c.endsWith('DISB-REPAIR')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-REPAIR' || c.endsWith('DISB-REPAIR')),
    },
    distributedIAShare: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-LATERAL' || c === 'DISB-SHARE' || c.endsWith('DISB-LATERAL') || c.endsWith('DISB-SHARE')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-LATERAL' || c === 'DISB-SHARE' || c.endsWith('DISB-LATERAL') || c.endsWith('DISB-SHARE')),
    },
    professionalFee: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-PROF' || c.endsWith('DISB-PROF')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-PROF' || c.endsWith('DISB-PROF')),
    },
    federationShare: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-FED' || c.endsWith('DISB-FED')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-FED' || c.endsWith('DISB-FED')),
    },
    pisoMulaSaPuso: {
      current: sumByCategory(currentTxs, 'disbursement', c => c === 'DISB-PISO' || c.endsWith('DISB-PISO')),
      prior: sumByCategory(priorTxs, 'disbursement', c => c === 'DISB-PISO' || c.endsWith('DISB-PISO')),
    },
    total: { current: 0, prior: 0 },
  };

  d.total.current = Object.values(d).filter(v => typeof v.current === 'number').reduce((s, v) => s + v.current, 0) + extraDisbursements.reduce((s, x) => s + x.current, 0);
  d.total.prior = Object.values(d).filter(v => typeof v.prior === 'number').reduce((s, v) => s + v.prior, 0) + extraDisbursements.reduce((s, x) => s + x.prior, 0);

  const netSurplusCurrent = r.total.current - d.total.current;
  const netSurplusPrior = r.total.prior - d.total.prior;
  const fundBalanceBeginningCurrent = netSurplusPrior;
  const fundBalanceEndCurrent = fundBalanceBeginningCurrent + netSurplusCurrent;

  const fs1 = {
    associationName: assoc.name,
    address: assoc.mailing_address,
    secRegNo: assoc.sec_registration_number,
    yearCurrent: 2026,
    yearPrior: 2025,
    receipts: r,
    disbursements: d,
    extraReceipts,
    extraDisbursements,
    netSurplus: { current: netSurplusCurrent, prior: netSurplusPrior },
    membersEquity: {
      fundBalanceBeginning: { current: fundBalanceBeginningCurrent, prior: 0 },
      netSavingsYear: { current: netSurplusCurrent, prior: netSurplusPrior },
      fundBalanceEnd: { current: fundBalanceEndCurrent, prior: netSurplusPrior },
    },
    officers: {
      treasurerName: 'RIC UNDAY',
      auditorName: 'ARTUR GUIANG',
      presidentName: assoc.president_name,
    },
  };

  // Section F Cash Composition
  let ledgerCashOnHand = 0;
  let ledgerBankRegular = 0;
  let ledgerBankCBU = 0;
  for (const tx of allTxs) {
    const amt = Number(tx.amount || 0);
    const method = tx.payment_method || '';
    const notes = tx.notes || '';
    const isCBU = method === 'bank_cbu' || notes.includes('[fund:bank_cbu]');
    const isReg = method === 'bank_regular' || notes.includes('[fund:bank_regular]') || method === 'bank_transfer' || method === 'check';
    const delta = tx.type === 'collection' ? amt : -amt;
    if (isCBU) ledgerBankCBU += delta;
    else if (isReg) ledgerBankRegular += delta;
    else ledgerCashOnHand += delta;
  }

  const composition = {
    cashOnHandPetty: ledgerCashOnHand,
    undepositedCollections: 0,
    cashInBankRegular: ledgerBankRegular,
    cashInBankCBU: ledgerBankCBU,
    savingsAccount: 0,
    currentAccount: 0,
    total: ledgerCashOnHand + ledgerBankRegular + ledgerBankCBU,
  };

  // FS2
  const officeBuildingValue = 714000;
  const currentLiabilitiesFromTxs = 16500;
  const nonCurrentLiabilitiesFromTxs = 35000;

  const fs2 = {
    associationName: assoc.name,
    address: assoc.mailing_address,
    secRegNo: assoc.sec_registration_number,
    yearCurrent: 2026,
    yearPrior: 2025,
    cashFlows: {
      netSurplus: { current: netSurplusCurrent, prior: netSurplusPrior },
      depreciation: { current: totalAnnualDepreciation, prior: 0 },
      cashBalanceBeginning: { current: fundBalanceBeginningCurrent, prior: 0 },
      cashBalanceEnd: { current: fundBalanceEndCurrent, prior: netSurplusPrior },
    },
    financialCondition: {
      assets: {
        currentAssets: { current: fundBalanceEndCurrent, prior: netSurplusPrior },
        inventorySupplies: { current: 0, prior: 0 },
        officeBuilding: { current: officeBuildingValue, prior: 0 },
        totalAssets: {
          current: fundBalanceEndCurrent + officeBuildingValue,
          prior: netSurplusPrior,
        },
      },
      liabilitiesEquity: {
        currentLiabilities: {
          current: currentLiabilitiesFromTxs,
          prior: 0,
        },
        nonCurrentLiabilities: {
          current: nonCurrentLiabilitiesFromTxs,
          prior: 0,
        },
        membersEquity: { current: fundBalanceEndCurrent, prior: netSurplusPrior },
        totalLiabilitiesEquity: {
          current: fundBalanceEndCurrent + currentLiabilitiesFromTxs + nonCurrentLiabilitiesFromTxs,
          prior: netSurplusPrior,
        },
      },
    },
    officers: {
      treasurerName: 'RIC UNDAY',
      presidentName: assoc.president_name,
    },
  };

  // FS3
  const fs3 = {
    associationName: assoc.name,
    address: assoc.mailing_address,
    secRegNo: assoc.sec_registration_number,
    tinNo: assoc.tin_number,
    yearEnding: 2026,
    cashReceipts: {
      membershipFees: r.membershipFees.current,
      annualDues: r.annualDues.current,
      feesPenalties: r.finesPenalties.current,
      donationsContributions: 0,
      interestEarned: r.interestEarned.current,
      iaSubsidy: r.omSubsidy.current,
      canalRemuneration: r.canalRemuIncentive.current,
      omFee: 0,
      otherIncome: r.otherIncome.current,
      total: r.total.current,
    },
    cashDisbursements: {
      registrationPermits: d.registrationPermits.current,
      travelRep: d.travelRep.current,
      meetingExpenses: d.meetingExpenses.current,
      officeSupplies: d.officeSupplies.current,
      salariesWages: d.salariesWages.current,
      canalClearingRepair: d.canalClearingRepair.current,
      snacksMeetings: 0,
      collectionExpenses: 0,
      miscExpenses: d.otherExpenses.current,
      otherExpenses: 0,
      distributedIAShare: d.distributedIAShare.current,
      professionalFee: d.professionalFee.current,
      federationShare: d.federationShare.current,
      pisoMulaSaPuso: d.pisoMulaSaPuso.current,
      total: d.total.current,
    },
    extraReceipts,
    extraDisbursements,
    cashBalanceThisYear: netSurplusCurrent,
    fundBalanceLastReport: fundBalanceBeginningCurrent,
    totalCashBalance: fundBalanceEndCurrent,
    composition,
    officers: {
      treasurerName: 'RIC UNDAY',
      auditorName: 'ARTUR GUIANG',
      presidentName: assoc.president_name,
    },
  };

  // FS4
  const cashOnHand = composition.cashOnHandPetty;
  const cashInBank = composition.cashInBankRegular + composition.cashInBankCBU;
  const receivables = 0;
  const materialsSuppliesInventory = 0;
  const officeBuilding = officeBuildingValue;
  const totalAssets = cashOnHand + cashInBank + receivables + materialsSuppliesInventory + officeBuilding;
  const totalLiabilities = currentLiabilitiesFromTxs + nonCurrentLiabilitiesFromTxs;
  const netWorth = totalAssets - totalLiabilities;

  const fs4 = {
    associationName: assoc.name,
    address: assoc.mailing_address,
    secRegNo: assoc.sec_registration_number,
    tinNo: assoc.tin_number,
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
      notarialPermitFees: 0,
      honorariumWagesPayable: currentLiabilitiesFromTxs,
      otherAccountsPayable: nonCurrentLiabilitiesFromTxs,
      totalLiabilities,
    },
    netWorth,
    officer: {
      treasurerName: 'RIC UNDAY',
      treasurerTin: '440-615-026-000',
    },
    notaryBlock: {
      province: 'Cagayan',
      municipality: 'Gonzaga',
      ctcNo: '18492041',
      ctcIssuedOn: 'January 12, 2026',
      ctcIssuedAt: 'Gonzaga, Cagayan',
    },
  };

  const reportData = {
    cash_at_bank: cashInBank,
    accounts_receivable: receivables,
    equipment_assets: officeBuilding,
    accounts_payable: totalLiabilities,
    retained_earnings: netWorth,
    fs1,
    fs2,
    fs3,
    fs4,
    categories_summary: [],
  };

  // Update or insert official statement
  const stmtId = 'stmt-nlfia-2026-official';
  const stmtObj = {
    id: stmtId,
    statement_number: 'FS-NLFIA-2026-ANNUAL',
    title: 'NLFIA Annual Audited Financial Statements (Comparative 2025-2026)',
    statement_type: 'fs_package',
    period_start: periodStart,
    period_end: periodEnd,
    total_collections: r.total.current,
    total_disbursements: d.total.current,
    net_cash_flow: netSurplusCurrent,
    association_id: ASSOC_ID,
    report_data: reportData,
    is_published: true,
    generated_by: 'user-admin-nlfia',
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { error: upsertErr } = await supabase.from('financial_statements').upsert(stmtObj);
  if (upsertErr) {
    console.error('Upsert failed:', upsertErr);
  } else {
    console.log('✔ Successfully generated & published official NLFIA Financial Statement Package:', stmtId);
    console.log('   FS1 Receipts Total Current   : ₱' + r.total.current.toLocaleString());
    console.log('   FS1 Disbursements Total Curr : ₱' + d.total.current.toLocaleString());
    console.log('   FS1 Net Operating Surplus    : ₱' + netSurplusCurrent.toLocaleString());
    console.log('   FS2 Cash Balance End (2026)  : ₱' + fundBalanceEndCurrent.toLocaleString());
    console.log('   FS3 Total Cash (Sec E)       : ₱' + fs3.totalCashBalance.toLocaleString());
    console.log('   FS3 Cash Composition (Sec F) : ₱' + composition.total.toLocaleString());
    console.log('   FS4 Total Assets             : ₱' + totalAssets.toLocaleString());
    console.log('   FS4 Total Liabilities        : ₱' + totalLiabilities.toLocaleString());
    console.log('   FS4 Net Worth                : ₱' + netWorth.toLocaleString());
  }
}

generateNLFIAStatement().catch(console.error);
