'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LayoutDashboard, Bike, IndianRupee, Wallet, UserCircle, LogOut } from 'lucide-react';
import { useRider } from '../lib/rider-context';

export default function Navigation() {
  const pathname = usePathname();
  const { rider, isOnline, activeOrder, activeRide, logout } = useRider();

  const navItems = [
    {
      href: '/',
      label: 'Deliveries',
      icon: LayoutDashboard,
      badge: activeOrder ? 1 : 0
    },
    {
      href: '/rides',
      label: 'City Rides',
      icon: Bike,
      badge: activeRide ? 1 : 0
    },
    {
      href: '/earnings',
      label: 'Earnings',
      icon: IndianRupee,
      badge: 0
    },
    {
      href: '/wallet',
      label: 'Wallet',
      icon: Wallet,
      badge: 0
    },
    {
      href: '/profile',
      label: 'Profile',
      icon: UserCircle,
      badge: 0
    }
  ];

  return (
    <>
      {/* Mobile Bottom Navigation Bar */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-xl border-t border-slate-200 px-2 py-2 shadow-lg">
        <div className="grid grid-cols-5 gap-1">
          {navItems.map((item) => {
            const isActive = pathname === item.href;
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex flex-col items-center justify-center py-1.5 px-1 rounded-2xl transition relative ${
                  isActive
                    ? 'text-blue-600 font-extrabold'
                    : 'text-slate-500 hover:text-slate-900'
                }`}
              >
                <div className="relative">
                  <Icon className={`w-5 h-5 transition-transform ${isActive ? 'scale-110 text-blue-600' : 'text-slate-500'}`} />
                  {item.badge > 0 && (
                    <span className="absolute -top-1.5 -right-2 w-4 h-4 bg-blue-600 text-white text-[10px] font-black rounded-full flex items-center justify-center animate-bounce shadow">
                      {item.badge}
                    </span>
                  )}
                </div>
                <span className="text-[10px] mt-1 font-bold tracking-tight truncate max-w-full">
                  {item.label}
                </span>
                {isActive && (
                  <span className="w-1.5 h-1.5 bg-blue-500 rounded-full mt-0.5" />
                )}
              </Link>
            );
          })}
        </div>
      </nav>

      {/* Desktop Navigation Sidebar — Fixed on Left */}
      <aside className="hidden md:flex md:w-64 md:flex-col fixed top-0 left-0 bottom-0 z-50 bg-white border-r border-slate-200 justify-between shadow-xs">
        <div>
          {/* Top Brand Header */}
          <div className="p-6 border-b border-slate-100 flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-r from-blue-600 to-indigo-600 text-white flex items-center justify-center shadow-md shadow-blue-500/20 shrink-0">
              <Bike className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black tracking-tight text-slate-900">
                  Pass<span className="text-blue-600">wala</span>
                </span>
              </div>
              <span className="text-[10px] font-extrabold text-blue-600 uppercase tracking-widest block">
                Rider Partner
              </span>
            </div>
          </div>

          {/* Navigation Items */}
          <nav className="p-4 space-y-1.5">
            {navItems.map((item) => {
              const isActive = pathname === item.href;
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  className={`flex items-center justify-between px-4 py-3 rounded-2xl text-sm font-bold transition ${
                    isActive
                      ? 'bg-blue-50 text-blue-600 border border-blue-200/80 font-extrabold shadow-xs'
                      : 'text-slate-600 hover:bg-slate-50 hover:text-slate-900'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className={`w-5 h-5 ${isActive ? 'text-blue-600' : 'text-slate-400'}`} />
                    <span>{item.label}</span>
                  </div>
                  {item.badge > 0 && (
                    <span className="px-2 py-0.5 bg-blue-600 text-white text-xs font-black rounded-full shadow">
                      {item.badge}
                    </span>
                  )}
                </Link>
              );
            })}
          </nav>
        </div>

        {/* Bottom Shift Status Footer */}
        <div className="p-4 border-t border-slate-100">
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-2xl flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className={`w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'
              }`} />
              <div>
                <span className="text-xs font-black text-slate-900 block leading-tight">
                  {rider?.name || 'Vikram Patel'}
                </span>
                <span className={`text-[10px] font-bold ${
                  isOnline ? 'text-emerald-600' : 'text-slate-500'
                }`}>
                  {isOnline ? 'Active Online' : 'Currently Offline'}
                </span>
              </div>
            </div>
            <Link
              href="/profile"
              className="w-8 h-8 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-slate-500 hover:text-slate-800 transition"
              title="Profile"
            >
              <UserCircle className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </aside>
    </>
  );
}
