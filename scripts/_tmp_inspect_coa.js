const fs = require('fs');
const path = require('path');
const { createClient } = require('@supabase/supabase-js');

function parseEnv(filePath) {
  if (!fs.existsSync(filePath)) return {};
  const content = fs.readFileSync(filePath, 'utf8');
  const env = {};
  for (let line of content.split('\n')) {
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

const env = parseEnv(path.resolve(__dirname, '..', '.env.local'));
const sb = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY);

async function main() {
  const { data, error } = await sb
    .from('budget_categories')
    .select('id,code,name,category_type,account_classification,association_id,is_active,allocated_amount,description')
    .order('code');
  if (error) { console.log('ERR', error.message); return; }
  console.log('TOTAL CATEGORIES:', data.length);
  data.forEach((d) =>
    console.log(
      [d.id, d.code, d.category_type, d.account_classification || '-', d.association_id || 'GLOBAL', d.is_active ? 'active' : 'inactive'].join(' | ')
    )
  );

  const { count: txCount } = await sb.from('transactions').select('*', { count: 'exact', head: true });
  console.log('\nTOTAL TRANSACTIONS:', txCount);

  const { data: assocs } = await sb.from('associations').select('id, code, name');
  console.log('\nASSOCIATIONS:');
  (assocs || []).forEach((a) => console.log(' ', a.id, '|', a.code, '|', a.name));

  const { data: profiles } = await sb.from('profiles').select('id, username, role, association_id');
  console.log('\nPROFILES:');
  (profiles || []).forEach((p) => console.log(' ', p.id, '|', p.username, '|', p.role, '|', p.association_id || 'none'));
}

main();
