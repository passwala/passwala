'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/lib/vendor-context';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Ticket, Calendar, MapPin, IndianRupee, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewEventPage() {
  const router = useRouter();
  const { vendor, store } = useVendor();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [title, setTitle] = useState('');
  const [category, setCategory] = useState('Music');
  const [venueName, setVenueName] = useState(store?.business_name || '');
  const [city, setCity] = useState(store?.city || 'Ahmedabad');
  const [eventDate, setEventDate] = useState('');
  const [price, setPrice] = useState('499');
  const [description, setDescription] = useState('');

  const categories = ['Music', 'Comedy', 'Theatre', 'Sports', 'Food', 'Nightlife', 'Workshop'];

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      toast.error('Please enter event title');
      return;
    }
    if (!eventDate) {
      toast.error('Please select event date');
      return;
    }

    setLoading(true);
    try {
      const { data: eventData, error: eventErr } = await supabase
        .from('events')
        .insert({
          title,
          category,
          venue_name: venueName || 'Passwala Arena',
          city: city || 'Ahmedabad',
          event_date: eventDate,
          description: description || `Join us for ${title} live in ${city}!`,
          organizer_id: store?.id || vendor?.id,
          created_by: vendor?.id || vendor?.user_id,
          banner_url: JSON.stringify(['https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=800&q=80']),
          status: 'published'
        })
        .select()
        .single();

      if (eventErr) throw eventErr;

      // Create default ticket tier
      if (eventData?.id) {
        try {
          await supabase
            .from('event_ticket_tiers')
            .insert({
              event_id: eventData.id,
              tier_name: 'General Admission',
              price: parseFloat(price) || 499,
              capacity: 200,
              available_count: 200
            });
        } catch {
          // non-blocking
        }
      }

      toast.success('🎉 Event created successfully!');
      router.push('/events');
    } catch (err: any) {
      toast.error('Failed to create event: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Publish New Event" />

        <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
          <Link
            href="/events"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Events</span>
          </Link>

          <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-10 shadow-lg shadow-slate-200/50 space-y-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Create New Event</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your event details. Once published, tickets can be booked on the customer webapp.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Event Title *
                </label>
                <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-600/10 transition-all">
                  <Ticket className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    placeholder="e.g. Arijit Singh Live in Concert"
                    className="bg-transparent flex-1 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Category
                  </label>
                  <select
                    value={category}
                    onChange={(e) => setCategory(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 text-sm text-slate-900 font-semibold focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 outline-none cursor-pointer transition-all"
                  >
                    {categories.map((c) => (
                      <option key={c} value={c} className="bg-white text-slate-900">
                        {c}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Event Date *
                  </label>
                  <input
                    type="date"
                    required
                    value={eventDate}
                    onChange={(e) => setEventDate(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 text-sm text-slate-900 font-semibold focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Venue Location Name
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-600/10 transition-all">
                    <MapPin className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                    <input
                      type="text"
                      value={venueName}
                      onChange={(e) => setVenueName(e.target.value)}
                      placeholder="e.g. Sardar Patel Stadium"
                      className="bg-transparent flex-1 text-sm text-slate-900 font-semibold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Base Pass Price (₹) *
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-indigo-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-indigo-600/10 transition-all">
                    <IndianRupee className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="number"
                      required
                      min={0}
                      value={price}
                      onChange={(e) => setPrice(e.target.value)}
                      placeholder="499"
                      className="bg-transparent flex-1 text-sm text-slate-900 font-bold outline-none"
                    />
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Event Description
                </label>
                <textarea
                  rows={3}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Provide an overview of the event, artists, gates opening time, and rules..."
                  className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 p-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-indigo-600 focus:bg-white focus:ring-4 focus:ring-indigo-600/10 transition-all"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-md shadow-indigo-600/20 transition-all cursor-pointer disabled:opacity-50"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Event Pass'}
              </button>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
