const fs = require('fs');
const path = require('path');

const dataPath = path.join(__dirname, '..', 'iarms_local_data.json');
if (!fs.existsSync(dataPath)) {
  console.error('iarms_local_data.json not found');
  process.exit(1);
}

const raw = JSON.parse(fs.readFileSync(dataPath, 'utf-8'));

function escapeSql(val) {
  if (val === null || val === undefined) return 'NULL';
  if (typeof val === 'number') return val;
  if (typeof val === 'boolean') return val ? 'TRUE' : 'FALSE';
  if (typeof val === 'object') return `'${JSON.stringify(val).replace(/'/g, "''")}'::jsonb`;
  return `'${String(val).replace(/'/g, "''")}'`;
}

let sql = `-- ==============================================================================
-- IARMS Complete Past Data Migration Dump (PostgreSQL / Supabase)
-- Irrigators Association Record Management System
-- Baua River Irrigation System - Region 02, Gonzaga, Cagayan
-- ==============================================================================

-- 1. Associations (Seed / Ensure 3 Primary IAs)
INSERT INTO public.associations (
    id, code, name, old_name, region, nis_name, mailing_address, president_name, contact_number,
    sec_registration_number, tin_number, service_area_ha, operational_area_ha,
    beneficiaries_total, beneficiaries_male, beneficiaries_female, tsag_count, contract_type, contract_effectivity_date
) VALUES 
`;

const assocRows = raw.associations.map((a) => {
  return `(${escapeSql(a.id)}, ${escapeSql(a.code)}, ${escapeSql(a.name)}, ${escapeSql(a.old_name)}, ${escapeSql(a.region || 'Region 02')}, ${escapeSql(a.nis_name || 'Baua River Irrigation System')}, ${escapeSql(a.mailing_address)}, ${escapeSql(a.president_name)}, ${escapeSql(a.contact_number)}, ${escapeSql(a.sec_registration_number)}, ${escapeSql(a.tin_number)}, ${escapeSql(a.service_area_ha || 0)}, ${escapeSql(a.operational_area_ha || 0)}, ${escapeSql(a.beneficiaries_total || 0)}, ${escapeSql(a.beneficiaries_male || 0)}, ${escapeSql(a.beneficiaries_female || 0)}, ${escapeSql(a.tsag_count || 1)}, ${escapeSql(a.contract_type || 'Modified IMT Contract')}, ${escapeSql(a.contract_effectivity_date || '2024-01-05')})`;
});
sql += assocRows.join(',\n') + '\nON CONFLICT (code) DO NOTHING;\n\n';

// 2. Profiles (All past users, officers, and farmer members)
const uniqueUsers = [];
const seenUsernames = new Set();
for (const u of raw.users) {
  const username = (u.username || (u.email ? u.email.split('@')[0] : u.id)).toLowerCase();
  if (!seenUsernames.has(username)) {
    seenUsernames.add(username);
    uniqueUsers.push(u);
  }
}

sql += `-- 2. Users & Members Profiles (${uniqueUsers.length} unique accounts)\n`;
sql += `INSERT INTO public.profiles (
    id, username, email, password, full_name, role, association_id, farm_location, farm_size_hectares, contact_number, token_version, created_at, updated_at
) VALUES\n`;

const userRows = uniqueUsers.map((u) => {
  const username = u.username || (u.email ? u.email.split('@')[0] : u.id);
  const email = u.email || `${username}@iarms.org`;
  return `(${escapeSql(u.id)}, ${escapeSql(username)}, ${escapeSql(email)}, ${escapeSql(u.password)}, ${escapeSql(u.full_name)}, ${escapeSql(u.role)}, ${escapeSql(u.association_id)}, ${escapeSql(u.farm_location)}, ${escapeSql(u.farm_size_hectares || 0)}, ${escapeSql(u.contact_number)}, ${escapeSql(u.token_version || 0)}, ${escapeSql(u.created_at || new Date().toISOString())}, ${escapeSql(u.updated_at || new Date().toISOString())})`;
});
sql += userRows.join(',\n') + '\nON CONFLICT (username) DO NOTHING;\n\n';

// 3. Budget Categories
if (raw.categories && raw.categories.length > 0) {
  const uniqueCategories = [];
  const seenCatCodes = new Set();
  for (const c of raw.categories) {
    if (!seenCatCodes.has(c.id)) {
      seenCatCodes.add(c.id);
      uniqueCategories.push(c);
    }
  }

  sql += `-- 3. Budget Categories (${uniqueCategories.length} items)\n`;
  sql += `INSERT INTO public.budget_categories (
    id, code, name, category_type, allocated_amount, description, is_active, association_id
) VALUES\n`;
  const catRows = uniqueCategories.map((c) => {
    return `(${escapeSql(c.id)}, ${escapeSql(c.code)}, ${escapeSql(c.name)}, ${escapeSql(c.category_type)}, ${escapeSql(c.allocated_amount || 0)}, ${escapeSql(c.description)}, ${escapeSql(c.is_active !== false)}, ${escapeSql(c.association_id || 'ia-nangurisan')})`;
  });
  sql += catRows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';
}

