import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function AuthRedirect() {
  const [, setLocation] = useLocation();
  const { user, isAuthenticated, isLoading } = useAuth();

  useEffect(() => {
    // Wait for auth to finish loading
    if (isLoading) return;

    // If user is authenticated, redirect to appropriate dashboard
    if (isAuthenticated && user) {
      console.log('Redirecting authenticated user:', user.email, 'Role:', user.role);
      
      switch (user.role) {
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
  }, [isAuthenticated, user, isLoading, setLocation]);

  // Don't render anything, this is just for redirection logic
  return null;
}