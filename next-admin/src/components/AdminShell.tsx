'use client';

import React, { useState } from 'react';
import { usePathname } from 'next/navigation';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { useAdmin } from '@/lib/admin-context';
import { RefreshCw } from 'lucide-react';

export function AdminShell({ children }: { children: React.ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const pathname = usePathname();
  const { isLoading, isAuthenticated } = useAdmin();

  // If on login page, render children directly without admin chrome
  if (pathname?.startsWith('/login')) {
    return <>{children}</>;
  }

  // Loading state while checking session
  if (isLoading) {
    return (
      <div className="flex h-screen w-full items-center justify-center bg-slate-50">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="h-8 w-8 animate-spin text-purple-600" />
          <p className="text-xs font-bold text-slate-500">Initializing SuperAdmin Console...</p>
        </div>
      </div>
    );
  }

  // If not authenticated, AdminProvider will redirect to /login
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-slate-50">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="flex flex-col lg:pl-64">
        <Header onOpenMenu={() => setSidebarOpen(true)} />
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-7xl">
            {children}
          </div>
        </main>
      </div>
    </div>
  );
}
