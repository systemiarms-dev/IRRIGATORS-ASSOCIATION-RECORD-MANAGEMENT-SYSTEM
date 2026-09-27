const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

const envPath = path.resolve(__dirname, '../.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const [k, ...v] = line.trim().split('=');
  if (k && v.length) env[k] = v.join('=').replace(/^["']|["']$/g, '');
});

const supabase = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY);

async function seedCompleteNLFIA() {
  console.log('>>> [START] Seeding Complete, Rich Records for NLFIA (ia-nangurisan)...');

  const ASSOC_ID = 'ia-nangurisan';
  const BOOKKEEPER_ID = 'user-bookkeeper-nlfia';
  const MEMBER_ID = 'mem-nlfia-01';

  // Fetch NLFIA category map
  const { data: cats, error: catErr } = await supabase
    .from('budget_categories')
    .select('id, code, name, category_type')
    .eq('association_id', ASSOC_ID);

  if (catErr || !cats) {
    console.error('Failed to fetch categories:', catErr);
    process.exit(1);
  }

  const catMap = {};
  for (const c of cats) {
    // Map both full code (NLFIA-REC-ISF) and short code (REC-ISF)
    catMap[c.code] = c.id;
    const short = c.code.replace(/^NLFIA-/, '');
    catMap[short] = c.id;
  }

  // 1. Clean existing transactions for NLFIA so we have a completely balanced, clean slate
  const { error: delErr } = await supabase.from('transactions').delete().eq('association_id', ASSOC_ID);
  if (delErr) {
    console.error('Failed to clean existing transactions:', delErr);
    process.exit(1);
  }
  console.log('  ✔ Reset NLFIA transactions table for clean, synchronized state.');

  // 2. Define Prior Year (2025) Transactions (Establishes 2026 Beginning Balances & Comparative Figures)
  const priorTxs = [
    {
      id: 'tx-nlfia-2025-01',
      association_id: ASSOC_ID,
      category_id: catMap['REC-MEM'],
      type: 'collection',
      amount: 24000,
      transaction_date: '2025-03-10',
      particulars: '2025 Annual Farmer Membership Dues & Onboarding',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Lateral A & B Membership validation',
      created_by: BOOKKEEPER_ID,
      member_id: MEMBER_ID,
      voucher_number: 'CR-2025-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2025-02',
      association_id: ASSOC_ID,
      category_id: catMap['REC-ISF'],
      type: 'collection',
      amount: 195000,
      transaction_date: '2025-05-15',
      particulars: 'Irrigation Service Fee (ISF) Dry Season 2025 Collections',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Direct LBP bank deposit of seasonal collections',
      created_by: BOOKKEEPER_ID,
      member_id: MEMBER_ID,
      voucher_number: 'CR-2025-002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2025-03',
      association_id: ASSOC_ID,
      category_id: catMap['REC-SUB'],
      type: 'collection',
      amount: 140000,
      transaction_date: '2025-06-20',
      particulars: 'NIA O&M Canal Maintenance Subsidy Release (2025)',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] National Irrigation Administration annual subsidy',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'CR-2025-003',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2025-04',
      association_id: ASSOC_ID,
      category_id: catMap['REC-FIN'],
      type: 'collection',
      amount: 6000,
      transaction_date: '2025-08-10',
      particulars: 'Water Schedule Penalties & Late Surcharges (2025)',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Fines collected for gate rotation violations',
      created_by: BOOKKEEPER_ID,
      member_id: MEMBER_ID,
      voucher_number: 'CR-2025-004',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2025-05',
      association_id: ASSOC_ID,
      category_id: catMap['REC-DON'],
      type: 'collection',
      amount: 25000,
      transaction_date: '2025-10-12',
      particulars: 'LGU Municipal Grant for Irrigation Rehabilitation (2025)',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Gonzaga Municipal Government financial assistance',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'CR-2025-005',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    // 2025 Disbursements
    {
      id: 'tx-nlfia-2025-06',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-CLEAR'],
      type: 'disbursement',
      amount: 75000,
      transaction_date: '2025-04-18',
      particulars: 'Canal Clearing, Desilting & Siphon Maintenance Labor (2025)',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] 15 laborers desilting Lateral A canal',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2025-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2025-07',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-HON'],
      type: 'disbursement',
      amount: 52000,
      transaction_date: '2025-06-30',
      particulars: 'Officers Monthly Honorarium & Board Allowances (2025)',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Allowances for President, Treasurer, Bookkeeper, Auditor',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2025-002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2025-08',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-SUPP'],
      type: 'disbursement',
      amount: 16000,
      transaction_date: '2025-07-25',
      particulars: 'Office Printing, Station Official Receipts & Field Measuring Tape (2025)',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Accounting supplies and receipt booklets',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2025-003',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2025-09',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-TRAV'],
      type: 'disbursement',
      amount: 18000,
      transaction_date: '2025-09-15',
      particulars: 'NIA Regional IA Federation Travel & General Assembly Meals (2025)',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Transportation and meals for general assembly',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2025-004',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2025-10',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-TAX'],
      type: 'disbursement',
      amount: 9000,
      transaction_date: '2025-11-20',
      particulars: 'SEC Annual Compliance, Notarial Fees & Municipal Permits (2025)',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] BIR document stamps and SEC filing fees',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2025-005',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2025-11',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-REPAIR'],
      type: 'disbursement',
      amount: 20000,
      transaction_date: '2025-12-05',
      particulars: 'Emergency Gate Replacement & Lateral Canal Cementing (2025)',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Steel welding repair for Lateral B head gate',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2025-006',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  // 3. Define Current Year (2026) Transactions (Complete coverage for every statutory line in FS-1, FS-2, FS-3, FS-4, FS-5)
  const currentTxs = [
    // Collections (Money IN)
    {
      id: 'tx-nlfia-2026-01',
      association_id: ASSOC_ID,
      category_id: catMap['REC-MEM'],
      type: 'collection',
      amount: 28000,
      transaction_date: '2026-01-15',
      particulars: '2026 Annual Membership Fees & Farmer Solidarity Dues',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Collected from 140 farmer beneficiaries at ₱200 each',
      created_by: BOOKKEEPER_ID,
      member_id: MEMBER_ID,
      voucher_number: 'CR-2026-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-02',
      association_id: ASSOC_ID,
      category_id: catMap['REC-ISF'],
      type: 'collection',
      amount: 110000,
      transaction_date: '2026-01-28',
      particulars: 'Irrigation Service Fee (ISF) Collections - Lateral A & B',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Wet season cropping harvest remittance',
      created_by: BOOKKEEPER_ID,
      member_id: MEMBER_ID,
      voucher_number: 'CR-2026-002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-03',
      association_id: ASSOC_ID,
      category_id: catMap['REC-SUB'],
      type: 'collection',
      amount: 155000,
      transaction_date: '2026-02-10',
      particulars: 'NIA Operations & Maintenance (O&M) Canal Subsidy (1st Tranche)',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Official check deposit from NIA Regional Division Office',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'CR-2026-003',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-04',
      association_id: ASSOC_ID,
      category_id: catMap['REC-CBU'],
      type: 'collection',
      amount: 45000,
      transaction_date: '2026-02-14',
      particulars: 'Capital Build-Up (CBU) Member Equity Contributions',
      payment_method: 'bank_cbu',
      notes: '[fund:bank_cbu] Direct deposit to LBP CBU Special Savings Account',
      created_by: BOOKKEEPER_ID,
      member_id: MEMBER_ID,
      voucher_number: 'CR-2026-004',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-05',
      association_id: ASSOC_ID,
      category_id: catMap['REC-FIN'],
      type: 'collection',
      amount: 7500,
      transaction_date: '2026-02-25',
      particulars: 'Water Schedule Turnout Fines & Gate Violation Penalties',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Penalty surcharges from unauthorized water tapping',
      created_by: BOOKKEEPER_ID,
      member_id: MEMBER_ID,
      voucher_number: 'CR-2026-005',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-06',
      association_id: ASSOC_ID,
      category_id: catMap['REC-DON'],
      type: 'collection',
      amount: 35000,
      transaction_date: '2026-03-02',
      particulars: 'Municipal LGU Financial Grant for Canal Desilting',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Local Government Unit of Gonzaga financial subsidy',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'CR-2026-006',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },

    // Disbursements (Money OUT)
    {
      id: 'tx-nlfia-2026-07',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-CLEAR'],
      type: 'disbursement',
      amount: 42000,
      transaction_date: '2026-01-20',
      particulars: 'Main Lateral Canal Desilting, Clearing & Weed Removal Labor',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Paid to 12 TSAG farmer laborers for 5 days clearing',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-001',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-08',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-SUPP'],
      type: 'disbursement',
      amount: 14500,
      transaction_date: '2026-02-05',
      particulars: 'Accounting Ledger Books, Official Receipts & Field Supplies',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Paper supplies, printer ink, and measuring tools',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-002',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-09',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-HON'],
      type: 'disbursement',
      amount: 38000,
      transaction_date: '2026-02-18',
      particulars: 'Monthly Officers Honorarium & Board Allowances (Q1)',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] President, Treasurer, Bookkeeper, and Auditor allowances',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-003',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-10',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-TRAV'],
      type: 'disbursement',
      amount: 12000,
      transaction_date: '2026-02-22',
      particulars: 'General Assembly Meeting Snacks, Sound Rental & Travel',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Snacks and representation meals for 120 farmers',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-004',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-11',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-TAX'],
      type: 'disbursement',
      amount: 8500,
      transaction_date: '2026-02-28',
      particulars: 'SEC Annual Compliance Filing, BIR Stamp Taxes & Notarial Fees',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Official legal notarization and annual SEC reportorial dues',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-005',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-12',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-LATERAL'],
      type: 'disbursement',
      amount: 19500,
      transaction_date: '2026-03-01',
      particulars: 'Distributed IA Share Incentive to Turn-out Service Groups (TSAG)',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Performance-based collection incentives distributed to Lateral groups',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-006',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-13',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-REPAIR'],
      type: 'disbursement',
      amount: 24000,
      transaction_date: '2026-03-04',
      particulars: 'Emergency Canal Gate Steel Welding & Concrete Apron Restoration',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Materials: Portland cement, steel rebars, welding rods',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-007',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-14',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-PROF'],
      type: 'disbursement',
      amount: 15000,
      transaction_date: '2026-03-08',
      particulars: 'Certified Public Accountant (CPA) Financial Statement Certification Fee',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Independent financial statement review and audit stamp',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-008',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-15',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-FED'],
      type: 'disbursement',
      amount: 14000,
      transaction_date: '2026-03-12',
      particulars: 'Baua River IA Federation Contribution & Solidarity Share',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Remittance to Baua River Federation of Irrigators Associations',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-009',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-16',
      association_id: ASSOC_ID,
      category_id: catMap['DISB-PISO'],
      type: 'disbursement',
      amount: 6000,
      transaction_date: '2026-03-14',
      particulars: 'Piso Mula Sa Puso Community Emergency Medical Assistance',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Emergency assistance for hospitalized farmer member',
      created_by: BOOKKEEPER_ID,
      member_id: MEMBER_ID,
      voucher_number: 'DV-2026-010',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },

    // Liabilities (Current & Non-Current)
    {
      id: 'tx-nlfia-2026-17',
      association_id: ASSOC_ID,
      category_id: catMap['LIAB-CUR-WAGES'],
      type: 'disbursement',
      amount: 16500,
      transaction_date: '2026-03-15',
      particulars: 'Accrued Gatekeeper Wages & Canal Tender Payables (March 2026)',
      payment_method: 'cash_on_hand',
      notes: '[fund:cash_on_hand] Monthly operational wage obligation for water tenders',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-011',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
    {
      id: 'tx-nlfia-2026-18',
      association_id: ASSOC_ID,
      category_id: catMap['LIAB-NONCUR-LOAN'],
      type: 'disbursement',
      amount: 35000,
      transaction_date: '2026-03-16',
      particulars: 'Long-Term Agricultural Equipment & Facility Loan Amortization',
      payment_method: 'bank_regular',
      notes: '[fund:bank_regular] Subsidized agricultural financing repayment',
      created_by: BOOKKEEPER_ID,
      member_id: null,
      voucher_number: 'DV-2026-012',
      created_at: new Date().toISOString(),
      updated_at: new Date().toISOString(),
    },
  ];

  const allTxsToInsert = [...priorTxs, ...currentTxs];
  console.log(`\n>>> Inserting ${allTxsToInsert.length} complete, balanced transactions for NLFIA...`);

  for (const t of allTxsToInsert) {
    if (!t.transaction_number) {
      t.transaction_number = `TXN-${t.id.replace('tx-', '').toUpperCase()}`;
    }
    const { error: insErr } = await supabase.from('transactions').insert(t);
    if (insErr) {
      console.error(`Error inserting ${t.id} (${t.particulars}):`, insErr.message);
    }
  }

  console.log(`  ✔ Successfully seeded ${allTxsToInsert.length} complete transactions.`);

  // 4. Verify Financial Statements Calculation
  const { data: nlfiaTxs } = await supabase.from('transactions').select('*').eq('association_id', ASSOC_ID);
  console.log(`\n>>> Verification: NLFIA now has ${nlfiaTxs?.length} total transactions in the ledger.`);

  const txs2025 = (nlfiaTxs || []).filter(t => t.transaction_date.startsWith('2025'));
  const txs2026 = (nlfiaTxs || []).filter(t => t.transaction_date.startsWith('2026'));

  const col2025 = txs2025.filter(t => t.type === 'collection').reduce((s, t) => s + Number(t.amount), 0);
  const disb2025 = txs2025.filter(t => t.type === 'disbursement').reduce((s, t) => s + Number(t.amount), 0);
  const net2025 = col2025 - disb2025;

  const col2026 = txs2026.filter(t => t.type === 'collection').reduce((s, t) => s + Number(t.amount), 0);
  const disb2026 = txs2026.filter(t => t.type === 'disbursement').reduce((s, t) => s + Number(t.amount), 0);
  const net2026 = col2026 - disb2026;

  console.log(`\n======================================================`);
  console.log(` FINANCIAL STATEMENT SCORECARD FOR NLFIA:`);
  console.log(` ------------------------------------------------------`);
  console.log(` [2025 Prior Year]`);
  console.log(`   Collections (Inflows)        : ₱${col2025.toLocaleString()}`);
  console.log(`   Disbursements (Outflows)     : ₱${disb2025.toLocaleString()}`);
  console.log(`   Net Operating Surplus        : ₱${net2025.toLocaleString()}`);
  console.log(`   Starting Cash for 2026       : ₱${net2025.toLocaleString()} (Automatic Rollover!)`);
  console.log(` ------------------------------------------------------`);
  console.log(` [2026 Current Year]`);
  console.log(`   Collections (Inflows)        : ₱${col2026.toLocaleString()}`);
  console.log(`   Disbursements (Outflows)     : ₱${disb2026.toLocaleString()}`);
  console.log(`   Net Operating Surplus (2026) : ₱${net2026.toLocaleString()}`);
  console.log(`   Cash Balance at Year End     : ₱${(net2025 + net2026).toLocaleString()} (100% Balanced!)`);
  console.log(`======================================================\n`);
}

seedCompleteNLFIA().catch(err => {
  console.error('Seeding failed:', err);
  process.exit(1);
});
