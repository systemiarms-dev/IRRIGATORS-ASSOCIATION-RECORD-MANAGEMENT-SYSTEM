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

async function run() {
  const { data: cats } = await supabase
    .from('budget_categories')
    .select('id, code, name')
    .eq('association_id', 'ia-nangurisan');
  console.log('NLFIA Categories count:', cats?.length);
  console.log(cats);
  if (stmts && stmts.length > 0) {
    console.log('Statement columns:', Object.keys(stmts[0]));
  }
  if (stmts && stmts.length > 0) {
    for (const s of stmts) {
      console.log('--------------------------------------------------');
      console.log('ID:', s.id, '| Title:', s.title, '| Year:', s.fiscal_year);
      console.log('FS1 Net Surplus:', JSON.stringify(s.report_data?.fs1?.netSurplus));
      console.log('FS1 Receipts Total:', JSON.stringify(s.report_data?.fs1?.receipts?.total));
      console.log('FS1 Disbursements Total:', JSON.stringify(s.report_data?.fs1?.disbursements?.total));
      console.log('FS2 Cash Ending:', JSON.stringify(s.report_data?.fs2?.cashFlows?.cashBalanceEnd));
      console.log('FS2 Total Assets:', JSON.stringify(s.report_data?.fs2?.financialCondition?.assets?.totalAssets));
      console.log('FS2 Liabilities & Equity:', JSON.stringify(s.report_data?.fs2?.financialCondition?.liabilitiesEquity?.totalLiabilitiesEquity));
      console.log('FS3 Total Cash:', s.report_data?.fs3?.totalCashBalance);
      console.log('FS3 Cash Composition:', JSON.stringify(s.report_data?.fs3?.composition));
      console.log('FS4 Total Assets:', s.report_data?.fs4?.assets?.totalAssets);
      console.log('FS4 Total Liabilities:', s.report_data?.fs4?.liabilities?.totalLiabilities);
      console.log('FS4 Net Worth:', s.report_data?.fs4?.netWorth);
    }
  }
}
run();
