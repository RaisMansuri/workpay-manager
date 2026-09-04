-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - CREATED BY & PROFILES FK MIGRATION
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/editor
-- ============================================================================

-- 1. Ensure customer_records table has created_by and updated_by columns of type UUID
ALTER TABLE public.customer_records 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

-- 2. Drop existing constraint if it existed with a different target or name
ALTER TABLE public.customer_records 
  DROP CONSTRAINT IF EXISTS customer_records_created_by_fkey;

-- 3. Add explicit Foreign Key constraint referencing public.profiles(id)
ALTER TABLE public.customer_records 
  ADD CONSTRAINT customer_records_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

-- 4. Add index on created_by for performance during joins and filtering
CREATE INDEX IF NOT EXISTS idx_customer_records_created_by ON public.customer_records(created_by);

-- 5. Optional Backfill for Existing Old Records with NULL created_by:
-- Map records with NULL created_by to the primary Admin user in profiles
DO $$
DECLARE
  admin_id UUID;
BEGIN
  -- Find the first active admin user ID
  SELECT id INTO admin_id FROM public.profiles WHERE LOWER(role) = 'admin' AND status = 'active' LIMIT 1;
  
  IF admin_id IS NOT NULL THEN
    -- Update NULL created_by values to admin_id
    UPDATE public.customer_records 
    SET created_by = admin_id 
    WHERE created_by IS NULL;
    
    RAISE NOTICE 'Backfilled records with missing created_by to Admin ID: %', admin_id;
  ELSE
    RAISE NOTICE 'No active admin profile found for backfill.';
  END IF;
END $$;
