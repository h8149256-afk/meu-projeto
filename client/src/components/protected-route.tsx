import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

interface ProtectedRouteProps {
  children: React.ReactNode;
  requiredRole?: string;
  redirectTo?: string;
}

export function ProtectedRoute({ 
  children, 
  requiredRole, 
  redirectTo = "/auth" 
}: ProtectedRouteProps) {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) return;

    // If not authenticated, redirect to auth
    if (!isAuthenticated) {
      console.log('User not authenticated, redirecting to auth');
      setLocation(redirectTo);
      return;
    }

    // If specific role required and user doesn't have it, redirect
    if (requiredRole && user?.role !== requiredRole) {
      console.log(`User role ${user?.role} does not match required role ${requiredRole}`);
      
      // Redirect to appropriate dashboard based on their actual role
      switch (user?.role) {
        case 'admin':
          setLocation('/admin-secret-2024');
          break;
        case 'driver':
          setLocation('/driver');
          break;
        case 'passenger':
          setLocation('/passenger');
          break;
        default:
          setLocation('/');
          break;
      }
    }
  }, [isAuthenticated, user, isLoading, requiredRole, redirectTo, setLocation]);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-coastal-mist dark:bg-deep-ocean flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-ocean-blue mx-auto mb-4"></div>
          <p className="text-gray-600 dark:text-gray-400">Carregando...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, don't render children
  if (!isAuthenticated) {
    return null;
  }

  // If wrong role, don't render children
  if (requiredRole && user?.role !== requiredRole) {
    return null;
  }

  // All good, render children
  return <>{children}</>;
}