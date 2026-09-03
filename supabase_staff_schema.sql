-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - PHASE 2: STAFF MANAGEMENT & RLS SCHEMA
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nqnyhqkwskvkstpqjvkv/editor
-- ============================================================================

-- 1. Ensure `created_by` column exists on `customer_records`
ALTER TABLE public.customer_records 
ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES auth.users(id);

-- 2. Ensure profiles table has mobile and status columns
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS mobile TEXT,
ADD COLUMN IF NOT EXISTS status TEXT NOT NULL DEFAULT 'active';

-- 3. Security Helper & Row Level Security Policies for profiles table
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins have full profile access" ON public.profiles;
CREATE POLICY "Admins have full profile access"
  ON public.profiles FOR ALL
  USING (
    auth.uid() = id OR public.is_admin()
  );

-- 4. Row Level Security Policies for customer_records table
ALTER TABLE public.customer_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full customer access" ON public.customer_records;
CREATE POLICY "Admins full customer access"
  ON public.customer_records FOR ALL
  USING (
    EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
  );

DROP POLICY IF EXISTS "Staff read insert own customer records" ON public.customer_records;
CREATE POLICY "Staff read insert own customer records"
  ON public.customer_records FOR SELECT
  USING (
    created_by = auth.uid() OR created_by IS NULL
  );

DROP POLICY IF EXISTS "Staff insert own customer records" ON public.customer_records;
CREATE POLICY "Staff insert own customer records"
  ON public.customer_records FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Staff update own customer records" ON public.customer_records;
CREATE POLICY "Staff update own customer records"
  ON public.customer_records FOR UPDATE
  USING (
    created_by = auth.uid() OR created_by IS NULL
  );

-- Note: No DELETE policy is granted to 'staff' role. Staff users cannot delete records.
