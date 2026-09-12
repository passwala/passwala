'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
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
  CheckCircle2,
  ExternalLink
} from 'lucide-react';

interface NavItem {
  label: string;
  href: string;
  icon: any;
  badge?: string;
}

export function Sidebar({ isOpen, onClose }: { isOpen: boolean; onClose?: () => void }) {
  const pathname = usePathname();
  const router = useRouter();
  const { vendor, store, businessType, setBusinessType, logout } = useVendor();

  // For sports account or sports active console, show Sports Venues and Court Bookings, NEVER Events
  const isSports = store?.business_type === 'sports' || businessType === 'sports';

  const inventoryItem: NavItem = isSports
    ? { label: 'Sports Venues', href: '/venues', icon: Trophy }
    : { label: 'Events', href: '/events', icon: Ticket };

  const bookingsItem: NavItem = isSports
    ? { label: 'Court Bookings', href: '/bookings', icon: CalendarCheck2 }
    : { label: 'Ticket Bookings', href: '/bookings', icon: CalendarCheck2 };

  const navItems: NavItem[] = [
    { label: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
    inventoryItem,
    bookingsItem,
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
          className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs z-40 lg:hidden"
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-full w-64 bg-white border-r border-slate-200 z-50 flex flex-col justify-between transition-transform duration-300 ease-in-out shadow-sm ${
          isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'
        }`}
      >
        {/* Top Brand */}
        <div className="p-5 border-b border-slate-100">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-orange-50 border border-orange-200/80 p-1.5 flex items-center justify-center shadow-xs">
              <img src="/logo.png" alt="Passwala Logo" className="w-full h-full object-contain" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-lg font-black tracking-tight text-slate-900">Passwala</span>
                <span className="text-[9px] font-black uppercase px-1.5 py-0.5 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                  Partner
                </span>
              </div>
              <p className="text-xs font-semibold text-slate-500 truncate max-w-[140px]">
                {store?.business_name || store?.name || 'My Business'}
              </p>
            </div>
          </div>

          {/* Quick Console Switcher or Fixed Account Type Badge */}
          <div className="mt-4 pt-3 border-t border-slate-100">
            {store?.business_type === 'sports' ? (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Account Type
                </label>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200/80 text-xs font-bold shadow-xs">
                  <div className="w-6 h-6 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0">
                    <Trophy className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="block font-black text-slate-900 leading-none">Sports Venue</span>
                    <span className="text-[10px] font-semibold text-emerald-700">Turf & Box Cricket</span>
                  </div>
                </div>
              </div>
            ) : store?.business_type === 'event' ? (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Account Type
                </label>
                <div className="flex items-center gap-2.5 px-3 py-2 rounded-xl bg-indigo-50 text-indigo-800 border border-indigo-200/80 text-xs font-bold shadow-xs">
                  <div className="w-6 h-6 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Ticket className="w-3.5 h-3.5" />
                  </div>
                  <div className="truncate">
                    <span className="block font-black text-slate-900 leading-none">Event Organizer</span>
                    <span className="text-[10px] font-semibold text-indigo-700">Concerts & Shows</span>
                  </div>
                </div>
              </div>
            ) : (
              <div>
                <label className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-1.5">
                  Active Console
                </label>
                <div className="grid grid-cols-2 gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setBusinessType('sports');
                      if (pathname.startsWith('/events')) {
                        router.push('/venues');
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      businessType === 'sports'
                        ? 'bg-emerald-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Trophy className="w-3.5 h-3.5" />
                    <span>Sports</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setBusinessType('event');
                      if (pathname.startsWith('/venues')) {
                        router.push('/events');
                      }
                    }}
                    className={`flex items-center justify-center gap-1.5 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                      businessType === 'event'
                        ? 'bg-indigo-600 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900 hover:bg-white/80'
                    }`}
                  >
                    <Ticket className="w-3.5 h-3.5" />
                    <span>Events</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Nav Links */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href || (item.href !== '/dashboard' && pathname.startsWith(item.href));
            const Icon = item.icon;

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={onClose}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-sm font-semibold transition-all ${
                  isActive
                    ? 'bg-orange-50 text-orange-600 border border-orange-200/80 shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50 border border-transparent'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon className={`w-4 h-4 ${isActive ? 'text-orange-600' : 'text-slate-400 group-hover:text-slate-600'}`} />
                  <span>{item.label}</span>
                </div>
                {item.badge && (
                  <span className="text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}

          <div className="pt-3 mt-3 border-t border-slate-100">
            <a
              href="http://localhost:3001"
              target="_blank"
              rel="noreferrer"
              className="flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-500 hover:text-slate-800 hover:bg-slate-50 transition-all"
            >
              <span>View Buyer App (:3001)</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          </div>
        </div>

        {/* Footer / Account */}
        <div className="p-4 border-t border-slate-100 bg-slate-50/70">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5 overflow-hidden">
              <div className="w-8 h-8 rounded-full bg-orange-100 text-orange-700 border border-orange-200 flex items-center justify-center font-bold text-xs shrink-0">
                {(vendor?.displayName || store?.business_name || 'V')[0]?.toUpperCase()}
              </div>
              <div className="truncate">
                <p className="text-xs font-bold text-slate-800 truncate">
                  {vendor?.displayName || 'Vendor Partner'}
                </p>
                <p className="text-[11px] text-slate-500 truncate flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3 text-emerald-600 shrink-0" />
                  <span>+91 {vendor?.phone || 'Verified'}</span>
                </p>
              </div>
            </div>

            <button
              onClick={logout}
              title="Logout"
              className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
