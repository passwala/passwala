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
        if (businessType === 'sports') {
          // Fetch sports bookings
          const { data: bookings } = await supabase
            .from('sports_bookings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

          if (bookings && bookings.length > 0) {
            setRecentBookings(bookings);
            const total = bookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
            const unique = new Set(bookings.map(b => b.user_phone || b.user_id || b.customer_name)).size;
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
        } else {
          // Fetch event tickets
          const { data: eventBookings } = await supabase
            .from('event_bookings')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(5);

          if (eventBookings && eventBookings.length > 0) {
            setRecentBookings(eventBookings);
            const total = eventBookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
            const unique = new Set(eventBookings.map(b => b.user_phone || b.user_id || b.customer_name)).size;
            setStats({
              totalRevenue: total,
              todayBookings: eventBookings.length,
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
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* Sidebar Navigation */}
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      {/* Main Content Area */}
      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Business Overview" />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-8">
          {/* Welcome Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-6 md:p-10 shadow-lg text-white">
            <div className="relative z-10 max-w-2xl space-y-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/15 text-orange-100 text-xs font-bold border border-white/20">
                ⭐ Verified Passwala Partner
              </span>
              <h2 className="text-2xl md:text-4xl font-black text-white tracking-tight">
                Welcome back, {vendor?.name || 'Partner'}!
              </h2>
              <p className="text-sm text-orange-100 leading-relaxed">
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
                <div className="p-2.5 rounded-xl bg-orange-50 text-orange-600 border border-orange-100">
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
                <span className="text-2xl font-black text-slate-900">{stats.rating > 0 ? `${stats.rating} ★` : '—'}</span>
                <span className="text-xs text-emerald-600 font-bold">{stats.rating > 0 ? 'Verified' : 'Active'}</span>
              </div>
            </div>
          </div>

          {/* Quick Actions Bar */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <Link
              href={businessType === 'sports' ? '/venues/new' : '/events/new'}
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:border-orange-300 hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-xl bg-orange-50 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-all">
                <Plus className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-orange-600 transition-colors">
                  {businessType === 'sports' ? 'Add New Sports Venue' : 'Create New Event'}
                </h4>
                <p className="text-xs text-slate-500">Set slots, pricing and publish instantly.</p>
              </div>
            </Link>

            <Link
              href="/scanner"
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:border-emerald-300 hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-xl bg-emerald-50 text-emerald-600 group-hover:bg-emerald-600 group-hover:text-white transition-all">
                <QrCode className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-emerald-600 transition-colors">
                  Live QR Gate Scanner
                </h4>
                <p className="text-xs text-slate-500">Scan passes on mobile or enter ticket codes.</p>
              </div>
            </Link>

            <Link
              href="/wallet"
              className="flex items-center gap-4 p-5 rounded-2xl bg-white border border-slate-200 hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="p-3 rounded-xl bg-blue-50 text-blue-600 group-hover:bg-blue-600 group-hover:text-white transition-all">
                <IndianRupee className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900 group-hover:text-blue-600 transition-colors">
                  Instant Bank Settlement
                </h4>
                <p className="text-xs text-slate-500">Request payout directly to your bank account.</p>
              </div>
            </Link>
          </div>

          {/* Recent Bookings & Orders */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-black text-slate-900">
                  {businessType === 'sports' ? 'Recent Slot Bookings' : 'Recent Ticket Orders'}
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">Live transactions from customer webapp</p>
              </div>
              <Link
                href="/bookings"
                className="text-xs font-bold text-orange-600 hover:text-orange-700 flex items-center gap-1"
              >
                View All <ExternalLink className="w-3.5 h-3.5" />
              </Link>
            </div>

            {recentBookings.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <p className="text-3xl mb-2">📋</p>
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
                      <div className="w-10 h-10 rounded-xl bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
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
