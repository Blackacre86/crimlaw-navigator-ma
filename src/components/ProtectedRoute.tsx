import React from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { Navigate, useLocation } from 'react-router-dom';
import { Loader2 } from 'lucide-react';

interface ProtectedRouteProps {
  children: React.ReactNode;
  adminOnly?: boolean;
}

export function ProtectedRoute({ children, adminOnly = false }: ProtectedRouteProps) {
  const { user, profile, loading } = useAuth();
  const location = useLocation();

  // Show loading spinner while checking authentication
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-center space-y-4">
          <Loader2 className="h-12 w-12 animate-spin mx-auto text-primary" />
          <div className="space-y-2">
            <h2 className="text-lg font-semibold text-foreground">Loading LexInnova</h2>
            <p className="text-sm text-muted-foreground">Verifying your access credentials...</p>
          </div>
        </div>
      </div>
    );
  }

  // Redirect to login if not authenticated
  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  // Redirect to main app if user is not admin but trying to access admin routes
  if (adminOnly && profile?.role !== 'admin') {
    return <Navigate to="/app" replace />;
  }

  return <>{children}</>;
}

// Higher-order component for easier usage
export function withProtectedRoute<P extends object>(
  Component: React.ComponentType<P>,
  adminOnly = false
) {
  return function ProtectedComponent(props: P) {
    return (
      <ProtectedRoute adminOnly={adminOnly}>
        <Component {...props} />
      </ProtectedRoute>
    );
  };
}