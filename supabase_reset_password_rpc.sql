-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - ADMIN PASSWORD RESET RPC FUNCTION
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nqnyhqkwskvkstpqjvkv/editor
-- ============================================================================

-- 1. Ensure pgcrypto extension is active in extensions schema for crypt() & gen_salt()
CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- 2. Create the SECURITY DEFINER RPC function for Admin password reset
CREATE OR REPLACE FUNCTION public.admin_reset_user_password(
  p_user_id UUID,
  p_new_password TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_target_user_exists BOOLEAN;
BEGIN
  -- 1. Verify caller is authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller must be authenticated to reset passwords';
  END IF;

  -- 2. If caller is resetting someone else's password, verify caller is an active Admin
  IF v_caller_id <> p_user_id THEN
    SELECT role INTO v_caller_role 
    FROM public.profiles 
    WHERE id = v_caller_id AND status = 'active';

    IF LOWER(COALESCE(v_caller_role, '')) <> 'admin' THEN
      RAISE EXCEPTION 'Forbidden: Only active Administrators can reset other staff passwords';
    END IF;
  END IF;

  -- 3. Validate password length
  IF p_new_password IS NULL OR LENGTH(p_new_password) < 6 THEN
    RAISE EXCEPTION 'Password must be at least 6 characters long';
  END IF;

  -- 4. Check if target user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_target_user_exists;
  IF NOT v_target_user_exists THEN
    RAISE EXCEPTION 'Target user not found in authentication system';
  END IF;

  -- 5. Update encrypted password directly in auth.users using bcrypt
  UPDATE auth.users
  SET encrypted_password = extensions.crypt(p_new_password, extensions.gen_salt('bf')),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- 6. Update updated_at timestamp in public.profiles table
  UPDATE public.profiles
  SET updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Password updated successfully'
  );
END;
$$;

-- 3. Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_reset_user_password(UUID, TEXT) TO authenticated;
