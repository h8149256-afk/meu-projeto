import { useEffect } from "react";
import { useLocation } from "wouter";
import { useAuth } from "@/hooks/use-auth";

export function AuthRedirect() {
  const { user, isAuthenticated, isLoading } = useAuth();
  const [, setLocation] = useLocation();

  useEffect(() => {
    if (!isLoading && isAuthenticated && user) {
      console.log('Redirecionando usuário logado:', user.email, 'role:', user.role);
      
      // Redirect based on user role
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
      }
    }
  }, [user, isAuthenticated, isLoading, setLocation]);

  return null;
}