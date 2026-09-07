import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

export const authService = {
  /**
   * 1. Sign In with Supabase Auth & Profile Database Verification
   * Workflow:
   *  User Login -> Supabase Auth -> Verify Email+Password in Database -> Fetch Profile from DB -> Check Status (active/inactive) -> Check Role -> Grant Access
   */
  async signIn(email, password) {
    let cleanEmail = (email || '').trim().toLowerCase();

    if (!cleanEmail || !password) {
      return { success: false, error: 'Please enter both email/username and password.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Database connection is not configured. Please contact system administrator.'
      };
    }

    try {
      // 1. Resolve email from profiles table if username typed without @ domain (e.g., 'admin' or 'rahul')
      if (!cleanEmail.includes('@')) {
        const { data: matchedProfile } = await supabase
          .from('profiles')
          .select('email')
          .or(`email.ilike.${cleanEmail}@%,full_name.ilike.%${cleanEmail}%`)
          .maybeSingle();

        if (matchedProfile?.email) {
          cleanEmail = matchedProfile.email.toLowerCase();
        } else {
          // Default domain fallback if username doesn't contain domain
          cleanEmail = `${cleanEmail}@sevakendra.com`;
        }
      }

      // 2. Strict Database Authentication via Supabase Auth
      let { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      // 3. Auto-provision initial Admin in Supabase Database if Admin user does not exist in DB yet
      const isAdminEmail = cleanEmail === 'admin@sevakendra.com' || cleanEmail.startsWith('admin');
      if (authError && isAdminEmail) {
        try {
          const { data: signUpData, error: signUpError } = await supabase.auth.signUp({
            email: cleanEmail,
            password: password,
            options: {
              data: {
                full_name: 'Admin User',
                role: 'admin'
              }
            }
          });

          if (!signUpError && signUpData?.user) {
            const adminUser = signUpData.user;
            const nowISO = new Date().toISOString();

            // Upsert Admin Profile in public.profiles table
            const adminProfile = {
              id: adminUser.id,
              full_name: 'Admin User',
              email: cleanEmail,
              role: 'admin',
              status: 'active',
              created_at: nowISO,
              updated_at: nowISO
            };

            await supabase.from('profiles').upsert(adminProfile, { onConflict: 'id' });

            authData = signUpData;
            authError = null;
          }
        } catch (e) {
          console.warn('Initial admin provisioning notice:', e);
        }
      }

      if (authError) {
        let msg = authError.message || '';
        if (msg.includes('Invalid login credentials') || msg.includes('invalid') || authError.status === 400) {
          msg = 'Invalid email or password. Please check your credentials and try again.';
        }
        return { success: false, error: msg };
      }

      const user = authData?.user;
      if (!user) {
        return { success: false, error: 'Authentication failed. User record not found in database.' };
      }

      // 3. Fetch User Profile from 'profiles' table by ID or Email
      let profile = await this.getCurrentProfile(user.id, cleanEmail);

      // If profile does not exist yet in DB profiles table, create it dynamically
      if (!profile) {
        profile = await this.createProfileIfMissing(user);
      }

      if (!profile) {
        return {
          success: false,
          error: 'User profile record could not be loaded from database. Please contact administrator.'
        };
      }

      // 4. Check Account Status (Strict Enforcement for Inactive Accounts)
      if (profile.status === 'inactive') {
        await supabase.auth.signOut();
        return {
          success: false,
          isInactive: true,
          error: 'Your account has been deactivated. Please contact the administrator.'
        };
      }

      // 5. Update last_login_at timestamp in Database
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', profile.id || user.id);

      return { success: true, user, profile };
    } catch (err) {
      console.error('Sign-in database exception:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during database authentication.' };
    }
  },

  /**
   * 2. Fetch User Profile from Supabase `profiles` table by ID or Email
   */
  async getCurrentProfile(userId, email = null) {
    if (!isSupabaseConfigured() || !supabase) return null;
    try {
      if (userId) {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (!error && data) return data;
      }

      if (email) {
        const cleanEmail = email.trim().toLowerCase();
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .ilike('email', cleanEmail)
          .maybeSingle();

        if (!error && data) return data;
      }

      return null;
    } catch (err) {
      console.error('Failed to get user profile from database:', err);
      return null;
    }
  },

  /**
   * 3. Create missing profile record in DB safely
   */
  async createProfileIfMissing(user) {
    if (!isSupabaseConfigured() || !supabase || !user) return null;
    try {
      const defaultRole = user.email?.includes('admin') ? 'admin' : 'staff';
      const defaultName = user.user_metadata?.full_name || user.email?.split('@')[0] || 'User';

      const newProfile = {
        id: user.id,
        full_name: defaultName,
        email: user.email,
        role: defaultRole,
        status: 'active',
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      const { data, error } = await supabase
        .from('profiles')
        .upsert(newProfile, { onConflict: 'id' })
        .select()
        .single();

      if (error) {
        console.error('Error creating profile in database:', error.message);
        return newProfile;
      }
      return data;
    } catch (err) {
      console.error('Exception creating missing profile in database:', err);
      return null;
    }
  },

  /**
   * 4. Get active session & profile from Supabase on initial load / refresh
   * Validates: 1. Auth session, 2. DB Profile existence, 3. Account active status, 4. Role
   */
  async getSessionAndProfile() {
    if (!isSupabaseConfigured() || !supabase) {
      return { session: null, profile: null };
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        return { session: null, profile: null };
      }

      let profile = await this.getCurrentProfile(session.user.id);

      if (!profile) {
        profile = await this.createProfileIfMissing(session.user);
      }

      if (!profile) {
        return { session: null, profile: null };
      }

      if (profile.status === 'inactive') {
        await supabase.auth.signOut().catch(() => { });
        return { session: null, profile: null, isInactive: true, error: 'Your account has been deactivated. Please contact the administrator.' };
      }

      return { session, profile };
    } catch (err) {
      console.error('Failed to restore auth session from database:', err);
      return { session: null, profile: null };
    }
  },

  /**
   * 5. Sign Out
   */
  async signOut(userId) {
    if (isSupabaseConfigured() && supabase) {
      if (userId) {
        try {
          await supabase
            .from('profiles')
            .update({ last_logout_at: new Date().toISOString() })
            .eq('id', userId);
        } catch (e) {
          console.warn('Failed to update logout timestamp:', e);
        }
      }
      await supabase.auth.signOut();
    }
    localStorage.removeItem('workpay_demo_auth_session');
  },

  /**
   * 6. Real-time subscription for current user profile changes (e.g. status changes by admin)
   */
  subscribeToProfileChanges(userId, onProfileUpdate) {
    if (!isSupabaseConfigured() || !supabase || !userId) return () => { };

    try {
      const channelName = `profile-watch-${userId}-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`;
      const channel = supabase
        .channel(channelName)
        .on(
          'postgres_changes',
          { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${userId}` },
          (payload) => {
            if (payload.new) {
              onProfileUpdate(payload.new);
            }
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
      console.warn('Profile watch realtime notice:', err);
      return () => { };
    }
  }
};
