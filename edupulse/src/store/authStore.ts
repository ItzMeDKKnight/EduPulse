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
    // If Supabase URL is not configured, skip auth check
    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    if (!supabaseUrl || supabaseUrl === 'your_supabase_project_url') {
      console.warn('Supabase not configured. Running in demo mode.');
      set({ isLoading: false, isInitialized: true });
      return;
    }

    try {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error) {
        console.error('Auth session error:', error);
        set({ isLoading: false, isInitialized: true });
        return;
      }

      if (session?.user) {
        const profile = await get().fetchProfile(session.user.id);
        set({
          user: { id: session.user.id, email: session.user.email || '' },
          profile,
          role: profile?.role || null,
          isLoading: false,
          isInitialized: true,
        });
      } else {
        set({ user: null, profile: null, role: null, isLoading: false, isInitialized: true });
      }

      supabase.auth.onAuthStateChange(async (event, session) => {
        if (event === 'SIGNED_IN' && session?.user) {
          const profile = await get().fetchProfile(session.user.id);
          set({
            user: { id: session.user.id, email: session.user.email || '' },
            profile,
            role: profile?.role || null,
            isLoading: false,
          });
        } else if (event === 'SIGNED_OUT') {
          set({ user: null, profile: null, role: null, isLoading: false });
        }
      });
    } catch (err) {
      console.error('Auth initialization error:', err);
      set({ isLoading: false, isInitialized: true });
    }
  },

  fetchProfile: async (userId: string): Promise<Profile | null> => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .single();
      if (error) {
        console.warn('Profile not found, attempting to create from auth metadata...');
        // Profile doesn't exist — create one from auth user metadata
        const { data: { user } } = await supabase.auth.getUser();
        if (user) {
          const meta = user.user_metadata || {};
          const newProfile = {
            id: user.id,
            full_name: meta.full_name || meta.name || user.email?.split('@')[0] || 'User',
            email: user.email || '',
            role: meta.role || 'student',
          };
          const { data: created, error: insertErr } = await supabase
            .from('profiles')
            .upsert(newProfile, { onConflict: 'id' })
            .select()
            .single();
          if (insertErr) {
            console.error('Failed to auto-create profile:', insertErr);
            // Return a temporary in-memory profile so the app doesn't get stuck
            return newProfile as Profile;
          }
          return created as Profile;
        }
        return null;
      }
      return data as Profile;
    } catch {
      return null;
    }
  },

  signIn: async (email: string, password: string) => {
    set({ isLoading: true });
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) {
      set({ isLoading: false });
      throw error;
    }
    if (data.user) {
      const profile = await get().fetchProfile(data.user.id);
      set({
        user: { id: data.user.id, email: data.user.email || '' },
        profile,
        role: profile?.role || null,
        isLoading: false,
      });
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
