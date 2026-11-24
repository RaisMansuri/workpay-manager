import { supabase, secondarySupabase, isSupabaseConfigured } from '../config/supabaseClient';

let inFlightStaffListPromise = null;

export const staffService = {
  /**
   * Fetch all staff members dynamically from Supabase `profiles` table
   */
  async getStaffListAsync() {
    if (inFlightStaffListPromise) {
      return inFlightStaffListPromise;
    }

    inFlightStaffListPromise = (async () => {
      try {
        if (!isSupabaseConfigured() || !supabase) {
          console.warn('Supabase is not configured.');
          const cached = typeof window !== 'undefined' ? localStorage.getItem('workpay_cached_staff_profiles') : null;
          return cached ? JSON.parse(cached) : [];
        }

        // 1. Primary query with created_at ordering
        let { data, error } = await supabase
          .from('profiles')
          .select('*')
          .order('created_at', { ascending: false });

        // 2. Fallback query without ordering if created_at column causes error
        if (error) {
          console.warn('Primary fetch with created_at order failed, trying fallback select without order:', error.message);
          const fallback = await supabase.from('profiles').select('*');
          if (!fallback.error) {
            data = fallback.data;
            error = null;
          }
        }

        if (error) {
          console.error('Error fetching staff list from Supabase profiles table:', error);
          const cached = typeof window !== 'undefined' ? localStorage.getItem('workpay_cached_staff_profiles') : null;
          return cached ? JSON.parse(cached) : [];
        }

        if (data && data.length > 0 && typeof window !== 'undefined') {
          localStorage.setItem('workpay_cached_staff_profiles', JSON.stringify(data));
        }

        return data || [];
      } catch (err) {
        console.error('Failed to get staff list (exception):', err);
        const cached = typeof window !== 'undefined' ? localStorage.getItem('workpay_cached_staff_profiles') : null;
        return cached ? JSON.parse(cached) : [];
      } finally {
        inFlightStaffListPromise = null;
      }
    })();

    return inFlightStaffListPromise;
  },

  /**
   * Create a new Staff Member dynamically in Supabase Auth + `profiles` table
   * Flow:
   *  Step 1: Validate input fields
   *  Step 2: Call Supabase Auth signup (using singleton secondary client)
   *  Step 3: Wait for Auth response
   *  Step 4: Only if Auth user creation is successful, create record in public.profiles
   *  Step 5: Refresh live staff list from database
   *  Step 6: Return result to close modal & show success toast
   */
  async createStaffAsync(staffData) {
    const { fullName, email, mobile, password, role = 'staff', status = 'active' } = staffData;
    const cleanEmail = (email || '').trim().toLowerCase();
    const nowISO = new Date().toISOString();

    // Step 1: Validate input fields
    if (!cleanEmail || !fullName || !password) {
      return { success: false, error: 'Name, Email, and Password are required fields.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      // Step 2 & 3: Call Supabase Auth signup via singleton secondary client and await response
      const clientToUse = secondarySupabase || supabase;
      const { data: authData, error: authError } = await clientToUse.auth.signUp({
        email: cleanEmail,
        password: password,
        options: {
          data: {
            full_name: fullName,
            role: role,
            mobile: mobile
          }
        }
      });

      // Handle Rate Limits (HTTP 429 / Email Rate Limit Exceeded)
      if (authError) {
        const msg = authError.message || '';
        const isRateLimit =
          authError.status === 429 ||
          msg.includes('429') ||
          msg.toLowerCase().includes('rate limit') ||
          msg.toLowerCase().includes('too many requests') ||
          msg.toLowerCase().includes('security purposes');

        if (isRateLimit) {
          console.warn('Supabase Auth signup rate limit:', msg);
          // Requirement 8: Do not create profiles record, do not retry automatically.
          return {
            success: false,
            error: 'Too many signup requests. Please wait a moment and try again.'
          };
        }

        // Other Auth Signup Errors
        if (!authData?.user) {
          return {
            success: false,
            error: authError.message || 'Failed to create user account in Supabase Auth.'
          };
        }
      }

      const createdUser = authData?.user;
      if (!createdUser?.id) {
        return {
          success: false,
          error: 'Auth user creation failed. No user ID returned.'
        };
      }

      // Step 4: Create or update staff record in public.profiles.
      // The Admin UUID is derived on the server from the verified session (auth.uid()).
      // We never trust a created_by value supplied by the client.
      let profileRecord = {
        id: createdUser.id,
        full_name: fullName,
        email: cleanEmail,
        mobile: mobile || '',
        role: role,
        status: status,
        created_at: nowISO,
        updated_at: nowISO
      };

      let profileError = null;

      // 1. Primary Method: Call server RPC which derives Admin UUID directly from auth.uid()
      const { data: rpcProfile, error: rpcErr } = await supabase.rpc('create_staff_profile', {
        p_id: createdUser.id,
        p_full_name: fullName,
        p_email: cleanEmail,
        p_mobile: mobile || '',
        p_role: role,
        p_status: status
      });

      if (!rpcErr && rpcProfile) {
        profileRecord = rpcProfile;
      } else {
        if (rpcErr) {
          console.warn('create_staff_profile RPC notice (falling back to trigger-secured upsert):', rpcErr.message);
        }

        // 2. Fallback: Authenticated admin client upsert. The server trigger trg_set_profile_created_by
        // automatically intercepts this upsert on the server and assigns created_by = auth.uid().
        const { error: upsertErr } = await supabase
          .from('profiles')
          .upsert(profileRecord, { onConflict: 'id' });

        if (upsertErr) {
          profileError = upsertErr;
        }
      }

      if (profileError) {
        console.error('Profiles table insertion failed after Auth signup:', profileError.message);

        // Safe partial failure handling (Task 6):
        // Attempt to rollback the orphaned auth user so the email isn't permanently trapped in auth.users
        let cleanedUp = false;
        try {
          const { data: cleanRes, error: cleanErr } = await supabase.rpc('cleanup_failed_staff_signup', {
            p_user_id: createdUser.id
          });
          if (!cleanErr && cleanRes) {
            cleanedUp = true;
          }
        } catch (cleanupEx) {
          console.warn('Orphaned auth user cleanup notice:', cleanupEx);
        }

        if (cleanedUp) {
          return {
            success: false,
            error: `Failed to create staff profile: ${profileError.message || 'Database error'}. The pending login account was safely rolled back. Please ensure 'supabase_staff_created_by_migration.sql' is executed in your Supabase SQL Editor and try again.`
          };
        }

        if (profileError.message?.includes('row-level security') || profileError.code === '42501') {
          return {
            success: false,
            error: "Database RLS Error: Row-level security prevented staff creation. Please execute the 'supabase_staff_created_by_migration.sql' script in your Supabase SQL Editor."
          };
        }
        return { 
          success: false, 
          error: `Staff account was created in Auth, but profile setup failed: ${profileError.message}. Please run 'supabase_staff_created_by_migration.sql' in your Supabase SQL Editor.` 
        };
      }

      // Step 5: Refresh live staff list from database
      const freshList = await this.getStaffListAsync();

      // Step 6: Return success
      return { success: true, staff: profileRecord, staffList: freshList };
    } catch (err) {
      console.error('Error creating staff in Supabase:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during staff creation.' };
    }
  },

  /**
   * Toggle or Update Staff Status (Active / Inactive) dynamically in Supabase `profiles` table
   */
  async updateStaffStatusAsync(staffId, newStatus) {
    const nowISO = new Date().toISOString();

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ status: newStatus, updated_at: nowISO })
        .eq('id', staffId);

      if (error) throw error;
    } catch (err) {
      console.error('Supabase staff status update exception:', err);
      return { success: false, error: err.message };
    }

    const freshList = await this.getStaffListAsync();
    return { success: true, staffList: freshList };
  },

  /**
   * Delete Staff Member dynamically
   * 1. Verifies caller is not deleting themselves
   * 2. Calls RPC 'admin_delete_staff_user' if available (deletes auth.users + public.profiles)
   * 3. Fallback: Deletes from public.profiles table and unlinks customer_records
   * 4. Updates localStorage cache & returns fresh staff list
   */
  async deleteStaffAsync(staffId) {
    if (!staffId) {
      return { success: false, error: 'Staff ID is required.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      // 1. Verify caller is not trying to delete their own account
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;
      if (currentUser?.id === staffId) {
        return { success: false, error: 'You cannot delete your own account.' };
      }

      let deleted = false;
      let deleteError = null;

      // 2. Try RPC 'admin_delete_staff_user' (cleans both auth.users & public.profiles)
      try {
        const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_delete_staff_user', {
          p_user_id: staffId
        });

        if (!rpcErr && rpcRes) {
          deleted = true;
        } else if (rpcErr) {
          console.warn('admin_delete_staff_user RPC notice, falling back to direct profiles deletion:', rpcErr.message);
          deleteError = rpcErr;
        }
      } catch (rpcEx) {
        console.warn('RPC call failed, attempting fallback delete on profiles table:', rpcEx);
      }

      // 3. Fallback: Direct delete from public.profiles table
      if (!deleted) {
        // First unlink customer records created_by / updated_by if any exist
        try {
          await supabase.from('customer_records').update({ created_by: null }).eq('created_by', staffId);
          await supabase.from('customer_records').update({ updated_by: null }).eq('updated_by', staffId);
        } catch (_) {
          /* ignore */
        }

        const { error: profileDeleteErr } = await supabase
          .from('profiles')
          .delete()
          .eq('id', staffId);

        if (profileDeleteErr) {
          console.error('Failed to delete staff profile:', profileDeleteErr);
          return {
            success: false,
            error: profileDeleteErr.message || deleteError?.message || 'Failed to delete staff member.'
          };
        }
        deleted = true;
      }

      // 4. Update cached profiles in localStorage if present
      try {
        const cached = localStorage.getItem('workpay_cached_staff_profiles');
        if (cached) {
          const list = JSON.parse(cached);
          const updatedList = list.filter((s) => s.id !== staffId);
          localStorage.setItem('workpay_cached_staff_profiles', JSON.stringify(updatedList));
        }
      } catch (_) {
        /* ignore */
      }

      // 5. Fetch fresh staff list
      const freshList = await this.getStaffListAsync();
      return { success: true, staffList: freshList };
    } catch (err) {
      console.error('Delete staff exception:', err);
      return { success: false, error: err.message || 'An unexpected error occurred while deleting staff.' };
    }
  },

  /**
   * Update Staff details (Full Name, Mobile, Role) dynamically in Supabase `profiles` table
   */
  async updateStaffProfileAsync(staffId, updates) {
    const nowISO = new Date().toISOString();

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      const { error } = await supabase
        .from('profiles')
        .update({ ...updates, updated_at: nowISO })
        .eq('id', staffId);

      if (error) throw error;
    } catch (err) {
      console.error('Supabase profile update warning:', err.message);
      return { success: false, error: err.message };
    }

    const freshList = await this.getStaffListAsync();
    return { success: true, staffList: freshList };
  },

  /**
   * Update Staff Email Address
   * 1. Validates format (must have @, domain, valid regex)
   * 2. Checks if email is already in use by another user in public.profiles
   * 3. If updating current logged-in user, calls supabase.auth.updateUser({ email })
   * 4. Attempts calling SECURITY DEFINER RPC 'admin_update_user_email'
   * 5. Persists email directly in public.profiles table
   * 6. Updates localStorage cache & returns fresh staff list
   */
  async updateStaffEmailAsync(staffId, newEmail) {
    const cleanEmail = (newEmail || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

    if (!cleanEmail) {
      return { success: false, error: 'Email Address is required.' };
    }

    if (!cleanEmail.includes('@') || !emailRegex.test(cleanEmail)) {
      return { success: false, error: 'Please enter a valid email address (e.g. rahul@sevakendra.com).' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      // 1. Check if email already used by another account in profiles
      const { data: existingProfiles, error: checkErr } = await supabase
        .from('profiles')
        .select('id, email')
        .eq('email', cleanEmail)
        .neq('id', staffId)
        .limit(1);

      if (!checkErr && existingProfiles && existingProfiles.length > 0) {
        return { success: false, error: 'This email address is already in use by another account.' };
      }

      let updatedInAuth = false;
      const nowISO = new Date().toISOString();

      // 2. Check if the caller is updating themselves
      const { data: authData } = await supabase.auth.getUser();
      const currentUser = authData?.user;

      if (currentUser && currentUser.id === staffId) {
        try {
          const { error: selfUpdateErr } = await supabase.auth.updateUser({ email: cleanEmail });
          if (!selfUpdateErr) {
            updatedInAuth = true;
          }
        } catch (selfEx) {
          console.warn('Self email update notice:', selfEx);
        }
      }

      // 3. If not updated yet (e.g. Admin updating a staff member), try RPC 'admin_update_user_email'
      if (!updatedInAuth) {
        try {
          const { data: rpcRes, error: rpcErr } = await supabase.rpc('admin_update_user_email', {
            p_user_id: staffId,
            p_new_email: cleanEmail
          });

          if (!rpcErr && rpcRes?.success) {
            updatedInAuth = true;
          } else if (rpcErr) {
            console.warn('admin_update_user_email RPC notice, falling back to direct profiles update:', rpcErr.message);
          }
        } catch (rpcEx) {
          console.warn('admin_update_user_email RPC call exception:', rpcEx);
        }
      }

      // 4. Always update public.profiles table to guarantee persistence
      const { error: profileUpdateErr } = await supabase
        .from('profiles')
        .update({ email: cleanEmail, updated_at: nowISO })
        .eq('id', staffId);

      if (profileUpdateErr) {
        console.error('Failed to update email in profiles:', profileUpdateErr);
        return { success: false, error: profileUpdateErr.message || 'Failed to update email address in database.' };
      }

      // 5. Update cached profiles in localStorage
      try {
        const cached = localStorage.getItem('workpay_cached_staff_profiles');
        if (cached) {
          const list = JSON.parse(cached);
          const updatedList = list.map((s) => (s.id === staffId ? { ...s, email: cleanEmail, updated_at: nowISO } : s));
          localStorage.setItem('workpay_cached_staff_profiles', JSON.stringify(updatedList));
        }
      } catch {
        /* ignore */
      }

      // 6. Return fresh list
      const freshList = await this.getStaffListAsync();
      const updatedStaff = freshList.find((s) => s.id === staffId) || { id: staffId, email: cleanEmail };

      return { success: true, staff: updatedStaff, staffList: freshList };
    } catch (err) {
      console.error('Update staff email exception:', err);
      return { success: false, error: err.message || 'An unexpected error occurred while updating email.' };
    }
  },

  /**
   * Update or Reset Staff Password
   * Supports:
   * 1. Self password update (logged-in Admin / staff updating their own password) via supabase.auth.updateUser
   * 2. Admin resetting another staff member's password via PostgreSQL SECURITY DEFINER RPC 'admin_reset_user_password'
   */
  async updateStaffPasswordAsync(staffId, newPassword, staffEmail = null) {
    const nowISO = new Date().toISOString();

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      // 1. Check current authenticated user session
      const { data: authData, error: getUserErr } = await supabase.auth.getUser();
      const currentUser = authData?.user;

      const isSelf = currentUser && (
        currentUser.id === staffId ||
        (currentUser.email && staffEmail && currentUser.email.toLowerCase() === staffEmail.toLowerCase())
      );

      if (isSelf) {
        // Case A: User is updating their OWN password (e.g. suleman95 / admin@sevakendra.com)
        const { error: authUpdateError } = await supabase.auth.updateUser({
          password: newPassword
        });

        if (authUpdateError) {
          console.error('Self password update auth error:', authUpdateError);
          return { success: false, error: authUpdateError.message || 'Failed to update password.' };
        }

        // Update profiles updated_at
        await supabase
          .from('profiles')
          .update({ updated_at: nowISO })
          .eq('id', staffId);

        return { success: true, message: 'Password updated successfully!' };
      } else {
        // Case B: Admin is resetting another staff member's password
        const { data: rpcData, error: rpcError } = await supabase.rpc('admin_reset_user_password', {
          p_user_id: staffId,
          p_new_password: newPassword
        });

        if (rpcError) {
          console.error('RPC admin_reset_user_password error:', rpcError);

          if (
            rpcError.code === 'PGRST202' ||
            rpcError.message?.includes('schema cache') ||
            rpcError.message?.includes('admin_reset_user_password')
          ) {
            return {
              success: false,
              error: "Database setup required: Please execute 'supabase_reset_password_rpc.sql' in your Supabase SQL Editor to allow Admin to reset other staff passwords."
            };
          }

          return { success: false, error: rpcError.message || 'Failed to reset staff password.' };
        }

        // Also update profiles updated_at
        await supabase
          .from('profiles')
          .update({ updated_at: nowISO })
          .eq('id', staffId);

        return {
          success: true,
          message: `Password updated successfully for ${staffEmail || 'staff member'}!`
        };
      }
    } catch (err) {
      console.error('Password reset exception:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred while updating password.'
      };
    }
  },

  /**
   * Realtime subscription for profiles table
   */
  subscribeToRealtime(onDataChange) {
    if (!isSupabaseConfigured() || !supabase) return () => { };

    try {
      const channelName = `profiles-sync-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: '*', schema: 'public', table: 'profiles' },
          async () => {
            const updated = await staffService.getStaffListAsync();
            onDataChange(updated);
          }
        )
        .subscribe();

      return () => {
        try {
          supabase.removeChannel(channel);
        } catch (e) {
          /* ignore cleanup error */
        }
      };
    } catch (err) {
      console.warn('Profiles realtime notice:', err);
      return () => { };
    }
  }
};
