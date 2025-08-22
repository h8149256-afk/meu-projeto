import React, { createContext, useContext, useState, useEffect } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import type { UserWithDriver, LoginData, RegisterData } from "@shared/schema";

interface AuthContextType {
  user: UserWithDriver | null;
  isLoading: boolean;
  login: (credentials: LoginData) => Promise<void>;
  register: (userData: RegisterData) => Promise<void>;
  logout: () => void;
  isAuthenticated: boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [token, setToken] = useState<string | null>(() => {
    try {
      return localStorage.getItem("auth_token");
    } catch {
      return null;
    }
  });
  const queryClient = useQueryClient();

  const { data: user, isLoading, error } = useQuery({
    queryKey: ["/api/auth/me"],
    enabled: !!token,
    retry: (failureCount, error: any) => {
      // Don't retry on 401 errors
      if (error?.message?.includes('401')) {
        return false;
      }
      return failureCount < 2;
    },
    staleTime: 5 * 60 * 1000, // 5 minutes
  });

  const loginMutation = useMutation({
    mutationFn: async (credentials: LoginData) => {
      try {
        const response = await apiRequest("POST", "/api/auth/login", credentials);
        const data = await response.json();
        
        if (!data.token || !data.user) {
          throw new Error('Resposta inválida do servidor');
        }
        
        return data;
      } catch (error: any) {
        // Better error handling
        if (error.message.includes('401')) {
          throw new Error('Email ou senha incorretos');
        } else if (error.message.includes('400')) {
          throw new Error('Dados inválidos');
        } else if (error.message.includes('500')) {
          throw new Error('Erro interno do servidor');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      try {
        setToken(data.token);
        localStorage.setItem("auth_token", data.token);
        queryClient.setQueryData(["/api/auth/me"], data.user);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        console.log('Login successful for user:', data.user.email);
      } catch (error) {
        console.error('Error saving login data:', error);
      }
    },
    onError: (error) => {
      console.error('Login error:', error);
      // Clear any invalid token
      setToken(null);
      localStorage.removeItem("auth_token");
    }
  });

  const registerMutation = useMutation({
    mutationFn: async (userData: RegisterData) => {
      try {
        const response = await apiRequest("POST", "/api/auth/register", userData);
        const data = await response.json();
        
        if (!data.token || !data.user) {
          throw new Error('Resposta inválida do servidor');
        }
        
        return data;
      } catch (error: any) {
        // Better error handling
        if (error.message.includes('400') && error.message.includes('já cadastrado')) {
          throw new Error('Este email já está cadastrado');
        } else if (error.message.includes('400')) {
          throw new Error('Dados inválidos ou incompletos');
        } else if (error.message.includes('500')) {
          throw new Error('Erro interno do servidor');
        }
        throw error;
      }
    },
    onSuccess: (data) => {
      try {
        setToken(data.token);
        localStorage.setItem("auth_token", data.token);
        queryClient.setQueryData(["/api/auth/me"], data.user);
        queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
        console.log('Registration successful for user:', data.user.email);
      } catch (error) {
        console.error('Error saving registration data:', error);
      }
    },
    onError: (error) => {
      console.error('Registration error:', error);
    }
  });

  const logout = () => {
    try {
      setToken(null);
      localStorage.removeItem("auth_token");
      queryClient.clear();
      console.log('User logged out successfully');
    } catch (error) {
      console.error('Error during logout:', error);
    }
  };

  // Handle authentication state changes
  useEffect(() => {
    if (error && token) {
      // If there's an auth error and we have a token, it might be invalid
      const errorMessage = error?.message || '';
      if (errorMessage.includes('401') || errorMessage.includes('Token inválido')) {
        console.log('Token inválido detectado, fazendo logout...');
        logout();
      }
    }
  }, [error, token]);

  // Validate token on app startup
  useEffect(() => {
    if (token && !user && !isLoading) {
      // Token exists but no user data - validate the token
      queryClient.invalidateQueries({ queryKey: ["/api/auth/me"] });
    }
  }, [token, user, isLoading, queryClient]);

  const value: AuthContextType = {
    user: (user as UserWithDriver) || null,
    isLoading: isLoading || loginMutation.isPending || registerMutation.isPending,
    login: loginMutation.mutateAsync,
    register: registerMutation.mutateAsync,
    logout,
    isAuthenticated: !!user && !!token && !error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}
