-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - ADMIN UPDATE USER EMAIL RPC FUNCTION
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nqnyhqkwskvkstpqjvkv/sql/new
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_update_user_email(
  p_user_id UUID,
  p_new_email TEXT
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, auth
AS $$
DECLARE
  v_caller_id UUID := auth.uid();
  v_caller_role TEXT;
  v_clean_email TEXT;
  v_email_exists BOOLEAN;
  v_target_user_exists BOOLEAN;
BEGIN
  -- 1. Validate clean email input
  v_clean_email := LOWER(TRIM(COALESCE(p_new_email, '')));
  IF v_clean_email IS NULL OR v_clean_email = '' OR v_clean_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Please provide a valid email address';
  END IF;

  -- 2. Verify caller is authenticated
  IF v_caller_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller must be authenticated';
  END IF;

  -- 3. If caller is updating someone else's email, verify caller is an active Admin
  IF v_caller_id <> p_user_id THEN
    SELECT role INTO v_caller_role 
    FROM public.profiles 
    WHERE id = v_caller_id AND status = 'active';

    IF LOWER(COALESCE(v_caller_role, '')) <> 'admin' THEN
      RAISE EXCEPTION 'Forbidden: Only active Administrators can update other staff email addresses';
    END IF;
  END IF;

  -- 4. Check if target user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_target_user_exists;
  IF NOT v_target_user_exists THEN
    RAISE EXCEPTION 'Target user not found in authentication system';
  END IF;

  -- 5. Check if new email is already in use by another user
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE LOWER(email) = v_clean_email AND id <> p_user_id
  ) INTO v_email_exists;

  IF v_email_exists THEN
    RAISE EXCEPTION 'This email address is already in use by another account';
  END IF;

  -- 6. Update auth.users table (email, raw_user_meta_data, email_confirmed_at)
  UPDATE auth.users
  SET email = v_clean_email,
      raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{email}', to_jsonb(v_clean_email)),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- 7. Update public.profiles table
  UPDATE public.profiles
  SET email = v_clean_email,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Email address updated successfully',
    'email', v_clean_email
  );
END;
$$;

-- Grant execution permission to authenticated users
GRANT EXECUTE ON FUNCTION public.admin_update_user_email(UUID, TEXT) TO authenticated;
