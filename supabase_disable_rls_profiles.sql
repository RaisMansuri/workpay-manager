-- ============================================================================
-- FIX DATABASE RLS ERROR FOR PROFILES / STAFF CREATION
-- Project: nqnyhqkwskvkstpqjvkv
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nqnyhqkwskvkstpqjvkv/sql/new
-- ============================================================================

-- STEP 1: Disable Row Level Security on 'profiles' table
-- This allows the admin to create staff members, activate/deactivate accounts, and edit profiles without 42501 RLS errors.
ALTER TABLE public.profiles DISABLE ROW LEVEL SECURITY;

-- STEP 2: Sync existing users from auth.users into public.profiles
-- This ensures any staff user (like sulemanAdmin) created previously is immediately visible in the staff list.
INSERT INTO public.profiles (id, full_name, email, role, status, created_at, updated_at)
SELECT 
  u.id,
  COALESCE(u.raw_user_meta_data->>'full_name', SPLIT_PART(u.email, '@', 1), 'Staff User') AS full_name,
  u.email,
  COALESCE(u.raw_user_meta_data->>'role', CASE WHEN u.email ILIKE '%admin%' THEN 'admin' ELSE 'staff' END) AS role,
  'active' AS status,
  COALESCE(u.created_at, NOW()),
  NOW()
FROM auth.users u
ON CONFLICT (id) DO UPDATE SET
  full_name = EXCLUDED.full_name,
  email = EXCLUDED.email,
  role = EXCLUDED.role,
  status = EXCLUDED.status,
  updated_at = NOW();

-- STEP 3: Create automatic database trigger for future signups
-- Automatically creates a profile record in public.profiles whenever any user is created in Supabase Auth.
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, full_name, email, mobile, role, status)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'full_name', SPLIT_PART(NEW.email, '@', 1)),
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'mobile', ''),
    COALESCE(NEW.raw_user_meta_data->>'role', 'staff'),
    'active'
  )
  ON CONFLICT (id) DO UPDATE SET
    full_name = EXCLUDED.full_name,
    email = EXCLUDED.email,
    mobile = COALESCE(EXCLUDED.mobile, public.profiles.mobile),
    role = EXCLUDED.role,
    updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();
