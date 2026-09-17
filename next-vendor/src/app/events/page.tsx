'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useVendor } from '@/lib/vendor-context';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import {
  Ticket,
  Plus,
  Calendar,
  MapPin,
  IndianRupee,
  Loader2,
  ExternalLink,
  Clock,
  Layers,
  Sparkles,
  ChevronRight,
  Eye
} from 'lucide-react';
import { CalendarIcon } from '@heroicons/react/24/outline';

interface TicketTier {
  id: string;
  tier_name: string;
  price: number;
  total_seats: number;
  available_seats: number;
}

interface SiblingShow {
  id: string;
  event_date: string;
  venue_name: string;
  available_seats: number;
  total_seats: number;
}

interface GroupedEvent {
  id: string;
  title: string;
  category: string;
  venue_name: string;
  city?: string;
  event_date: string;
  ends_at?: string;
  banner_url?: string;
  status: string;
  show_type?: 'single' | 'multiple' | 'tour';
  duration?: string;
  language?: string;
  showCount: number;
  showsList: SiblingShow[];
  total_seats: number;
  available_seats: number;
  lowestPrice: number | null;
}

export default function EventsPage() {
  const { vendor, store } = useVendor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState<GroupedEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'all' | 'single' | 'multiple' | 'tour'>('all');

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data, error } = await supabase
          .from('events')
          .select('*, event_ticket_tiers(*)')
          .order('event_date', { ascending: true });

        if (error) throw error;

        const rawEvents = data || [];

        // Reference from Old Vendor Side (VendorSubPages.jsx line 630-666):
        // Group multiple show occurrences by title & category
        const titleCounts: Record<string, number> = {};
        rawEvents.forEach((item: any) => {
          const key = (item.title || '').toLowerCase().trim();
          if (key) titleCounts[key] = (titleCounts[key] || 0) + 1;
        });

        const grouped: GroupedEvent[] = [];
        const groupMap: Record<string, number> = {};

        rawEvents.forEach((item: any) => {
          const key = (item.title || '').toLowerCase().trim();
          const isMultiShow =
            item.show_type === 'multiple' ||
            item.show_type === 'tour' ||
            (titleCounts[key] && titleCounts[key] > 1);

          const tiers = item.event_ticket_tiers || [];
          const itemCap = tiers.reduce((sum: number, t: any) => sum + (t.total_seats || 0), 0);
          const itemAvail = tiers.reduce((sum: number, t: any) => sum + (t.available_seats || 0), 0);
          const itemLowest = tiers.length > 0
            ? Math.min(...tiers.map((t: any) => Number(t.price) || 0))
            : null;

          const slotInfo: SiblingShow = {
            id: item.id,
            event_date: item.event_date,
            venue_name: item.venue_name || 'Passwala Arena',
            available_seats: itemAvail,
            total_seats: itemCap
          };

          if (isMultiShow) {
            if (key && groupMap[key] !== undefined) {
              const existing = grouped[groupMap[key]];
              existing.showCount += 1;
              existing.showsList.push(slotInfo);
              existing.total_seats += itemCap;
              existing.available_seats += itemAvail;
              if (itemLowest !== null && (existing.lowestPrice === null || itemLowest < existing.lowestPrice)) {
                existing.lowestPrice = itemLowest;
              }
            } else {
              const entry: GroupedEvent = {
                id: item.id,
                title: item.title,
                category: item.category || 'Music & Concerts',
                venue_name: item.venue_name || 'Passwala Arena',
                city: item.city || 'Ahmedabad',
                event_date: item.event_date,
                ends_at: item.ends_at,
                banner_url: item.banner_url,
                status: item.status,
                show_type: item.show_type || 'multiple',
                duration: item.duration,
                language: item.language,
                showCount: 1,
                showsList: [slotInfo],
                total_seats: itemCap,
                available_seats: itemAvail,
                lowestPrice: itemLowest
              };
              groupMap[key] = grouped.length;
              grouped.push(entry);
            }
          } else {
            grouped.push({
              id: item.id,
              title: item.title,
              category: item.category || 'Event',
              venue_name: item.venue_name || 'Passwala Arena',
              city: item.city || 'Ahmedabad',
              event_date: item.event_date,
              ends_at: item.ends_at,
              banner_url: item.banner_url,
              status: item.status,
              show_type: 'single',
              duration: item.duration,
              language: item.language,
              showCount: 1,
              showsList: [slotInfo],
              total_seats: itemCap,
              available_seats: itemAvail,
              lowestPrice: itemLowest
            });
          }
        });

        setEvents(grouped);
      } catch (e) {
        console.error('Error fetching events:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [vendor]);

  const filteredEvents = events.filter((e) => {
    if (activeTab === 'single') return e.show_type === 'single';
    if (activeTab === 'multiple') return e.show_type === 'multiple';
    if (activeTab === 'tour') return e.show_type === 'tour';
    return true;
  });

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Event Organizer Console" />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Your Events & Shows</h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage single shows, multiple show series, tour festivals, and tiered ticket capacities.
              </p>
            </div>
            <Link
              href="/events/new"
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Publish New Event / Show</span>
            </Link>
          </div>

          {/* Filter Tabs */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            <button
              type="button"
              onClick={() => setActiveTab('all')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all cursor-pointer ${
                activeTab === 'all'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              All Events ({events.length})
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('single')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'single'
                  ? 'bg-orange-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Clock className="w-3.5 h-3.5" />
              <span>Single Shows ({events.filter((e) => e.show_type === 'single').length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('multiple')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'multiple'
                  ? 'bg-indigo-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Multiple Shows ({events.filter((e) => e.show_type === 'multiple').length})</span>
            </button>

            <button
              type="button"
              onClick={() => setActiveTab('tour')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'tour'
                  ? 'bg-pink-600 text-white shadow-xs'
                  : 'bg-white text-slate-600 hover:bg-slate-100 border border-slate-200'
              }`}
            >
              <Sparkles className="w-3.5 h-3.5" />
              <span>Festivals & Tours ({events.filter((e) => e.show_type === 'tour').length})</span>
            </button>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : filteredEvents.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-300 rounded-3xl bg-white p-8 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4 border border-orange-100">
                <Ticket className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No events found in this category</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Publish your single concert, multi-date theatre run, or tour festival to start selling passes.
              </p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Create New Event</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredEvents.map((evt) => {
                let banner = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80';
                try {
                  if (evt.banner_url) {
                    const parsed = JSON.parse(evt.banner_url);
                    if (Array.isArray(parsed) && parsed.length > 0) banner = parsed[0];
                    else if (typeof parsed === 'string') banner = parsed;
                  }
                } catch {
                  if (evt.banner_url) banner = evt.banner_url;
                }

                const showType = evt.show_type || 'single';

                return (
                  <div
                    key={evt.id}
                    className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Banner Image & Badges */}
                      <div className="h-44 relative bg-slate-100 overflow-hidden">
                        <img src={banner} alt={evt.title} className="w-full h-full object-cover" />

                        {/* Top Left: Setup Model Badge */}
                        <div className="absolute top-3 left-3 flex items-center gap-1.5">
                          {showType === 'tour' ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-pink-600 text-white shadow-xs flex items-center gap-1">
                              <Sparkles className="w-3 h-3" /> Festival / Tour
                            </span>
                          ) : showType === 'multiple' || evt.showCount > 1 ? (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-indigo-600 text-white shadow-xs flex items-center gap-1">
                              <Layers className="w-3 h-3" /> Multiple Shows ({evt.showCount})
                            </span>
                          ) : (
                            <span className="px-2.5 py-1 rounded-full text-[10px] font-black bg-orange-600 text-white shadow-xs flex items-center gap-1">
                              <Clock className="w-3 h-3" /> Single Show
                            </span>
                          )}
                        </div>

                        {/* Top Right: Category Badge */}
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-slate-900/80 backdrop-blur text-white shadow-xs">
                            {evt.category || 'Event'}
                          </span>
                        </div>
                      </div>

                      {/* Card Content */}
                      <div className="p-5 space-y-3">
                        <div>
                          <h3 className="text-lg font-black text-slate-900 truncate">{evt.title}</h3>
                          <div className="flex items-center gap-2 mt-0.5">
                            <span className="text-[11px] font-bold text-slate-400">
                              {evt.duration ? `${evt.duration} • ` : ''}
                              {evt.language || 'Hindi / English'}
                            </span>
                          </div>
                        </div>

                        {/* Shows & Schedule List (Reference from VendorSubPages.jsx line 3986) */}
                        {evt.showsList && evt.showsList.length > 1 ? (
                          <div className="pt-2 border-t border-slate-100 space-y-2">
                            <span className="text-[10px] font-extrabold uppercase text-indigo-700 tracking-wider flex items-center gap-1">
                              <CalendarIcon className="w-3.5 h-3.5 shrink-0" />
                              <span>{evt.showsList.length} Scheduled Shows in Series:</span>
                            </span>

                            <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                              {evt.showsList.map((show, idx) => {
                                const dStr = show.event_date
                                  ? new Date(show.event_date).toLocaleDateString('en-IN', {
                                      day: 'numeric',
                                      month: 'short',
                                      hour: '2-digit',
                                      minute: '2-digit'
                                    })
                                  : 'Date TBA';

                                const pct =
                                  show.total_seats > 0
                                    ? (show.available_seats / show.total_seats) * 100
                                    : 0;

                                return (
                                  <div
                                    key={show.id || idx}
                                    className="p-2 rounded-xl bg-slate-50 border border-slate-100 space-y-1"
                                  >
                                    <div className="flex items-center justify-between text-[11px]">
                                      <span className="font-bold text-slate-700">{dStr}</span>
                                      <span
                                        className={`font-black text-[10px] ${
                                          show.available_seats === 0
                                            ? 'text-red-600'
                                            : show.available_seats / show.total_seats < 0.2
                                            ? 'text-amber-600'
                                            : 'text-emerald-600'
                                        }`}
                                      >
                                        {show.available_seats === 0
                                          ? 'Sold Out'
                                          : `${show.available_seats}/${show.total_seats} left`}
                                      </span>
                                    </div>
                                    <div className="w-full h-1 rounded-full bg-slate-200 overflow-hidden">
                                      <div
                                        className={`h-full rounded-full transition-all ${
                                          show.available_seats === 0
                                            ? 'bg-red-500'
                                            : show.available_seats / show.total_seats < 0.2
                                            ? 'bg-amber-500'
                                            : 'bg-emerald-500'
                                        }`}
                                        style={{ width: `${Math.max(0, Math.min(100, pct))}%` }}
                                      />
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ) : (
                          /* Single show date & venue */
                          <div className="space-y-1.5 pt-1 text-xs text-slate-600">
                            <div className="flex items-center gap-1.5">
                              <Calendar className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              <span className="font-semibold text-slate-700 truncate">
                                {evt.event_date
                                  ? new Date(evt.event_date).toLocaleDateString('en-IN', {
                                      weekday: 'short',
                                      day: 'numeric',
                                      month: 'short',
                                      year: 'numeric'
                                    })
                                  : 'Upcoming Date'}
                              </span>
                            </div>
                            <div className="flex items-center gap-1.5">
                              <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                              <span className="truncate font-semibold text-slate-700">
                                {evt.venue_name || evt.city || 'Passwala Arena, Ahmedabad'}
                              </span>
                            </div>
                          </div>
                        )}

                        {/* Price summary */}
                        <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                          <span className="text-[11px] text-slate-400 font-bold">Starting Price</span>
                          <span className="font-black text-orange-600 text-sm">
                            {evt.lowestPrice !== null
                              ? evt.lowestPrice === 0
                                ? 'FREE ENTRY'
                                : `₹${evt.lowestPrice}`
                              : '₹299'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Card Actions */}
                    <div className="p-5 pt-0 grid grid-cols-2 gap-2">
                      <Link
                        href={`/events/${evt.id}`}
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition-all"
                      >
                        <Eye className="w-3.5 h-3.5" />
                        <span>Manage Show</span>
                      </Link>

                      <a
                        href={`http://localhost:3001/events/${evt.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center justify-center gap-1 py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-all"
                      >
                        <span>Buyer App</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </main>
      </div>
    </div>
  );
}
