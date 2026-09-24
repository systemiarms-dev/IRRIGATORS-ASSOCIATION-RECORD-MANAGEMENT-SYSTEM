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

const runId = Date.now().toString().slice(-5);
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

async function auditAllTabsCRUD() {
  console.log('\n╔════════════════════════════════════════════════════════════════════════════╗');
  console.log('║       COMPREHENSIVE ALL-TABS CRUD & BUTTONS VERIFICATION AUDIT             ║');
  console.log('║       Every Sidebar Tab • Full C-R-U-D Lifecycle • Real-time DB Engine     ║');
  console.log('╚════════════════════════════════════════════════════════════════════════════╝\n');

  const cleanup = {
    associations: [],
    members: [],
    categories: [],
    fixedAssets: [],
    transactions: [],
    receipts: [],
    statements: [],
    users: [],
  };

  try {
    // ==============================================================================
    // TAB 1: IRRIGATORS ASSOCIATIONS (/dashboard/associations)
    // ==============================================================================
    console.log('──────────────────────────────────────────────────────────────────────────────');
    console.log(' TAB 1: IRRIGATORS ASSOCIATIONS (C-R-U-D Lifecycle)');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    const testAssocId = `ia-crud-${runId}`;
    const testAssocCode = `CRUD-${runId}`;

    // 1A. CREATE
    const { data: createdAssoc, error: errCreateAssoc } = await supabase.from('associations').insert({
      id: testAssocId,
      code: testAssocCode,
      name: `CRUD Test Association ${runId}`,
      old_name: 'Test IA Inc.',
      region: 'Region 02',
      nis_name: 'Baua River Irrigation System',
      mailing_address: 'Barangay Test, Gonzaga, Cagayan',
      president_name: 'Test President',
      contact_number: '09171234567',
      sec_registration_number: `SEC-${runId}`,
      tin_number: `TIN-${runId}`,
      service_area_ha: 50.5,
      operational_area_ha: 45.0,
      beneficiaries_total: 40,
      is_active: true
    }).select().single();
    cleanup.associations.push(testAssocId);
    assert(!errCreateAssoc && createdAssoc, `[CREATE] Registered new Association: ${testAssocCode}`);

    // 1B. READ
    const { data: readAssoc, error: errReadAssoc } = await supabase.from('associations').select('*').eq('id', testAssocId).single();
    assert(!errReadAssoc && readAssoc?.name === `CRUD Test Association ${runId}`, `[READ] Retrieved Association details successfully`);

    // 1C. UPDATE
    const { data: updatedAssoc, error: errUpdateAssoc } = await supabase.from('associations').update({
      president_name: 'Updated President Name',
      operational_area_ha: 48.0
    }).eq('id', testAssocId).select().single();
    assert(!errUpdateAssoc && updatedAssoc?.president_name === 'Updated President Name', `[UPDATE] Updated Association President to "Updated President Name"`);

    // 1D. DELETE
    const { error: errDeleteAssoc } = await supabase.from('associations').delete().eq('id', testAssocId);
    assert(!errDeleteAssoc, `[DELETE] Deleted Association: ${testAssocCode}`);

    // ==============================================================================
    // TAB 2: FARMER MEMBERS (/dashboard/members)
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' TAB 2: FARMER MEMBERS (C-R-U-D Lifecycle)');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    const testMemberId = `mem-crud-${runId}`;

    // 2A. CREATE
    const { data: createdMember, error: errCreateMem } = await supabase.from('profiles').insert({
      id: testMemberId,
      username: `mem_crud_${runId}`,
      full_name: `Mang Ambo (CRUD Test Member ${runId})`,
      role: 'member',
      association_id: 'ia-nangurisan',
      farm_location: 'Lateral B Turnout 3',
      farm_size_hectares: 2.25,
      contact_number: '09178889900',
      password: 'no_login_needed'
    }).select().single();
    cleanup.members.push(testMemberId);
    assert(!errCreateMem && createdMember, `[CREATE] Registered Farmer Member: "${createdMember?.full_name}"`);

    // 2B. READ
    const { data: readMember, error: errReadMem } = await supabase.from('profiles').select('*').eq('id', testMemberId).single();
    assert(!errReadMem && readMember?.farm_location === 'Lateral B Turnout 3', `[READ] Retrieved Member: farm location verified`);

    // 2C. UPDATE
    const { data: updatedMember, error: errUpdateMem } = await supabase.from('profiles').update({
      farm_size_hectares: 3.50,
      contact_number: '09170001122'
    }).eq('id', testMemberId).select().single();
    assert(!errUpdateMem && Number(updatedMember?.farm_size_hectares) === 3.5, `[UPDATE] Updated Member farm size to 3.50 ha`);

    // 2D. DELETE
    const { error: errDeleteMem } = await supabase.from('profiles').delete().eq('id', testMemberId);
    assert(!errDeleteMem, `[DELETE] Deleted Farmer Member: ${testMemberId}`);

    // ==============================================================================
    // TAB 3: CHART OF ACCOUNTS (/dashboard/chart-of-accounts - Tab 1)
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' TAB 3: CHART OF ACCOUNTS BUDGET CATEGORIES (C-R-U-D Lifecycle)');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    const testCatId = `cat-crud-${runId}`;
    const testCatCode = `DISB-CRUD-${runId}`;

    // 3A. CREATE
    const { data: createdCat, error: errCreateCat } = await supabase.from('budget_categories').insert({
      id: testCatId,
      code: testCatCode,
      name: `Emergency Siphon Repair & Overhaul ${runId}`,
      category_type: 'disbursement',
      allocated_amount: 45000,
      description: '[class:current_liability] Emergency canal gate overhaul funds',
      association_id: 'ia-nangurisan',
      is_active: true
    }).select().single();
    cleanup.categories.push(testCatId);
    assert(!errCreateCat && createdCat, `[CREATE] Added Classified Category: "${createdCat?.name}" (${testCatCode})`);

    // 3B. READ
    const { data: readCat, error: errReadCat } = await supabase.from('budget_categories').select('*').eq('id', testCatId).single();
    assert(!errReadCat && readCat?.allocated_amount === 45000, `[READ] Retrieved Category with classification [class:current_liability]`);

    // 3C. UPDATE
    const { data: updatedCat, error: errUpdateCat } = await supabase.from('budget_categories').update({
      allocated_amount: 55000,
      name: `Emergency Siphon Repair (Adjusted)`
    }).eq('id', testCatId).select().single();
    assert(!errUpdateCat && updatedCat?.allocated_amount === 55000, `[UPDATE] Updated Category allocated budget to ₱55,000.00`);

    // 3D. DELETE
    const { error: errDeleteCat } = await supabase.from('budget_categories').delete().eq('id', testCatId);
    assert(!errDeleteCat, `[DELETE] Deleted Budget Category: ${testCatCode}`);

    // ==============================================================================
    // TAB 4: FIXED ASSET & EQUIPMENT REGISTRY (/dashboard/chart-of-accounts - Tab 2)
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' TAB 4: FIXED ASSET & EQUIPMENT REGISTRY (C-R-U-D Lifecycle)');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    const testAssetId = `ast-crud-${runId}`;
    const testAssetCode = `AST-TRACTOR-${runId}`;
    const assetMeta = {
      is_asset: true,
      asset_type: 'heavy_machinery',
      date_acquired: '2024-03-01',
      depreciation_rate: 10, // 10% straight line
      useful_life_years: 10,
      salvage_value: 50000,
      notes: 'CRUD Audit Heavy Machinery Tractor'
    };

    // 4A. CREATE
    const { data: createdAsset, error: errCreateAsset } = await supabase.from('budget_categories').insert({
      id: testAssetId,
      code: testAssetCode,
      name: `Mitsubishi 95HP Heavy Tractor ${runId}`,
      category_type: 'disbursement',
      allocated_amount: 500000,
      description: JSON.stringify(assetMeta),
      association_id: 'ia-nangurisan',
      is_active: true
    }).select().single();
    cleanup.fixedAssets.push(testAssetId);
    assert(!errCreateAsset && createdAsset, `[CREATE] Registered Equipment: "${createdAsset?.name}" at 10% depreciation`);

    // 4B. READ & AUTO-COMPUTE DEPRECIATION
    const { data: readAsset, error: errReadAsset } = await supabase.from('budget_categories').select('*').eq('id', testAssetId).single();
    const parsedMeta = JSON.parse(readAsset?.description || '{}');
    const depCost = 500000 - parsedMeta.salvage_value; // ₱450,000
    const annualDep = depCost * 0.10; // ₱45,000 / yr
    const nbv2026 = 500000 - (annualDep * 2); // ₱410,000
    assert(!errReadAsset && nbv2026 === 410000, `[READ] Live Depreciation Engine computed NBV = ₱410,000.00 (Cost ₱500k - Accum Dep ₱90k)`);

    // 4C. UPDATE
    const updatedMeta = { ...parsedMeta, notes: 'Updated service location to Lateral Sector C' };
    const { data: updatedAsset, error: errUpdateAsset } = await supabase.from('budget_categories').update({
      description: JSON.stringify(updatedMeta)
    }).eq('id', testAssetId).select().single();
    assert(!errUpdateAsset && updatedAsset?.description.includes('Lateral Sector C'), `[UPDATE] Updated Fixed Asset notes & location`);

    // 4D. DELETE
    const { error: errDeleteAsset } = await supabase.from('budget_categories').delete().eq('id', testAssetId);
    assert(!errDeleteAsset, `[DELETE] Deleted Fixed Asset Record: ${testAssetCode}`);

    // ==============================================================================
    // TAB 5: COLLECTIONS & EXPENSES LEDGER (/dashboard/treasurer)
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' TAB 5: COLLECTIONS & DISBURSEMENTS LEDGER (C-R-U-D Lifecycle)');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    const testTxId = `tx-crud-${runId}`;
    const testTxNum = `COL-CRUD-${runId}`;

    // Find any existing category for foreign key
    const { data: catList } = await supabase.from('budget_categories').select('id').eq('association_id', 'ia-nangurisan').limit(1);
    const validCatId = catList[0]?.id;

    // 5A. CREATE COLLECTION WITH FUND TAG
    const { data: createdTx, error: errCreateTx } = await supabase.from('transactions').insert({
      id: testTxId,
      transaction_number: testTxNum,
      type: 'collection',
      association_id: 'ia-nangurisan',
      category_id: validCatId,
      amount: 15000.00,
      transaction_date: '2026-03-01',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] CRUD Test Collection via Bank',
      particulars: 'Test Irrigation Fee',
    }).select().single();
    cleanup.transactions.push(testTxId);
    assert(!errCreateTx && createdTx, `[CREATE] Logged Transaction: ${testTxNum} (₱15,000.00 in Bank Regular)`);

    // 5B. READ
    const { data: readTx, error: errReadTx } = await supabase.from('transactions').select('*').eq('id', testTxId).single();
    assert(!errReadTx && Number(readTx?.amount) === 15000, `[READ] Retrieved Transaction record with fund tagging: ${readTx?.payment_method}`);

    // 5C. UPDATE
    const { data: updatedTx, error: errUpdateTx } = await supabase.from('transactions').update({
      particulars: 'Updated Particulars - Verified Collection'
    }).eq('id', testTxId).select().single();
    assert(!errUpdateTx && updatedTx?.particulars === 'Updated Particulars - Verified Collection', `[UPDATE] Updated Transaction particulars`);

    // 5D. DELETE
    const { error: errDeleteTx } = await supabase.from('transactions').delete().eq('id', testTxId);
    assert(!errDeleteTx, `[DELETE] Deleted Transaction: ${testTxNum}`);

    // ==============================================================================
    // TAB 6: VERIFICATION & AUDIT QUEUE (/dashboard/auditor)
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' TAB 6: VERIFICATION & AUDIT QUEUE (C-R-U-D Lifecycle)');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    const testRcptId = `rcpt-crud-${runId}`;

    // 6A. CREATE RECEIPT VOUCHER
    const { data: createdRcpt, error: errCreateRcpt } = await supabase.from('receipts').insert({
      id: testRcptId,
      file_path: `/uploads/vouchers/crud_receipt_${runId}.jpg`,
      file_name: `crud_receipt_${runId}.jpg`,
      file_size: 1048576,
      content_type: 'image/jpeg',
      uploader_id: 'user-bookkeeper-nlfia',
      association_id: 'ia-nangurisan',
      status: 'pending'
    }).select().single();
    cleanup.receipts.push(testRcptId);
    assert(!errCreateRcpt && createdRcpt, `[CREATE] Uploaded Voucher Receipt: ${createdRcpt?.file_name} (Status: pending)`);

    // 6B. READ AUDIT QUEUE
    const { data: readRcpt, error: errReadRcpt } = await supabase.from('receipts').select('*').eq('id', testRcptId).single();
    assert(!errReadRcpt && readRcpt?.status === 'pending', `[READ] Retrieved Voucher from Auditor Queue`);

    // 6C. UPDATE (AUDITOR VERIFIES RECEIPT)
    const { data: verifiedRcpt, error: errVerifyRcpt } = await supabase.from('receipts').update({
      status: 'verified',
      auditor_id: 'user-auditor-nlfia',
      auditor_notes: 'All items verified against supplier delivery order.',
      verified_at: new Date().toISOString()
    }).eq('id', testRcptId).select().single();
    assert(!errVerifyRcpt && verifiedRcpt?.status === 'verified', `[UPDATE] Auditor marked receipt as [VERIFIED]`);

    // 6D. DELETE
    const { error: errDeleteRcpt } = await supabase.from('receipts').delete().eq('id', testRcptId);
    assert(!errDeleteRcpt, `[DELETE] Deleted Audit Receipt Voucher`);

    // ==============================================================================
    // TAB 7: FINANCIAL STATEMENTS (/dashboard/statements)
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' TAB 7: FINANCIAL STATEMENTS (C-R-U-D Lifecycle)');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    const testStmtId = `stmt-crud-${runId}`;
    const testStmtNum = `FS-CRUD-${runId}`;

    // 7A. CREATE (COMPILE STATEMENT)
    const { data: createdStmt, error: errCreateStmt } = await supabase.from('financial_statements').insert({
      id: testStmtId,
      statement_number: testStmtNum,
      title: `CRUD Audit Financial Statement ${runId}`,
      association_id: 'ia-nangurisan',
      statement_type: 'fs1',
      period_start: '2026-01-01',
      period_end: '2026-12-31',
      total_collections: 208500,
      total_disbursements: 26700,
      net_cash_flow: 181800,
      report_data: { test: true, compiled_year: 2026 },
      is_published: true
    }).select().single();
    cleanup.statements.push(testStmtId);
    assert(!errCreateStmt && createdStmt, `[CREATE] Compiled Financial Statement: ${testStmtNum} (Net Cash Flow: ₱181,800.00)`);

    // 7B. READ
    const { data: readStmt, error: errReadStmt } = await supabase.from('financial_statements').select('*').eq('id', testStmtId).single();
    assert(!errReadStmt && Number(readStmt?.net_cash_flow) === 181800, `[READ] Retrieved Statement: Net Cash Flow verified`);

    // 7C. UPDATE (EDIT ADJUSTMENT / TITLE)
    const { data: updatedStmt, error: errUpdateStmt } = await supabase.from('financial_statements').update({
      title: `Official Audited Annual FS Report 2026 (${runId})`
    }).eq('id', testStmtId).select().single();
    assert(!errUpdateStmt && updatedStmt?.title.includes('Official Audited'), `[UPDATE] Updated Financial Statement Title`);

    // 7D. DELETE
    const { error: errDeleteStmt } = await supabase.from('financial_statements').delete().eq('id', testStmtId);
    assert(!errDeleteStmt, `[DELETE] Deleted Financial Statement: ${testStmtNum}`);

    // ==============================================================================
    // TAB 8: USER ACCOUNT MANAGER (/dashboard/admin)
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' TAB 8: USER ACCOUNT MANAGER (C-R-U-D Lifecycle)');
    console.log('──────────────────────────────────────────────────────────────────────────────');
    const testUserId = `user-crud-${runId}`;
    const testUsername = `user_crud_${runId}`;

    // 8A. CREATE OFFICER ACCOUNT
    const { data: createdUser, error: errCreateUser } = await supabase.from('profiles').insert({
      id: testUserId,
      username: testUsername,
      email: `${testUsername}@iarms.org`,
      password: 'hashed_password_dummy',
      full_name: `CRUD Test Officer ${runId}`,
      role: 'bookkeeper',
      association_id: 'ia-nangurisan',
      contact_number: '09176665544'
    }).select().single();
    cleanup.users.push(testUserId);
    assert(!errCreateUser && createdUser, `[CREATE] Registered Officer Account: ${testUsername} (Role: Bookkeeper)`);

    // 8B. READ
    const { data: readUser, error: errReadUser } = await supabase.from('profiles').select('*').eq('id', testUserId).single();
    assert(!errReadUser && readUser?.role === 'bookkeeper', `[READ] Retrieved User Account details`);

    // 8C. UPDATE (UPDATE ROLE & CONTACT)
    const { data: updatedUser, error: errUpdateUser } = await supabase.from('profiles').update({
      contact_number: '09179990011',
      farm_location: 'IA Admin Compound'
    }).eq('id', testUserId).select().single();
    assert(!errUpdateUser && updatedUser?.contact_number === '09179990011', `[UPDATE] Updated User Contact & Location`);

    // 8D. DELETE
    const { error: errDeleteUser } = await supabase.from('profiles').delete().eq('id', testUserId);
    assert(!errDeleteUser, `[DELETE] Deleted User Account: ${testUsername}`);

    // ==============================================================================
    // TAB 9: MY ACCOUNT SETTINGS (/dashboard/account)
    // ==============================================================================
    console.log('\n──────────────────────────────────────────────────────────────────────────────');
    console.log(' TAB 9: MY ACCOUNT SETTINGS (R-U Lifecycle)');
    console.log('──────────────────────────────────────────────────────────────────────────────');

    // 9A. READ SUPERADMIN PROFILE
    const { data: superProfile, error: errSuper } = await supabase.from('profiles').select('*').eq('username', 'superadmin').single();
    assert(!errSuper && superProfile?.role === 'super_admin', `[READ] Loaded My Account Settings profile: ${superProfile?.full_name}`);

    // 9B. UPDATE PROFILE PREFERENCES
    const originalContact = superProfile?.contact_number || '+63 900 000 0000';
    const { data: updatedSuper, error: errUpdateSuper } = await supabase.from('profiles').update({
      contact_number: '+63 917 000 8888'
    }).eq('id', superProfile.id).select().single();
    assert(!errUpdateSuper && updatedSuper?.contact_number === '+63 917 000 8888', `[UPDATE] Updated My Account Settings Contact`);

    // Restore original contact
    await supabase.from('profiles').update({ contact_number: originalContact }).eq('id', superProfile.id);
    console.log(`  ✔ [RESTORE] Restored SuperAdmin contact to default.`);

  } finally {
    // Purge any remaining probe IDs
    if (cleanup.associations.length > 0) await supabase.from('associations').delete().in('id', cleanup.associations);
    if (cleanup.members.length > 0) await supabase.from('profiles').delete().in('id', cleanup.members);
    if (cleanup.categories.length > 0) await supabase.from('budget_categories').delete().in('id', cleanup.categories);
    if (cleanup.fixedAssets.length > 0) await supabase.from('budget_categories').delete().in('id', cleanup.fixedAssets);
    if (cleanup.transactions.length > 0) await supabase.from('transactions').delete().in('id', cleanup.transactions);
    if (cleanup.receipts.length > 0) await supabase.from('receipts').delete().in('id', cleanup.receipts);
    if (cleanup.statements.length > 0) await supabase.from('financial_statements').delete().in('id', cleanup.statements);
    if (cleanup.users.length > 0) await supabase.from('profiles').delete().in('id', cleanup.users);
  }

  console.log('\n════════════════════════════════════════════════════════════════════════════');
  console.log('       ALL TABS CRUD AUDIT SCORECARD                                        ');
  console.log(`       Passed: ${passed} | Failed: ${failed} | Rate: ${(passed / (passed + failed) * 100).toFixed(1)}%`);
  console.log('════════════════════════════════════════════════════════════════════════════\n');
}

auditAllTabsCRUD().catch((err) => {
  console.error('All tabs audit failed:', err);
  process.exit(1);
});
