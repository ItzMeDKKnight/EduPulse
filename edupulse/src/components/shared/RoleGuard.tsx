import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import type { UserRole } from '../../types';

interface RoleGuardProps {
  allowedRoles: UserRole[];
  children: React.ReactNode;
}

export default function RoleGuard({ allowedRoles, children }: RoleGuardProps) {
  const { isAuthenticated, role, isLoading, isInitialized } = useAuth();
  const location = useLocation();

  if (!isInitialized || isLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4">
          <div className="w-12 h-12 border-4 border-primary-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-text-secondary font-body">Loading...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // If user is authenticated but has no role/profile, redirect to login
  // This prevents infinite loading when profile creation failed
  if (!role) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-surface">
        <div className="flex flex-col items-center gap-4 text-center max-w-md">
          <div className="w-16 h-16 rounded-2xl bg-red-100 flex items-center justify-center">
            <span className="text-2xl">⚠️</span>
          </div>
          <h2 className="text-xl font-heading font-bold text-gray-900">Profile Not Found</h2>
          <p className="text-gray-500">Your account was created but your profile couldn't be loaded. Please sign out and sign back in.</p>
          <button
            onClick={async () => {
              const { default: store } = await import('../../store/authStore');
              await store.getState().signOut();
              window.location.href = '/login';
            }}
            className="btn-primary mt-2"
          >
            Sign Out & Retry
          </button>
        </div>
      </div>
    );
  }

  if (!allowedRoles.includes(role)) {
    const dashboardPath = role === 'admin' ? '/admin/dashboard'
      : role === 'teacher' ? '/teacher/dashboard'
      : role === 'student' ? '/student/dashboard'
      : '/parent/dashboard';
    return <Navigate to={dashboardPath} replace />;
  }

  return <>{children}</>;
}
