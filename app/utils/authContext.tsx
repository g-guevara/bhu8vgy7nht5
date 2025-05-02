// app/contexts/AuthContext.tsx
import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { User } from '../components/Login/User';
import { getToken, saveToken, removeToken } from '../lib/authUtils';
import { ApiService } from '../services/api';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  signup: (userData: { name: string; email: string; password: string; language: string }) => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAuth();
  }, []);

  const checkAuth = async () => {
    try {
      const token = await getToken();
      if (token) {
        const response = await ApiService.fetch('/verify-token');
        if (response.valid && response.user) {
          setUser({
            _id: response.user.userID,
            userID: response.user.userID,
            name: response.user.name,
            email: response.user.email,
            language: response.user.language || 'es',
            trialPeriodDays: response.user.trialPeriodDays || 5
          });
        } else {
          await removeToken();
        }
      }
    } catch (error) {
      console.error('Auth check error:', error);
      await removeToken();
    } finally {
      setLoading(false);
    }
  };

  const login = async (email: string, password: string) => {
    const response = await ApiService.login(email, password);
    if (response.token) {
      await saveToken(response.token);
      setUser(response.user);
    }
  };

  const logout = async () => {
    await removeToken();
    setUser(null);
  };

  const signup = async (userData: { name: string; email: string; password: string; language: string }) => {
    await ApiService.signup(userData);
    // After signup, user needs to login
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};