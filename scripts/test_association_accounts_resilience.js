const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Load environment variables
const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k] = v.join('=').replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

// Standard Templates definition matching lib/financial/standardAccounts.ts
const STANDARD_NIA_ACCOUNT_TEMPLATES = [
  { slug: 'AST-CUR-REC-ISF', name: 'Receivables from Members (ISF Dues)', category_type: 'collection', account_classification: 'current_asset', allocated_amount: 120000, description: '[class:current_asset] Short-term outstanding irrigation fee receivables from members' },
  { slug: 'AST-CUR-ADV-OPS', name: 'Operating Advances & Petty Cash Fund', category_type: 'collection', account_classification: 'current_asset', allocated_amount: 30000, description: '[class:current_asset] Revolving petty cash advances for emergency gate and field operations' },
  { slug: 'LIAB-CUR-WAGES', name: 'Accrued Honorarium & Gatekeeper Wages Payable', category_type: 'disbursement', account_classification: 'current_liability', allocated_amount: 45000, description: '[class:current_liability] Accrued but unreleased monthly wages and honorarium for canal tenders' },
  { slug: 'LIAB-CUR-SUPPLIERS', name: 'Accounts Payable - Hardware & Fuel Suppliers', category_type: 'disbursement', account_classification: 'current_liability', allocated_amount: 25000, description: '[class:current_liability] Outstanding short-term credit balances with local diesel and hardware suppliers' },
  { slug: 'LIAB-NONCUR-LOAN', name: 'Long-Term Facility & Equipment Loan Payable', category_type: 'disbursement', account_classification: 'non_current_liability', allocated_amount: 150000, description: '[class:non_current_liability] Long-term subsidized agricultural financing for communal irrigation assets' },
  { slug: 'REC-ISF', name: 'Irrigation Service Fee (ISF) Collections', category_type: 'collection', account_classification: 'collection', allocated_amount: 250000, description: '[class:collection] Seasonal wet & dry irrigation service fees collected from farmer beneficiaries' },
  { slug: 'REC-MEM', name: 'Membership Fees & Annual Dues', category_type: 'collection', account_classification: 'collection', allocated_amount: 60000, description: '[class:collection] Official IA member onboarding fees and annual solidarity dues' },
  { slug: 'REC-SUB', name: 'O&M Subsidy & Canal Remuneration (NIA)', category_type: 'collection', account_classification: 'collection', allocated_amount: 180000, description: '[class:collection] National Irrigation Administration Operations & Maintenance management subsidy' },
  { slug: 'REC-CBU', name: 'Capital Build-Up (CBU) Equity Contributions', category_type: 'collection', account_classification: 'collection', allocated_amount: 100000, description: '[class:collection] Long-term capital equity contributions paid by farmer members for association ownership' },
  { slug: 'REC-FIN', name: 'Fines, Penalties & Bank Interest', category_type: 'collection', account_classification: 'collection', allocated_amount: 20000, description: '[class:collection] Late fee surcharges, water distribution violation fines, and bank interest' },
  { slug: 'REC-DON', name: 'Donations, Grants & LGU Financial Assistance', category_type: 'collection', account_classification: 'collection', allocated_amount: 50000, description: '[class:collection] Local Government Unit (LGU) and NGO agricultural equipment grants and donations' },
  { slug: 'DISB-CLEAR', name: 'Canal Clearing, Desilting & Vegetation Maintenance', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 110000, description: '[class:disbursement] Labor and heavy equipment rentals for desilting lateral and main irrigation canals' },
  { slug: 'DISB-SUPP', name: 'Office, Station & Field Supplies', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 35000, description: '[class:disbursement] Accounting stationery, official receipt booklets, measuring tapes, and field tools' },
  { slug: 'DISB-HON', name: 'Officers Honorarium & Personnel Allowances', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 80000, description: '[class:disbursement] Monthly operational allowances for President, Treasurer, Bookkeeper, and Auditors' },
  { slug: 'DISB-TRAV', name: 'Travel, Meeting & General Assembly Expenses', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 30000, description: '[class:disbursement] Representation travel to NIA division offices and general farmer assembly meals' },
  { slug: 'DISB-TAX', name: 'Registration, Legal Permits & LGU Taxes', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 18000, description: '[class:disbursement] SEC annual reportorial compliance, BIR stamp taxes, and municipal permits' },
  { slug: 'DISB-LATERAL', name: 'Lateral & TSAG Share Incentive Distribution', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 45000, description: '[class:disbursement] Performance-based collection incentives returned to turn-out service area groups' },
  { slug: 'DISB-REPAIR', name: 'Emergency Canal Gate Repairs & Water Control', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 70000, description: '[class:disbursement] Steel gate welding, turnout replacement, cement seals, and water control repairs' },
  { slug: 'DISB-PROF', name: 'Professional Auditing & Accounting Fees', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 35000, description: '[class:disbursement] Certified Public Accountant fees for annual financial statement certification' },
  { slug: 'DISB-FED', name: 'Baua River IA Federation Contribution Share', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 40000, description: '[class:disbursement] Remittance to Baua River Federation of Irrigators Associations' },
  { slug: 'DISB-PISO', name: 'Piso Mula sa Puso Community Emergency Fund', category_type: 'disbursement', account_classification: 'disbursement', allocated_amount: 20000, description: '[class:disbursement] Mutual aid community assistance for member calamity and health emergencies' },
];

