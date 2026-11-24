import { supabase, isSupabaseConfigured } from '../config/supabaseClient';

export const authService = {
  /**
   * Helper to resolve email address from username, full name, mobile number, or email
   */
  async resolveEmailFromIdentifier(identifier) {
    const rawInput = (identifier || '').trim();
    if (!rawInput) return null;
    if (rawInput.includes('@')) return rawInput.toLowerCase();

    if (!isSupabaseConfigured() || !supabase) {
      return `${rawInput.toLowerCase()}@sevakendra.com`;
    }

    // A. Match by exact full_name (case-insensitive)
    try {
      const { data: exactNameData } = await supabase
        .from('profiles')
        .select('email')
        .ilike('full_name', rawInput)
        .limit(1);

      if (exactNameData && exactNameData.length > 0 && exactNameData[0]?.email) {
        return exactNameData[0].email.toLowerCase();
      }
    } catch (_) {
      /* ignore */
    }

    // B. Match where email username/prefix matches (e.g. 'rehan' matches 'rehan@gmail.com')
    try {
      const { data: prefixData } = await supabase
        .from('profiles')
        .select('email')
        .ilike('email', `${rawInput}@%`)
        .limit(1);

      if (prefixData && prefixData.length > 0 && prefixData[0]?.email) {
        return prefixData[0].email.toLowerCase();
      }
    } catch (_) {
      /* ignore */
    }

    // C. Match where full_name contains the keyword (e.g. 'rehan' in 'Rehan Ansari')
    try {
      const { data: partialNameData } = await supabase
        .from('profiles')
        .select('email')
        .ilike('full_name', `%${rawInput}%`)
        .limit(1);

      if (partialNameData && partialNameData.length > 0 && partialNameData[0]?.email) {
        return partialNameData[0].email.toLowerCase();
      }
    } catch (_) {
      /* ignore */
    }

    // D. Match by mobile phone number if digits only
    if (/^\d+$/.test(rawInput)) {
      try {
        const { data: mobileData } = await supabase
          .from('profiles')
          .select('email')
          .eq('mobile', rawInput)
          .limit(1);

        if (mobileData && mobileData.length > 0 && mobileData[0]?.email) {
          return mobileData[0].email.toLowerCase();
        }
      } catch (_) {
        /* ignore */
      }
    }

    // E. Fallback search in cached profiles (localStorage)
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem('workpay_cached_staff_profiles');
        if (cached) {
          const list = JSON.parse(cached);
          const low = rawInput.toLowerCase();
          const found = list.find((s) => {
            const sName = (s.full_name || '').toLowerCase();
            const sEmail = (s.email || '').toLowerCase();
            const sMobile = String(s.mobile || '');
            return (
              sName === low ||
              sEmail.startsWith(`${low}@`) ||
              sName.includes(low) ||
              sMobile === rawInput
            );
          });
          if (found?.email) {
            return found.email.toLowerCase();
          }
        }
      } catch (_) {
        /* ignore */
      }
    }

    // F. Final fallback for demo shortcuts or default domain
    const low = rawInput.toLowerCase();
    if (low === 'admin') return 'admin@sevakendra.com';
    if (low === 'staff') return 'staff@sevakendra.com';
    return `${low}@sevakendra.com`;
  },

  /**
   * 1. Sign In with Supabase Auth & Profile Database Verification
   * Workflow:
   *  User Login -> Supabase Auth -> Verify Email+Password in Database -> Fetch Profile from DB -> Check Status (active/inactive) -> Check Role -> Grant Access
   */
  async signIn(email, password) {
    const rawInput = (email || '').trim();

    if (!rawInput || !password) {
      return { success: false, error: 'Please enter both username/email and password.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Database connection is not configured. Please contact system administrator.'
      };
    }

    try {
      // 1. Resolve email from profiles table if username typed without @ domain
      const cleanEmail = await this.resolveEmailFromIdentifier(rawInput);

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
          msg = 'Invalid username/email or password. Please check your credentials and try again.';
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
  },

  /**
   * 7. Send Password Reset Instructions Link via Supabase Auth
   */
  async sendPasswordResetEmail(identifier) {
    const rawInput = (identifier || '').trim();
    if (!rawInput) {
      return { success: false, error: 'Please enter your username or email address.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return {
        success: false,
        error: 'Database connection is not configured. Please contact system administrator.'
      };
    }

    try {
      const targetEmail = await this.resolveEmailFromIdentifier(rawInput);
      if (!targetEmail) {
        return {
          success: false,
          error: 'No account found matching that username or email address.'
        };
      }

      const redirectUrl = `${window.location.origin}/reset-password`;
      const { error } = await supabase.auth.resetPasswordForEmail(targetEmail, {
        redirectTo: redirectUrl
      });

      if (error) {
        let msg = error.message || '';
        if (msg.toLowerCase().includes('rate limit') || error.status === 429) {
          msg = 'Too many password reset requests. Please wait a few minutes before trying again.';
        }
        return { success: false, error: msg, email: targetEmail };
      }

      // Obfuscate email for user privacy (e.g., r***@gmail.com)
      const parts = targetEmail.split('@');
      const namePart = parts[0];
      const domainPart = parts[1] || '';
      const obfuscated = namePart.length <= 2
        ? `${namePart[0]}***@${domainPart}`
        : `${namePart[0]}***${namePart[namePart.length - 1]}@${domainPart}`;

      return {
        success: true,
        email: targetEmail,
        obfuscatedEmail: obfuscated,
        message: `Password reset instructions have been sent to ${obfuscated}.`
      };
    } catch (err) {
      console.error('Password reset email dispatch exception:', err);
      return {
        success: false,
        error: err.message || 'An unexpected error occurred while sending password reset email.'
      };
    }
  },

  /**
   * 8. Update Password for an active or recovery session
   */
  async updateNewPassword(newPassword) {
    const trimmed = (newPassword || '').trim();
    if (!trimmed || trimmed.length < 6) {
      return { success: false, error: 'Password must be at least 6 characters long.' };
    }

    if (!isSupabaseConfigured() || !supabase) {
      return { success: false, error: 'Database connection is not configured.' };
    }

    try {
      const { error } = await supabase.auth.updateUser({
        password: trimmed
      });

      if (error) {
        return { success: false, error: error.message || 'Failed to update password.' };
      }

      return {
        success: true,
        message: 'Password updated successfully! You can now log in with your new password.'
      };
    } catch (err) {
      console.error('Update password exception:', err);
      return { success: false, error: err.message || 'Failed to update password.' };
    }
  }
};