// 4. Receipts
if (raw.receipts && raw.receipts.length > 0) {
  sql += `-- 4. Receipts & Audit Files (${raw.receipts.length} items)\n`;
  sql += `INSERT INTO public.receipts (
    id, file_path, file_name, file_size, content_type, uploader_id, association_id, status, auditor_id, auditor_notes, verified_at, created_at, updated_at
) VALUES\n`;
  const rcptRows = raw.receipts.map((r) => {
    return `(${escapeSql(r.id)}, ${escapeSql(r.file_path)}, ${escapeSql(r.file_name)}, ${escapeSql(r.file_size || 0)}, ${escapeSql(r.content_type)}, ${escapeSql(r.uploader_id)}, ${escapeSql(r.association_id || 'ia-nangurisan')}, ${escapeSql(r.status || 'pending')}, ${escapeSql(r.auditor_id)}, ${escapeSql(r.auditor_notes)}, ${escapeSql(r.verified_at)}, ${escapeSql(r.created_at || new Date().toISOString())}, ${escapeSql(r.updated_at || new Date().toISOString())})`;
  });
  sql += rcptRows.join(',\n') + '\nON CONFLICT (id) DO NOTHING;\n\n';
}

// 5. Transactions
if (raw.transactions && raw.transactions.length > 0) {
  sql += `-- 5. Past Collections & Disbursements Ledger (${raw.transactions.length} transactions)\n`;
  sql += `INSERT INTO public.transactions (
    id, transaction_number, voucher_number, type, association_id, member_id, member_ids, category_id, receipt_id, amount, transaction_date, payment_method, reference_number, payee_name, lateral_section, particulars, notes, created_by, created_at, updated_at
) VALUES\n`;
  const txRows = raw.transactions.map((tx) => {
    return `(${escapeSql(tx.id)}, ${escapeSql(tx.transaction_number)}, ${escapeSql(tx.voucher_number || null)}, ${escapeSql(tx.type)}, ${escapeSql(tx.association_id || 'ia-nangurisan')}, ${escapeSql(tx.member_id)}, ${escapeSql(tx.member_ids || null)}, ${escapeSql(tx.category_id)}, ${escapeSql(tx.receipt_id)}, ${escapeSql(tx.amount)}, ${escapeSql(tx.transaction_date)}, ${escapeSql(tx.payment_method || 'cash')}, ${escapeSql(tx.reference_number)}, ${escapeSql(tx.payee_name || null)}, ${escapeSql(tx.lateral_section || null)}, ${escapeSql(tx.particulars || null)}, ${escapeSql(tx.notes)}, ${escapeSql(tx.created_by)}, ${escapeSql(tx.created_at || new Date().toISOString())}, ${escapeSql(tx.updated_at || new Date().toISOString())})`;
  });
  sql += txRows.join(',\n') + '\nON CONFLICT (transaction_number) DO NOTHING;\n\n';
}

// 6. Financial Statements
if (raw.financial_statements && raw.financial_statements.length > 0) {
  sql += `-- 6. Past Compiled Financial Statements (${raw.financial_statements.length} reports)\n`;
  sql += `INSERT INTO public.financial_statements (
    id, statement_number, title, association_id, statement_type, period_start, period_end, total_collections, total_disbursements, net_cash_flow, report_data, is_published, generated_by, created_at, updated_at
) VALUES\n`;
  const stmtRows = raw.financial_statements.map((s) => {
    return `(${escapeSql(s.id)}, ${escapeSql(s.statement_number)}, ${escapeSql(s.title)}, ${escapeSql(s.association_id || 'ia-nangurisan')}, ${escapeSql(s.statement_type)}, ${escapeSql(s.period_start)}, ${escapeSql(s.period_end)}, ${escapeSql(s.total_collections || 0)}, ${escapeSql(s.total_disbursements || 0)}, ${escapeSql(s.net_cash_flow || 0)}, ${escapeSql(s.report_data)}, ${escapeSql(s.is_published !== false)}, ${escapeSql(s.generated_by)}, ${escapeSql(s.created_at || new Date().toISOString())}, ${escapeSql(s.updated_at || new Date().toISOString())})`;
  });
  sql += stmtRows.join(',\n') + '\nON CONFLICT (statement_number) DO NOTHING;\n\n';
}

const outPath = path.join(__dirname, '..', 'supabase_schema.sql');
const baseSchemaPath = path.join(__dirname, '..', 'supabase_schema.sql');
let existingSchema = fs.readFileSync(baseSchemaPath, 'utf-8');

// Find insertion point before initial seed or append
const seedMarker = '-- Initial Seed Data: 3 Baua River Irrigators Associations';
if (existingSchema.includes(seedMarker)) {
  const schemaDDL = existingSchema.substring(0, existingSchema.indexOf(seedMarker));
  fs.writeFileSync(outPath, schemaDDL.trim() + '\n\n' + sql, 'utf-8');
} else {
  fs.appendFileSync(outPath, '\n\n' + sql, 'utf-8');
}

console.log('Successfully updated supabase_schema.sql with full past data migration dump!');