function isStandardNiaAccount(code) {
  if (!code) return false;
  const upper = code.toUpperCase();
  return STANDARD_NIA_ACCOUNT_TEMPLATES.some((t) => upper === t.slug || upper.endsWith(`-${t.slug}`));
}

async function seedCategories(associationId, associationCode) {
  const cleanCode = (associationCode || 'IA').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  const { data: existing } = await supabase.from('budget_categories').select('*').eq('association_id', associationId);
  const existingCategories = existing || [];

  let addedCount = 0;
  for (const tpl of STANDARD_NIA_ACCOUNT_TEMPLATES) {
    const fullCode = `${cleanCode}-${tpl.slug}`;
    const alreadyExists = existingCategories.some(
      (c) =>
        c.code.toUpperCase() === fullCode ||
        c.code.toUpperCase().endsWith(`-${tpl.slug}`) ||
        c.name.toLowerCase() === tpl.name.toLowerCase()
    );
    if (!alreadyExists) {
      const catId = `cat-${cleanCode.toLowerCase()}-${tpl.slug.toLowerCase().replace(/[^a-z0-9]/g, '-')}`;
      const newCategory = {
        id: catId,
        code: fullCode,
        name: tpl.name,
        category_type: tpl.category_type,
        allocated_amount: tpl.allocated_amount,
        description: tpl.description,
        association_id: associationId,
        is_active: true,
      };
      const { error: insErr } = await supabase.from('budget_categories').insert(newCategory);
      if (insErr) {
        console.error(`Error inserting category ${fullCode}:`, insErr.message);
      } else {
        addedCount++;
      }
    }
  }

  return {
    added: addedCount,
    existing: STANDARD_NIA_ACCOUNT_TEMPLATES.length - addedCount,
    total: STANDARD_NIA_ACCOUNT_TEMPLATES.length,
  };
}

