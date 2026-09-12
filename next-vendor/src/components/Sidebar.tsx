'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useVendor, BusinessType } from '@/lib/vendor-context';
import { 
  LayoutDashboard, 
  Trophy, 
  Ticket, 
  CalendarCheck2, 
  QrCode, 
  TrendingUp, 
  Wallet, 
  Settings, 
  LogOut, 
  Store,
  ChevronDown
} from 'lucide-react';

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const { vendor, store, businessType, setBusinessType, logout } = useVendor();

  const navItems = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    { label: 'Sports Venues', href: '/venues', icon: Trophy },
    { label: 'Events', href: '/events', icon: Ticket },
    { label: 'Bookings & Orders', href: '/bookings', icon: CalendarCheck2 },
    { label: 'QR Scanner', href: '/scanner', icon: QrCode, badge: 'Live' },
    { label: 'Earnings', href: '/earnings', icon: TrendingUp },
    { label: 'Wallet', href: '/wallet', icon: Wallet },
    { label: 'Settings', href: '/settings', icon: Settings },
  ];

  return (
    <>
      {/* Mobile Backdrop */}
      {isOpen && (
        <div
          onClick={onClose}
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-zinc-950 border-r border-zinc-800/80 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand */}
        <div className="p-6 border-b border-zinc-800/60">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-zinc-900 border border-zinc-800 p-1.5 flex items-center justify-center shadow-md">
              <img src="/logo.png" alt="Passwala Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-white">Passwala</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.2 rounded bg-orange-500/20 text-orange-400 border border-orange-500/30">
                  Partner
                </span>
              </div>
              <p className="text-[11px] text-zinc-500 truncate max-w-[140px]">
                {store?.business_name || store?.name || 'My Business'}
              </p>
            </div>
          </div>

          {/* Quick Console Switcher */}
          <div className="mt-4 pt-3 border-t border-zinc-900">
            <label className="text-[10px] font-bold text-zinc-500 uppercase tracking-wider block mb-1.5">
              Active Console
            </label>
            <div className="grid grid-cols-2 gap-1.5 bg-zinc-900/80 p-1 rounded-xl border border-zinc-800">
              <button
                onClick={() => setBusinessType('sports')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  businessType === 'sports'
                    ? 'bg-orange-500 text-white shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Trophy className="w-3.5 h-3.5" />
                <span>Sports</span>
              </button>
              <button
                onClick={() => setBusinessType('event')}
                className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all ${
                  businessType === 'event'
                    ? 'bg-purple-600 text-white shadow'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-800'
                }`}
              >
                <Ticket className="w-3.5 h-3.5" />
                <span>Events</span>
              </button>
            </div>
          </div>
        </div>

        {/* Navigation Links */}
        <div className="flex-1 overflow-y-auto py-4 px-3 space-y-1 scrollbar-hide">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`group flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-orange-500/10 text-orange-400 border border-orange-500/20'
                    : 'text-zinc-400 hover:text-white hover:bg-zinc-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 transition-colors ${isActive ? 'text-orange-500' : 'text-zinc-500 group-hover:text-zinc-300'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold px-1.5 py-0.2 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </div>

        {/* User Info & Logout */}
        <div className="p-4 border-t border-zinc-800/60 bg-zinc-950">
          <div className="flex items-center justify-between p-2 rounded-xl bg-zinc-900/60 border border-zinc-800/80">
            <div className="flex items-center gap-2.5 min-w-0">
              <div className="w-8 h-8 rounded-full bg-orange-500/20 border border-orange-500/30 text-orange-400 flex items-center justify-center font-bold text-xs shrink-0">
                {(vendor?.name || 'V').charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <p className="text-xs font-bold text-white truncate">{vendor?.name || 'Partner'}</p>
                <p className="text-[10px] text-zinc-500 font-mono truncate">+91 {vendor?.phone}</p>
              </div>
            </div>
            <button
              onClick={logout}
              title="Logout"
              className="p-1.5 rounded-lg text-zinc-400 hover:text-red-400 hover:bg-red-500/10 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
