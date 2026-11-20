-- ============================================================================
-- SEVA KENDRA MANAGEMENT SYSTEM - ADMIN DELETE STAFF USER RPC
-- Allows authenticated Admin to permanently delete a staff member
-- Removes the user from both public.profiles and auth.users safely
-- Execute this script in your Supabase SQL Editor:
-- https://supabase.com/dashboard/project/_/sql/new
-- ============================================================================

CREATE OR REPLACE FUNCTION public.admin_delete_staff_user(p_user_id UUID)
RETURNS BOOLEAN AS $$
DECLARE
  v_admin_id UUID;
  v_is_admin BOOLEAN := FALSE;
BEGIN
  -- 1. Check if caller is authenticated admin
  v_admin_id := auth.uid();
  IF v_admin_id IS NULL THEN
    RAISE EXCEPTION 'Unauthorized: Caller is not authenticated';
  END IF;

  SELECT (LOWER(role) = 'admin' AND status = 'active') INTO v_is_admin
  FROM public.profiles
  WHERE id = v_admin_id;

  IF v_is_admin IS NOT TRUE THEN
    RAISE EXCEPTION 'Forbidden: Only active administrators can delete staff members';
  END IF;

  -- 2. Safety: Cannot delete oneself
  IF v_admin_id = p_user_id THEN
    RAISE EXCEPTION 'Safety check failed: You cannot delete your own admin account';
  END IF;

  -- 3. Safety: Cannot delete any other admin account
  IF EXISTS (SELECT 1 FROM public.profiles WHERE id = p_user_id AND LOWER(role) = 'admin') THEN
    RAISE EXCEPTION 'Safety check failed: Admin accounts cannot be deleted';
  END IF;

  -- 4. Safely set created_by / updated_by to NULL on customer records so history remains intact
  UPDATE public.customer_records SET created_by = NULL WHERE created_by = p_user_id;
  UPDATE public.customer_records SET updated_by = NULL WHERE updated_by = p_user_id;

  -- 5. Delete from public.profiles and auth.users
  DELETE FROM public.profiles WHERE id = p_user_id;
  DELETE FROM auth.users WHERE id = p_user_id;

  RETURN TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
