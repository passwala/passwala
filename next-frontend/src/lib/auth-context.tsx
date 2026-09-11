'use client';

import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase-client';

interface UserProfile {
  id?: string;
  uid?: string;
  email?: string;
  phone?: string;
  phoneNumber?: string;
  name?: string;
  displayName?: string;
  role?: string;
  [key: string]: any;
}

interface AuthContextType {
  user: UserProfile | null;
  loading: boolean;
  isLoginOpen: boolean;
  openLogin: () => void;
  closeLogin: () => void;
  logout: () => Promise<void>;
  setUser: (user: UserProfile | null) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [isLoginOpen, setIsLoginOpen] = useState(false);

  // Hydrate from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem('passwala_user');
    if (stored) {
      try { setUser(JSON.parse(stored)); } catch {}
    }

    // Listen for Supabase auth state (handles Google OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
          const su = session.user;
          // Skip if already logged in locally
          if (localStorage.getItem('passwala_user')) {
            setLoading(false);
            return;
          }
          const name =
            su.user_metadata?.full_name ||
            su.user_metadata?.name ||
            (su.email || '').split('@')[0];

          const profile: UserProfile = {
            uid: su.id,
            email: su.email || undefined,
            name,
            displayName: name,
            role: 'BUYER',
          };
          setUser(profile);
          localStorage.setItem('passwala_user', JSON.stringify(profile));
          setIsLoginOpen(false);
        } else if (event === 'SIGNED_OUT') {
          setUser(null);
          localStorage.removeItem('passwala_user');
        }
        setLoading(false);
      }
    );

    setLoading(false);
    return () => subscription.unsubscribe();
  }, []);

  const openLogin = () => setIsLoginOpen(true);
  const closeLogin = () => setIsLoginOpen(false);

  const logout = async () => {
    await supabase.auth.signOut().catch(() => {});
    setUser(null);
    localStorage.removeItem('passwala_user');
  };

  return (
    <AuthContext.Provider value={{ user, loading, isLoginOpen, openLogin, closeLogin, logout, setUser }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuthContext = () => {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuthContext must be used within AuthProvider');
  return ctx;
};
