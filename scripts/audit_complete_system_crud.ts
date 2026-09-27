import fs from 'fs';
import path from 'path';
import { createClient } from '@supabase/supabase-js';

function parseEnv(filePath: string): Record<string, string> {
  const content = fs.readFileSync(filePath, 'utf8');
  const env: Record<string, string> = {};
  for (let line of content.split('\n')) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[line.slice(0, eqIdx).trim()] = val;
    }
  }
  return env;
}

const env = parseEnv(path.resolve(process.cwd(), '.env.local'));
process.env.NEXT_PUBLIC_SUPABASE_URL = env.NEXT_PUBLIC_SUPABASE_URL;
process.env.SUPABASE_SERVICE_ROLE_KEY = env.SUPABASE_SERVICE_ROLE_KEY;

interface TestResult {
  suite: string;
  test: string;
  passed: boolean;
  message?: string;
  error?: any;
}

const scorecard: TestResult[] = [];

function record(suite: string, test: string, passed: boolean, message?: string, error?: any) {
  scorecard.push({ suite, test, passed, message, error });
  const icon = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${icon} [${suite}] ${test}${message ? ` - ${message}` : ''}`);
  if (error && !passed) {
    console.error('    Error details:', error);
  }
}

async function runComprehensiveAudit() {
  console.log('================================================================');
  console.log('       IARMS END-TO-END COMPREHENSIVE CRUD & ROLES AUDIT        ');
  console.log('================================================================\n');

  const { localDb } = await import('../lib/db/supabaseDb');
  const { verifyPassword, hashPassword } = await import('../lib/auth/password');
  const { seedStandardCategoriesForAssociation } = await import('../lib/financial/standardAccounts');

  // -------------------------------------------------------------
  // SUITE 1: AUTHENTICATION & LOGIN AUDIT FOR ALL ROLES
  // -------------------------------------------------------------
  console.log('\n--- 1. AUTHENTICATION & LOGIN AUDIT ---');
  const rolesToAudit = ['super_admin', 'admin', 'bookkeeper', 'treasurer', 'auditor', 'member'];
  const users = await localDb.getUsers();
  console.log(`Total users in system: ${users.length}`);

  for (const role of rolesToAudit) {
    const userForRole = users.find((u) => u.role === role);
    if (!userForRole) {
      record('Auth', `Role check: ${role}`, false, `No test user currently found with role ${role}`);
      continue;
    }

    try {
      const authUser = await localDb.getUserAuthById(userForRole.id);
      if (!authUser || !authUser.password) {
        record('Auth', `Login verification: ${role} (${userForRole.username})`, false, 'User has no password hash');
        continue;
      }

      const { isHashedPassword } = await import('../lib/auth/password');
      const isHashed = isHashedPassword(authUser.password) || authUser.password.startsWith('member_no_login');
      record(
        'Auth',
        `Password format for ${role} (${authUser.username})`,
        isHashed,
        isHashed ? 'Hashed securely with scrypt' : 'Plaintext detected'
      );

      // Verify that lookup by username works
      const byUsername = await localDb.getUserByUsername(authUser.username);
      record(
        'Auth',
        `Lookup by username: ${authUser.username}`,
        !!byUsername && byUsername.id === authUser.id,
        `Resolved ID: ${byUsername?.id}`
      );
    } catch (err: any) {
      record('Auth', `Login check for ${role}`, false, err.message, err);
    }
  }

  // -------------------------------------------------------------
  // SUITE 2: ASSOCIATIONS CRUD & AUTO-SEEDING
  // -------------------------------------------------------------
  console.log('\n--- 2. ASSOCIATIONS CRUD & AUTO-SEEDING ---');
  const testAssocCode = `IA-AUDIT-${Math.floor(1000 + Math.random() * 9000)}`;
  const testAssocId = `ia-${testAssocCode.toLowerCase()}`;
  let createdAssocId: string | null = null;

  try {
    // 2.1 CREATE Association
    const newAssoc = await localDb.createAssociation({
      id: testAssocId,
      code: testAssocCode,
      name: `Audit Test IA ${testAssocCode}`,
      region: 'Region 02',
      nis_name: 'Baua River Irrigation System',
      mailing_address: 'Audit Barangay, Gonzaga, Cagayan',
      president_name: 'Audit President',
      contact_number: '09171234567',
      sec_registration_number: 'SEC-AUDIT-999',
      tin_number: '999-888-777-000',
      service_area_ha: 150.5,
      operational_area_ha: 140.0,
      beneficiaries_total: 80,
      beneficiaries_male: 45,
      beneficiaries_female: 35,
      tsag_count: 4,
      contract_type: 'Model 1',
      contract_effectivity_date: '2026-01-01',
      is_active: true,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });

    createdAssocId = newAssoc.id;
    record('Associations', 'CREATE Association', !!newAssoc.id, `Created ${newAssoc.name} (ID: ${newAssoc.id})`);

    // 2.2 AUTO-SEEDING of Standard NIA Accounts
    const seedResult = await seedStandardCategoriesForAssociation(newAssoc.id, newAssoc.code);
    record(
      'Associations',
      'AUTO-SEED 21 Standard NIA Accounts',
      seedResult.added === 21 && seedResult.total === 21,
      `Added: ${seedResult.added}, Total: ${seedResult.total}`
    );

    // 2.3 READ / Verify seeded accounts
    const seededCategories = await localDb.getBudgetCategories(newAssoc.id);
    record(
      'Associations',
      'READ Seeded Categories',
      seededCategories.length === 21,
      `Found ${seededCategories.length} categories for new association`
    );

    // Verify account classifications are properly populated
    const assetCats = seededCategories.filter(
      (c) => c.account_classification === 'current_asset' || c.account_classification === 'non_current_asset'
    );
    const liabCats = seededCategories.filter(
      (c) => c.account_classification === 'current_liability' || c.account_classification === 'non_current_liability'
    );
    record(
      'Associations',
      'VERIFY Seeded Classifications',
      assetCats.length >= 2 && liabCats.length >= 3,
      `Assets: ${assetCats.length}, Liabilities: ${liabCats.length}`
    );

    // 2.4 UPDATE Association
    const updatedAssoc = await localDb.updateAssociation(newAssoc.id, {
      president_name: 'Audit President Updated',
      service_area_ha: 155.0,
    });
    record(
      'Associations',
      'UPDATE Association',
      updatedAssoc?.president_name === 'Audit President Updated',
      `New president: ${updatedAssoc?.president_name}`
    );
  } catch (err: any) {
    record('Associations', 'CRUD Association Lifecycle', false, err.message, err);
  }

  // -------------------------------------------------------------
  // SUITE 3: CHART OF ACCOUNTS CRUD & ACTIONS
  // -------------------------------------------------------------
  console.log('\n--- 3. CHART OF ACCOUNTS CRUD & ACTIONS ---');
  const targetAssocId = createdAssocId || users[0]?.association_id || 'ia-audit';
  const customCatId = `cat-custom-${Date.now()}`;

  try {
    // 3.1 CREATE Custom Budget Category
    const createdCat = await localDb.createBudgetCategory({
      id: customCatId,
      code: 'TEST-CUSTOM-DISB',
      name: 'Test Emergency Canal Gate Grease',
      category_type: 'disbursement',
      account_classification: 'disbursement',
      allocated_amount: 15000,
      description: 'Grease and lubricant for canal gates',
      association_id: targetAssocId,
      is_active: true,
    });
    record('Chart of Accounts', 'CREATE Custom Category', !!createdCat.id, `Created ${createdCat.name} (${createdCat.code})`);

    // 3.2 READ Category
    const allCats = await localDb.getBudgetCategories(targetAssocId);
    const foundCat = allCats.find((c) => c.id === customCatId);
    record('Chart of Accounts', 'READ Category', !!foundCat, `Found custom category in list`);

    // 3.3 UPDATE Category
    const updatedCat = await localDb.updateBudgetCategory(customCatId, {
      name: 'Test Emergency Canal Gate Grease (Updated)',
      allocated_amount: 18000,
    });
    record(
      'Chart of Accounts',
      'UPDATE Category',
      updatedCat?.name.includes('(Updated)') && updatedCat.allocated_amount === 18000,
      `Updated name: ${updatedCat?.name}, amount: ${updatedCat?.allocated_amount}`
    );

    // 3.4 TOGGLE Active/Inactive
    const toggledCat = await localDb.updateBudgetCategory(customCatId, {
      is_active: false,
    });
    record('Chart of Accounts', 'TOGGLE Category Inactive', toggledCat?.is_active === false, 'Marked as Inactive');

    // 3.5 DELETE Custom Category
    const deletedCat = await localDb.deleteBudgetCategory(customCatId);
    record('Chart of Accounts', 'DELETE Custom Category', deletedCat === true, 'Successfully removed');

    // 3.6 FIXED ASSETS CRUD
    const createdAsset = await localDb.createFixedAsset({
      association_id: targetAssocId,
      name: 'Audit Test Water Pump 10HP',
      asset_type: 'heavy_machinery',
      date_acquired: '2025-03-01',
      acquisition_cost: 85000,
      depreciation_rate: 10,
      useful_life_years: 10,
      salvage_value: 8500,
      is_active: true,
      notes: 'Audit test asset',
    });
    record('Fixed Assets', 'CREATE Fixed Asset', !!createdAsset.id, `Asset ID: ${createdAsset.id}, Cost: ₱${createdAsset.acquisition_cost}`);

    // READ Fixed Assets with enrichment (depreciation & net book value)
    const fixedAssets = await localDb.getFixedAssets(targetAssocId);
    const foundAsset = fixedAssets.find((a) => a.id === createdAsset.id);
    record(
      'Fixed Assets',
      'READ & ENRICH Fixed Asset',
      !!foundAsset && foundAsset.net_book_value !== undefined,
      `Net book value computed: ₱${foundAsset?.net_book_value}`
    );

    // DELETE Fixed Asset
    const deletedAsset = await localDb.deleteFixedAsset(createdAsset.id);
    record('Fixed Assets', 'DELETE Fixed Asset', deletedAsset === true, 'Successfully cleaned up asset');
  } catch (err: any) {
    record('Chart of Accounts', 'Category / Asset Operations', false, err.message, err);
  }

  // -------------------------------------------------------------
  // SUITE 4: FARMER MEMBERS CRUD
  // -------------------------------------------------------------
  console.log('\n--- 4. FARMER MEMBERS CRUD ---');
  const testMemberId = `usr-mem-${Date.now()}`;
  try {
    // 4.1 CREATE Farmer Member
    const newMember = await localDb.createUser({
      id: testMemberId,
      username: `member_audit_${Date.now()}`,
      full_name: 'Juan Dela Cruz Audit',
      role: 'member',
      association_id: targetAssocId,
      farm_location: 'Lateral B, TSAG 2',
      farm_size_hectares: 2.75,
      contact_number: '09189876543',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    record('Farmer Members', 'CREATE Farmer Member', !!newMember.id, `Created ${newMember.full_name} (${newMember.username})`);

    // 4.2 READ Farmer Members
    const membersList = await localDb.getUsers(targetAssocId, 'member');
    const foundMember = membersList.find((m) => m.id === testMemberId);
    record('Farmer Members', 'READ Farmer Member', !!foundMember, `Found member in IA roster`);

    // 4.3 UPDATE Farmer Member
    const updatedMember = await localDb.updateUserProfileById(testMemberId, {
      farm_size_hectares: 3.5,
      farm_location: 'Lateral B, TSAG 3 (Relocated)',
    });
    record(
      'Farmer Members',
      'UPDATE Farmer Member',
      updatedMember?.farm_size_hectares === 3.5,
      `Updated farm size: ${updatedMember?.farm_size_hectares} ha`
    );

    // 4.4 DELETE Farmer Member
    const deletedMember = await localDb.deleteUser(testMemberId);
    record('Farmer Members', 'DELETE Farmer Member', deletedMember === true, 'Cleaned up test member');
  } catch (err: any) {
    record('Farmer Members', 'Farmer Members Lifecycle', false, err.message, err);
  }

  // -------------------------------------------------------------
  // SUITE 5: TRANSACTIONS & PAYMENT VOUCHERS CRUD
  // -------------------------------------------------------------
  console.log('\n--- 5. TRANSACTIONS & PAYMENT VOUCHERS CRUD ---');
  const testTxId = `tx-audit-${Date.now()}`;
  try {
    const cats = await localDb.getBudgetCategories(targetAssocId);
    const colCat = cats.find((c) => c.category_type === 'collection') || cats[0];
    const disbCat = cats.find((c) => c.category_type === 'disbursement') || cats[1];

    // 5.1 CREATE Collection Transaction
    const colTx = await localDb.createTransaction({
      id: testTxId,
      transaction_number: `COL-AUDIT-${Date.now()}`,
      voucher_number: null,
      type: 'collection',
      association_id: targetAssocId,
      member_id: null,
      category_id: colCat.id,
      receipt_id: null,
      amount: 25000,
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash_on_hand',
      reference_number: 'OR-AUDIT-001',
      payee_name: null,
      notes: '[fund:cash_on_hand] Audit test collection',
      created_by: users[0]?.id || 'usr-audit',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    record('Transactions', 'CREATE Collection Transaction', !!colTx.id, `Created ${colTx.transaction_number} - ₱${colTx.amount}`);

    // 5.2 CREATE Disbursement / Payment Voucher Transaction
    const disbTxId = `tx-disb-audit-${Date.now()}`;
    const disbTx = await localDb.createTransaction({
      id: disbTxId,
      transaction_number: `DISB-AUDIT-${Date.now()}`,
      voucher_number: 'PV-2026-999',
      type: 'disbursement',
      association_id: targetAssocId,
      member_id: null,
      category_id: disbCat.id,
      receipt_id: null,
      amount: 5000,
      transaction_date: new Date().toISOString().split('T')[0],
      payment_method: 'cash_on_hand',
      reference_number: 'CHK-999',
      payee_name: 'Audit Canal Maintenance Worker',
      notes: '[fund:cash_on_hand] Audit test payment voucher',
      created_by: users[0]?.id || 'usr-audit',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    record('Transactions', 'CREATE Disbursement (Payment Voucher)', !!disbTx.id, `Created ${disbTx.transaction_number} (Voucher: ${disbTx.voucher_number})`);

    // 5.3 READ Transactions
    const txList = await localDb.getTransactions(targetAssocId);
    const foundTx = txList.find((t) => t.id === testTxId);
    record('Transactions', 'READ Transactions', !!foundTx, `Retrieved ${txList.length} transactions for IA`);

    // 5.4 UPDATE Transaction
    const updatedTx = await localDb.updateTransaction(testTxId, {
      particulars: 'Updated particulars after audit check',
      amount: 26000,
    });
    record('Transactions', 'UPDATE Transaction', updatedTx?.amount === 26000, `Updated amount to ₱${updatedTx?.amount}`);

    // 5.5 DELETE Transactions
    await localDb.deleteTransaction(testTxId);
    await localDb.deleteTransaction(disbTxId);
    record('Transactions', 'DELETE Transactions', true, 'Cleaned up test transactions');
  } catch (err: any) {
    record('Transactions', 'Transactions Lifecycle', false, err.message, err);
  }

  // -------------------------------------------------------------
  // SUITE 6: RECEIPTS & AUDIT QUEUE
  // -------------------------------------------------------------
  console.log('\n--- 6. RECEIPTS & AUDIT QUEUE ---');
  const testRcptId = `rcpt-audit-${Date.now()}`;
  try {
    // 6.1 CREATE Receipt
    const newRcpt = await localDb.createReceipt({
      id: testRcptId,
      file_path: '/uploads/receipts/test.jpg',
      file_name: 'test_receipt.jpg',
      file_size: 10240,
      content_type: 'image/jpeg',
      uploader_id: users[0]?.id || 'usr-audit',
      association_id: targetAssocId,
      status: 'pending',
      auditor_id: null,
      auditor_notes: null,
      verified_at: null,
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    record('Receipts', 'CREATE Receipt', !!newRcpt.id, `Receipt ID: ${newRcpt.id}`);

    // 6.2 READ Receipts
    const rcptList = await localDb.getReceipts(targetAssocId);
    const foundRcpt = rcptList.find((r) => r.id === testRcptId);
    record('Receipts', 'READ Receipts', !!foundRcpt, `Found receipt in IA audit queue`);

    // 6.3 AUDITOR VERIFY
    const verifiedRcpt = await localDb.updateReceiptStatus(
      testRcptId,
      'verified',
      'Verified compliant with NIA requirements',
      users.find((u) => u.role === 'auditor')?.id || users[0]?.id
    );
    record('Receipts', 'AUDITOR VERIFY Status', verifiedRcpt?.status === 'verified', `Status: ${verifiedRcpt?.status}`);

    // 6.4 AUDITOR FLAG
    const flaggedRcpt = await localDb.updateReceiptStatus(testRcptId, 'flagged', 'Missing invoice signature');
    record('Receipts', 'AUDITOR FLAG Status', flaggedRcpt?.status === 'flagged', `Status: ${flaggedRcpt?.status}`);

    // 6.5 DELETE Receipt
    const deletedRcpt = await localDb.deleteReceipt(testRcptId);
    record('Receipts', 'DELETE Receipt', deletedRcpt === true, 'Successfully removed test receipt');
  } catch (err: any) {
    record('Receipts', 'Receipts Queue Lifecycle', false, err.message, err);
  }

  // -------------------------------------------------------------
  // SUITE 7: FINANCIAL STATEMENTS CRUD
  // -------------------------------------------------------------
  console.log('\n--- 7. FINANCIAL STATEMENTS CRUD ---');
  const testStmtId = `stmt-audit-${Date.now()}`;
  try {
    // 7.1 SAVE Statement
    const savedStmt = await localDb.saveFinancialStatement({
      id: testStmtId,
      statement_number: `FS-AUDIT-${Date.now()}`,
      title: 'Audit Financial Statement Q1 2026',
      association_id: targetAssocId,
      statement_type: 'fs1',
      period_start: '2026-01-01',
      period_end: '2026-03-31',
      total_collections: 150000,
      total_disbursements: 95000,
      net_cash_flow: 55000,
      report_data: { test: true, notes: 'Audit verification statement' } as any,
      is_published: false,
      generated_by: users[0]?.id || 'usr-audit',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    });
    record('Financial Statements', 'SAVE Statement', !!savedStmt.id, `Created ${savedStmt.statement_number}`);

    // 7.2 READ Statement
    const stmtsList = await localDb.getFinancialStatements(targetAssocId);
    const foundStmt = stmtsList.find((s) => s.id === testStmtId);
    record('Financial Statements', 'READ Statements', !!foundStmt, `Found statement in registry`);

    // 7.3 UPDATE Statement (Publish)
    const updatedStmt = await localDb.updateFinancialStatement(testStmtId, {
      is_published: true,
    });
    record('Financial Statements', 'UPDATE Statement', updatedStmt?.is_published === true, 'Published statement');

    // 7.4 DELETE Statement
    const deletedStmt = await localDb.deleteFinancialStatement(testStmtId);
    record('Financial Statements', 'DELETE Statement', deletedStmt === true, 'Cleaned up test statement');
  } catch (err: any) {
    record('Financial Statements', 'Statement Lifecycle', false, err.message, err);
  }

  // -------------------------------------------------------------
  // SUITE 8: CLEANUP TEST ASSOCIATION (IF CREATED)
  // -------------------------------------------------------------
  if (createdAssocId) {
    console.log('\n--- 8. TEARDOWN AUDIT ASSOCIATION ---');
    try {
      const delRes = await localDb.deleteAssociation(createdAssocId);
      record('Associations', 'DELETE Association (Cascade)', delRes === true, `Cleaned up test association ${createdAssocId}`);
    } catch (err: any) {
      record('Associations', 'DELETE Association', false, err.message, err);
    }
  }

  // -------------------------------------------------------------
  // FINAL SCORECARD
  // -------------------------------------------------------------
  console.log('\n================================================================');
  console.log('                    FINAL AUDIT SCORECARD                       ');
  console.log('================================================================');
  const passedCount = scorecard.filter((s) => s.passed).length;
  const failedCount = scorecard.filter((s) => !s.passed).length;
  const totalCount = scorecard.length;
  const passRate = ((passedCount / totalCount) * 100).toFixed(1);

  console.log(`Total Verification Checks : ${totalCount}`);
  console.log(`Checks Passed             : \x1b[32m${passedCount}\x1b[0m`);
  console.log(`Checks Failed             : ${failedCount > 0 ? `\x1b[31m${failedCount}\x1b[0m` : '0'}`);
  console.log(`Overall Pass Rate         : ${passRate}%`);
  console.log(`Result                    : ${passedCount}/${totalCount} Passed`);
  console.log('================================================================\n');

  if (failedCount > 0) {
    process.exit(1);
  }
}

runComprehensiveAudit().catch((err) => {
  console.error('Fatal crash during audit:', err);
  process.exit(1);
});
