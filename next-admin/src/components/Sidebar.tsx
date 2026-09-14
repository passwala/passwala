'use client';

import React from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { PasswalaLogo } from './PasswalaLogo';
import { useAdmin } from '@/lib/admin-context';
import {
  LayoutDashboard,
  Users,
  Store,
  Bike,
  Sparkles,
  ShieldCheck,
  Trophy,
  UserCheck,
  Ticket,
  Tag,
  Settings,
  MapPin,
  LogOut,
  X
} from 'lucide-react';
import { cn } from '@/lib/utils';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
}

export function Sidebar({ isOpen, onClose }: SidebarProps) {
  const pathname = usePathname();
  const { logout, pendingApprovalsCount, pendingUpgradesCount, role } = useAdmin();

  const navigationSections = [
    {
      label: 'Main Control',
      items: [
        { label: 'Dashboard', href: '/', icon: LayoutDashboard },
        { label: 'People & Fleet Map', href: '/map', icon: MapPin },
      ]
    },
    {
      label: 'Directory',
      items: [
        { label: 'Users Directory', href: '/users', icon: Users },
        { label: 'Vendors & Partners', href: '/vendors', icon: Store },
        { label: 'Riders Fleet', href: '/riders', icon: Bike },
      ]
    },
    {
      label: 'Events & Venues',
      items: [
        { label: 'Events Console', href: '/events', icon: Sparkles },
        {
          label: 'Event Approvals',
          href: '/events/approvals',
          icon: ShieldCheck,
          badge: pendingApprovalsCount > 0 ? pendingApprovalsCount : undefined,
          badgeColor: 'bg-amber-500 text-white'
        },
        { label: 'Sports Venues', href: '/venues', icon: Trophy },
      ]
    },
    {
      label: 'Operations',
      items: [
        {
          label: 'Upgrade Requests',
          href: '/upgrades',
          icon: UserCheck,
          badge: pendingUpgradesCount > 0 ? pendingUpgradesCount : undefined,
          badgeColor: 'bg-orange-500 text-white'
        },
        { label: 'Bookings & Tickets', href: '/bookings', icon: Ticket },
        { label: 'Promo Codes', href: '/promos', icon: Tag },
      ]
    },
    {
      label: 'System',
      items: [
        { label: 'Platform Settings', href: '/settings', icon: Settings },
      ]
    }
  ];

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-slate-900/50 backdrop-blur-xs lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar Panel */}
      <aside
        className={cn(
          'fixed top-0 left-0 z-50 flex h-full w-64 flex-col justify-between border-r border-slate-200 bg-white shadow-sm transition-transform duration-200 ease-in-out lg:translate-x-0',
          isOpen ? 'translate-x-0' : '-translate-x-full'
        )}
      >
        {/* Brand Header */}
        <div className="flex flex-col border-b border-slate-100 p-5">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <PasswalaLogo
                size="sm"
                variant="admin"
                showTagline
                tagline="SUPERADMIN OPS"
                href="/"
              />
            </div>
            <button
              onClick={onClose}
              className="rounded-lg p-1 text-slate-400 hover:bg-slate-100 lg:hidden"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </div>

        {/* Scrollable Navigation Items */}
        <div className="flex-1 overflow-y-auto px-3 py-4 space-y-6">
          {navigationSections.map((section) => (
            <div key={section.label} className="space-y-1">
              <p className="px-3 text-[10px] font-black uppercase tracking-wider text-slate-400">
                {section.label}
              </p>
              <div className="space-y-0.5 pt-1">
                {section.items.map((item) => {
                  const isActive = pathname === item.href || (item.href !== '/' && pathname.startsWith(item.href));
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      onClick={onClose}
                      className={cn(
                        'group flex items-center justify-between rounded-xl px-3 py-2 text-xs font-bold transition-colors',
                        isActive
                          ? 'bg-purple-600 text-white shadow-xs'
                          : 'text-slate-600 hover:bg-slate-100 hover:text-slate-900'
                      )}
                    >
                      <div className="flex items-center gap-3">
                        <Icon
                          className={cn(
                            'h-4 w-4 shrink-0 transition-transform group-hover:scale-110',
                            isActive ? 'text-white' : 'text-slate-500 group-hover:text-slate-700'
                          )}
                        />
                        <span>{item.label}</span>
                      </div>
                      {item.badge !== undefined && (
                        <span
                          className={cn(
                            'flex h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-black',
                            isActive ? 'bg-white text-purple-700' : item.badgeColor || 'bg-slate-200 text-slate-700'
                          )}
                        >
                          {item.badge}
                        </span>
                      )}
                    </Link>
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* User Footer & Logout */}
        <div className="border-t border-slate-100 p-3">
          <div className="mb-2 flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 border border-slate-100">
            <div className="truncate">
              <p className="text-xs font-black text-slate-900">Passwala Staff</p>
              <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider">{role}</p>
            </div>
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-100" />
          </div>
          <button
            onClick={logout}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-3 py-2 text-xs font-bold text-rose-600 transition-colors hover:bg-rose-100 hover:text-rose-700 cursor-pointer"
          >
            <LogOut className="h-4 w-4" />
            <span>Terminate Session</span>
          </button>
        </div>
      </aside>
    </>
  );
}
