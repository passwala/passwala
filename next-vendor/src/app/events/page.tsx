'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useVendor } from '@/lib/vendor-context';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { Ticket, Plus, Calendar, MapPin, IndianRupee, Loader2, ExternalLink } from 'lucide-react';

export default function EventsPage() {
  const { vendor, store } = useVendor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEvents = async () => {
      setLoading(true);
      try {
        const { data } = await supabase
          .from('events')
          .select('*, event_ticket_tiers(*)')
          .order('created_at', { ascending: false });
        setEvents(data || []);
      } catch (e) {
        console.error('Error fetching events:', e);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
  }, [vendor]);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Event Organizer Console" />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Your Events</h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage concerts, workshops, comedy shows and tiered ticket capacities.
              </p>
            </div>
            <Link
              href="/events/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Create New Event</span>
            </Link>
          </div>

          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-indigo-600" />
            </div>
          ) : events.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-300 rounded-3xl bg-white p-8 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center mx-auto mb-4 border border-indigo-100">
                <Ticket className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No events published yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Publish your music festival, theatre show or workshop to sell tickets online.
              </p>
              <Link
                href="/events/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Create First Event</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {events.map((evt) => {
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

                return (
                  <div
                    key={evt.id}
                    className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      <div className="h-44 relative bg-slate-100 overflow-hidden">
                        <img src={banner} alt={evt.title} className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-indigo-600 text-white shadow-xs">
                            {evt.category || 'Event'}
                          </span>
                        </div>
                      </div>

                      <div className="p-5 space-y-3">
                        <h3 className="text-lg font-black text-slate-900 truncate">{evt.title}</h3>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <Calendar className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="font-semibold text-slate-700">{evt.event_date || 'Upcoming'}</span>
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                          <span className="truncate font-semibold text-slate-700">{evt.venue_name || evt.city || 'Ahmedabad'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="p-5 pt-0">
                      <a
                        href={`http://localhost:3001/events/${evt.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-indigo-50 hover:bg-indigo-100 text-indigo-700 border border-indigo-200 text-xs font-bold transition-all"
                      >
                        <span>View on Buyer App</span>
                        <ExternalLink className="w-3.5 h-3.5" />
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
