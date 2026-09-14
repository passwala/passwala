'use client';

import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { adminApi } from './api-client';
import { toast } from 'react-hot-toast';

interface AdminContextType {
  isAuthenticated: boolean;
  isLoading: boolean;
  role: string;
  syncStatus: 'cloud' | 'cached' | 'offline';
  pendingApprovalsCount: number;
  pendingUpgradesCount: number;
  login: (accessCode: string) => Promise<boolean>;
  logout: () => void;
  refreshCounters: () => Promise<void>;
}

const AdminContext = createContext<AdminContextType | undefined>(undefined);

export function AdminProvider({ children }: { children: React.ReactNode }) {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [role, setRole] = useState<string>('SUPERADMIN');
  const [syncStatus, setSyncStatus] = useState<'cloud' | 'cached' | 'offline'>('cloud');
  const [pendingApprovalsCount, setPendingApprovalsCount] = useState<number>(0);
  const [pendingUpgradesCount, setPendingUpgradesCount] = useState<number>(0);

  const router = useRouter();
  const pathname = usePathname();

  const checkAuth = useCallback(() => {
    if (typeof window === 'undefined') return;
    const token = sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
    const session = sessionStorage.getItem('admin_session') || localStorage.getItem('admin_session');

    if (token && session === 'true') {
      setIsAuthenticated(true);
      setSyncStatus('cloud');
    } else {
      setIsAuthenticated(false);
      if (pathname && !pathname.startsWith('/login')) {
        router.replace('/login');
      }
    }
    setIsLoading(false);
  }, [pathname, router]);

  const refreshCounters = useCallback(async () => {
    try {
      const [eventsRes, upgradesRes] = await Promise.allSettled([
        adminApi.getPendingEvents(),
        adminApi.fetchTable('event_organizer_requests')
      ]);

      if (eventsRes.status === 'fulfilled' && eventsRes.value.events) {
        setPendingApprovalsCount(eventsRes.value.events.length);
      }
      if (upgradesRes.status === 'fulfilled' && upgradesRes.value.data) {
        const pending = upgradesRes.value.data.filter((r: any) => (r.request_status || r.status || 'PENDING') === 'PENDING');
        setPendingUpgradesCount(pending.length);
      }
      setSyncStatus('cloud');
    } catch {
      setSyncStatus('offline');
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  useEffect(() => {
    if (isAuthenticated) {
      refreshCounters();
      const interval = setInterval(refreshCounters, 30000);
      return () => clearInterval(interval);
    }
  }, [isAuthenticated, refreshCounters]);

  const login = async (accessCode: string): Promise<boolean> => {
    try {
      setIsLoading(true);
      const res = await adminApi.login(accessCode);
      if (res.success) {
        setIsAuthenticated(true);
        if (res.role) setRole(res.role);
        toast.success('Admin authorized successfully');
        router.replace('/');
        return true;
      }
      return false;
    } catch (err: any) {
      toast.error(err.message || 'Invalid access code');
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = () => {
    sessionStorage.removeItem('admin_token');
    sessionStorage.removeItem('admin_session');
    localStorage.removeItem('admin_token');
    localStorage.removeItem('admin_session');
    setIsAuthenticated(false);
    toast.success('Admin session ended');
    router.replace('/login');
  };

  return (
    <AdminContext.Provider
      value={{
        isAuthenticated,
        isLoading,
        role,
        syncStatus,
        pendingApprovalsCount,
        pendingUpgradesCount,
        login,
        logout,
        refreshCounters
      }}
    >
      {children}
    </AdminContext.Provider>
  );
}

export function useAdmin() {
  const context = useContext(AdminContext);
  if (!context) {
    throw new Error('useAdmin must be used within an AdminProvider');
  }
  return context;
}
