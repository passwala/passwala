'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useVendor } from '@/lib/vendor-context';
import { supabase } from '@/lib/supabase-client';
import { 
  CalendarCheck2, 
  Search, 
  Filter, 
  Trophy, 
  Ticket, 
  Phone, 
  Calendar, 
  Clock, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';

export default function BookingsPage() {
  const { businessType, store, vendor } = useVendor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [bookings, setBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');

  useEffect(() => {
    const fetchBookings = async () => {
      setLoading(true);
      try {
        if (businessType === 'sports') {
          const { data } = await supabase
            .from('sports_bookings')
            .select('*')
            .order('created_at', { ascending: false });
          setBookings(data || []);
        } else {
          const { data } = await supabase
            .from('event_bookings')
            .select('*')
            .order('created_at', { ascending: false });
          setBookings(data || []);
        }
      } catch (e) {
        console.error('Error fetching bookings:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchBookings();
  }, [businessType]);

  const filteredBookings = bookings.filter((b) => {
    const matchesFilter = filter === 'all' || (b.status?.toLowerCase() === filter.toLowerCase());
    const query = search.toLowerCase();
    const matchesSearch = 
      !query || 
      b.id?.toLowerCase().includes(query) ||
      b.user_name?.toLowerCase().includes(query) ||
      b.user_phone?.includes(query);
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Bookings & Orders" />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Live Bookings & Schedule</h2>
              <p className="text-xs text-slate-500 mt-1">
                Real-time reservations booked by players on the customer webapp.
              </p>
            </div>

            {/* Filter pills */}
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-xs">
              {['all', 'confirmed', 'completed'].map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-3 py-1.5 rounded-lg font-bold capitalize transition-all cursor-pointer ${
                    filter === f ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by customer name, phone or booking ID..."
              className="w-full pl-11 pr-4 py-3 rounded-2xl bg-white border-2 border-slate-200 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 transition-all font-medium shadow-xs"
            />
          </div>

          {/* Bookings Table / List */}
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-300 rounded-3xl bg-white p-8 shadow-xs">
              <p className="text-3xl mb-2">🎟️</p>
              <h3 className="text-base font-bold text-slate-900">No bookings found</h3>
              <p className="text-xs text-slate-500 mt-1">Try changing the filter or search keyword.</p>
            </div>
          ) : (
            <div className="space-y-3">
              {filteredBookings.map((b) => (
                <div
                  key={b.id}
                  className="rounded-2xl bg-white border border-slate-200 p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 hover:border-slate-300 hover:shadow-md transition-all shadow-xs"
                >
                  <div className="flex items-start gap-4">
                    <div className="w-12 h-12 rounded-2xl bg-orange-50 text-orange-600 border border-orange-100 flex items-center justify-center shrink-0">
                      {businessType === 'sports' ? <Trophy className="w-6 h-6" /> : <Ticket className="w-6 h-6" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <h4 className="font-bold text-sm text-slate-900">{b.user_name || 'Customer'}</h4>
                        <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-slate-100 text-slate-600 border border-slate-200">
                          #{b.id.substring(0, 8)}
                        </span>
                      </div>
                      <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1.5">
                        {b.user_phone && (
                          <span className="flex items-center gap-1 font-medium">
                            <Phone className="w-3 h-3 text-slate-400" />
                            +91 {b.user_phone}
                          </span>
                        )}
                        <span className="flex items-center gap-1 font-medium">
                          <Calendar className="w-3 h-3 text-slate-400" />
                          {b.booking_date || b.created_at?.substring(0, 10)}
                        </span>
                        {b.start_time && (
                          <span className="flex items-center gap-1 font-medium">
                            <Clock className="w-3 h-3 text-slate-400" />
                            {b.start_time?.substring(0, 5)} - {b.end_time?.substring(0, 5)}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center justify-between md:justify-end gap-5 border-t md:border-t-0 pt-3 md:pt-0 border-slate-100">
                    <div className="text-right">
                      <span className="text-base font-black text-slate-900 block">
                        ₹{b.total_amount || 0}
                      </span>
                      <span className="text-[10px] text-emerald-600 font-bold">Paid Online</span>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                      {b.status || 'Confirmed'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
