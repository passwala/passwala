'use client';

import React, { useState, useEffect, use } from 'react';
import { useRouter } from 'next/navigation';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useVendor } from '@/lib/vendor-context';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import {
  Ticket,
  Calendar,
  MapPin,
  Clock,
  IndianRupee,
  Loader2,
  ExternalLink,
  ArrowLeft,
  Layers,
  Sparkles,
  Users,
  CheckCircle2,
  AlertCircle,
  QrCode,
  Share2
} from 'lucide-react';
import toast from 'react-hot-toast';

interface TicketTier {
  id: string;
  tier_name: string;
  price: number;
  total_seats: number;
  available_seats: number;
}

interface EventData {
  id: string;
  title: string;
  description: string;
  category: string;
  venue_name: string;
  city?: string;
  event_date: string;
  ends_at?: string;
  banner_url?: string;
  status: string;
  approval_status?: string;
  show_type?: 'single' | 'multiple' | 'tour';
  created_by?: string;
  booking_start?: string;
  booking_end?: string;
  visibility?: string;
  is_online?: boolean;
  duration?: string;
  age_restriction?: string;
  language?: string;
  event_ticket_tiers?: TicketTier[];
}

export default function EventShowDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const { vendor } = useVendor();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [event, setEvent] = useState<EventData | null>(null);
  const [siblingShows, setSiblingShows] = useState<EventData[]>([]);

  useEffect(() => {
    if (!id) return;

    const fetchEventDetails = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, event_ticket_tiers(*)')
          .eq('id', id)
          .single();

        if (error) throw error;
        setEvent(data);

        // If it's a multiple show or tour, fetch all siblings in the series
        if (data?.title && (data.show_type === 'multiple' || data.show_type === 'tour')) {
          const { data: siblings } = await supabase
            .from('events')
            .select('*, event_ticket_tiers(*)')
            .eq('title', data.title)
            .eq('category', data.category)
            .order('event_date', { ascending: true });

          setSiblingShows(siblings || []);
        }
      } catch (err: any) {
        console.error('Failed to load event show details:', err);
        toast.error('Could not load event show details');
      } finally {
        setLoading(false);
      }
    };

    fetchEventDetails();
  }, [id]);

  if (loading) {
    return (
      <div className="min-h-screen bg-slate-50 flex items-center justify-center">
        <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
      </div>
    );
  }

  if (!event) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col items-center justify-center space-y-4 p-4 text-center">
        <h2 className="text-xl font-bold text-slate-900">Event show not found</h2>
        <p className="text-xs text-slate-500">The requested show does not exist or has been removed.</p>
        <Link
          href="/events"
          className="px-5 py-2.5 rounded-2xl bg-orange-600 text-white font-bold text-xs shadow-md shadow-orange-600/20"
        >
          Back to Events List
        </Link>
      </div>
    );
  }

  let banner = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80';
  try {
    if (event.banner_url) {
      const parsed = JSON.parse(event.banner_url);
      if (Array.isArray(parsed) && parsed.length > 0) banner = parsed[0];
      else if (typeof parsed === 'string') banner = parsed;
    }
  } catch {
    if (event.banner_url) banner = event.banner_url;
  }

  const tiers = event.event_ticket_tiers || [];
  const totalCapacity = tiers.reduce((acc, t) => acc + (t.total_seats || 0), 0);
  const totalAvailable = tiers.reduce((acc, t) => acc + (t.available_seats || 0), 0);
  const totalSold = Math.max(0, totalCapacity - totalAvailable);
  const totalRevenue = tiers.reduce((acc, t) => acc + (t.price * Math.max(0, t.total_seats - t.available_seats)), 0);

  const showType = event.show_type || 'single';

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Event Show Details" />

        <main className="flex-1 p-4 md:p-8 max-w-6xl mx-auto w-full space-y-6">
          {/* Back & Actions */}
          <div className="flex items-center justify-between">
            <Link
              href="/events"
              className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Back to Events Console</span>
            </Link>

            <div className="flex items-center gap-2">
              <Link
                href="/scanner"
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
              >
                <QrCode className="w-4 h-4 text-slate-600" />
                <span>Ticket Scanner</span>
              </Link>

              <a
                href={`http://localhost:3001/events/${event.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-orange-600 hover:bg-orange-700 text-white text-xs font-bold shadow-xs transition-all"
              >
                <span>Preview on Buyer App</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>

          {/* Hero Banner Card */}
          <div className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs">
            <div className="h-56 md:h-72 relative bg-slate-200">
              <img src={banner} alt={event.title} className="w-full h-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/25 to-transparent flex items-end p-6 md:p-8">
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="px-3 py-1 rounded-full text-xs font-black bg-orange-600 text-white">
                      {event.category}
                    </span>

                    {showType === 'tour' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-pink-600 text-white flex items-center gap-1">
                        <Sparkles className="w-3.5 h-3.5" /> Festival / Tour
                      </span>
                    ) : showType === 'multiple' ? (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-indigo-600 text-white flex items-center gap-1">
                        <Layers className="w-3.5 h-3.5" /> Multiple Shows
                      </span>
                    ) : (
                      <span className="px-3 py-1 rounded-full text-xs font-black bg-emerald-600 text-white flex items-center gap-1">
                        <Clock className="w-3.5 h-3.5" /> Single Show
                      </span>
                    )}

                    <span className="px-3 py-1 rounded-full text-xs font-black bg-white/20 backdrop-blur text-white">
                      {event.visibility || 'public'}
                    </span>
                  </div>

                  <h1 className="text-2xl md:text-4xl font-black text-white">{event.title}</h1>
                </div>
              </div>
            </div>

            {/* Quick Metrics Bar */}
            <div className="grid grid-cols-2 md:grid-cols-4 divide-y md:divide-y-0 md:divide-x divide-slate-100 p-6 bg-slate-50/50">
              <div className="p-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Total Capacity</span>
                <div className="text-2xl font-black text-slate-900 mt-0.5">{totalCapacity} seats</div>
              </div>

              <div className="p-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Tickets Booked</span>
                <div className="text-2xl font-black text-indigo-600 mt-0.5">{totalSold} passes</div>
              </div>

              <div className="p-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Available Seats</span>
                <div className="text-2xl font-black text-emerald-600 mt-0.5">{totalAvailable} left</div>
              </div>

              <div className="p-3">
                <span className="text-[11px] font-bold text-slate-400 uppercase">Gross Ticket Sales</span>
                <div className="text-2xl font-black text-orange-600 mt-0.5">₹{totalRevenue.toLocaleString('en-IN')}</div>
              </div>
            </div>
          </div>

          {/* Details Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Left 2 Cols: Details & Shows */}
            <div className="lg:col-span-2 space-y-6">
              {/* Event Show Metadata */}
              <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 space-y-4">
                <h3 className="text-lg font-black text-slate-900">Show Details & Timings</h3>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <Calendar className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[10px]">Show Date & Time</span>
                      <p className="font-extrabold text-slate-800 text-sm mt-0.5">
                        {event.event_date
                          ? new Date(event.event_date).toLocaleDateString('en-IN', {
                              weekday: 'long',
                              day: 'numeric',
                              month: 'long',
                              year: 'numeric'
                            })
                          : 'Upcoming'}
                      </p>
                      <p className="text-slate-500 font-semibold">
                        {event.event_date ? new Date(event.event_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ''}
                        {event.ends_at ? ` - ${new Date(event.ends_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}` : ''}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <MapPin className="w-5 h-5 text-orange-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-bold text-slate-400 uppercase text-[10px]">Venue Location</span>
                      <p className="font-extrabold text-slate-800 text-sm mt-0.5">
                        {event.is_online ? 'Online Virtual Venue' : (event.venue_name || 'Passwala Arena')}
                      </p>
                      <p className="text-slate-500 font-semibold">{event.city || 'Ahmedabad, Gujarat'}</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-3 gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100 text-xs">
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Duration</span>
                    <span className="font-extrabold text-slate-900">{event.duration || '2h 30m'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Language</span>
                    <span className="font-extrabold text-slate-900">{event.language || 'Hindi / English'}</span>
                  </div>
                  <div>
                    <span className="text-slate-400 font-bold uppercase text-[10px] block">Age Restriction</span>
                    <span className="font-extrabold text-slate-900">{event.age_restriction || 'All Ages'}</span>
                  </div>
                </div>

                {event.description && (
                  <div className="pt-2">
                    <span className="text-slate-400 font-bold uppercase text-[10px] block mb-1">Description</span>
                    <p className="text-xs text-slate-600 leading-relaxed">{event.description}</p>
                  </div>
                )}
              </div>

              {/* Sibling Shows List (If Multiple Shows or Tour) */}
              {(showType === 'multiple' || showType === 'tour') && siblingShows.length > 0 && (
                <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 space-y-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <h3 className="text-lg font-black text-slate-900">
                        All Shows in this Series ({siblingShows.length} Dates)
                      </h3>
                      <p className="text-xs text-slate-500">
                        Attendees on the buyer app can select any of these scheduled show dates.
                      </p>
                    </div>
                    <span className="px-3 py-1 rounded-full text-xs font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                      Multi-Show Series
                    </span>
                  </div>

                  <div className="divide-y divide-slate-100 border border-slate-100 rounded-2xl overflow-hidden">
                    {siblingShows.map((sib, sIdx) => {
                      const isCurrent = sib.id === event.id;
                      const sibTiers = sib.event_ticket_tiers || [];
                      const sibCap = sibTiers.reduce((a, b) => a + (b.total_seats || 0), 0);
                      const sibAvail = sibTiers.reduce((a, b) => a + (b.available_seats || 0), 0);
                      const pct = sibCap > 0 ? (sibAvail / sibCap) * 100 : 0;

                      return (
                        <div
                          key={sib.id}
                          className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                            isCurrent ? 'bg-orange-50/50' : 'bg-white hover:bg-slate-50'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <span
                              className={`w-7 h-7 rounded-full text-xs font-bold flex items-center justify-center shrink-0 ${
                                isCurrent ? 'bg-orange-600 text-white' : 'bg-slate-100 text-slate-600'
                              }`}
                            >
                              {sIdx + 1}
                            </span>
                            <div>
                              <div className="flex items-center gap-2">
                                <span className="font-extrabold text-sm text-slate-900">
                                  {sib.event_date
                                    ? new Date(sib.event_date).toLocaleDateString('en-IN', {
                                        weekday: 'short',
                                        day: 'numeric',
                                        month: 'short',
                                        year: 'numeric'
                                      })
                                    : 'Date not set'}
                                </span>
                                {isCurrent && (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-orange-100 text-orange-700">
                                    Current
                                  </span>
                                )}
                              </div>
                              <span className="text-xs text-slate-500 font-semibold">
                                {sib.venue_name || 'Passwala Arena'}
                              </span>
                            </div>
                          </div>

                          <div className="flex items-center gap-4">
                            <div className="text-right">
                              <span className="text-xs font-bold text-slate-700">
                                {sibAvail === 0 ? 'Sold Out' : `${sibAvail}/${sibCap} left`}
                              </span>
                              <div className="w-24 h-2 bg-slate-200 rounded-full overflow-hidden mt-1">
                                <div
                                  className="h-full bg-emerald-500 rounded-full transition-all"
                                  style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                                />
                              </div>
                            </div>

                            {!isCurrent && (
                              <Link
                                href={`/events/${sib.id}`}
                                className="px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-600 hover:bg-white transition-all shrink-0"
                              >
                                View Show →
                              </Link>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right Column: Ticket Tiers Breakdown */}
            <div className="space-y-6">
              <div className="rounded-3xl bg-white border border-slate-200 p-6 space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-base font-black text-slate-900">Ticket Tiers</h3>
                  <span className="text-xs font-bold text-slate-400">{tiers.length} Tiers</span>
                </div>

                <div className="space-y-3">
                  {tiers.map((t) => {
                    const sold = Math.max(0, (t.total_seats || 0) - (t.available_seats || 0));
                    const pctSold = t.total_seats > 0 ? (sold / t.total_seats) * 100 : 0;

                    return (
                      <div
                        key={t.id}
                        className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-2.5"
                      >
                        <div className="flex items-center justify-between">
                          <div>
                            <h4 className="text-sm font-black text-slate-900">{t.tier_name}</h4>
                            <span className="text-[11px] font-bold text-slate-400">
                              Capacity: {t.total_seats} seats
                            </span>
                          </div>
                          <span className="text-base font-black text-orange-600">
                            {t.price === 0 ? 'FREE' : `₹${t.price}`}
                          </span>
                        </div>

                        <div className="space-y-1">
                          <div className="flex items-center justify-between text-[11px] font-bold text-slate-600">
                            <span>Sold: {sold}</span>
                            <span className="text-emerald-600">{t.available_seats} Available</span>
                          </div>
                          <div className="w-full h-2 rounded-full bg-slate-200 overflow-hidden">
                            <div
                              className="h-full bg-orange-500 rounded-full transition-all"
                              style={{ width: `${Math.min(100, Math.max(0, pctSold))}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Share & Links Box */}
              <div className="rounded-3xl bg-orange-500 text-white p-6 space-y-3 shadow-lg shadow-orange-500/20">
                <h4 className="text-base font-black">Live Customer Booking URL</h4>
                <p className="text-xs text-orange-100 leading-relaxed">
                  Share this event link directly with your community to start selling tickets immediately.
                </p>
                <div className="p-3 bg-white/15 backdrop-blur rounded-2xl text-xs font-mono break-all text-white">
                  http://localhost:3001/events/{event.id}
                </div>
                <button
                  type="button"
                  onClick={() => {
                    navigator.clipboard.writeText(`http://localhost:3001/events/${event.id}`);
                    toast.success('Link copied to clipboard!');
                  }}
                  className="w-full py-3 rounded-2xl bg-white text-orange-600 font-extrabold text-xs hover:bg-orange-50 transition-all cursor-pointer"
                >
                  Copy Booking Link
                </button>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
