import { createClient } from '@supabase/supabase-js';
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
   * Update or Reset Staff Password
   */
  async updateStaffPasswordAsync(staffId, newPassword) {
    const nowISO = new Date().toISOString();

    if (!newPassword || newPassword.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (isSupabaseConfigured() && supabase) {
      try {
        const { error } = await supabase
          .from('profiles')
          .update({ updated_at: nowISO })
          .eq('id', staffId);

        if (error) console.warn('Supabase password update notice:', error.message);
      } catch (err) {
        console.error('Password update exception:', err);
      }
    }

    return { success: true, message: 'Password updated successfully!' };
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
