const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

// Parse .env.local manually
function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const lines = content.split('\n');
  const env = {};
  for (let line of lines) {
    line = line.trim();
    if (!line || line.startsWith('#')) continue;
    const eqIdx = line.indexOf('=');
    if (eqIdx !== -1) {
      const key = line.slice(0, eqIdx).trim();
      let val = line.slice(eqIdx + 1).trim();
      if ((val.startsWith('"') && val.endsWith('"')) || (val.startsWith("'") && val.endsWith("'"))) {
        val = val.slice(1, -1);
      }
      env[key] = val;
    }
  }
  return env;
}

const envPath = path.resolve(process.cwd(), '.env.local');
const envVars = parseEnv(envPath);

const supabaseUrl = envVars.NEXT_PUBLIC_SUPABASE_URL || envVars.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL;
const supabaseKey = envVars.SUPABASE_SERVICE_ROLE_KEY || envVars.NEXT_PUBLIC_SUPABASE_ANON_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

console.log('================================================================');
console.log('         LIVE SUPABASE CONNECTION & HEALTH AUDIT SUITE           ');
console.log('================================================================');
console.log(`Target URL: ${supabaseUrl ? supabaseUrl.replace(/\/$/, '') : 'NOT CONFIGURED'}`);
console.log(`Key Type:   ${envVars.SUPABASE_SERVICE_ROLE_KEY ? 'Service Role Key (Admin)' : 'Anon Key'}`);
console.log('----------------------------------------------------------------\n');

const results = [];

function recordResult(testName, passed, message) {
  results.push({ name: testName, passed, message });
  const status = passed ? '\x1b[32m[PASS]\x1b[0m' : '\x1b[31m[FAIL]\x1b[0m';
  console.log(`${status} ${testName}${message ? ` - ${message}` : ''}`);
}

