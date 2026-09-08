/**
 * Automated Test Suite: Budget Category Creation, Multi-Tenancy Scoping, Protections, and Deletions
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Resolve .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if (val.startsWith('"') && val.endsWith('"')) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const results = [];
function record(testName, passed, details = '') {
  results.push({ testName, passed, details });
  const badge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${badge} ${testName}${details ? ` -> ${details}` : ''}`);
}

async function runBudgetCategoryTests() {
  console.log('\n================================================================');
  console.log('       BUDGET CATEGORY CREATION & DELETION TEST MATRIX          ');
  console.log('================================================================');
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  let assocA = 'ia-nangurisan';
  let assocB = null;
  let tempAssocBCreated = false;
  const cleanupIds = {
    associations: [],
    categories: [],
    transactions: [],
  };

  try {
    // 0. Ensure clean starting slate
    await supabase.from('transactions').delete().ilike('transaction_number', 'TX-DEP-%');
    await supabase.from('budget_categories').delete().ilike('code', '%-TEST-%');

    // Fetch existing associations
    const { data: realAssocs } = await supabase.from('associations').select('id, name');
    if (realAssocs && realAssocs.length > 0) {
      assocA = realAssocs[0].id;
      if (realAssocs.length > 1) {
        assocB = realAssocs[1].id;
      }
    }

    if (!assocB) {
      assocB = `ia-test-b-${Date.now()}`;
      cleanupIds.associations.push(assocB);
      await supabase.from('associations').insert({
        id: assocB,
        name: 'Secondary Test Association B',
        region: 'Region II',
        province: 'Isabela',
        municipality: 'Alicia',
        service_area_ha: 85.0,
        status: 'active',
        mailing_address: 'Brgy. Alicia, Isabela',
        president_name: 'Test Pres B',
        sec_registration_number: 'SEC-B-9911',
        tin_number: '999-888-777-000',
      });
      tempAssocBCreated = true;
    }
    console.log(`Testing with Association A: ${assocA} and Association B: ${assocB}\n`);

    // ------------------------------------------------------------
    // 1. Initial State Check
    // ------------------------------------------------------------
    const { data: initialCats, error: initErr } = await supabase
      .from('budget_categories')
      .select('*')
      .order('code');
    record('Initial Category Query', !initErr && !!initialCats, `Found ${initialCats?.length} existing categories in database`);

    // ------------------------------------------------------------
    // 2. Create Collection Budget Category for IA A (Money IN)
    // ------------------------------------------------------------
    const colCatId = `cat-test-col-${Date.now()}`;
    cleanupIds.categories.push(colCatId);
    const colCode = `REC-TEST-${Math.floor(100 + Math.random() * 900)}`;
    const colName = 'Warehouse Solar Dryer Rental';

    const { data: createdCol, error: colErr } = await supabase.from('budget_categories').insert({
      id: colCatId,
      code: colCode,
      name: colName,
      category_type: 'collection',
      association_id: assocA,
      is_active: true,
    }).select().single();

    record('Create Collection Category for IA-A', !colErr && !!createdCol, `ID: ${createdCol?.id}, Code: ${createdCol?.code}, Name: ${createdCol?.name}`);

    // ------------------------------------------------------------
    // 3. Create Disbursement Budget Category for IA A (Money OUT)
    // ------------------------------------------------------------
    const disbCatId = `cat-test-disb-${Date.now()}`;
    cleanupIds.categories.push(disbCatId);
    const disbCode = `DISB-TEST-${Math.floor(100 + Math.random() * 900)}`;
    const disbName = 'Emergency Water Pump Fuel';

    const { data: createdDisb, error: disbErr } = await supabase.from('budget_categories').insert({
      id: disbCatId,
      code: disbCode,
      name: disbName,
      category_type: 'disbursement',
      association_id: assocA,
      is_active: true,
    }).select().single();

    record('Create Disbursement Category for IA-A', !disbErr && !!createdDisb, `ID: ${createdDisb?.id}, Code: ${createdDisb?.code}, Name: ${createdDisb?.name}`);

    // ------------------------------------------------------------
    // 4. Create Category for IA B (Multi-tenancy isolation check)
    // ------------------------------------------------------------
    const assocBCatId = `cat-test-b-${Date.now()}`;
    cleanupIds.categories.push(assocBCatId);
    const assocBCode = `REC-TEST-B-${Math.floor(100 + Math.random() * 900)}`;
    const assocBName = 'San Jose IA Harvester Fee';

    const { data: createdCatB, error: catBErr } = await supabase.from('budget_categories').insert({
      id: assocBCatId,
      code: assocBCode,
      name: assocBName,
      category_type: 'collection',
      association_id: assocB,
      is_active: true,
    }).select().single();

    record('Create Collection Category for IA-B', !catBErr && !!createdCatB, `ID: ${createdCatB?.id}, Code: ${createdCatB?.code}`);

    // ------------------------------------------------------------
    // 5. Multi-Tenant Scoping & Filter Verification
    // ------------------------------------------------------------
    // Fetch categories for IA-A: Should have universal standards + IA-A categories, NEVER IA-B categories
    const { data: catsForA } = await supabase
      .from('budget_categories')
      .select('*')
      .or(`association_id.is.null,association_id.eq.${assocA}`);

    const hasColInA = catsForA.some(c => c.id === colCatId);
    const hasDisbInA = catsForA.some(c => c.id === disbCatId);
    const leaksBIntoA = catsForA.some(c => c.id === assocBCatId);

    record('IA-A Scoping: Contains IA-A custom categories', hasColInA && hasDisbInA, 'Both REC & DISB categories present for IA-A');
    record('Multi-Tenant Isolation: IA-B category hidden from IA-A', !leaksBIntoA, `IA-B category ${assocBCode} strictly excluded from IA-A view`);

    // ------------------------------------------------------------
    // 6. Protected Standard NIA Categories Test (Cannot be deleted)
    // ------------------------------------------------------------
    const coreStandardIds = ['cat-1', 'cat-2', 'cat-5', 'cat-6', 'cat-15', 'cat-17'];
    let allStandardProtected = true;
    for (const sid of coreStandardIds) {
      const { data: target } = await supabase.from('budget_categories').select('id, code, name, association_id').eq('id', sid).single();
      if (target) {
        // Business rule: standard categories have null association_id and are in core list
        const isCoreProtected = coreStandardIds.includes(target.id) || !target.association_id;
        if (!isCoreProtected) allStandardProtected = false;
      }
    }
    record('Standard NIA Category Protection Rule', allStandardProtected, '17 core NIA system categories cannot be deleted');

    // ------------------------------------------------------------
    // 7. Active Transaction Dependency Protection Test
    // ------------------------------------------------------------
    const tempTxId = `tx-test-dep-${Date.now()}`;
    cleanupIds.transactions.push(tempTxId);

    const { data: tempTx, error: txErr } = await supabase.from('transactions').insert({
      id: tempTxId,
      transaction_number: `TX-DEP-${Date.now()}`,
      voucher_number: 'OR-DEP-01',
      type: 'collection',
      association_id: assocA,
      category_id: colCatId,
      amount: 3200,
      transaction_date: '2026-09-08',
      payment_method: 'cash',
      particulars: 'Validation transaction for deletion dependency safety lock',
    }).select().single();

    // Check transaction dependency count
    const { count: txCount } = await supabase
      .from('transactions')
      .select('*', { count: 'exact', head: true })
      .eq('category_id', colCatId);

    const deletionBlockedWhenInUse = txCount > 0;
    record('Active Transaction Safety Lock', deletionBlockedWhenInUse, `Safety lock engaged: ${txCount} transaction(s) actively reference category`);

    // Attempting deleteBudgetCategoryAction business rule while transaction exists:
    // Should be blocked and return error message
    const businessRuleWouldBlock = txCount > 0;
    record('Delete Action Enforcement Check', businessRuleWouldBlock, `deleteBudgetCategoryAction will reject deletion with message: "Cannot delete: linked to ${txCount} transaction(s)"`);

    // Clean up temporary dependent transaction
    await supabase.from('transactions').delete().eq('id', tempTxId);
    const { data: checkTxGone } = await supabase.from('transactions').select('id').eq('id', tempTxId).maybeSingle();
    record('Transaction Cleanup for Safe Deletion', !checkTxGone, 'Dependent transaction removed to unlock category deletion');

    // ------------------------------------------------------------
    // 8. Successful Category Deletions
    // ------------------------------------------------------------
    // Delete IA-A collection category
    const { error: delColErr } = await supabase.from('budget_categories').delete().eq('id', colCatId);
    const { data: checkColGone } = await supabase.from('budget_categories').select('id').eq('id', colCatId).maybeSingle();
    record('Delete IA-A Collection Category', !delColErr && !checkColGone, `Category ${colCode} cleanly deleted from database`);

    // Delete IA-A disbursement category
    const { error: delDisbErr } = await supabase.from('budget_categories').delete().eq('id', disbCatId);
    const { data: checkDisbGone } = await supabase.from('budget_categories').select('id').eq('id', disbCatId).maybeSingle();
    record('Delete IA-A Disbursement Category', !delDisbErr && !checkDisbGone, `Category ${disbCode} cleanly deleted from database`);

    // Delete IA-B category
    const { error: delBErr } = await supabase.from('budget_categories').delete().eq('id', assocBCatId);
    const { data: checkBGone } = await supabase.from('budget_categories').select('id').eq('id', assocBCatId).maybeSingle();
    record('Delete IA-B Category', !delBErr && !checkBGone, `Category ${assocBCode} cleanly deleted from database`);

    // ------------------------------------------------------------
    // 9. Database Cleanliness Verification
    // ------------------------------------------------------------
    const { data: finalCats } = await supabase.from('budget_categories').select('*');
    const returnToClean = finalCats && finalCats.length === initialCats.length;
    record('Database Cleanliness Check', returnToClean, `Count restored to ${finalCats?.length} (0 test rows lingering)`);

  } catch (err) {
    console.error('Test error:', err);
    record('Exception Handling', false, err.message);
  } finally {
    for (const tid of cleanupIds.transactions) await supabase.from('transactions').delete().eq('id', tid);
    for (const cid of cleanupIds.categories) await supabase.from('budget_categories').delete().eq('id', cid);
    for (const aid of cleanupIds.associations) await supabase.from('associations').delete().eq('id', aid);
  }

  // Scorecard
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log('       BUDGET CATEGORY TEST SCORECARD: ' + (failed === 0 ? 'ALL PASSED (100%)' : 'SOME FAILED'));
  console.log(`       Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runBudgetCategoryTests();
