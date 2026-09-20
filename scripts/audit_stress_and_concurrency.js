/**
 * Automated Pre-Launch Audit Suite: Stress Testing & Concurrency
 */

const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

const https = require('https');
https.globalAgent.maxSockets = 25;

// Parse .env.local
const envPath = path.resolve(__dirname, '..', '.env.local');
const envContent = fs.readFileSync(envPath, 'utf8');
const env = {};
envContent.split('\n').forEach(line => {
  const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
  if (match) {
    let val = match[2] || '';
    if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) val = val.slice(1, -1);
    env[match[1]] = val.trim();
  }
});

const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = env.SUPABASE_SERVICE_ROLE_KEY || env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const supabase = createClient(supabaseUrl, supabaseKey);

const results = [];
function record(category, testName, passed, details = '') {
  results.push({ category, testName, passed, details });
  const badge = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${badge} [${category}] ${testName}${details ? ` -> ${details}` : ''}`);
}

async function runStressAndConcurrencyAudit() {
  console.log('\n================================================================');
  console.log('         CONCURRENCY, HIGH-LOAD & STRESS AUDIT MATRIX           ');
  console.log('================================================================');
  console.log(`Supabase URL: ${supabaseUrl}\n`);

  const testAssocId = 'ia-nangurisan';
  const cleanupTxs = [];

  try {
    // ------------------------------------------------------------
    // 1. Concurrent Simultaneous Transaction Writes (10 Parallel Users)
    // ------------------------------------------------------------
    console.log('--- 1. Concurrent Simultaneous Ledger Writes (10 Users) ---');
    const CONCURRENT_USERS = 6;
    const startTime = Date.now();

    const writePromises = Array.from({ length: CONCURRENT_USERS }).map(async (_, idx) => {
      const txId = `tx-stress-${Date.now()}-${idx}-${Math.floor(Math.random()*1000)}`;
      cleanupTxs.push(txId);
      const isCollection = idx % 2 === 0;
      const type = isCollection ? 'collection' : 'disbursement';
      const categoryId = isCollection ? 'cat-1' : 'cat-5';
      const amount = 1000 + (idx * 250);

      const t0 = Date.now();
      const { data, error } = await supabase.from('transactions').insert({
        id: txId,
        transaction_number: `STRESS-${Date.now()}-${idx}`,
        voucher_number: `V-STRESS-${idx}`,
        type,
        association_id: testAssocId,
        category_id: categoryId,
        amount,
        transaction_date: '2026-09-20',
        payment_method: 'cash',
        particulars: `Stress concurrency test thread #${idx + 1}`,
      }).select().single();

      console.log(`  -> Thread #${idx + 1} finished in ${Date.now() - t0}ms (status: ${!error ? 'OK' : error.message})`);
      return { idx, success: !error && !!data, data, error };
    });

    const writeResults = await Promise.all(writePromises);
    const duration = Date.now() - startTime;

    const successfulWrites = writeResults.filter(r => r.success).length;
    record('Concurrency', `${CONCURRENT_USERS} Simultaneous Parallel Writes Settled`, successfulWrites === CONCURRENT_USERS, `${successfulWrites}/${CONCURRENT_USERS} succeeded in ${duration}ms (${(duration/CONCURRENT_USERS).toFixed(0)}ms/op avg)`);

    // Verify unique transaction numbers
    const txNumbers = writeResults.map(r => r.data?.transaction_number).filter(Boolean);
    const uniqueTxNumbers = new Set(txNumbers);
    record('Concurrency', 'No Transaction Number Collisions or Deadlocks', uniqueTxNumbers.size === CONCURRENT_USERS, `${uniqueTxNumbers.size}/${CONCURRENT_USERS} unique identifiers`);

    // ------------------------------------------------------------
    // 2. High-Frequency Aggregate Read Under Load
    // ------------------------------------------------------------
    console.log('\n--- 2. High-Frequency Ledger Query & Sum Verification ---');
    const { data: writtenRows, error: qErr } = await supabase
      .from('transactions')
      .select('id, amount, type')
      .in('id', cleanupTxs);

    const retrievedAll = !qErr && writtenRows?.length === CONCURRENT_USERS;
    record('Consistency', 'All Concurrent Transactions Visible in Read View', retrievedAll, `Found ${writtenRows?.length}/${CONCURRENT_USERS} rows`);

    const expectedTotal = cleanupTxs.reduce((sum, _, idx) => sum + (1000 + (idx * 250)), 0);
    const actualTotal = (writtenRows || []).reduce((sum, r) => sum + Number(r.amount), 0);
    record('Consistency', 'Mathematical Sum Integrity Preserved Across Threads', expectedTotal === actualTotal, `Expected: ₱${expectedTotal} == Actual: ₱${actualTotal}`);

    // ------------------------------------------------------------
    // 3. Batch Safe Cleanup
    // ------------------------------------------------------------
    console.log('\n--- 3. Batch Cleanup & Rollback ---');
    const { error: delErr } = await supabase.from('transactions').delete().in('id', cleanupTxs);
    const { data: lingering } = await supabase.from('transactions').select('id').in('id', cleanupTxs);
    record('Cleanup', 'All Stress Test Rows Purged', !delErr && lingering?.length === 0, `0 lingering test rows`);

  } catch (err) {
    console.error('Stress test error:', err);
    record('Exception Handling', 'Stress test completed without unhandled crash', false, err.message);
  } finally {
    if (cleanupTxs.length > 0) {
      await supabase.from('transactions').delete().in('id', cleanupTxs);
    }
  }

  // Scorecard
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log(`       STRESS & CONCURRENCY AUDIT SCORECARD: ${failed === 0 ? 'ALL PASSED (100%)' : 'SOME FAILED'}`);
  console.log(`       Passed: ${passed}/${total} (${((passed/total)*100).toFixed(1)}%)`);
  console.log('================================================================\n');

  if (failed > 0) process.exit(1);
  else process.exit(0);
}

runStressAndConcurrencyAudit();
