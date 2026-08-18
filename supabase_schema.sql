-- ==============================================================================
-- IARMS Multi-Association PostgreSQL Schema (Supabase Cloud Deployment)
-- Irrigators Association Record Management System
-- Baua River Irrigation System - Region 02, Gonzaga, Cagayan
-- ==============================================================================

-- Enable UUID Extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Associations Table (NIS IA Profile)
CREATE TABLE IF NOT EXISTS public.associations (
    id TEXT PRIMARY KEY DEFAULT 'ia-' || substr(md5(random()::text), 1, 8),
    code VARCHAR(30) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    old_name VARCHAR(255),
    region VARCHAR(50) DEFAULT 'Region 02',
    nis_name VARCHAR(255) DEFAULT 'Baua River Irrigation System',
    mailing_address TEXT NOT NULL,
    president_name VARCHAR(255) NOT NULL,
    contact_number VARCHAR(50),
    sec_registration_number VARCHAR(100) NOT NULL,
    tin_number VARCHAR(100) NOT NULL,
    service_area_ha NUMERIC(10, 4) DEFAULT 0,
    operational_area_ha NUMERIC(10, 4) DEFAULT 0,
    beneficiaries_total INTEGER DEFAULT 0,
    beneficiaries_male INTEGER DEFAULT 0,
    beneficiaries_female INTEGER DEFAULT 0,
    tsag_count INTEGER DEFAULT 1,
    contract_type VARCHAR(100) DEFAULT 'Modified IMT Contract',
    contract_effectivity_date DATE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. User Profiles Table (Strict 4 Roles: super_admin, admin, treasurer, auditor)
CREATE TABLE IF NOT EXISTS public.profiles (
    id TEXT PRIMARY KEY DEFAULT 'user-' || substr(md5(random()::text), 1, 8),
    username VARCHAR(100) UNIQUE NOT NULL,
    email VARCHAR(255),
    password TEXT NOT NULL,
    full_name VARCHAR(255) NOT NULL,
    role VARCHAR(50) NOT NULL CHECK (role IN ('super_admin', 'admin', 'treasurer', 'auditor', 'member')),
    association_id TEXT REFERENCES public.associations(id) ON DELETE SET NULL,
    farm_location TEXT,
    farm_size_hectares NUMERIC(10, 2) DEFAULT 0,
    contact_number VARCHAR(50),
    token_version INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Budget Categories Table (NIA Standard Chart of Accounts)
CREATE TABLE IF NOT EXISTS public.budget_categories (
    id TEXT PRIMARY KEY DEFAULT 'cat-' || substr(md5(random()::text), 1, 8),
    code VARCHAR(50) NOT NULL,
    name VARCHAR(255) NOT NULL,
    category_type VARCHAR(20) NOT NULL CHECK (category_type IN ('collection', 'disbursement')),
    allocated_amount NUMERIC(15, 2) DEFAULT 0,
    description TEXT,
    association_id TEXT REFERENCES public.associations(id) ON DELETE CASCADE,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Receipts & Expense Vouchers Table
CREATE TABLE IF NOT EXISTS public.receipts (
    id TEXT PRIMARY KEY DEFAULT 'rcpt-' || substr(md5(random()::text), 1, 8),
    file_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    file_size BIGINT DEFAULT 0,
    content_type VARCHAR(100) NOT NULL,
    uploader_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    association_id TEXT REFERENCES public.associations(id) ON DELETE CASCADE,
    status VARCHAR(30) DEFAULT 'pending' CHECK (status IN ('pending', 'verified', 'flagged', 'rejected')),
    auditor_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    auditor_notes TEXT,
    verified_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 5. Transactions Table (Collections & Disbursements Ledger)
CREATE TABLE IF NOT EXISTS public.transactions (
    id TEXT PRIMARY KEY DEFAULT 'tx-' || substr(md5(random()::text), 1, 8),
    transaction_number VARCHAR(100) UNIQUE NOT NULL,
    voucher_number VARCHAR(100),
    type VARCHAR(20) NOT NULL CHECK (type IN ('collection', 'disbursement')),
    association_id TEXT NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    member_id TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    member_ids JSONB,
    category_id TEXT NOT NULL REFERENCES public.budget_categories(id) ON DELETE RESTRICT,
    receipt_id TEXT REFERENCES public.receipts(id) ON DELETE SET NULL,
    amount NUMERIC(15, 2) NOT NULL CHECK (amount > 0),
    transaction_date DATE NOT NULL,
    payment_method VARCHAR(50) DEFAULT 'cash',
    reference_number VARCHAR(100),
    payee_name VARCHAR(255),
    lateral_section VARCHAR(255),
    particulars TEXT,
    notes TEXT,
    created_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Financial Statements Table (FS1 - FS4)
CREATE TABLE IF NOT EXISTS public.financial_statements (
    id TEXT PRIMARY KEY DEFAULT 'stmt-' || substr(md5(random()::text), 1, 8),
    statement_number VARCHAR(100) UNIQUE NOT NULL,
    title VARCHAR(255) NOT NULL,
    association_id TEXT NOT NULL REFERENCES public.associations(id) ON DELETE CASCADE,
    statement_type VARCHAR(50) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    total_collections NUMERIC(15, 2) DEFAULT 0,
    total_disbursements NUMERIC(15, 2) DEFAULT 0,
    net_cash_flow NUMERIC(15, 2) DEFAULT 0,
    report_data JSONB NOT NULL,
    is_published BOOLEAN DEFAULT TRUE,
    generated_by TEXT REFERENCES public.profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Audit Logs Table
CREATE TABLE IF NOT EXISTS public.audit_logs (
    id TEXT PRIMARY KEY DEFAULT 'log-' || substr(md5(random()::text), 1, 8),
    user_id TEXT NOT NULL,
    association_id TEXT REFERENCES public.associations(id) ON DELETE SET NULL,
    action VARCHAR(100) NOT NULL,
    entity_type VARCHAR(100) NOT NULL,
    entity_id TEXT,
    details TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Performance Indexes
CREATE INDEX IF NOT EXISTS idx_transactions_assoc_date ON public.transactions(association_id, transaction_date);
CREATE INDEX IF NOT EXISTS idx_transactions_type ON public.transactions(type);
CREATE INDEX IF NOT EXISTS idx_receipts_assoc_status ON public.receipts(association_id, status);
CREATE INDEX IF NOT EXISTS idx_statements_assoc ON public.financial_statements(association_id);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_profiles_assoc ON public.profiles(association_id);

-- ==============================================================================
-- OFFICIAL SEED DATA DUMP (Deduplicated & Cleaned)
-- ==============================================================================

-- 1. Associations (Seed 3 Primary IAs of Baua River NIS)
INSERT INTO public.associations (
    id, code, name, old_name, region, nis_name, mailing_address, president_name, contact_number,
    sec_registration_number, tin_number, service_area_ha, operational_area_ha,
    beneficiaries_total, beneficiaries_male, beneficiaries_female, tsag_count, contract_type, contract_effectivity_date
) VALUES 
('ia-nangurisan', 'NLFIA', 'Nangurisan Laya Farmers Irrigators Association, Inc.', 'Nangurisan/Baraikbak IA Inc.', 'Region 02', 'Baua River Irrigation System', 'Sta. Cruz, Gonzaga, Cagayan', 'Meynard A. Tomaneng', '09278718567', 'CN202060557', '769-207-601-00000', 88.4129, 69.2676, 75, 66, 9, 4, 'Modified IMT Contract', '2024-01-05'),
('ia-timog', 'TSCFIA', 'Timog Sta. Cruz Farmers Irrigators Association, Inc.', 'Western Sta. Cruz IA Inc.', 'Region 02', 'Baua River Irrigation System', 'Sta. Cruz, Gonzaga, Cagayan', 'Arturo V. Alvarez', '09539704743', 'CN202060559', '774-472-832-000', 28.6197, 28.6197, 34, 28, 6, 1, 'Modified IMT Contract', '2024-01-05'),
('ia-gimong', 'GTESCIA', 'Gimong ti Eastern Sta. Cruz Irrigators Association, Inc.', 'Eastern Sta. Cruz IA Inc.', 'Region 02', 'Baua River Irrigation System', 'Sta. Cruz, Gonzaga, Cagayan', 'Romeo P. Vega', '09755132231', '2021050013005-15', '778-440-161-000', 99.7460, 79.7560, 102, 80, 22, 2, 'Modified IMT Contract', '2024-01-05')
ON CONFLICT (code) DO UPDATE SET
    name = EXCLUDED.name,
    president_name = EXCLUDED.president_name,
    contact_number = EXCLUDED.contact_number,
    sec_registration_number = EXCLUDED.sec_registration_number,
    tin_number = EXCLUDED.tin_number,
    service_area_ha = EXCLUDED.service_area_ha,
    operational_area_ha = EXCLUDED.operational_area_ha,
    beneficiaries_total = EXCLUDED.beneficiaries_total;

-- 2. Official Officer Profiles (Strict 4 Roles, 10 Official Accounts)
INSERT INTO public.profiles (
    id, username, email, password, full_name, role, association_id, farm_location, farm_size_hectares, contact_number, token_version, created_at, updated_at
) VALUES
-- System Super Administrator
('user-superadmin-1', 'superadmin', 'superadmin@iarms.org', 'scrypt$09d5cc8612ffb7f81550f268fa65a972$eef1e3bc50028ece2862813d0092dbd837b885cdefa92ba0d30cddd512a720827c8fee7f5b6c15ab12bc161df82c1c26f3185fa69bf89a2b9806fa504369fb34', 'SYSTEM SUPER ADMINISTRATOR', 'super_admin', NULL, 'Gonzaga, Cagayan', 0, '+63 900 000 0000', 0, NOW(), NOW()),

-- 1. Nangurisan Laya Farmers Irrigators Association, Inc. (NLFIA)
('user-admin-nlfia', 'admin_nlfia', 'admin.nlfia@iarms.org', 'scrypt$3728714d12e595e5ea2500471e23a576$9f503a19d98d655422a01886bd7b31ed3e28222efb5a2c71446ba2531759ef3ae75c8812758374dce49e48d535e0502b008bf80a47337d679942ac2e50de3925', 'MEYNARD A. TOMANENG', 'admin', 'ia-nangurisan', 'Sta. Cruz / Ipil, Gonzaga, Cagayan', 3.5, '09278718567', 0, NOW(), NOW()),
('user-treasurer-nlfia', 'treasurer_nlfia', 'treasurer.nlfia@iarms.org', 'scrypt$ec61735ba9e26846457a991d0b5883d2$729ea800465755b9d92b87b5b931cb1b8e7c1ad424c1de31662a240e20de659b58f450fdfbb3fe88f7b4287431f94f891cda0ebc75fe996876d3a0fecf03d239', 'RIC UNDAY', 'treasurer', 'ia-nangurisan', 'Sta. Cruz / Ipil, Gonzaga, Cagayan', 2.0, '+63 918 987 6543', 0, NOW(), NOW()),
('user-auditor-nlfia', 'auditor_nlfia', 'auditor.nlfia@iarms.org', 'scrypt$457a7f4180450428f6a62253042e0281$401f30596b225ab7152791fbdef07718960548dab5c298e002d6ebc15c7a0a6a4ebacb86b21fc4d23c6ea43a85d2c1a65a2dfbd73d6200be4c289f7a75a1aab9', 'ARTUR GUIANG', 'auditor', 'ia-nangurisan', 'Sta. Cruz / Ipil, Gonzaga, Cagayan', 4.2, '+63 919 456 7890', 0, NOW(), NOW()),

-- 2. Timog Sta. Cruz Farmers Irrigators Association, Inc. (TSCFIA)
('user-admin-tscfia', 'admin_tscfia', 'admin.tscfia@iarms.org', 'scrypt$b7630becec55c7d1f8294ea45bdcb25b$58ed60c9dddd1dd2f9ce636ab11a2347f0f06b9b280137ab81619b48b01f1ea55935296f6888bc47e14935ca226f4268a72d79ecde12b3296ed04a08f23785a9', 'ARTURO V. ALVAREZ', 'admin', 'ia-timog', 'Sta. Cruz, Gonzaga, Cagayan', 3.0, '09539704743', 0, NOW(), NOW()),
('user-treasurer-tscfia', 'treasurer_tscfia', 'treasurer.tscfia@iarms.org', 'scrypt$948cab0a0308c090609f638d1acda8e0$14f371c098ceb275c2f13f7fd329a9eb62e6109f1ee554d2bdc759b43c60b7b242941402fc25081f606c597ee5b9c65ca486d57d62831ca33817a02f16c510a6', 'TREASURER TIMOG STA. CRUZ', 'treasurer', 'ia-timog', 'Sta. Cruz, Gonzaga, Cagayan', 2.5, '09539704740', 0, NOW(), NOW()),
('user-auditor-tscfia', 'auditor_tscfia', 'auditor.tscfia@iarms.org', 'scrypt$57cbfb8e301aefbf10ae01f37b5085de$677df22643e563b8dc2d8ee1a90f1c6dcf595c72885c6c528f4689fcdae3f5c55a8efacb17de40b13bd20981a1f136901ff2a6c85ef47003f34235a1ad553919', 'AUDITOR TIMOG STA. CRUZ', 'auditor', 'ia-timog', 'Sta. Cruz, Gonzaga, Cagayan', 2.8, '09539704741', 0, NOW(), NOW()),

-- 3. Gimong ti Eastern Sta. Cruz Irrigators Association, Inc. (GTESCIA)
('user-admin-gtescia', 'admin_gtescia', 'admin.gtescia@iarms.org', 'scrypt$49d55bfc8941975b170952affd2601bb$f746b4937454c1d4e577a4b509893b4d8d50a2e5a7bef24a5a0e85e91beb029618d9859dfe86e0fa327d9fd5e6450a81b83ab5d5a1899b6147ed64456c297fd8', 'ROMEO P. VEGA', 'admin', 'ia-gimong', 'Sta. Cruz, Gonzaga, Cagayan', 4.0, '09755132231', 0, NOW(), NOW()),
('user-treasurer-gtescia', 'treasurer_gtescia', 'treasurer.gtescia@iarms.org', 'scrypt$ff40938af63c21512d5a77d03924cdbb$91d8a47799d05ae49b73b6bb0e9823f119110589d8b4eb17c8cba9236f826aabed293848ed043d9546f80f0980197ba45397892bcc3944db4ab753947661f758', 'TREASURER EASTERN STA. CRUZ', 'treasurer', 'ia-gimong', 'Sta. Cruz, Gonzaga, Cagayan', 3.2, '09755132230', 0, NOW(), NOW()),
('user-auditor-gtescia', 'auditor_gtescia', 'auditor.gtescia@iarms.org', 'scrypt$95aa60887a59e98f0d6b5c0131fed307$38c17a9c886882a71993d5155f7bdd26e07619c7d6dc445df88b3a6edf1527fe6804f6353ea942fac32a00e5576accaeea8e581084178fabfe4d79f2ed2e991e', 'AUDITOR EASTERN STA. CRUZ', 'auditor', 'ia-gimong', 'Sta. Cruz, Gonzaga, Cagayan', 3.8, '09755132232', 0, NOW(), NOW())
ON CONFLICT (username) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    password = EXCLUDED.password,
    role = EXCLUDED.role,
    association_id = EXCLUDED.association_id,
    farm_location = EXCLUDED.farm_location,
    farm_size_hectares = EXCLUDED.farm_size_hectares,
    contact_number = EXCLUDED.contact_number;

-- 3. Budget Categories (15 NIA Standard Chart of Accounts)
INSERT INTO public.budget_categories (
    id, code, name, category_type, allocated_amount, description, is_active, association_id
) VALUES
('cat-1', 'REC-ISF', 'Irrigation Service Fee (ISF) Collections', 'collection', 100000, 'Member ISF payments', TRUE, NULL),
('cat-2', 'REC-MEM', 'Membership Fees & Annual Dues', 'collection', 50000, 'IA Member registration and annual dues', TRUE, NULL),
('cat-3', 'REC-SUB', 'O&M Subsidy & Canal Remuneration', 'collection', 150000, 'NIA Operations & Maintenance subsidies', TRUE, NULL),
('cat-4', 'REC-FIN', 'Fines, Penalties & Interest', 'collection', 20000, 'Delinquency penalties and bank interest', TRUE, NULL),
('cat-5', 'DISB-CLEAR', 'Canal Clearing, Repair & Maintenance', 'disbursement', 80000, 'Operational desilting and clearing of irrigation canals', TRUE, NULL),
('cat-6', 'DISB-SUPP', 'Office & Field Supplies', 'disbursement', 30000, 'Stationery, fuel, and operational tools', TRUE, NULL),
('cat-7', 'DISB-HON', 'Honorarium, Salaries & Wages', 'disbursement', 60000, 'Monthly allowance and personnel wages', TRUE, NULL),
('cat-8', 'DISB-TRAV', 'Travel, Meeting & Rep Expenses', 'disbursement', 25000, 'Transport allowances and IA assembly expenses', TRUE, NULL),
('cat-9', 'DISB-TAX', 'Registration, Tax & Licenses', 'disbursement', 15000, 'LGU permits, BIR taxes, legal jurats', TRUE, NULL),
('cat-10', 'DISB-SHARE', 'Distributed IA Share to Laterals', 'disbursement', 20000, 'Federation and lateral incentive distribution', TRUE, NULL),
('cat-11', 'DISB-LATERAL', 'Lateral Share Distribution', 'disbursement', 35000, 'Danak Share, Barakibak Share, lateral TSAG distribution', TRUE, NULL),
('cat-12', 'DISB-REPAIR', 'Repair & Maintenance', 'disbursement', 50000, 'Temporary xyphone, canal gate repairs, irrigation tools', TRUE, NULL),
('cat-13', 'DISB-PROF', 'Professional Fee', 'disbursement', 25000, 'Processing fee of Audited FS, legal jurats, accounting fees', TRUE, NULL),
('cat-14', 'DISB-FED', 'Federation Share', 'disbursement', 30000, 'Baua River IA Federation share allocation', TRUE, NULL),
('cat-15', 'REC-DON', 'Donations, Grants & Other Income', 'collection', 30000, 'Other community donations and LGU assistance', TRUE, NULL),
('cat-16', 'DISB-PISO', 'Piso Mula sa Puso', 'disbursement', 15000, 'Community fund and solidarity initiative (Piso Mula sa Puso)', TRUE, NULL)
ON CONFLICT (id) DO NOTHING;

-- 4. Past Collections & Disbursements Ledger (15 Transactions)
INSERT INTO public.transactions (
    id, transaction_number, voucher_number, type, association_id, member_id, member_ids, category_id, receipt_id, amount, transaction_date, payment_method, reference_number, payee_name, lateral_section, particulars, notes, created_by, created_at, updated_at
) VALUES
('tx-1785998375508', 'DISB-202608-9975', NULL, 'disbursement', 'ia-nangurisan', NULL, NULL, 'cat-9', NULL, 12000, '2025-11-05', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:39:35.508Z', '2026-08-06T06:39:35.508Z'),
('tx-1785998345843', 'DISB-202608-5446', NULL, 'disbursement', 'ia-nangurisan', NULL, NULL, 'cat-8', NULL, 6000, '2025-10-04', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:39:05.843Z', '2026-08-06T06:39:05.843Z'),
('tx-1785998316218', 'DISB-202608-6767', NULL, 'disbursement', 'ia-nangurisan', NULL, NULL, 'cat-7', NULL, 20000, '2025-09-03', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:38:36.218Z', '2026-08-06T06:38:36.218Z'),
('tx-1785998285685', 'DISB-202608-5425', NULL, 'disbursement', 'ia-nangurisan', NULL, NULL, 'cat-6', NULL, 7500, '2025-08-02', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:38:05.685Z', '2026-08-06T06:38:05.685Z'),
('tx-1785998258820', 'DISB-202608-2120', NULL, 'disbursement', 'ia-nangurisan', NULL, NULL, 'cat-5', NULL, 15000, '2025-07-01', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:37:38.820Z', '2026-08-06T06:37:38.820Z'),
('tx-1785998204367', 'COL-202608-5347', NULL, 'collection', 'ia-nangurisan', NULL, NULL, 'cat-2', NULL, 8000, '2025-06-20', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:36:44.367Z', '2026-08-06T06:36:44.367Z'),
('tx-1785998164234', 'COL-202608-5985', NULL, 'collection', 'ia-nangurisan', NULL, NULL, 'cat-4', NULL, 3500, '2025-05-15', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:36:04.234Z', '2026-08-06T06:36:04.234Z'),
('tx-1785998090532', 'COL-202608-7666', NULL, 'collection', 'ia-nangurisan', NULL, NULL, 'cat-3', NULL, 40000, '2025-04-10', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:34:50.532Z', '2026-08-06T06:34:50.532Z'),
('tx-1785998060775', 'COL-202608-7122', NULL, 'collection', 'ia-nangurisan', NULL, NULL, 'cat-2', NULL, 12000, '2025-03-05', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:34:20.775Z', '2026-08-06T06:34:20.775Z'),
('tx-1785997962937', 'COL-202608-8081', NULL, 'collection', 'ia-nangurisan', NULL, NULL, 'cat-1', NULL, 25000, '2025-02-01', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:32:42.937Z', '2026-08-06T06:32:42.937Z'),
('tx-1785997688258', 'DISB-202608-4910', NULL, 'disbursement', 'ia-nangurisan', NULL, NULL, 'cat-7', NULL, 18000, '2024-12-01', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:28:08.258Z', '2026-08-06T06:28:08.258Z'),
('tx-1785997662333', 'DISB-202608-5933', NULL, 'disbursement', 'ia-nangurisan', NULL, NULL, 'cat-6', NULL, 6000, '2024-11-01', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:27:42.333Z', '2026-08-06T06:27:42.333Z'),
('tx-1785997627412', 'DISB-202608-4489', NULL, 'disbursement', 'ia-nangurisan', NULL, NULL, 'cat-5', NULL, 12000, '2024-09-01', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:27:07.412Z', '2026-08-06T06:27:07.412Z'),
('tx-1785997580026', 'COL-202608-4004', NULL, 'collection', 'ia-nangurisan', NULL, NULL, 'cat-2', NULL, 10000, '2024-05-02', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:26:20.026Z', '2026-08-06T06:26:20.026Z'),
('tx-1785997540638', 'COL-202608-9011', NULL, 'collection', 'ia-nangurisan', NULL, NULL, 'cat-1', NULL, 20000, '2024-03-01', 'cash', NULL, NULL, NULL, NULL, NULL, 'user-admin-nlfia', '2026-08-06T06:25:40.638Z', '2026-08-06T06:25:40.638Z')
ON CONFLICT (transaction_number) DO NOTHING;

-- 5. Past Compiled Financial Statement (FS1 - FS4)
INSERT INTO public.financial_statements (
    id, statement_number, title, association_id, statement_type, period_start, period_end, total_collections, total_disbursements, net_cash_flow, report_data, is_published, generated_by, created_at, updated_at
) VALUES
('stmt-1785998487143', 'FS-2025-2574', 'Annual FS report 2025', 'ia-nangurisan', 'fs1', '2025-01-01', '2025-12-31', 88500, 65500, 23000, '{"cash_at_bank":14450,"accounts_receivable":0,"equipment_assets":0,"accounts_payable":0,"retained_earnings":17000,"fs1":{"associationName":"NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.","address":"IPIL, GONZAGA CAGAYAN","secRegNo":"CN202060557","yearCurrent":2025,"yearPrior":2024,"receipts":{"membershipFees":{"current":20000,"prior":10000},"annualDues":{"current":0,"prior":0},"omSubsidy":{"current":65000,"prior":20000},"canalRemuIncentive":{"current":0,"prior":0},"finesPenalties":{"current":3500,"prior":0},"interestEarned":{"current":0,"prior":0},"otherIncome":{"current":0,"prior":0},"total":{"current":88500,"prior":30000}},"disbursements":{"registrationPermits":{"current":12000,"prior":0},"travelRep":{"current":6000,"prior":0},"meetingExpenses":{"current":0,"prior":0},"officeSupplies":{"current":7500,"prior":6000},"salariesWages":{"current":20000,"prior":18000},"canalClearingRepair":{"current":15000,"prior":12000},"taxLicenses":{"current":0,"prior":0},"otherExpenses":{"current":0,"prior":0},"repairMaintenance":{"current":0,"prior":0},"distributedIAShare":{"current":5000,"prior":0},"total":{"current":65500,"prior":36000}},"netSurplus":{"current":23000,"prior":-6000},"membersEquity":{"fundBalanceBeginning":{"current":-6000,"prior":0},"netSavingsYear":{"current":23000,"prior":-6000},"fundBalanceEnd":{"current":17000,"prior":-6000}},"officers":{"treasurerName":"RIC UNDAY","auditorName":"ARTUR GUIANG","presidentName":"MEYNARD A. TOMANENG"}},"fs2":{"associationName":"NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.","address":"IPIL, GONZAGA CAGAYAN","secRegNo":"CN202060557","yearCurrent":2025,"yearPrior":2024,"cashFlows":{"netSurplus":{"current":23000,"prior":-6000},"depreciation":{"current":0,"prior":0},"cashBalanceBeginning":{"current":-6000,"prior":0},"cashBalanceEnd":{"current":17000,"prior":-6000}},"financialCondition":{"assets":{"currentAssets":{"current":17000,"prior":-6000},"inventorySupplies":{"current":0,"prior":0},"totalAssets":{"current":17000,"prior":-6000}},"liabilitiesEquity":{"currentLiabilities":{"current":0,"prior":0},"nonCurrentLiabilities":{"current":0,"prior":0},"membersEquity":{"current":17000,"prior":-6000},"totalLiabilitiesEquity":{"current":17000,"prior":-6000}}},"officers":{"treasurerName":"RIC UNDAY","presidentName":"MEYNARD A. TOMANENG"}},"fs3":{"associationName":"NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.","address":"Ipil, Gonzaga, Cagayan","secRegNo":"CN202060557","tinNo":"769-207-601-000","yearEnding":2025,"cashReceipts":{"membershipFees":20000,"annualDues":0,"feesPenalties":3500,"donationsContributions":0,"interestEarned":0,"iaSubsidy":65000,"canalRemuneration":0,"omFee":0,"otherIncome":0,"total":88500},"cashDisbursements":{"registrationPermits":12000,"travelRep":6000,"meetingExpenses":0,"officeSupplies":7500,"salariesWages":20000,"canalClearingRepair":15000,"snacksMeetings":0,"collectionExpenses":0,"miscExpenses":0,"otherExpenses":0,"distributedIAShare":5000,"total":65500},"cashBalanceThisYear":23000,"fundBalanceLastReport":-6000,"totalCashBalance":17000,"composition":{"cashOnHandPetty":2550,"undepositedCollections":0,"cashInBankRegular":9350,"cashInBankCBU":5100,"savingsAccount":0,"currentAccount":0,"total":17000},"officers":{"treasurerName":"RIC UNDAY","auditorName":"ARTUR GUIANG","presidentName":"MEYNARD A. TOMANENG"}},"fs4":{"associationName":"NANGURISAN LAYA FARMERS IRRIGATORS ASSOCIATION, INC.","address":"Ipil, Gonzaga, Cagayan","secRegNo":"CN202060557","tinNo":"769-207-601-000","asOfDate":"December 31, 2025","assets":{"cashOnHand":2550,"cashInBank":14450,"receivables":0,"materialsSuppliesInventory":0,"officeBuilding":0,"totalAssets":17000},"liabilities":{"notarialPermitFees":0,"honorariumWagesPayable":0,"otherAccountsPayable":0,"totalLiabilities":0},"netWorth":17000,"officer":{"treasurerName":"RIC UNDAY","treasurerTin":"440-615-026-000"},"notaryBlock":{"province":"Cagayan","municipality":"Gonzaga","ctcNo":"___________","ctcIssuedOn":"___________","ctcIssuedAt":"Gonzaga"}},"categories_summary":[]}'::jsonb, TRUE, 'user-admin-nlfia', '2026-08-06T06:41:27.143Z', '2026-08-06T06:41:27.143Z')
ON CONFLICT (statement_number) DO NOTHING;

-- ==============================================================================
-- MIGRATION (safe to re-run): enables the 'member' role for the Farmer Members
-- registry. Run this once on EXISTING databases. Fresh installs already get it
-- via the profiles CHECK constraint above, and the app also self-heals via the
-- ensure_iarms_schema() function below when creating members.
-- ==============================================================================
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'treasurer', 'auditor', 'member'));

-- Helper called automatically by the app before inserting members, so the
-- schema always matches even if this migration was never run manually.
CREATE OR REPLACE FUNCTION public.ensure_iarms_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check CHECK (role IN ('super_admin', 'admin', 'treasurer', 'auditor', 'member'));
    PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;
