'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/lib/vendor-context';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency } from '@/lib/utils';
import Link from 'next/link';
import { 
  IndianRupee, 
  Trophy, 
  Ticket, 
  Users, 
  Star, 
  ArrowUpRight, 
  QrCode, 
  Calendar, 
  Clock, 
  Plus, 
  CheckCircle2, 
  AlertCircle,
  ExternalLink
} from 'lucide-react';
import { StarIcon as StarIconSolid, ShieldCheckIcon as ShieldCheckSolid } from '@heroicons/react/24/solid';
import { ClipboardDocumentListIcon } from '@heroicons/react/24/outline';

export default function DashboardPage() {
  const router = useRouter();
  const { vendor, store, businessType, loading, isOnboarded } = useVendor();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [stats, setStats] = useState({
    totalRevenue: 0,
    todayBookings: 0,
    totalCustomers: 0,
    rating: 0,
  });
  const [recentBookings, setRecentBookings] = useState<any[]>([]);
  const [dataLoading, setDataLoading] = useState(true);

  useEffect(() => {
    if (!loading) {
      if (!vendor) {
        router.replace('/login');
      } else if (!isOnboarded) {
        router.replace('/onboarding');
      }
    }
  }, [vendor, isOnboarded, loading, router]);

  // Load real data from Supabase for this vendor
  useEffect(() => {
    if (!vendor) return;

    const fetchDashboardData = async () => {
      setDataLoading(true);
      try {
        const phone = vendor?.phone || '';
        const res = await fetch(`/api/bookings?type=${businessType}&phone=${encodeURIComponent(phone)}`);
        const resData = await res.json();
        const bookings = (resData.success && Array.isArray(resData.bookings)) ? resData.bookings : [];

        if (bookings.length > 0) {
          setRecentBookings(bookings.slice(0, 5));
          const total = bookings.reduce((sum: number, b: any) => sum + (parseFloat(b.total_amount) || 0), 0);
          const unique = new Set(bookings.map((b: any) => b.user_phone || b.user_id || b.user_name || b.customer_name)).size;
          setStats({
            totalRevenue: total,
            todayBookings: bookings.length,
            totalCustomers: unique,
            rating: 5.0,
          });
        } else {
          setRecentBookings([]);
          setStats({
            totalRevenue: 0,
            todayBookings: 0,
            totalCustomers: 0,
            rating: 0,
          });
        }
      } catch (e) {
        console.error('Error loading dashboard data:', e);
      } finally {
        setDataLoading(false);
      }
    };

    fetchDashboardData();
  }, [vendor, businessType]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-blue-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Business Overview" />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-blue-600 to-indigo-700 p-6 md:p-10 shadow-lg text-white">
            <div className="relative z-10 max-w-2xl space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-white/15 text-white text-xs font-bold border border-white/20 backdrop-blur-xs">
                <ShieldCheckSolid className="w-4 h-4 text-blue-200" />
                Verified Passwala Partner
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                Welcome back, {vendor?.name || 'Partner'}!
              </h2>
              <p className="text-sm text-blue-100 leading-relaxed">
                {businessType === 'sports'
                  ? 'Your turfs and grounds are open for live hourly slot bookings. View slots, confirm players, and check in attendees.'
                  : 'Manage your live events, set up tiered passes, and scan guest QR tickets at the gate.'}
              </p>
            </div>
            {/* Ambient pattern */}
            <div className="absolute right-0 top-0 bottom-0 w-1/2 bg-[radial-gradient(ellipse_at_top_right,_var(--tw-gradient-stops))] from-white/20 via-transparent to-transparent pointer-events-none" />
          </div>

          {/* Quick Metrics Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
            {/* Metric 1 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Earnings</span>
                <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100">
                  <IndianRupee className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{formatCurrency(stats.totalRevenue)}</span>
                <span className="text-xs font-bold text-emerald-600 flex items-center gap-0.5">
                  <ArrowUpRight className="w-3.5 h-3.5" /> Live
                </span>
              </div>
            </div>

            {/* Metric 2 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                  {businessType === 'sports' ? 'Turf Bookings' : 'Tickets Sold'}
                </span>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  {businessType === 'sports' ? <Trophy className="w-4 h-4" /> : <Ticket className="w-4 h-4" />}
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.todayBookings} Bookings</span>
                <span className="text-xs text-slate-500 font-medium">All-time</span>
              </div>
            </div>

            {/* Metric 3 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Total Guests</span>
                <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100">
                  <Users className="w-4 h-4" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900">{stats.totalCustomers} Players</span>
                <span className="text-xs text-emerald-600 font-semibold">Total unique</span>
              </div>
            </div>

            {/* Metric 4 */}
            <div className="p-6 rounded-2xl bg-white border border-slate-200 shadow-xs space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Partner Rating</span>
                <div className="p-2.5 rounded-xl bg-amber-50 text-amber-600 border border-amber-100">
                  <Star className="w-4 h-4 fill-amber-400 text-amber-500" />
                </div>
              </div>
              <div className="flex items-baseline justify-between">
                <span className="text-2xl font-black text-slate-900 flex items-center gap-1.5">
                  {stats.rating > 0 ? (
                    <>
                      <span>{stats.rating}</span>
                      <StarIconSolid className="w-5 h-5 text-amber-400 inline" />
                    </>
                  ) : (
                    '—'
                  )}
                </span>
                <span className="text-xs text-emerald-600 font-bold">{stats.rating > 0 ? 'Verified' : 'Active'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href={businessType === 'sports' ? '/venues/new' : '/events/new'}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <Plus className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">
                  {businessType === 'sports' ? 'Register New Venue' : 'Create New Event'}
                </h4>
                <p className="text-xs text-slate-500 mt-0.5">
                  {businessType === 'sports' ? 'Add turfs, courts & slots' : 'Set up shows & ticket tiers'}
                </p>
              </div>
            </Link>

            <Link
              href="/scanner"
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-xl bg-indigo-50 text-indigo-600 group-hover:bg-indigo-600 group-hover:text-white transition-all">
                <QrCode className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Scan QR Code</h4>
                <p className="text-xs text-slate-500 mt-0.5">Rapid attendee gate check-in</p>
              </div>
            </Link>

            <Link
              href="/earnings"
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <IndianRupee className="w-6 h-6" />
              </div>
              <div>
                <h4 className="font-bold text-slate-900 text-sm">Settlement & Wallet</h4>
                <p className="text-xs text-slate-500 mt-0.5">Instant payouts to UPI / Bank</p>
              </div>
            </Link>
          </div>

          {/* Recent Bookings Table Preview */}
          <div className="rounded-2xl bg-white border border-slate-200 p-6 shadow-xs space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-black text-slate-900">Recent Customer Bookings</h3>
                <p className="text-xs text-slate-500 mt-0.5">Live incoming customer orders and gate passes</p>
              </div>
              <Link
                href="/bookings"
                className="text-xs font-bold text-blue-600 hover:text-blue-700 flex items-center gap-1 hover:underline"
              >
                View All <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentBookings.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50/60 flex flex-col items-center justify-center">
                <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mb-3">
                  <ClipboardDocumentListIcon className="w-6 h-6 text-slate-400" />
                </div>
                <h4 className="text-sm font-bold text-slate-800">No bookings yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Once customers book tickets or court slots on Passwala, they will appear here in real-time.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {recentBookings.map((b) => (
                  <div
                    key={b.id}
                    className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50/70 border border-slate-200 gap-3 hover:bg-slate-50 transition-colors"
                  >
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-100 text-blue-600 flex items-center justify-center shrink-0">
                        {businessType === 'sports' ? <Trophy className="w-5 h-5" /> : <Ticket className="w-5 h-5" />}
                      </div>
                      <div>
                        <p className="text-sm font-bold text-slate-900">
                          {b.user_name || b.customer_name || 'Customer'}
                        </p>
                        <p className="text-xs text-slate-500 font-mono">
                          {b.user_phone ? `+91 ${b.user_phone}` : `Booking #${b.id.substring(0, 8)}`}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center justify-between sm:justify-end gap-4 text-xs">
                      <div className="text-right">
                        <span className="font-bold text-slate-900 block">
                          ₹{b.total_amount || 0}
                        </span>
                        <span className="text-slate-500">
                          {b.booking_date || b.created_at?.substring(0, 10) || 'Today'}
                        </span>
                      </div>
                      <span className="px-2.5 py-1 rounded-full font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                        {b.status || 'Confirmed'}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
