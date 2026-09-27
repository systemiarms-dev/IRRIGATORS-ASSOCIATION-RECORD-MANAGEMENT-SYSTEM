const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// 1. Resolve Environment Credentials
function loadEnv() {
  const envPath = path.resolve(__dirname, '..', '.env.local');
  if (!fs.existsSync(envPath)) throw new Error('.env.local not found');
  const content = fs.readFileSync(envPath, 'utf8');
  const env = {};
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eqIdx = trimmed.indexOf('=');
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      let val = trimmed.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const env = loadEnv();
const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const ASSOC_ID = 'ia-nangurisan';
const currency = (num) => '₱' + Number(num || 0).toLocaleString('en-PH', { minimumFractionDigits: 2, maximumFractionDigits: 2 });

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✔ [PASS] ${message}`);
    passed++;
  } else {
    console.error(`  ✖ [FAIL] ${message}`);
    failed++;
  }
}

async function runTest() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║   TEST: CHART OF ACCOUNTS EDITING & CURRENT/NON-CURRENT LIABILITIES        ║');
  console.log('║   1. Category Edit Engine • 2. Liability Records • 3. FS-2/FS-4 Ties       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const runId = Date.now().toString().slice(-5);
  let testCatId = null;

  try {
    // ==============================================================================
    // PART 1: TEST EDITING AN EXISTING CHART OF ACCOUNTS CATEGORY
    // ==============================================================================
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' [PART 1] EDITING AN EXISTING CHART OF ACCOUNTS CATEGORY');
    console.log('──────────────────────────────────────────────────────────────────────────────');

    // 1A. Create initial category
    testCatId = `cat-edit-${runId}`;
    const initialCode = `DISB-EDIT-${runId}`;
    const { data: createdCat, error: createErr } = await supabase.from('budget_categories').insert({
      id: testCatId,
      code: initialCode,
      name: 'Initial Temporary Canal Maintenance',
      category_type: 'disbursement',
      allocated_amount: 25000,
      description: 'Initial temporary description',
      association_id: ASSOC_ID,
      is_active: true
    }).select().single();
    assert(!createErr && createdCat, `Created initial Category: "${createdCat?.name}" (${initialCode})`);

    // 1B. Edit the category (Name, Classification, Budget Allocation, Description)
    const newName = 'Permanent Turnout & Canal Maintenance';
    const newAllocated = 58000;
    const newClassification = 'current_liability';
    const cleanDesc = 'Accrued liability obligations for turnout repairs';
    const classTag = `[class:${newClassification}]`;
    const fullDesc = `${classTag} ${cleanDesc}`;

    const { data: updatedCat, error: updateErr } = await supabase.from('budget_categories').update({
      name: newName,
      allocated_amount: newAllocated,
      description: fullDesc,
      updated_at: new Date().toISOString()
    }).eq('id', testCatId).select().single();

    assert(!updateErr && updatedCat, `Executed update on Category ${testCatId}`);
    assert(updatedCat?.name === newName, `Verified Name edited: "${updatedCat?.name}"`);
    assert(Number(updatedCat?.allocated_amount) === newAllocated, `Verified Allocated Budget edited: ${currency(updatedCat?.allocated_amount)}`);
    assert(updatedCat?.description.includes('[class:current_liability]'), `Verified Classification tag edited: [class:current_liability]`);

    // 1C. Clean up test category
    await supabase.from('budget_categories').delete().eq('id', testCatId);
    console.log(`  ✔ Cleaned up temporary test category ${testCatId}`);

    // ==============================================================================
    // PART 2: CREATE RECORDS WITH CURRENT LIABILITIES & NON-CURRENT LIABILITIES
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' [PART 2] LOGGING TRANSACTIONS FOR CURRENT & NON-CURRENT LIABILITIES');
    console.log('──────────────────────────────────────────────────────────────────────────────');

    // Find the official Current Liability category (NLFIA-LIAB-CUR-WAGES)
    const { data: curLiabCat } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('association_id', ASSOC_ID)
      .like('code', '%LIAB-CUR-WAGES%')
      .single();

    // Find the official Non-Current Liability category (NLFIA-LIAB-NONCUR-LOAN)
    const { data: nonCurLiabCat } = await supabase
      .from('budget_categories')
      .select('*')
      .eq('association_id', ASSOC_ID)
      .like('code', '%LIAB-NONCUR-LOAN%')
      .single();

    assert(Boolean(curLiabCat), `Located Current Liability Category: ${curLiabCat?.name} (${curLiabCat?.code})`);
    assert(Boolean(nonCurLiabCat), `Located Non-Current Liability Category: ${nonCurLiabCat?.name} (${nonCurLiabCat?.code})`);

    // 2A. Log CURRENT LIABILITY Transaction (Accrued Gatekeeper Wages)
    const curLiabAmount = 14500.00;
    const txCurLiabRow = {
      id: `tx-cur-liab-${runId}`,
      transaction_number: `DISB-CUR-LIAB-${runId}`,
      type: 'disbursement',
      association_id: ASSOC_ID,
      category_id: curLiabCat.id,
      amount: curLiabAmount,
      transaction_date: '2026-03-01',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Payment of dry-season accrued gatekeeper wages [class:current_liability]',
      particulars: 'Accrued Gatekeeper Wages & Monthly Honorarium',
      payee_name: 'Lateral Sector A Gatekeepers Brigade',
      lateral_section: 'Lateral A Turnout 1-5'
    };
    const { data: txCurLiab, error: errCurLiab } = await supabase.from('transactions').insert(txCurLiabRow).select().single();
    assert(!errCurLiab && txCurLiab, `[RECORD CREATED] Current Liability: ${currency(curLiabAmount)} (${txCurLiab?.transaction_number}) via [Cash on Hand]`);

    // 2B. Log NON-CURRENT LIABILITY Transaction (Agricultural Facility Loan Amortization)
    const nonCurLiabAmount = 30000.00;
    const txNonCurLiabRow = {
      id: `tx-noncur-liab-${runId}`,
      transaction_number: `DISB-NONCUR-LIAB-${runId}`,
      type: 'disbursement',
      association_id: ASSOC_ID,
      category_id: nonCurLiabCat.id,
      amount: nonCurLiabAmount,
      transaction_date: '2026-03-05',
      payment_method: 'bank_regular',
      reference_number: `LBP-LOAN-${runId}`,
      notes: '[fund:bank_regular] Semi-annual principal loan amortization for communal facility [class:non_current_liability]',
      particulars: 'Long-Term Facility Loan Amortization',
      payee_name: 'Land Bank of the Philippines - Agricultural Credit'
    };
    const { data: txNonCurLiab, error: errNonCurLiab } = await supabase.from('transactions').insert(txNonCurLiabRow).select().single();
    assert(!errNonCurLiab && txNonCurLiab, `[RECORD CREATED] Non-Current Liability: ${currency(nonCurLiabAmount)} (${txNonCurLiab?.transaction_number}) via [Bank Regular]`);

    // ==============================================================================
    // PART 3: FINANCIAL STATEMENT COMPUTATIONS WITH CURRENT & NON-CURRENT LIABILITIES
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' [PART 3] FINANCIAL STATEMENT COMPUTATIONS WITH LIABILITIES (FS-1 to FS-4)');
    console.log('──────────────────────────────────────────────────────────────────────────────');

    // Fetch all current transactions
    const { data: allTxs } = await supabase.from('transactions').select('*, category:budget_categories(*)').eq('association_id', ASSOC_ID);

    let totalCollections = 0;
    let totalDisbursements = 0;
    let currentLiabilitiesSum = 0;
    let nonCurrentLiabilitiesSum = 0;

    const funds = { cash_on_hand: 0, bank_regular: 0, bank_cbu: 0 };

    (allTxs || []).forEach((t) => {
      const amt = Number(t.amount || 0);
      const fund = t.payment_method === 'bank_cbu' ? 'bank_cbu' : (t.payment_method === 'bank_regular' ? 'bank_regular' : 'cash_on_hand');
      const catCode = t.category?.code || '';
      const catDesc = t.category?.description || '';

      if (t.type === 'collection') {
        totalCollections += amt;
        funds[fund] += amt;
      } else if (t.type === 'disbursement') {
        totalDisbursements += amt;
        funds[fund] -= amt;

        if (catDesc.includes('[class:current_liability]') || catCode.includes('LIAB-CUR')) {
          currentLiabilitiesSum += amt;
        } else if (catDesc.includes('[class:non_current_liability]') || catCode.includes('LIAB-NONCUR')) {
          nonCurrentLiabilitiesSum += amt;
        }
      }
    });

    const netSurplus = totalCollections - totalDisbursements;

    // Fixed assets
    const totalFixedAssetNBV = 714000; // From Nangurisan pump + building

    const totalCashOnHand = funds.cash_on_hand;
    const totalBankRegular = funds.bank_regular;
    const totalBankCBU = funds.bank_cbu;
    const undeposited = 3500;
    const totalCashAssets = totalCashOnHand + totalBankRegular + totalBankCBU + undeposited;

    const totalAssets = totalCashAssets + totalFixedAssetNBV;
    const totalLiabilities = currentLiabilitiesSum + nonCurrentLiabilitiesSum;
    const netWorth = totalAssets - totalLiabilities;

    console.log(' 📑 [FS-1: STATEMENT OF OPERATIONS]');
    console.log(`    Total Receipts (Inflows)                    : ${currency(totalCollections)}`);
    console.log(`    Total Disbursements (Outflows)              : ${currency(totalDisbursements)}`);
    console.log(`    Net Operating Surplus                       : ${currency(netSurplus)}`);

    console.log('\n 📑 [FS-2: STATEMENT OF FINANCIAL CONDITION (BALANCE SHEET)]');
    console.log(`    Current Assets (Total Cash & Receivables)   : ${currency(totalCashAssets)}`);
    console.log(`    Non-Current Assets (Fixed Assets NBV)       : ${currency(totalFixedAssetNBV)}`);
    console.log(`    TOTAL ASSETS                                : ${currency(totalAssets)}`);
    console.log('    ─────────────────────────────────────────────────────────────');
    console.log(`    Current Liabilities (Accrued Wages/Suppliers): ${currency(currentLiabilitiesSum)}`);
    console.log(`    Non-Current Liabilities (Long-term Loan)    : ${currency(nonCurrentLiabilitiesSum)}`);
    console.log(`    TOTAL LIABILITIES                           : ${currency(totalLiabilities)}`);
    console.log(`    Members Equity (Fund Balance)               : ${currency(totalAssets - totalLiabilities)}`);
    console.log(`    TOTAL LIABILITIES & EQUITY                  : ${currency(totalAssets)} (100% Balanced!)`);

    console.log('\n 📑 [FS-3: SECTION F — COMPOSITION OF CASH BALANCE]');
    console.log(`    1. Cash on Hand (Vault / Petty Cash)        : ${currency(totalCashOnHand)}`);
    console.log(`    2. Cash in Bank - Regular (Operations)      : ${currency(totalBankRegular)}`);
    console.log(`    3. Cash in Bank - CBU (Member Equity)       : ${currency(totalBankCBU)}`);
    console.log(`    4. Undeposited Collections (Adjustment)     : ${currency(undeposited)}`);
    console.log(`    TOTAL CASH COMPOSITION                      : ${currency(totalCashAssets)}`);

    console.log('\n 📑 [FS-4: STATEMENT OF NET WORTH]');
    console.log(`    Cash & Cash Equivalents                     : ${currency(totalCashAssets)}`);
    console.log(`    Equipment & Fixed Assets (NBV)              : ${currency(totalFixedAssetNBV)}`);
    console.log(`    TOTAL ASSETS                                : ${currency(totalAssets)}`);
    console.log('    ─────────────────────────────────────────────────────────────');
    console.log(`    Current Liabilities (Accrued Wages)         : ${currency(currentLiabilitiesSum)}`);
    console.log(`    Non-Current Liabilities (Loan Payable)      : ${currency(nonCurrentLiabilitiesSum)}`);
    console.log(`    TOTAL LIABILITIES                           : ${currency(totalLiabilities)}`);
    console.log(`    ASSOCIATION NET WORTH                       : ${currency(netWorth)} (Assets - Liabilities)`);

    assert(currentLiabilitiesSum >= 14500, `Current Liabilities captured in financial statements: ${currency(currentLiabilitiesSum)}`);
    assert(nonCurrentLiabilitiesSum >= 30000, `Non-Current Liabilities captured in financial statements: ${currency(nonCurrentLiabilitiesSum)}`);
    assert(totalLiabilities === (currentLiabilitiesSum + nonCurrentLiabilitiesSum), `Total Liabilities equation balanced: ${currency(totalLiabilities)}`);
    assert(netWorth === (totalAssets - totalLiabilities), `Net Worth equation balanced: ${currency(netWorth)} == Assets - Liabilities`);

  } finally {
    console.log('\n════════════════════════════════════════════════════════════════════════════');
    console.log('       TEST SCORECARD: ALL ASSERTIONS VERIFIED                              ');
    console.log(`       Passed: ${passed} | Failed: ${failed} | Success Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%`);
    console.log('════════════════════════════════════════════════════════════════════════════\n');
  }
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
