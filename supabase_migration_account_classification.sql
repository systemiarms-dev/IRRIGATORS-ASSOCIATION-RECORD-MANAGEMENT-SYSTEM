-- ==============================================================================
-- IARMS Migration: Add 'account_classification' to 'budget_categories' Table
-- Irrigators Association Record Management System (IARMS)
-- ==============================================================================
-- Instructions:
-- 1. Open your Supabase Dashboard: https://supabase.com/dashboard/project/hbsdofevepvnnngzmjry
-- 2. Go to the "SQL Editor" tab on the left sidebar.
-- 3. Click "New Query", paste this entire script, and click "Run".
-- ==============================================================================

-- Step 1: Add the 'account_classification' column if it does not already exist
ALTER TABLE public.budget_categories 
ADD COLUMN IF NOT EXISTS account_classification VARCHAR(50);

-- Step 2: Populate account_classification from any existing [class:...] tags in description
UPDATE public.budget_categories
SET account_classification = substring(description from '\[class:([a-z_]+)\]')
WHERE description LIKE '%[class:%' 
  AND (account_classification IS NULL OR account_classification = '');

-- Step 3: Default any remaining records without classification to their category_type
UPDATE public.budget_categories
SET account_classification = category_type
WHERE account_classification IS NULL OR account_classification = '';

-- Step 4: Notify PostgREST to immediately refresh its schema cache
NOTIFY pgrst, 'reload schema';

-- Verification Query (Run this to confirm the column exists and records are classified):
SELECT id, code, name, category_type, account_classification 
FROM public.budget_categories 
ORDER BY code 
LIMIT 10;
