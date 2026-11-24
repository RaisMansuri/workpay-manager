-- ============================================================================
-- SEVA KENDRA / SEVADESK - SYNC PROFILES EMAIL TO SUPABASE AUTH.USERS
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/nqnyhqkwskvkstpqjvkv/sql/new
-- ============================================================================

-- 1. Automatic Trigger: Whenever 'email' in public.profiles is updated, 
--    immediately sync the new email into Supabase auth.users table.
CREATE OR REPLACE FUNCTION public.sync_profile_email_to_auth()
RETURNS TRIGGER AS $$
DECLARE
  v_clean_email TEXT;
  v_exists BOOLEAN;
BEGIN
  v_clean_email := LOWER(TRIM(NEW.email));

  IF v_clean_email IS NOT NULL AND v_clean_email <> '' AND (OLD.email IS NULL OR v_clean_email <> LOWER(TRIM(OLD.email))) THEN
    -- Check if email is already used by another user in auth.users
    SELECT EXISTS (
      SELECT 1 FROM auth.users 
      WHERE LOWER(email) = v_clean_email AND id <> NEW.id
    ) INTO v_exists;

    IF v_exists THEN
      RAISE EXCEPTION 'Email % is already in use by another authentication account', v_clean_email;
    END IF;

    -- Update auth.users email, raw_user_meta_data, and mark confirmed
    UPDATE auth.users
    SET email = v_clean_email,
        raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{email}', to_jsonb(v_clean_email)),
        email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
        updated_at = NOW()
    WHERE id = NEW.id;
  END IF;

  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public, auth, extensions;

-- Drop existing trigger if present and re-create
DROP TRIGGER IF EXISTS trigger_sync_profile_email ON public.profiles;

CREATE TRIGGER trigger_sync_profile_email
AFTER UPDATE OF email ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.sync_profile_email_to_auth();


-- 2. Dedicated RPC Function for Admin Email Updates
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
  v_clean_email TEXT;
  v_email_exists BOOLEAN;
  v_target_user_exists BOOLEAN;
BEGIN
  -- Validate clean email input
  v_clean_email := LOWER(TRIM(COALESCE(p_new_email, '')));
  IF v_clean_email IS NULL OR v_clean_email = '' OR v_clean_email NOT LIKE '%@%.%' THEN
    RAISE EXCEPTION 'Please provide a valid email address';
  END IF;

  -- Check if target user exists in auth.users
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = p_user_id) INTO v_target_user_exists;
  IF NOT v_target_user_exists THEN
    RAISE EXCEPTION 'Target user not found in authentication system';
  END IF;

  -- Check if new email is already in use by another user
  SELECT EXISTS(
    SELECT 1 FROM auth.users WHERE LOWER(email) = v_clean_email AND id <> p_user_id
  ) INTO v_email_exists;

  IF v_email_exists THEN
    RAISE EXCEPTION 'This email address is already in use by another account';
  END IF;

  -- Update auth.users table
  UPDATE auth.users
  SET email = v_clean_email,
      raw_user_meta_data = jsonb_set(COALESCE(raw_user_meta_data, '{}'::jsonb), '{email}', to_jsonb(v_clean_email)),
      email_confirmed_at = COALESCE(email_confirmed_at, NOW()),
      updated_at = NOW()
  WHERE id = p_user_id;

  -- Update public.profiles table
  UPDATE public.profiles
  SET email = v_clean_email,
      updated_at = NOW()
  WHERE id = p_user_id;

  RETURN jsonb_build_object(
    'success', true, 
    'message', 'Email address updated successfully in both Auth and Profiles',
    'email', v_clean_email
  );
END;
$$;

-- Grant execution permissions
GRANT EXECUTE ON FUNCTION public.admin_update_user_email(UUID, TEXT) TO authenticated, service_role, anon;
GRANT EXECUTE ON FUNCTION public.sync_profile_email_to_auth() TO authenticated, service_role, anon;


-- 3. IMMEDIATE ONE-TIME SYNC:
-- Synchronize any existing profiles that currently differ from auth.users (e.g. sevadesk11@gmail.com)
UPDATE auth.users u
SET email = LOWER(TRIM(p.email)),
    raw_user_meta_data = jsonb_set(COALESCE(u.raw_user_meta_data, '{}'::jsonb), '{email}', to_jsonb(LOWER(TRIM(p.email)))),
    email_confirmed_at = COALESCE(u.email_confirmed_at, NOW()),
    updated_at = NOW()
FROM public.profiles p
WHERE u.id = p.id 
  AND p.email IS NOT NULL 
  AND p.email <> '' 
  AND LOWER(TRIM(u.email)) <> LOWER(TRIM(p.email));
