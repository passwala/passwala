'use client';

import React from 'react';
import { 
  Bars3Icon, 
  ArrowPathIcon, 
  ArrowTopRightOnSquareIcon, 
  CircleStackIcon 
} from '@heroicons/react/24/outline';
import { useAdmin } from '@/lib/admin-context';
import { usePathname } from 'next/navigation';
import { cn } from '@/lib/utils';

interface HeaderProps {
  onOpenMenu: () => void;
}

export function Header({ onOpenMenu }: HeaderProps) {
  const { syncStatus, refreshCounters, isLoading } = useAdmin();
  const pathname = usePathname();

  // Create friendly readable title from path
  const getPageTitle = () => {
    if (pathname === '/') return 'Dashboard';
    const segment = pathname.split('/')[1] || '';
    const sub = pathname.split('/')[2];
    if (sub) return `${segment.charAt(0).toUpperCase() + segment.slice(1)} / ${sub.charAt(0).toUpperCase() + sub.slice(1)}`;
    return segment.charAt(0).toUpperCase() + segment.slice(1);
  };

  return (
    <header className="sticky top-0 z-30 flex h-16 w-full items-center justify-between border-b border-slate-200/80 bg-white/95 px-4 backdrop-blur-sm sm:px-6">
      {/* Left side: Hamburger & Breadcrumb */}
      <div className="flex items-center gap-3">
        <button
          onClick={onOpenMenu}
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 lg:hidden"
        >
          <Bars3Icon className="h-5 w-5" />
        </button>

        <div className="flex items-center gap-2 text-sm font-bold text-slate-900">
          <div className="hidden items-center gap-1.5 text-xs font-semibold text-slate-400 sm:flex">
            <CircleStackIcon className="h-3.5 w-3.5 text-blue-600" />
            <span>SUPERADMIN</span>
            <span>/</span>
          </div>
          <span className="text-base font-extrabold text-slate-900">
            {getPageTitle()}
          </span>
        </div>
      </div>

      {/* Right side: Sync Pill, External Portal Links, Refresh */}
      <div className="flex items-center gap-2 sm:gap-3">
        {/* Sync Indicator */}
        <div
          className={cn(
            'flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-bold transition-colors',
            syncStatus === 'cloud' && 'border-emerald-200 bg-emerald-50 text-emerald-700',
            syncStatus === 'cached' && 'border-amber-200 bg-amber-50 text-amber-700',
            syncStatus === 'offline' && 'border-rose-200 bg-rose-50 text-rose-700'
          )}
        >
          <span
            className={cn(
              'h-2 w-2 rounded-full',
              syncStatus === 'cloud' && 'bg-emerald-500 animate-pulse',
              syncStatus === 'cached' && 'bg-amber-500',
              syncStatus === 'offline' && 'bg-rose-500'
            )}
          />
          <span className="hidden sm:inline">
            {syncStatus === 'cloud' ? 'Cloud Sync Active' : syncStatus === 'cached' ? 'Cached Data' : 'Offline'}
          </span>
        </div>

        {/* Portal Quick Links Dropdown/Button */}
        <a
          href="http://localhost:3001"
          target="_blank"
          rel="noopener noreferrer"
          className="hidden md:flex items-center gap-1.5 text-xs font-bold text-slate-600 hover:text-blue-600 rounded-lg px-2 py-1 hover:bg-slate-50"
        >
          <span>Buyer App</span>
          <ArrowTopRightOnSquareIcon className="h-3.5 w-3.5" />
        </a>

        {/* Refresh Counters */}
        <button
          onClick={refreshCounters}
          disabled={isLoading}
          title="Refresh system metrics"
          className="rounded-xl border border-slate-200 p-2 text-slate-600 hover:bg-slate-50 hover:text-slate-900 cursor-pointer transition-transform active:rotate-180"
        >
          <ArrowPathIcon className={cn('h-4 w-4', isLoading && 'animate-spin text-blue-600')} />
        </button>

        {/* Admin Badge */}
        <div className="flex items-center gap-2 rounded-xl bg-blue-50 border border-blue-100 px-3 py-1.5">
          <div className="flex h-6 w-6 items-center justify-center rounded-lg bg-blue-600 text-white font-black text-xs">
            A
          </div>
          <span className="text-xs font-black text-blue-900 hidden sm:inline">Admin Root</span>
        </div>
      </div>
    </header>
  );
}
