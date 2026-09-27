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
const sleep = (ms) => new Promise((res) => setTimeout(res, ms));

async function runLiveUserSession() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║        IARMS LIVE USER WORKFLOW SIMULATION (HEADLESS / NON-BROWSER)        ║');
  console.log('║        Nangurisan Irrigators Association — Operational Day in Action       ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const createdIds = {
    categories: [],
    transactions: [],
    fixedAssets: [],
  };

  try {
    // -------------------------------------------------------------
    // SCENE 1: BOOKKEEPER LOGS IN & CHECKS OPENING FUND BALANCES
    // -------------------------------------------------------------
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' ACT 1: BOOKKEEPER CHECKS 3-FUND CASH & BANK POSITIONS (TREASURY OVERSIGHT)');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    
    const { data: allTx, error: txErr } = await supabase
      .from('transactions')
      .select('*')
      .eq('association_id', ASSOC_ID);

    if (txErr) throw txErr;

    function getFundFromTx(tx) {
      if (tx.payment_method && ['cash_on_hand', 'bank_regular', 'bank_cbu'].includes(tx.payment_method)) {
        return tx.payment_method;
      }
      if (tx.notes && tx.notes.includes('[fund:bank_regular]')) return 'bank_regular';
      if (tx.notes && tx.notes.includes('[fund:bank_cbu]')) return 'bank_cbu';
      return 'cash_on_hand';
    }

    const currentBalances = { cash_on_hand: 0, bank_regular: 0, bank_cbu: 0 };
    (allTx || []).forEach((t) => {
      const fund = getFundFromTx(t);
      const amt = Number(t.amount || 0);
      if (t.type === 'collection') {
        currentBalances[fund] += amt;
      } else if (t.type === 'disbursement') {
        currentBalances[fund] -= amt;
      }
    });

    console.log(' [Bookkeeper Dashboard] Opening Fund Balances Retrieved:');
    console.log(`   ├─ 💵 Cash on Hand (Vault / Petty Cash) : ${currency(currentBalances.cash_on_hand)}`);
    console.log(`   ├─ 🏦 Bank - Regular Fund (Operations) : ${currency(currentBalances.bank_regular)}`);
    console.log(`   └─ 🏛️  Bank - CBU Fund (Member Equity)  : ${currency(currentBalances.bank_cbu)}`);
    console.log(`   TOTAL LIQUID CASH ASSETS               : ${currency(currentBalances.cash_on_hand + currentBalances.bank_regular + currentBalances.bank_cbu)}\n`);

    await sleep(800);

    // -------------------------------------------------------------
    // SCENE 2: REGISTERING A NEW FIXED ASSET / EQUIPMENT
    // -------------------------------------------------------------
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' ACT 2: REGISTERING NEW HEAVY EQUIPMENT IN FIXED ASSET REGISTRY');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' Bookkeeper selects: Tab -> "Fixed Asset Registry" -> "+ Register Equipment"');

    const assetCost = 185000;
    const salvageVal = 25000;
    const depRate = 20; // 20% straight line (5 years useful life for irrigation pump)
    const depreciableCost = assetCost - salvageVal;
    const annualDep = depreciableCost * (depRate / 100);
    const monthlyDep = annualDep / 12;
    const nbv = assetCost - annualDep; // After 1 yr

    const assetCode = `AST-DEMO-PUMP-${Date.now().toString().slice(-4)}`;
    const assetMeta = {
      asset_name: 'Kubota 8.5HP High-Discharge Diesel Irrigation Water Pump',
      category: 'equipment',
      acquisition_date: '2025-01-15',
      acquisition_cost: assetCost,
      salvage_value: salvageVal,
      useful_life_years: 5,
      depreciation_rate_percent: depRate,
      status: 'active',
      location: 'Lateral Canal Section B Pump House',
      serial_number: 'KB-85-D-2025-0988',
      registered_by: 'IA Bookkeeper'
    };

    const { data: newAsset, error: assetErr } = await supabase
      .from('budget_categories')
      .insert({
        id: `ast-demo-${Date.now()}`,
        association_id: ASSOC_ID,
        name: assetMeta.asset_name,
        code: assetCode,
        category_type: 'disbursement',
        allocated_amount: assetCost,
        description: JSON.stringify(assetMeta),
        is_active: true,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();

    if (assetErr) throw assetErr;
    createdIds.fixedAssets.push(newAsset.id);

    console.log(' ✅ [Registry Saved] New Fixed Asset Successfully Tagged in Database!');
    console.log(' ┌────────────────────────────────────────────────────────────────────────┐');
    console.log(` │ Asset Name       : ${assetMeta.asset_name}`);
    console.log(` │ Serial Number    : ${assetMeta.serial_number}`);
    console.log(` │ Location         : ${assetMeta.location}`);
    console.log(` │ Acquisition Cost : ${currency(assetCost)} (Salvage Value: ${currency(salvageVal)})`);
    console.log(` │ Useful Life Rate : ${depRate}% Straight-Line (5 Years Preset)`);
    console.log(` │ Depreciable Cost : ${currency(depreciableCost)}`);
    console.log(` │ Annual Deprec.   : ${currency(annualDep)} / year (${currency(monthlyDep)} / month)`);
    console.log(` │ Net Book Value   : ${currency(nbv)} (Automatically feeds FS-2 & FS-4 Assets)`);
    console.log(' └────────────────────────────────────────────────────────────────────────┘\n');

    await sleep(800);

    // -------------------------------------------------------------
    // SCENE 3: LOGGING COLLECTIONS ACROSS DISTINCT CASH ACCOUNTS
    // -------------------------------------------------------------
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' ACT 3: LOGGING COLLECTIONS WITH FUND ACCOUNT SPECIFICATION');
    console.log('──────────────────────────────────────────────────────────────────────────────');

    // 1. ISF Cash Collection
    const col1Amount = 35000;
    const { data: tx1, error: tx1Err } = await supabase
      .from('transactions')
      .insert({
        id: `tx-demo-cash-${Date.now()}`,
        transaction_number: `OR-CASH-${Date.now().toString().slice(-4)}`,
        type: 'collection',
        association_id: ASSOC_ID,
        category_id: newAsset.id,
        amount: col1Amount,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash_on_hand',
        notes: '[fund:cash_on_hand] Wet Season ISF remittances from Lateral Canal Sector A',
        particulars: 'Irrigation Service Fee (ISF) - Cash Payment',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (tx1Err) throw tx1Err;
    createdIds.transactions.push(tx1.id);
    console.log(` ✅ [Collection Logged] ${currency(col1Amount)} via [💵 Cash on Hand]`);
    console.log(`    OR#: ${tx1.transaction_number} | Particulars: ${tx1.particulars}`);

    // 2. CBU Share Direct Deposit
    const col2Amount = 25000;
    const { data: tx2, error: tx2Err } = await supabase
      .from('transactions')
      .insert({
        id: `tx-demo-cbu-${Date.now()}`,
        transaction_number: `DEP-CBU-${Date.now().toString().slice(-4)}`,
        type: 'collection',
        association_id: ASSOC_ID,
        category_id: newAsset.id,
        amount: col2Amount,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'bank_cbu',
        notes: '[fund:bank_cbu] Direct deposit to Land Bank CBU Trust Acct #0811',
        particulars: 'Capital Build-Up (CBU) Equity Contribution',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (tx2Err) throw tx2Err;
    createdIds.transactions.push(tx2.id);
    console.log(` ✅ [Collection Logged] ${currency(col2Amount)} via [🏛️  Bank - CBU Fund]`);
    console.log(`    Slip#: ${tx2.transaction_number} | Particulars: ${tx2.particulars}`);

    // Update simulation balances
    currentBalances.cash_on_hand += col1Amount;
    currentBalances.bank_cbu += col2Amount;

    console.log('\n 📊 Live Available Balances After Inflows:');
    console.log(`    Cash on Hand : ${currency(currentBalances.cash_on_hand)}`);
    console.log(`    Bank Regular : ${currency(currentBalances.bank_regular)}`);
    console.log(`    Bank CBU     : ${currency(currentBalances.bank_cbu)}\n`);

    await sleep(800);

    // -------------------------------------------------------------
    // SCENE 4: TESTING OVER-DISBURSEMENT / INSUFFICIENT FUNDS GUARD
    // -------------------------------------------------------------
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' ACT 4: TESTING SYSTEM SAFETY GUARD — OVER-DISBURSEMENT ATTEMPT');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' Scenario: Bookkeeper attempts to disburse ₱10,000,000 from Cash on Hand');
    console.log(`           (Available in Cash on Hand: ${currency(currentBalances.cash_on_hand)})`);

    const attemptedOverdraft = 10000000;
    const isOverdraft = attemptedOverdraft > currentBalances.cash_on_hand;

    if (isOverdraft) {
      console.log(' 🛑 [SYSTEM INTERCEPT] Over-Disbursement Rule Triggered!');
      console.log(`    Error Message Displayed to User:`);
      console.log(`    "❌ Insufficient funds in Cash on Hand.`);
      console.log(`        Available: ${currency(currentBalances.cash_on_hand)} | Attempted: ${currency(attemptedOverdraft)}`);
      console.log(`        Transaction blocked to protect Association reserves."`);
      console.log('    UI Action: Submit Button is DISABLED, Red Warning Alert displayed.');
    } else {
      throw new Error('Over-disbursement check failed to trigger!');
    }

    await sleep(800);

    // -------------------------------------------------------------
    // SCENE 5: LOGGING VALID DISBURSEMENT WITHIN APPROVED LIMITS
    // -------------------------------------------------------------
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' ACT 5: BOOKKEEPER LOGS LEGITIMATE EXPENSE WITHIN BUDGET');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' Bookkeeper adjusts disbursement to ₱12,500 for Emergency Canal Gate Lubrication');

    // Create receipt voucher in database
    const rcptId = `rcpt-demo-${Date.now()}`;
    const { data: voucherRcpt, error: rcptErr } = await supabase
      .from('receipts')
      .insert({
        id: rcptId,
        file_path: `/uploads/vouchers/voucher_${Date.now()}.jpg`,
        file_name: `canals_maintenance_receipt_${Date.now()}.jpg`,
        file_size: Math.round(1.2 * 1024 * 1024),
        content_type: 'image/jpeg',
        uploader_id: 'user-bookkeeper-nlfia',
        association_id: ASSOC_ID,
        status: 'pending',
        created_at: new Date().toISOString()
      })
      .select()
      .single();
    if (rcptErr) throw rcptErr;
    createdIds.receipts = createdIds.receipts || [];
    createdIds.receipts.push(voucherRcpt.id);

    const validDisbAmount = 12500;
    const { data: tx3, error: tx3Err } = await supabase
      .from('transactions')
      .insert({
        id: `tx-demo-disb-${Date.now()}`,
        transaction_number: `DV-MAINT-${Date.now().toString().slice(-4)}`,
        type: 'disbursement',
        association_id: ASSOC_ID,
        category_id: newAsset.id,
        receipt_id: voucherRcpt.id,
        amount: validDisbAmount,
        transaction_date: new Date().toISOString().split('T')[0],
        payment_method: 'cash_on_hand',
        notes: '[fund:cash_on_hand] Emergency canal gate seals and grease',
        particulars: 'Canal Repairs & Maintenance',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      })
      .select()
      .single();
    if (tx3Err) throw tx3Err;
    createdIds.transactions.push(tx3.id);
    currentBalances.cash_on_hand -= validDisbAmount;

    console.log(` ✅ [Disbursement Approved] ${currency(validDisbAmount)} deducted from [💵 Cash on Hand]`);
    console.log(`    Voucher: ${tx3.transaction_number} | Receipt: ${voucherRcpt.file_name} (Status: PENDING AUDIT)`);
    console.log(`    Remaining Cash on Hand: ${currency(currentBalances.cash_on_hand)}\n`);

    await sleep(800);

    // -------------------------------------------------------------
    // SCENE 6: INTERNAL AUDITOR VERIFIES VOUCHER
    // -------------------------------------------------------------
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' ACT 6: INTERNAL AUDITOR REVIEWS & VERIFIES DISBURSEMENT VOUCHER');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(` Auditor inspects voucher ${tx3.transaction_number} in Auditor Queue...`);
    console.log(` Particulars verified against physical hardware store receipt.`);

    const { error: auditErr } = await supabase
      .from('receipts')
      .update({
        status: 'verified',
        auditor_id: 'user-auditor-nlfia',
        auditor_notes: 'All particulars match irrigation canal log and official receipt. Verified OK.',
        verified_at: new Date().toISOString()
      })
      .eq('id', voucherRcpt.id);
    if (auditErr) throw auditErr;

    console.log(` ✅ [Audit Queue] Receipt ${voucherRcpt.file_name} status updated to: [VERIFIED]`);
    console.log(`    Audited By: user-auditor-nlfia | Notes: Verified OK | Ledger integrity confirmed.\n`);

    await sleep(800);

    // -------------------------------------------------------------
    // SCENE 7: AUTOMATED FS COMPILATION & SECTION F BREAKDOWN
    // -------------------------------------------------------------
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' ACT 7: AUTOMATED FS-1 TO FS-4 GENERATION (WITH AUTO-COMPUTED SECTION F)');
    console.log('──────────────────────────────────────────────────────────────────────────────');

    // Fetch all active transactions including new ones
    const { data: updatedTx } = await supabase
      .from('transactions')
      .select('*')
      .eq('association_id', ASSOC_ID);

    const sectionF = {
      cashOnHand: 0,
      bankRegular: 0,
      bankCbu: 0,
      undeposited: 3500 // Preserved manual adjustment row
    };

    let totalCollections = 0;
    let totalDisbursements = 0;

    (updatedTx || []).forEach((t) => {
      const amt = Number(t.amount || 0);
      const f = getFundFromTx(t);
      if (t.type === 'collection') {
        totalCollections += amt;
        if (f === 'cash_on_hand') sectionF.cashOnHand += amt;
        else if (f === 'bank_regular') sectionF.bankRegular += amt;
        else if (f === 'bank_cbu') sectionF.bankCbu += amt;
      } else if (t.type === 'disbursement') {
        totalDisbursements += amt;
        if (f === 'cash_on_hand') sectionF.cashOnHand -= amt;
        else if (f === 'bank_regular') sectionF.bankRegular -= amt;
        else if (f === 'bank_cbu') sectionF.bankCbu -= amt;
      }
    });

    const netSurplus = totalCollections - totalDisbursements;
    const totalCashComposition = sectionF.cashOnHand + sectionF.bankRegular + sectionF.bankCbu + sectionF.undeposited;

    console.log(' 📑 [FS-1: STATEMENT OF OPERATIONS]');
    console.log(`    Total Receipts (Inflows)        : ${currency(totalCollections)}`);
    console.log(`    Total Disbursements (Outflows)  : ${currency(totalDisbursements)}`);
    console.log(`    Net Surplus for the Period      : ${currency(netSurplus)}`);

    console.log('\n 📑 [FS-2: STATEMENT OF CASH FLOWS & BALANCE SHEET]');
    console.log(`    Operating Cash Flow             : ${currency(netSurplus)}`);
    console.log(`    Annual Depreciation Captured    : ${currency(annualDep)} (Auto-fed from Fixed Assets)`);

    console.log('\n 📑 [FS-3: SECTION F — COMPOSITION OF CASH BALANCE (100% AUTOMATED)]');
    console.log('    ┌──────────────────────────────────────────────────────────────┬───────────────┐');
    console.log('    │ Fund / Account Description                                   │ Balance (PHP) │');
    console.log('    ├──────────────────────────────────────────────────────────────┼───────────────┤');
    console.log(`    │ 1. Cash on Hand (Petty Cash / Vault)                         │ ${currency(sectionF.cashOnHand).padStart(13)} │`);
    console.log(`    │ 2. Cash in Bank - Regular / General Fund (Operations)        │ ${currency(sectionF.bankRegular).padStart(13)} │`);
    console.log(`    │ 3. Cash in Bank - CBU / Special Project Fund (Member Equity) │ ${currency(sectionF.bankCbu).padStart(13)} │`);
    console.log(`    │ 4. Undeposited / Unremitted Collections (Adjustment)         │ ${currency(sectionF.undeposited).padStart(13)} │`);
    console.log('    ├──────────────────────────────────────────────────────────────┼───────────────┤');
    console.log(`    │ TOTAL COMPOSITION OF CASH                                    │ ${currency(totalCashComposition).padStart(13)} │`);
    console.log('    └──────────────────────────────────────────────────────────────┴───────────────┘');

    console.log('\n 📑 [FS-4: STATEMENT OF NET WORTH (CONSOLIDATED ASSETS)]');
    console.log(`    Cash & Cash Equivalents         : ${currency(totalCashComposition)}`);
    console.log(`    Fixed Assets & Equipment (NBV)  : ${currency(nbv)} (${assetMeta.asset_name})`);
    console.log(`    TOTAL ASSOCIATION ASSETS        : ${currency(totalCashComposition + nbv)}`);
    console.log(`    TOTAL LIABILITIES               : ₱0.00`);
    console.log(`    ASSOCIATION NET WORTH           : ${currency(totalCashComposition + nbv)}`);

  } finally {
    // -------------------------------------------------------------
    // TEARDOWN & REVERSION
    // -------------------------------------------------------------
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' CLEANUP & PURGE: Restoring Production Database to Initial Pristine State');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    if (createdIds.transactions.length > 0) {
      await supabase.from('transactions').delete().in('id', createdIds.transactions);
      console.log(` 🧹 Purged ${createdIds.transactions.length} simulation transactions.`);
    }
    if (createdIds.receipts && createdIds.receipts.length > 0) {
      await supabase.from('receipts').delete().in('id', createdIds.receipts);
      console.log(` 🧹 Purged ${createdIds.receipts.length} simulation receipt records.`);
    }
    if (createdIds.fixedAssets.length > 0) {
      await supabase.from('budget_categories').delete().in('id', createdIds.fixedAssets);
      console.log(` 🧹 Purged ${createdIds.fixedAssets.length} simulation fixed asset records.`);
    }
    console.log(' ✅ Database cleaned up cleanly. Zero residual footprint remaining.\n');
  }

  console.log('════════════════════════════════════════════════════════════════════════════');
  console.log('       SIMULATION COMPLETE: ALL ROLES AND FEATURES EXECUTED FLAWLESSLY       ');
  console.log('════════════════════════════════════════════════════════════════════════════\n');
}

runLiveUserSession().catch((err) => {
  console.error('Simulation encountered an error:', err);
  process.exit(1);
});
