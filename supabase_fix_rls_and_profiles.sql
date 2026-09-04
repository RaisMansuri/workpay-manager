-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - COMPLETE DATABASE FIX SCRIPT
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/editor
-- ============================================================================

-- ----------------------------------------------------------------------------
-- STEP 1: FIX PROFILES ROW LEVEL SECURITY (RLS) POLICIES
-- Allow all authenticated users (and anon) to view staff profiles for dropdowns & creator joins.
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Allow profile read access" ON public.profiles;
DROP POLICY IF EXISTS "Admins and self profile access" ON public.profiles;
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;

CREATE POLICY "Allow authenticated read profiles"
  ON public.profiles FOR SELECT
  USING (true);

DROP POLICY IF EXISTS "Allow self and admin profile modification" ON public.profiles;
CREATE POLICY "Allow self and admin profile modification"
  ON public.profiles FOR ALL
  USING (
    auth.uid() = id OR public.is_admin() OR auth.role() = 'service_role'
  );

-- ----------------------------------------------------------------------------
-- STEP 2: SYNC PROFILES FROM AUTH.USERS
-- Ensure every user in auth.users has a corresponding row in public.profiles with matching id.
-- ----------------------------------------------------------------------------
INSERT INTO public.profiles (id, full_name, email, role, status, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1), 'User') AS full_name,
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', CASE WHEN u.email ILIKE '%admin%' THEN 'admin' ELSE 'staff' END) AS role,
  'active' AS status,
  u.created_at,
  NOW()
FROM auth.users u
ON CONFLICT (id) DO UPDATE 
SET 
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  updated_at = NOW()
WHERE public.profiles.full_name IS NULL OR public.profiles.email IS NULL;

-- ----------------------------------------------------------------------------
-- STEP 3: ENSURE FOREIGN KEY CONSTRAINT ON CUSTOMER_RECORDS
-- customer_records.created_by -> profiles.id
-- ----------------------------------------------------------------------------
ALTER TABLE public.customer_records 
  ADD COLUMN IF NOT EXISTS created_by UUID,
  ADD COLUMN IF NOT EXISTS updated_by UUID;

ALTER TABLE public.customer_records 
  DROP CONSTRAINT IF EXISTS customer_records_created_by_fkey;

ALTER TABLE public.customer_records 
  ADD CONSTRAINT customer_records_created_by_fkey 
  FOREIGN KEY (created_by) 
  REFERENCES public.profiles(id) 
  ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_customer_records_created_by ON public.customer_records(created_by);

-- ----------------------------------------------------------------------------
-- STEP 4: BACKFILL EXISTING CUSTOMER RECORDS
-- Fix customer_records where created_by is NULL or refers to a missing profile ID.
-- ----------------------------------------------------------------------------
DO $$
DECLARE
  primary_admin_id UUID;
BEGIN
  -- 1. Find the first active Admin profile ID
  SELECT id INTO primary_admin_id 
  FROM public.profiles 
  WHERE LOWER(role) = 'admin' AND status = 'active' 
  ORDER BY created_at ASC 
  LIMIT 1;

  -- If no admin role profile exists, take the first profile available
  IF primary_admin_id IS NULL THEN
    SELECT id INTO primary_admin_id FROM public.profiles LIMIT 1;
  END IF;

  IF primary_admin_id IS NOT NULL THEN
    -- Update NULL or unmatched created_by values to primary_admin_id
    UPDATE public.customer_records 
    SET created_by = primary_admin_id 
    WHERE created_by IS NULL 
       OR created_by NOT IN (SELECT id FROM public.profiles);
       
    RAISE NOTICE 'Successfully backfilled records with missing creator to Profile ID: %', primary_admin_id;
  ELSE
    RAISE NOTICE 'No profile records found for backfill. Please create a user in Supabase Auth first.';
  END IF;
END $$;
