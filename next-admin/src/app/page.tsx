'use client';

import React, { useState, useEffect } from 'react';
import { useAdmin } from '@/lib/admin-context';
import { adminApi } from '@/lib/api-client';
import { StatCard } from '@/components/StatCard';
import { EventWizardModal } from '@/components/EventWizardModal';
import {
  Users,
  Store,
  Bike,
  Sparkles,
  Trophy,
  Ticket,
  TrendingUp,
  ShieldAlert,
  ArrowRight,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  MapPin
} from 'lucide-react';
import Link from 'next/link';
import { formatCurrency, formatDateTime, getStatusBadge } from '@/lib/utils';
import { toast } from 'react-hot-toast';

export default function AdminDashboardPage() {
  const { pendingApprovalsCount, pendingUpgradesCount } = useAdmin();
  const [stats, setStats] = useState<any>({
    users: 0,
    vendors: 0,
    riders: 0,
    events: 0,
    venues: 0,
    bookings: 0,
    revenue: 0
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showEventWizard, setShowEventWizard] = useState(false);

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const [statsRes, bookingsRes, venuesRes] = await Promise.allSettled([
        adminApi.getStats(),
        adminApi.fetchTable('event_bookings'),
        adminApi.fetchTable('venue_bookings')
      ]);

      if (statsRes.status === 'fulfilled' && statsRes.value?.stats) {
        const s = statsRes.value.stats;
        setStats({
          users: s.users ?? s.userCount ?? 0,
          vendors: s.vendors ?? s.vendorCount ?? 0,
          riders: s.riders ?? s.riderCount ?? 0,
          events: s.events ?? s.eventCount ?? 0,
          venues: s.venues ?? s.venueCount ?? 0,
          bookings: s.bookings ?? s.orders ?? s.orderCount ?? 0,
          revenue: s.revenue ?? s.totalRevenue ?? 0
        });
      }

      const combinedBookings: any[] = [];
      if (bookingsRes.status === 'fulfilled' && Array.isArray(bookingsRes.value.data)) {
        combinedBookings.push(...bookingsRes.value.data);
      }
      if (venuesRes.status === 'fulfilled' && Array.isArray(venuesRes.value.data)) {
        combinedBookings.push(...venuesRes.value.data);
      }

      combinedBookings.sort((a, b) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime());
      setRecentBookings(combinedBookings.slice(0, 6));
    } catch (err: any) {
      console.error('Failed to load dashboard data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboardData();
  }, []);

  return (
    <div className="space-y-8">
      {/* Top Welcome Title */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900 sm:text-3xl">
            Platform Intelligence
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Real-time overview of your entire ecosystem across Ahmedabad & service hubs.
          </p>
        </div>

        <button
          onClick={() => setShowEventWizard(true)}
          className="flex items-center gap-2 rounded-2xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white shadow-sm hover:bg-purple-700 transition-all cursor-pointer shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Publish Event</span>
        </button>
      </div>

      {/* Action Banners for Pending Items */}
      {(pendingApprovalsCount > 0 || pendingUpgradesCount > 0) && (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          {pendingApprovalsCount > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-amber-200 bg-amber-50/80 p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white shrink-0">
                  <ShieldAlert className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-amber-900">
                    {pendingApprovalsCount} Event{pendingApprovalsCount > 1 ? 's' : ''} Awaiting Approval
                  </p>
                  <p className="text-[11px] font-medium text-amber-700">
                    Community organizers submitted events for review.
                  </p>
                </div>
              </div>
              <Link
                href="/events/approvals"
                className="flex items-center gap-1 rounded-xl bg-amber-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-amber-700 transition-colors shrink-0"
              >
                <span>Review</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}

          {pendingUpgradesCount > 0 && (
            <div className="flex items-center justify-between rounded-2xl border border-orange-200 bg-orange-50/80 p-4 shadow-xs">
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-orange-500 text-white shrink-0">
                  <Store className="h-5 w-5" />
                </div>
                <div>
                  <p className="text-xs font-black text-orange-900">
                    {pendingUpgradesCount} Organizer Upgrade Request{pendingUpgradesCount > 1 ? 's' : ''}
                  </p>
                  <p className="text-[11px] font-medium text-orange-700">
                    Vendors applied for organizer privileges.
                  </p>
                </div>
              </div>
              <Link
                href="/upgrades"
                className="flex items-center gap-1 rounded-xl bg-orange-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-orange-700 transition-colors shrink-0"
              >
                <span>Review</span>
                <ArrowRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          )}
        </div>
      )}

      {/* KPI Metrics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Users"
          value={stats.users || 0}
          subtitle="Buyers, Vendors & Riders"
          icon={Users}
          color="purple"
        />
        <StatCard
          title="Active Vendors"
          value={stats.vendors || 0}
          subtitle="Organizers & Merchant Stores"
          icon={Store}
          color="orange"
        />
        <StatCard
          title="Delivery Riders"
          value={stats.riders || 0}
          subtitle="Active on Fleet Duty"
          icon={Bike}
          color="blue"
        />
        <StatCard
          title="Live Events"
          value={stats.events || 0}
          subtitle="Public & Featured Events"
          icon={Sparkles}
          color="emerald"
        />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <StatCard
          title="Sports Venues"
          value={stats.venues || 0}
          subtitle="Box Cricket, Turf & Courts"
          icon={Trophy}
          color="amber"
        />
        <StatCard
          title="Total Bookings"
          value={stats.bookings || 0}
          subtitle="Tickets & Turf Slots Reserved"
          icon={Ticket}
          color="purple"
        />
        <StatCard
          title="Platform GMV"
          value={formatCurrency(stats.revenue || 0)}
          subtitle="Total Processed Booking Value"
          icon={TrendingUp}
          color="emerald"
        />
      </div>

      {/* Quick Launchpad & Recent Bookings */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Quick Launchpad */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Operations Hub
            </h2>
            <span className="rounded-full bg-slate-100 px-2.5 py-0.5 text-[10px] font-black text-slate-600">
              Shortcuts
            </span>
          </div>

          <div className="space-y-2.5">
            <Link
              href="/users"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs font-bold text-slate-800 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <Users className="h-4 w-4 text-purple-600" />
                <span>Manage Users & Roles</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/events"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs font-bold text-slate-800 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <Sparkles className="h-4 w-4 text-purple-600" />
                <span>Events Directory & Tiers</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/venues"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs font-bold text-slate-800 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <Trophy className="h-4 w-4 text-emerald-600" />
                <span>Sports Venues & Slots</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/map"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs font-bold text-slate-800 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-orange-600" />
                <span>People & Fleet Geo Map</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>

            <Link
              href="/settings"
              className="flex items-center justify-between rounded-2xl border border-slate-100 bg-slate-50/50 p-3.5 text-xs font-bold text-slate-800 hover:bg-purple-50 hover:border-purple-200 hover:text-purple-700 transition-all"
            >
              <div className="flex items-center gap-3">
                <Clock className="h-4 w-4 text-slate-600" />
                <span>Platform Fees & Config</span>
              </div>
              <ArrowRight className="h-4 w-4 text-slate-400" />
            </Link>
          </div>
        </div>

        {/* Live Bookings Stream */}
        <div className="lg:col-span-2 rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
                Latest Bookings Stream
              </h2>
              <p className="text-[11px] font-medium text-slate-500">Real-time incoming reservations</p>
            </div>
            <Link
              href="/bookings"
              className="text-xs font-bold text-purple-600 hover:text-purple-700 flex items-center gap-1"
            >
              <span>View All</span>
              <ArrowRight className="h-3.5 w-3.5" />
            </Link>
          </div>

          {recentBookings.length === 0 ? (
            <div className="py-12 text-center text-slate-400">
              <Calendar className="mx-auto h-8 w-8 text-slate-300 mb-2" />
              <p className="font-bold text-slate-600 text-xs">No recent bookings recorded</p>
              <p className="text-[11px]">New event and turf bookings will appear here instantly.</p>
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {recentBookings.map((b, idx) => {
                const badge = getStatusBadge(b.status);
                return (
                  <div key={b.id || idx} className="flex items-center justify-between py-3">
                    <div className="flex items-center gap-3">
                      <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-600 shrink-0">
                        <Ticket className="h-4 w-4" />
                      </div>
                      <div>
                        <p className="text-xs font-bold text-slate-900">
                          Booking #{String(b.id || '').slice(0, 8)}
                        </p>
                        <p className="text-[11px] text-slate-500">
                          {formatDateTime(b.created_at)} &bull; {b.ticket_count ? `${b.ticket_count} ticket(s)` : (b.scheduled_at ? 'Turf Slot' : 'Order')}
                        </p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-xs font-black text-slate-900">
                        {formatCurrency(b.total_amount)}
                      </p>
                      <span className={`inline-block rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                        {badge.label}
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Event Wizard Modal */}
      <EventWizardModal
        isOpen={showEventWizard}
        onClose={() => setShowEventWizard(false)}
        onSuccess={loadDashboardData}
      />
    </div>
  );
}
