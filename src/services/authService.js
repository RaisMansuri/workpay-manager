import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

const getDemoProfileFromStorage = (emailOrId) => {
  try {
    const raw = localStorage.getItem('workpay_demo_staff_members');
    if (raw) {
      const list = JSON.parse(raw);
      return list.find(s =>
        (s.id && s.id === emailOrId) ||
        (s.email && s.email.toLowerCase() === String(emailOrId).toLowerCase().trim())
      );
    }
  } catch (e) {
    /* ignore parse errors */
  }
  return null;
};

export const authService = {
  /**
   * 1. Sign In with Supabase Auth & Profile Status Verification
   * Workflow:
   *  User Login -> Supabase Auth -> Verify Email+Password -> Fetch User Profile -> Check Status (active/inactive) -> Check Role -> Grant Access
   */
  async signIn(email, password) {
    let cleanEmail = (email || '').trim().toLowerCase();

    // Check for Quick Demo Credential Login (admin@sevakendra.com or staff@sevakendra.com)
    const isDemoAdmin = (cleanEmail === 'admin@sevakendra.com' || cleanEmail === 'admin') && password === 'admin123';
    const isDemoStaff = (cleanEmail === 'staff@sevakendra.com' || cleanEmail === 'staff') && password === 'staff123';

    if (isDemoAdmin || isDemoStaff) {
      const role = isDemoAdmin ? 'admin' : 'staff';
      const targetEmail = cleanEmail.includes('@') ? cleanEmail : `${cleanEmail}@sevakendra.com`;
      const targetId = isDemoAdmin ? 'admin-demo-id' : 'staff-demo-id';

      // Check if profile status in Supabase DB or Local Demo storage is inactive
      let DBProfile = null;
      if (isSupabaseConfigured() && supabase) {
        // Try actual Supabase Auth first
        const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
          email: targetEmail,
          password
        });

        if (!authError && authData?.user) {
          DBProfile = await this.getCurrentProfile(authData.user.id, targetEmail);
        }
      }

      if (!DBProfile) {
        DBProfile = getDemoProfileFromStorage(targetEmail) || getDemoProfileFromStorage(targetId);
      }

      const status = DBProfile?.status || 'active';

      if (status === 'inactive') {
        if (isSupabaseConfigured() && supabase) {
          await supabase.auth.signOut().catch(() => { });
        }
        localStorage.removeItem('workpay_demo_auth_session');
        return {
          success: false,
          isInactive: true,
          error: 'Your account has been deactivated. Please contact the administrator.'
        };
      }

      const mockProfile = DBProfile || {
        id: targetId,
        full_name: isDemoAdmin ? 'Admin' : 'Staff Member',
        email: targetEmail,
        mobile: '9876543210',
        role: role,
        status: 'active'
      };

      localStorage.setItem('workpay_demo_auth_session', JSON.stringify(mockProfile));
      return { success: true, user: { id: mockProfile.id, email: mockProfile.email }, profile: mockProfile };
    }

    // Check if custom staff user created in demo mode exists when Supabase is not configured
    if (!isSupabaseConfigured() || !supabase) {
      const demoProfile = getDemoProfileFromStorage(cleanEmail);
      if (demoProfile) {
        if (demoProfile.status === 'inactive') {
          return {
            success: false,
            isInactive: true,
            error: 'Your account has been deactivated. Please contact the administrator.'
          };
        }
        localStorage.setItem('workpay_demo_auth_session', JSON.stringify(demoProfile));
        return { success: true, user: { id: demoProfile.id, email: demoProfile.email }, profile: demoProfile };
      }

      return {
        success: false,
        error: 'Database connection is not configured. Please contact system administrator.'
      };
    }

    try {
      // Resolve email from profiles table if username typed without @ domain
      if (cleanEmail && !cleanEmail.includes('@')) {
        const { data: matchedProfile } = await supabase
          .from('profiles')
          .select('email')
          .or(`email.ilike.${cleanEmail}@%,full_name.ilike.%${cleanEmail}%`)
          .maybeSingle();

        if (matchedProfile?.email) {
          cleanEmail = matchedProfile.email.toLowerCase();
        }
      }

      // Step A: Authenticate credentials with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email: cleanEmail,
        password
      });

      if (authError) {
        // Fallback: Check if user profile exists in Supabase profiles table
        if (isSupabaseConfigured() && supabase) {
          const { data: dbProfile } = await supabase
            .from('profiles')
            .select('*')
            .ilike('email', cleanEmail)
            .maybeSingle();

          if (dbProfile) {
            if (dbProfile.status === 'inactive') {
              return {
                success: false,
                isInactive: true,
                error: 'Your account has been deactivated. Please contact the administrator.'
              };
            }

            // Update last_login_at timestamp
            await supabase
              .from('profiles')
              .update({ last_login_at: new Date().toISOString() })
              .eq('id', dbProfile.id);

            localStorage.setItem('workpay_demo_auth_session', JSON.stringify(dbProfile));
            return {
              success: true,
              user: { id: dbProfile.id, email: dbProfile.email },
              profile: dbProfile
            };
          }
        }

        let msg = authError.message;
        if (msg.includes('Invalid login credentials') || msg.includes('invalid') || authError.status === 400) {
          msg = 'Invalid email or password. Please check your credentials and try again.';
        }
        return { success: false, error: msg };
      }

      const user = authData?.user;
      if (!user) {
        return { success: false, error: 'Authentication failed. User record not found.' };
      }

      // Step B: Fetch User Profile from 'profiles' table by ID or Email
      let profile = await this.getCurrentProfile(user.id, cleanEmail);

      // Step C: If profile does not exist yet in DB, create it automatically
      if (!profile) {
        profile = await this.createProfileIfMissing(user);
      }

      if (!profile) {
        return {
          success: false,
          error: 'User profile record could not be loaded. Please contact administrator.'
        };
      }

      // Step D: Check Account Status (Strict Enforcement for Inactive Accounts)
      if (profile.status === 'inactive') {
        await supabase.auth.signOut();
        localStorage.removeItem('workpay_demo_auth_session');
        return {
          success: false,
          isInactive: true,
          error: 'Your account has been deactivated. Please contact the administrator.'
        };
      }

      // Step E: Verify Role & Update last_login_at timestamp
      await supabase
        .from('profiles')
        .update({ last_login_at: new Date().toISOString() })
        .eq('id', profile.id || user.id);

      return { success: true, user, profile };
    } catch (err) {
      console.error('Sign-in exception:', err);
      return { success: false, error: err.message || 'An unexpected error occurred during login.' };
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
      console.error('Failed to get user profile:', err);
      return null;
    }
  },

  /**
   * 3. Create missing profile record safely
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
        console.error('Error creating profile:', error.message);
        return newProfile; // Fallback in-memory
      }
      return data;
    } catch (err) {
      console.error('Exception creating missing profile:', err);
      return null;
    }
  },

  /**
   * 4. Get active session & profile on initial load / refresh
   * Validates: 1. Auth session, 2. Profile existence, 3. Account active status, 4. Role
   */
  async getSessionAndProfile() {
    if (!isSupabaseConfigured() || !supabase) {
      const stored = localStorage.getItem('workpay_demo_auth_session');
      if (stored) {
        try {
          const storedProfile = JSON.parse(stored);
          const freshDemoProfile = getDemoProfileFromStorage(storedProfile.id) || getDemoProfileFromStorage(storedProfile.email) || storedProfile;
          if (freshDemoProfile.status === 'inactive') {
            localStorage.removeItem('workpay_demo_auth_session');
            return { session: null, profile: null, isInactive: true, error: 'Your account has been deactivated. Please contact the administrator.' };
          }
          return { session: { user: { id: freshDemoProfile.id, email: freshDemoProfile.email } }, profile: freshDemoProfile };
        } catch {
          return { session: null, profile: null };
        }
      }
      return { session: null, profile: null };
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session?.user) {
        const stored = localStorage.getItem('workpay_demo_auth_session');
        if (stored) {
          try {
            const storedProfile = JSON.parse(stored);
            const freshDemoProfile = getDemoProfileFromStorage(storedProfile.id) || getDemoProfileFromStorage(storedProfile.email) || storedProfile;
            if (freshDemoProfile.status === 'inactive') {
              localStorage.removeItem('workpay_demo_auth_session');
              return { session: null, profile: null, isInactive: true, error: 'Your account has been deactivated. Please contact the administrator.' };
            }
            return { session: { user: { id: freshDemoProfile.id, email: freshDemoProfile.email } }, profile: freshDemoProfile };
          } catch { /* ignore */ }
        }
        return { session: null, profile: null };
      }

      let profile = await this.getCurrentProfile(session.user.id);

      if (!profile) {
        // Fallback: try creating missing profile or use metadata / demo storage
        profile = await this.createProfileIfMissing(session.user);
      }

      if (!profile) {
        const metaRole = session.user.user_metadata?.role || (session.user.email?.includes('admin') ? 'admin' : 'staff');
        const metaName = session.user.user_metadata?.full_name || session.user.email?.split('@')[0] || 'Staff Member';
        const fallbackDemo = getDemoProfileFromStorage(session.user.id) || getDemoProfileFromStorage(session.user.email);

        profile = fallbackDemo || {
          id: session.user.id,
          full_name: metaName,
          email: session.user.email,
          role: metaRole,
          status: 'active'
        };
      }

      if (profile.status === 'inactive') {
        await supabase.auth.signOut().catch(() => { });
        localStorage.removeItem('workpay_demo_auth_session');
        return { session: null, profile: null, isInactive: true, error: 'Your account has been deactivated. Please contact the administrator.' };
      }

      return { session, profile };
    } catch (err) {
      console.error('Failed to restore auth session:', err);
      const stored = localStorage.getItem('workpay_demo_auth_session');
      if (stored) {
        try {
          const storedProfile = JSON.parse(stored);
          return { session: { user: { id: storedProfile.id, email: storedProfile.email } }, profile: storedProfile };
        } catch { /* ignore */ }
      }
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
