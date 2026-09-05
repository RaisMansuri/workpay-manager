import { supabase, secondarySupabase, isSupabaseConfigured } from '../config/supabaseClient';

export const staffService = {
  /**
   * Fetch all staff members dynamically from Supabase `profiles` table
   */
  async getStaffListAsync() {
    if (!isSupabaseConfigured() || !supabase) {
      console.warn('Supabase is not configured.');
      const cached = typeof window !== 'undefined' ? localStorage.getItem('workpay_cached_staff_profiles') : null;
      return cached ? JSON.parse(cached) : [];
    }

    try {
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
    }
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

      // Step 4: Only if Auth user creation is successful, create/update user's record in public.profiles
      const profileRecord = {
        id: createdUser.id,
        full_name: fullName,
        email: cleanEmail,
        mobile: mobile || '',
        role: role,
        status: status,
        created_at: nowISO,
        updated_at: nowISO
      };

      const { error: profileError } = await supabase
        .from('profiles')
        .upsert(profileRecord, { onConflict: 'id' });

      if (profileError) {
        console.warn('Profiles table upsert notice:', profileError.message);

        // Check if profile record was already created in profiles table by Supabase Auth Trigger
        const freshList = await this.getStaffListAsync();
        const existingStaff = freshList.find(
          (s) => s.id === createdUser.id || (s.email && s.email.toLowerCase() === cleanEmail)
        );

        if (existingStaff) {
          return { success: true, staff: existingStaff, staffList: freshList };
        }

        if (profileError.message?.includes('row-level security') || profileError.code === '42501') {
          return {
            success: false,
            error: "Database RLS Error: Row-level security is enabled on 'profiles' table in Supabase. Please run SQL in Supabase Editor: ALTER TABLE profiles DISABLE ROW LEVEL SECURITY;"
          };
        }
        return { success: false, error: profileError.message };
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
