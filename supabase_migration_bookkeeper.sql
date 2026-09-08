-- ==============================================================================
-- IARMS Migration: Add 'bookkeeper' Role to Supabase PostgreSQL Database
-- Irrigators Association Record Management System
-- ==============================================================================

-- 1. Drop existing role check constraint and re-add with 'bookkeeper'
ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
    CHECK (role IN ('super_admin', 'admin', 'bookkeeper', 'treasurer', 'auditor', 'member'));

-- 2. Update ensure_iarms_schema() self-healing helper
CREATE OR REPLACE FUNCTION public.ensure_iarms_schema()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
    ALTER TABLE public.profiles DROP CONSTRAINT IF EXISTS profiles_role_check;
    ALTER TABLE public.profiles ADD CONSTRAINT profiles_role_check 
        CHECK (role IN ('super_admin', 'admin', 'bookkeeper', 'treasurer', 'auditor', 'member'));
    PERFORM pg_notify('pgrst', 'reload schema');
END;
$$;

-- 3. Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';
