-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - AUTHENTICATION & PROFILES SCHEMA
-- Run this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nqnyhqkwskvkstpqjvkv/editor
-- ============================================================================

-- 1. Create Profiles Table
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  full_name TEXT NOT NULL,
  email TEXT,
  mobile TEXT,
  role TEXT NOT NULL DEFAULT 'staff',
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  last_login_at TIMESTAMP WITH TIME ZONE,
  last_logout_at TIMESTAMP WITH TIME ZONE
);

-- 2. Security Helper & Enable Row Level Security (RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- 3. Row Level Security Policies
DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
CREATE POLICY "Users can view own profile"
  ON public.profiles FOR SELECT
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Users can update own profile" ON public.profiles;
CREATE POLICY "Users can update own profile"
  ON public.profiles FOR UPDATE
  USING (auth.uid() = id OR public.is_admin());

DROP POLICY IF EXISTS "Enable insert for profiles" ON public.profiles;
CREATE POLICY "Enable insert for profiles"
  ON public.profiles FOR INSERT
  WITH CHECK (auth.uid() = id OR auth.role() = 'authenticated' OR auth.role() = 'service_role');

-- 4. Automatic Profile Creation Trigger on Auth User Registration
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- 5. Seed initial profiles for existing users if any exist in auth.users
INSERT INTO public.profiles (id, full_name, email, role, status)
SELECT 
  id,
  COALESCE(raw_user_meta_data->>'full_name', SPLIT_PART(email, '@', 1)),
  email,
  CASE WHEN email LIKE '%admin%' THEN 'admin' ELSE 'staff' END,
  'active'
FROM auth.users
ON CONFLICT (id) DO NOTHING;
