import { create } from 'zustand';
import supabase from '../lib/supabase';
import type { Profile, UserRole } from '../types';

interface AuthState {
  user: { id: string; email: string } | null;
  profile: Profile | null;
  role: UserRole | null;
  isLoading: boolean;
  isInitialized: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signUp: (email: string, password: string, fullName: string, role: UserRole) => Promise<string>;
  signOut: () => Promise<void>;
  resetPassword: (email: string) => Promise<void>;
  initialize: () => Promise<void>;
  fetchProfile: (userId: string) => Promise<Profile | null>;
}

const useAuthStore = create<AuthState>((set, get) => ({
  user: null,
  profile: null,
  role: null,
  isLoading: true,
  isInitialized: false,

  initialize: async () => {
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') {
      console.warn('Supabase not configured. Running in demo mode.');
      set({ isLoading: false, isInitialized: true });
      return;
    }

    try {
      // Listen for auth changes first to catch the initial session
      supabase.auth.onAuthStateChange(async (event, session) => {
        if (session?.user) {
          // If we already have the profile and it's the same user, don't refetch
          const currentState = get();
          if (currentState.user?.id === session.user.id && currentState.profile) {
            return;
          }

          const profile = await get().fetchProfile(session.user.id, session.user.user_metadata);
          set({
            user: { id: session.user.id, email: session.user.email || '' },
            profile,
            role: profile?.role || null,
            isLoading: false,
            isInitialized: true,
          });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, role: null, isLoading: false, isInitialized: true });
        }
      });

      // Get initial session
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const profile = await get().fetchProfile(session.user.id, session.user.user_metadata);
        set({
          user: { id: session.user.id, email: session.user.email || '' },
          profile,
          role: profile?.role || null,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({ isLoading: false, isInitialized: true });
      }
    } catch (err) {
      console.error('Auth initialization error:', err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  fetchProfile: async (userId: string, metadata?: any): Promise<Profile | null> => {
    // Create a timeout promise to prevent infinite hangs
    const timeoutPromise = new Promise<null>((resolve) =>
      setTimeout(() => {
        console.warn('Profile fetch timed out, using fallback.');
        resolve(null);
      }, 5000)
    );

    const fetchPromise = (async () => {
      try {
        const { data, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', userId)
          .maybeSingle();

        if (error) {
          console.error('Error fetching profile:', error);
        }

        if (data) return data as Profile;

        // Profile doesn't exist — create one from provided metadata or auth user
        const userMeta = metadata || (await supabase.auth.getUser()).data.user?.user_metadata || {};
        const newProfile = {
          id: userId,
          full_name: userMeta.full_name || userMeta.name || 'User',
          email: userMeta.email || '',
          role: userMeta.role || 'student',
        };

        const { data: created, error: insertErr } = await supabase
          .from('profiles')
          .upsert(newProfile, { onConflict: 'id' })
          .select()
          .single();

        if (insertErr) {
          console.error('Failed to auto-create profile:', insertErr);
          return newProfile as Profile;
        }
        return created as Profile;
      } catch (err) {
        console.error('Profile fetch exception:', err);
        return null;
      }
    })();

    return Promise.race([fetchPromise, timeoutPromise]);
  },

  signIn: async (email: string, password: string) => {
    console.log('Attempting sign in for:', email);
    set({ isLoading: true });

    const timeout = setTimeout(() => {
      console.warn('Sign in timed out after 10s');
      set({ isLoading: false });
    }, 10000);

    try {
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      clearTimeout(timeout);

      if (error) {
        console.error('Sign in error:', error);
        throw error;
      }

      if (data.user) {
        console.log('Sign in successful, fetching profile...');
        const profile = await get().fetchProfile(data.user.id, data.user.user_metadata);
        console.log('Profile loaded:', profile?.role);
        set({
          user: { id: data.user.id, email: data.user.email || '' },
          profile,
          role: profile?.role || null,
          isLoading: false,
        });
      } else {
        console.warn('Sign in returned no user and no error');
        set({ isLoading: false });
      }
    } catch (error) {
      clearTimeout(timeout);
      console.error('Sign in exception:', error);
      set({ isLoading: false });
      throw error;
    }
  },

  signUp: async (email: string, password: string, fullName: string, role: UserRole): Promise<string> => {
    set({ isLoading: true });
    try {
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            role,
          },
        },
      });
      if (error) {
        // Detect rate-limiting
        if (error.status === 429 || error.message?.toLowerCase().includes('rate')) {
          throw new Error('Too many signup attempts. Please wait a few minutes and try again.');
        }
        throw error;
      }
      if (data.user) {
        // Use upsert to handle any race condition or duplicate key scenario
        const { error: profileError } = await supabase.from('profiles').upsert({
          id: data.user.id,
          full_name: fullName,
          email,
          role,
        }, { onConflict: 'id' });
        if (profileError) {
          console.error('Profile creation error:', profileError);
          // Don't throw — user account was created, profile can be retried on next login
          console.warn('Profile will be created on next sign-in via trigger.');
        }
      }
      set({ isLoading: false });
      return data.user?.id || '';
    } catch (err) {
      set({ isLoading: false });
      throw err;
    }
  },

  signOut: async () => {
    await supabase.auth.signOut();
    set({ user: null, profile: null, role: null });
  },

  resetPassword: async (email: string) => {
    const { error } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/login`,
    });
    if (error) throw error;
  },
}));

export default useAuthStore;