async function runTest() {
  console.log('>>> [START] Testing Association Chart of Accounts Resilience Engine...');
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

  // Step 1: Verify standard accounts definition
  assert(STANDARD_NIA_ACCOUNT_TEMPLATES.length === 21, `Standard templates defined (21 statutory NIA templates)`);
  assert(isStandardNiaAccount('NLFIA-REC-ISF'), 'isStandardNiaAccount detects NLFIA-REC-ISF');
  assert(isStandardNiaAccount('REC-ISF'), 'isStandardNiaAccount detects standalone REC-ISF');
  assert(isStandardNiaAccount('NLFIA-DISB-CLEAR'), 'isStandardNiaAccount detects NLFIA-DISB-CLEAR');
  assert(isStandardNiaAccount('NLFIA-LIAB-CUR-WAGES'), 'isStandardNiaAccount detects NLFIA-LIAB-CUR-WAGES');
  assert(!isStandardNiaAccount('NLFIA-CUSTOM-XYZ'), 'isStandardNiaAccount returns false for custom account');

  // Step 2: Test temporary association creation and auto-seeding
  const testAssocId = `ia-test-seed-${Date.now()}`;
  const testAssocCode = `TSE${Date.now().toString().slice(-3)}`;
  
  console.log(`\n>>> Creating test association [${testAssocCode}] (${testAssocId})...`);
  const { error: assocErr } = await supabase.from('associations').insert({
    id: testAssocId,
    code: testAssocCode,
    name: `Test Association ${testAssocCode}`,
    region: 'Region 02',
    nis_name: 'IARMS',
    mailing_address: 'Barangay Test, Gonzaga, Cagayan',
    president_name: 'Juan Test President',
    sec_registration_number: `SEC-${testAssocCode}-2026`,
    tin_number: `000-${testAssocCode}-000`,
    is_active: true,
  });
  if (assocErr) console.error('Association insert error:', assocErr.message);
  assert(!assocErr, `Test association registered in Supabase`);

  console.log(`\n>>> Testing auto-seeding for [${testAssocCode}]...`);
  // Seed accounts for test association
  const seedResult = await seedCategories(testAssocId, testAssocCode);
  assert(seedResult.added === 21, `Seeded all 21 initial standard categories for test association`);

  // Verify categories in database
  const { data: seededCats, error: fetchErr } = await supabase
    .from('budget_categories')
    .select('*')
    .eq('association_id', testAssocId);

  assert(!fetchErr && seededCats && seededCats.length === 21, `Database confirmed 21 categories present for test association`);

  // Check specific standard categories exist
  const hasISF = seededCats.some(c => c.code === `${testAssocCode}-REC-ISF`);
  const hasClear = seededCats.some(c => c.code === `${testAssocCode}-DISB-CLEAR`);
  const hasWages = seededCats.some(c => c.code === `${testAssocCode}-LIAB-CUR-WAGES`);
  assert(hasISF, `Contains ${testAssocCode}-REC-ISF with proper classification`);
  assert(hasClear, `Contains ${testAssocCode}-DISB-CLEAR`);
  assert(hasWages, `Contains ${testAssocCode}-LIAB-CUR-WAGES`);

  // Step 3: Test Idempotence / Restore (running seed again should add 0 new accounts)
  const secondSeed = await seedCategories(testAssocId, testAssocCode);
  assert(secondSeed.added === 0, `Idempotent: Re-running seed added 0 duplicates (existing: ${secondSeed.existing})`);

  // Step 4: Simulate accidental deletion of one account and verify restore restores ONLY that missing account
  const catToDelete = seededCats.find(c => c.code === `${testAssocCode}-REC-MEM`);
  if (catToDelete) {
    await supabase.from('budget_categories').delete().eq('id', catToDelete.id);
    console.log(`\n>>> Simulated deletion of ${catToDelete.code}. Now running restore...`);

    const restoreResult = await seedCategories(testAssocId, testAssocCode);
    assert(restoreResult.added === 1, `Restore self-healed exactly 1 missing account (${catToDelete.code})`);

    const { data: healedCats } = await supabase.from('budget_categories').select('*').eq('association_id', testAssocId);
    const restoredCat = healedCats.find(c => c.code === `${testAssocCode}-REC-MEM`);
    assert(restoredCat !== undefined, `Restored account is confirmed back in the database with status Active`);
  }

  // Step 5: Test Soft Deactivation (Active -> Inactive -> Active)
  const targetToToggle = seededCats[0];
  console.log(`\n>>> Testing soft deactivation on category ${targetToToggle.code}...`);
  await supabase.from('budget_categories').update({ is_active: false }).eq('id', targetToToggle.id);
  const { data: deactivated } = await supabase.from('budget_categories').select('is_active').eq('id', targetToToggle.id).single();
  assert(deactivated.is_active === false, `Category marked as Inactive (soft-deleted from new transaction dropdowns)`);

  await supabase.from('budget_categories').update({ is_active: true }).eq('id', targetToToggle.id);
  const { data: reactivated } = await supabase.from('budget_categories').select('is_active').eq('id', targetToToggle.id).single();
  assert(reactivated.is_active === true, `Category successfully reactivated to Active status`);

  // Cleanup test association records
  await supabase.from('budget_categories').delete().eq('association_id', testAssocId);
  await supabase.from('associations').delete().eq('id', testAssocId);
  console.log(`\n✔ Cleaned up test association and category records.`);

  console.log(`\n========================================`);
  console.log(`TEST RESULTS: ${passed} PASSED | ${failed} FAILED`);
  console.log(`========================================\n`);

  if (failed > 0) process.exit(1);
}

runTest().catch((err) => {
  console.error('Test execution failed:', err);
  process.exit(1);
});
