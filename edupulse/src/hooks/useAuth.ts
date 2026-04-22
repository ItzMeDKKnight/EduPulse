import useAuthStore from '../store/authStore';

export function useAuth() {
  const user = useAuthStore((s) => s.user);
  const profile = useAuthStore((s) => s.profile);
  const role = useAuthStore((s) => s.role);
  const isLoading = useAuthStore((s) => s.isLoading);
  const isInitialized = useAuthStore((s) => s.isInitialized);
  const signIn = useAuthStore((s) => s.signIn);
  const signUp = useAuthStore((s) => s.signUp);
  const signOut = useAuthStore((s) => s.signOut);
  const resetPassword = useAuthStore((s) => s.resetPassword);
  const initialize = useAuthStore((s) => s.initialize);

  return {
    user,
    profile,
    role,
    isLoading,
    isInitialized,
    signIn,
    signUp,
    signOut,
    resetPassword,
    initialize,
    isAuthenticated: !!user,
    isAdmin: role === 'admin',
    isTeacher: role === 'teacher',
    isStudent: role === 'student',
    isParent: role === 'parent',
  };
}