async function runAudit() {
  if (!supabaseUrl || !supabaseKey) {
    recordResult('Environment Config Check', false, 'Missing URL or Key in .env.local');
    printScorecard();
    process.exit(1);
  }
  recordResult('Environment Config Check', true, 'URL and API Key resolved from .env.local');

  let supabase;
  try {
    supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false, autoRefreshToken: false },
      realtime: { params: { eventsPerSecond: 10 } }
    });
    recordResult('Client Initialization', true, '@supabase/supabase-js client instantiated');
  } catch (err) {
    recordResult('Client Initialization', false, err.message);
    printScorecard();
    process.exit(1);
  }

  // 1. SELECT queries on all database tables
  const tables = [
    'associations',
    'profiles',
    'budget_categories',
    'receipts',
    'transactions',
    'financial_statements',
    'audit_logs'
  ];

  for (const table of tables) {
    try {
      const { data, error } = await supabase.from(table).select('id').limit(5);
      if (error) {
        recordResult(`Table SELECT: ${table}`, false, error.message);
      } else {
        recordResult(`Table SELECT: ${table}`, true, `Retrieved ${data.length} sample record(s)`);
      }
    } catch (err) {
      recordResult(`Table SELECT: ${table}`, false, err.message);
    }
  }

  // 2. Storage checks
  let receiptsBucketExists = false;
  try {
    const { data: buckets, error } = await supabase.storage.listBuckets();
    if (error) {
      recordResult('Storage: List Buckets', false, error.message);
    } else {
      const bucketNames = (buckets || []).map(b => b.name);
      recordResult('Storage: List Buckets', true, `Found ${bucketNames.length} bucket(s): [${bucketNames.join(', ')}]`);
      receiptsBucketExists = bucketNames.includes('receipts');
    }
  } catch (err) {
    recordResult('Storage: List Buckets', false, err.message);
  }

  try {
    if (!receiptsBucketExists) {
      // Try to create or check access
      const { data, error } = await supabase.storage.getBucket('receipts');
      if (error) {
        // Attempt create if service role key
        const { error: createErr } = await supabase.storage.createBucket('receipts', { public: false });
        if (createErr && !createErr.message?.includes('already exists')) {
          recordResult('Storage: receipts Bucket Check', false, createErr.message);
        } else {
          recordResult('Storage: receipts Bucket Check', true, 'Created/verified receipts bucket');
          receiptsBucketExists = true;
        }
      } else {
        recordResult('Storage: receipts Bucket Check', true, 'receipts bucket verified');
        receiptsBucketExists = true;
      }
    } else {
      recordResult('Storage: receipts Bucket Check', true, 'receipts bucket is active and available');
    }
  } catch (err) {
    recordResult('Storage: receipts Bucket Check', false, err.message);
  }

  try {
    const { data: files, error } = await supabase.storage.from('receipts').list('', { limit: 5 });
    if (error) {
      recordResult('Storage: receipts File Listing', false, error.message);
    } else {
      recordResult('Storage: receipts File Listing', true, `Accessible, retrieved ${files.length} file listing(s)`);
    }
  } catch (err) {
    recordResult('Storage: receipts File Listing', false, err.message);
  }

  // 3. Realtime WebSocket subscription verification
  try {
    const realtimeTest = await new Promise((resolve) => {
      const timeout = setTimeout(() => {
        resolve({ success: false, reason: 'Subscription timed out after 5000ms' });
      }, 5000);

      const channel = supabase.channel('audit-probe-channel');
      channel
        .on('broadcast', { event: 'ping' }, (payload) => {
          clearTimeout(timeout);
          supabase.removeChannel(channel);
          resolve({ success: true, reason: 'Received ping broadcast reply' });
        })
        .subscribe(async (status) => {
          if (status === 'SUBSCRIBED') {
            await channel.send({
              type: 'broadcast',
              event: 'ping',
              payload: { message: 'hello from test probe' },
            });
            clearTimeout(timeout);
            supabase.removeChannel(channel);
            resolve({ success: true, reason: 'Channel subscribed and active' });
          } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT') {
            clearTimeout(timeout);
            supabase.removeChannel(channel);
            resolve({ success: false, reason: `Status: ${status}` });
          }
        });
    });

    recordResult('Realtime: WebSocket Channel Subscription', realtimeTest.success, realtimeTest.reason);
  } catch (err) {
    recordResult('Realtime: WebSocket Channel Subscription', false, err.message);
  }

  // Realtime Broadcast Test
  try {
    const channel = supabase.channel('broadcast-test-channel');
    await new Promise((resolve) => {
      channel.subscribe((status) => {
        if (status === 'SUBSCRIBED') {
          resolve();
        }
      });
      setTimeout(resolve, 2000);
    });
    const sendResult = await channel.send({
      type: 'broadcast',
      event: 'audit_test',
      payload: { timestamp: Date.now() },
    });
    supabase.removeChannel(channel);
    recordResult('Realtime: Broadcast Message Dispatch', sendResult === 'ok', `Broadcast status: ${sendResult}`);
  } catch (err) {
    recordResult('Realtime: Broadcast Message Dispatch', false, err.message);
  }

  // 4. Safe INSERT -> UPDATE -> DELETE lifecycle test row with immediate cleanup
  const testId = `log-audit-probe-${Date.now()}`;
  const initialDetails = 'Live Supabase Verification Initial Probe';
  const updatedDetails = 'Live Supabase Verification Updated Probe';

  // INSERT
  try {
    const { data, error } = await supabase.from('audit_logs').insert({
      id: testId,
      user_id: 'probe-auditor',
      association_id: null,
      action: 'CONNECTION_TEST',
      entity_type: 'system_probe',
      entity_id: testId,
      details: initialDetails,
    }).select().single();

    if (error) {
      recordResult('Lifecycle CRUD: INSERT Test Row', false, error.message);
    } else {
      recordResult('Lifecycle CRUD: INSERT Test Row', true, `Inserted test row with id: ${data.id}`);
    }
  } catch (err) {
    recordResult('Lifecycle CRUD: INSERT Test Row', false, err.message);
  }

  // READ / VERIFY INSERT
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').eq('id', testId).single();
    if (error || !data) {
      recordResult('Lifecycle CRUD: READ Test Row', false, error ? error.message : 'Row not found');
    } else {
      recordResult('Lifecycle CRUD: READ Test Row', true, `Verified row existence: ${data.details}`);
    }
  } catch (err) {
    recordResult('Lifecycle CRUD: READ Test Row', false, err.message);
  }

  // UPDATE
  try {
    const { data, error } = await supabase.from('audit_logs').update({
      details: updatedDetails,
    }).eq('id', testId).select().single();

    if (error) {
      recordResult('Lifecycle CRUD: UPDATE Test Row', false, error.message);
    } else {
      recordResult('Lifecycle CRUD: UPDATE Test Row', true, `Updated row details successfully`);
    }
  } catch (err) {
    recordResult('Lifecycle CRUD: UPDATE Test Row', false, err.message);
  }

  // VERIFY UPDATE
  try {
    const { data, error } = await supabase.from('audit_logs').select('*').eq('id', testId).single();
    if (error || data?.details !== updatedDetails) {
      recordResult('Lifecycle CRUD: VERIFY UPDATE Content', false, `Expected "${updatedDetails}", got "${data?.details}"`);
    } else {
      recordResult('Lifecycle CRUD: VERIFY UPDATE Content', true, 'Content matches updated payload');
    }
  } catch (err) {
    recordResult('Lifecycle CRUD: VERIFY UPDATE Content', false, err.message);
  }

  // DELETE
  try {
    const { error } = await supabase.from('audit_logs').delete().eq('id', testId);
    if (error) {
      recordResult('Lifecycle CRUD: DELETE Test Row', false, error.message);
    } else {
      recordResult('Lifecycle CRUD: DELETE Test Row', true, 'Deleted test row successfully');
    }
  } catch (err) {
    recordResult('Lifecycle CRUD: DELETE Test Row', false, err.message);
  }

  // VERIFY CLEANUP
  try {
    const { data, error } = await supabase.from('audit_logs').select('id').eq('id', testId);
    if (error) {
      recordResult('Lifecycle CRUD: VERIFY Immediate Cleanup', false, error.message);
    } else if (data && data.length === 0) {
      recordResult('Lifecycle CRUD: VERIFY Immediate Cleanup', true, 'Zero rows found; database clean');
    } else {
      recordResult('Lifecycle CRUD: VERIFY Immediate Cleanup', false, 'Test row was not removed');
    }
  } catch (err) {
    recordResult('Lifecycle CRUD: VERIFY Immediate Cleanup', false, err.message);
  }

  printScorecard();
}

function printScorecard() {
  const total = results.length;
  const passed = results.filter(r => r.passed).length;
  const failed = total - passed;

  console.log('\n================================================================');
  console.log('                  FINAL AUDIT SCORECARD                         ');
  console.log('================================================================');
  console.log(`Total Verification Checks : ${total}`);
  console.log(`Checks Passed             : \x1b[32m${passed}\x1b[0m`);
  console.log(`Checks Failed             : ${failed > 0 ? `\x1b[31m${failed}\x1b[0m` : '\x1b[32m0\x1b[0m'}`);
  console.log(`Overall Pass Rate         : ${((passed / total) * 100).toFixed(1)}%`);
  console.log(`Result                    : \x1b[1m${passed}/${total} Passed\x1b[0m`);
  console.log('================================================================\n');

  if (failed > 0) {
    process.exit(1);
  } else {
    process.exit(0);
  }
}

runAudit();
