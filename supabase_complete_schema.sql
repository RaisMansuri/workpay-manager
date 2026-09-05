-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - COMPLETE SYSTEM DATABASE SCHEMA
-- Execute this single SQL script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/editor
-- ============================================================================

-- 1. Create Profiles Table (Linked to auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT NOT NULL,
  mobile TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  last_login_at TIMESTAMPTZ,
  last_logout_at TIMESTAMPTZ
);

-- 2. Create Customer Records Table (With Audit UUID Columns)
CREATE TABLE IF NOT EXISTS public.customer_records (
  id VARCHAR(50) PRIMARY KEY,
  customer_name VARCHAR(255) NOT NULL,
  mobile_number VARCHAR(15) NOT NULL,
  address TEXT,
  service_type VARCHAR(255) NOT NULL,
  requirement VARCHAR(100),
  work_description TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  paid_amount NUMERIC(10, 2) NOT NULL DEFAULT 0,
  remaining_balance NUMERIC(10, 2) NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  created_by UUID CONSTRAINT customer_records_created_by_fkey REFERENCES public.profiles(id) ON DELETE SET NULL,
  updated_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL
);

-- Ensure created_by, updated_by, and requirement exist if table was previously created
ALTER TABLE public.customer_records ADD COLUMN IF NOT EXISTS created_by UUID;
ALTER TABLE public.customer_records ADD COLUMN IF NOT EXISTS updated_by UUID;
ALTER TABLE public.customer_records ADD COLUMN IF NOT EXISTS requirement VARCHAR(100);
ALTER TABLE public.customer_records DROP CONSTRAINT IF EXISTS customer_records_created_by_fkey;
ALTER TABLE public.customer_records ADD CONSTRAINT customer_records_created_by_fkey FOREIGN KEY (created_by) REFERENCES public.profiles(id) ON DELETE SET NULL;

-- 3. Create Performance Indexes
CREATE INDEX IF NOT EXISTS idx_customer_name ON public.customer_records(customer_name);
CREATE INDEX IF NOT EXISTS idx_mobile_number ON public.customer_records(mobile_number);
CREATE INDEX IF NOT EXISTS idx_status ON public.customer_records(status);
CREATE INDEX IF NOT EXISTS idx_created_at ON public.customer_records(created_at);
CREATE INDEX IF NOT EXISTS idx_created_by ON public.customer_records(created_by);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);
CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);

-- 4. Security Helper Function (Bypasses RLS recursion)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND LOWER(role) = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 5. Row Level Security Policies for `profiles` Table
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins and self profile access" ON public.profiles;
CREATE POLICY "Admins and self profile access"
  ON public.profiles FOR ALL
  USING (
    auth.uid() = id OR public.is_admin() OR auth.role() = 'service_role'
  );

-- 6. Row Level Security Policies for `customer_records` Table
ALTER TABLE public.customer_records ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Admins full customer access" ON public.customer_records;
CREATE POLICY "Admins full customer access"
  ON public.customer_records FOR ALL
  USING (
    public.is_admin() OR auth.role() = 'service_role'
  );

DROP POLICY IF EXISTS "Staff select customer records" ON public.customer_records;
CREATE POLICY "Staff select customer records"
  ON public.customer_records FOR SELECT
  USING (
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Staff insert customer records" ON public.customer_records;
CREATE POLICY "Staff insert customer records"
  ON public.customer_records FOR INSERT
  WITH CHECK (
    auth.role() = 'authenticated'
  );

DROP POLICY IF EXISTS "Staff update customer records" ON public.customer_records;
CREATE POLICY "Staff update customer records"
  ON public.customer_records FOR UPDATE
  USING (
    auth.role() = 'authenticated'
  );

-- 7. Automatic Profile Creation Trigger on Auth User Creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    COALESCE(NEW.raw_user_meta_data->>'status', 'active')
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    full_name = EXCLUDED.full_name,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 8. Enable Supabase Realtime for Multi-User Live Sync
ALTER PUBLICATION supabase_realtime ADD TABLE public.customer_records;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
