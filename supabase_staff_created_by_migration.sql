-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - STAFF CREATED_BY COLUMN & SERVER DERIVATION
-- Safe Migration: Adds nullable created_by UUID referencing auth.users(id)
-- Project: nqnyhqkwskvkstpqjvkv
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nqnyhqkwskvkstpqjvkv/sql/new
-- ============================================================================

-- ----------------------------------------------------------------------------
-- 1. ADD NULLABLE created_by COLUMN REFERENCING auth.users(id)
-- ----------------------------------------------------------------------------
-- Adds a nullable UUID column named created_by referencing auth.users(id).
-- Safe: Uses IF NOT EXISTS to prevent errors if already added.
-- Existing staff records remain intact with created_by = NULL (never backfilled with guessed IDs).
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL;

-- Create index on created_by for fast filtering, joins, and lookup
CREATE INDEX IF NOT EXISTS idx_profiles_created_by ON public.profiles(created_by);

-- ----------------------------------------------------------------------------
-- 2. SECURITY HELPER: is_admin() FUNCTION
-- ----------------------------------------------------------------------------
-- Evaluates whether the current authenticated session caller is an Admin.
-- Uses SECURITY DEFINER to bypass RLS recursion safely.
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 
    FROM public.profiles 
    WHERE id = auth.uid() 
      AND LOWER(role) = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 3. SERVER-SIDE TRIGGER: DERIVE & ENFORCE created_by FROM AUTHENTICATED SESSION
-- ----------------------------------------------------------------------------
-- Automatically derives the Admin UUID on the server from auth.uid().
-- Never trusts a created_by value supplied by the client.
-- Ensures the staff member's own UUID is NEVER stored in created_by.
CREATE OR REPLACE FUNCTION public.set_profile_created_by()
RETURNS TRIGGER AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- Derive the authenticated caller's UUID directly from the server session
  v_admin_id := auth.uid();

  -- Verify caller is authenticated, is NOT the staff member themselves, and is an Admin
  IF v_admin_id IS NOT NULL AND v_admin_id <> NEW.id THEN
    SELECT (LOWER(role) = 'admin') INTO v_is_admin
    FROM public.profiles
    WHERE id = v_admin_id;

    IF v_is_admin IS TRUE THEN
      -- Automatically store the Admin's verified Supabase Auth UUID
      NEW.created_by := v_admin_id;
    END IF;
  END IF;

  -- On UPDATE: Always preserve existing created_by value (never overwrite or reset to NULL)
  IF TG_OP = 'UPDATE' THEN
    IF OLD.created_by IS NOT NULL THEN
      NEW.created_by := OLD.created_by;
    END IF;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS trg_set_profile_created_by ON public.profiles;
CREATE TRIGGER trg_set_profile_created_by
  BEFORE INSERT OR UPDATE ON public.profiles
  FOR EACH ROW
  EXECUTE FUNCTION public.set_profile_created_by();

-- ----------------------------------------------------------------------------
-- 4. SERVER RPC FUNCTION: create_staff_profile
-- ----------------------------------------------------------------------------
-- Dedicated server function to safely create or update staff profiles.
-- Derives the Admin UUID strictly from the verified session (auth.uid()).
-- Does not accept created_by as an input parameter from the client.
CREATE OR REPLACE FUNCTION public.create_staff_profile(
  p_id UUID,
  p_full_name TEXT,
  p_email TEXT,
  p_mobile TEXT DEFAULT '',
  p_role TEXT DEFAULT 'staff',
  p_status TEXT DEFAULT 'active'
)
RETURNS JSONB AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN := FALSE;
  v_result JSONB;
BEGIN
  -- 1. Derive Admin UUID from verified session on the server
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: User is not authenticated';
  END IF;

  -- 2. Verify caller is an Admin
  SELECT (LOWER(role) = 'admin') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: Only authenticated admins can create staff members';
  END IF;

  -- 3. Ensure staff ID is not the admin's own ID
  IF p_id = v_admin_id THEN
    RAISE EXCEPTION 'Invalid operation: Admin cannot be set as staff';
  END IF;

  -- 4. Insert or update public.profiles with created_by set to the verified Admin UUID
  INSERT INTO public.profiles (
    id, full_name, email, mobile, role, status, created_by, created_at, updated_at
  ) VALUES (
    p_id,
    p_full_name,
    p_email,
    COALESCE(p_mobile, ''),
    COALESCE(p_role, 'staff'),
    COALESCE(p_status, 'active'),
    v_admin_id,
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    mobile = COALESCE(EXCLUDED.mobile, public.profiles.mobile),
    role = EXCLUDED.role,
    status = EXCLUDED.status,
    created_by = COALESCE(public.profiles.created_by, v_admin_id),
    updated_at = NOW();

  SELECT to_jsonb(p) INTO v_result FROM public.profiles p WHERE id = p_id;
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ----------------------------------------------------------------------------
-- 5. PRESERVE ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
-- Ensure RLS is enabled on public.profiles (never disabled)
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to view profiles (needed for dropdowns & customer lists)
DROP POLICY IF EXISTS "Allow authenticated read profiles" ON public.profiles;
CREATE POLICY "Allow authenticated read profiles"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (true);

-- Allow admins full access and users to update their own profile
DROP POLICY IF EXISTS "Allow admin and self profile management" ON public.profiles;
CREATE POLICY "Allow admin and self profile management"
  ON public.profiles FOR ALL
  TO authenticated
  USING (
    public.is_admin() OR auth.uid() = id
  )
  WITH CHECK (
    public.is_admin() OR auth.uid() = id
  );

-- Service role bypass policy for backend scripts
DROP POLICY IF EXISTS "Service role profile access" ON public.profiles;
CREATE POLICY "Service role profile access"
  ON public.profiles FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- ----------------------------------------------------------------------------
-- 6. PARTIAL FAILURE CLEANUP RPC FUNCTION: cleanup_failed_staff_signup
-- ----------------------------------------------------------------------------
-- If Auth user creation succeeds but profile insertion fails, this safe server
-- function allows an authenticated Admin to rollback the newly created auth user,
-- preventing orphaned auth accounts from blocking re-registration with that email.
CREATE OR REPLACE FUNCTION public.cleanup_failed_staff_signup(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- 1. Verify caller is an authenticated Admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated';
  END IF;

  SELECT (LOWER(role) = 'admin' AND status = 'active') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: Only authenticated admins can clean up failed staff registrations';
  END IF;

  -- 2. Safety checks: Never delete admin accounts or accounts with customer records
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND LOWER(role) = 'admin') THEN
    RAISE EXCEPTION 'Safety check failed: Cannot delete admin accounts';
  END IF;

  IF EXISTS (SELECT 1 FROM public.customer_records WHERE created_by = p_user_id) THEN
    RAISE EXCEPTION 'Safety check failed: User has existing customer records';
  END IF;

  -- 3. Delete from public.profiles and auth.users
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

