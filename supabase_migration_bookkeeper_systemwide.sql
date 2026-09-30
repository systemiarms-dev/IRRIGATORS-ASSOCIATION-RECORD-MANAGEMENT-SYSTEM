-- =====================================================================
-- IARMS Migration: Bookkeeper = SINGLE system-wide, view-only account
-- =====================================================================
-- The Bookkeeper is now one authorized account for the whole system:
--   * association_id = NULL (belongs to no single IA)
--   * MAY view the financial reports and records of EVERY association
--   * MAY NOT create, edit, delete, or modify any data
--
-- Run this in the Supabase SQL Editor on existing databases.
-- (No CHECK constraint change is needed: 'bookkeeper' is already allowed by
--  profiles_role_check -- see supabase_migration_bookkeeper.sql)
-- =====================================================================

-- 1) Detach every Bookkeeper profile from its association so the account is
--    system-wide. The application also enforces global read scope by role, so
--    this step only keeps the stored data consistent with the new model.
UPDATE public.profiles
SET association_id = NULL,
    updated_at   = NOW()
WHERE role = 'bookkeeper';

-- 2) Review every Bookkeeper account. The system allows only ONE.
SELECT id, username, full_name, association_id, created_at
FROM public.profiles
WHERE role = 'bookkeeper'
ORDER BY created_at;

-- 3) OPTIONAL & DESTRUCTIVE: keep exactly one Bookkeeper and remove the
--    per-association duplicates that association provisioning used to create.
--    (The live system now uses the single account 'iabookkeeper'.)
--    (All foreign keys pointing at profiles are ON DELETE SET NULL, so this
--    will not remove transactions, receipts, or statements.)
--
-- DELETE FROM public.profiles
-- WHERE role = 'bookkeeper'
--   AND username <> 'iabookkeeper';

-- 4) If NO Bookkeeper account exists yet, create one from the Super Admin's
--    User Account Manager (System Bookkeeper option). Passwords are hashed by
--    the application, so the account cannot be seeded safely from raw SQL.
