'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/lib/vendor-context';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase-client';
import Link from 'next/link';
import { toast } from 'react-hot-toast';
import { 
  Trophy, 
  MapPin, 
  Plus, 
  Clock, 
  IndianRupee, 
  Calendar, 
  Sparkles, 
  CheckCircle2, 
  Loader2,
  ExternalLink 
} from 'lucide-react';

export default function VenuesPage() {
  const router = useRouter();
  const { vendor, store, loading: authLoading } = useVendor();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [slotGenLoading, setSlotGenLoading] = useState<string | null>(null);

  const fetchVenues = async () => {
    if (!vendor) return;
    setLoading(true);
    try {
      const phone = vendor.phone || localStorage.getItem('vPhone') || '';
      const { data, error } = await supabase
        .from('sports_venues')
        .select('*')
        .or(`owner_phone.eq.${phone},owner_id.eq.${store?.id || vendor.id}`)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setVenues(data || []);
    } catch (e: any) {
      console.error('Failed to load venues:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading && !vendor) {
      router.replace('/login');
    } else if (vendor) {
      fetchVenues();
    }
  }, [vendor, authLoading]);

  const handleGenerateSlots = async (venueId: string, sportType: string = 'box_cricket') => {
    setSlotGenLoading(venueId);
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      // Auto generate slots for today from 06:00 to 23:00
      const slotsPayload = [];
      for (let h = 6; h <= 23; h++) {
        const timeStr = `${String(h).padStart(2, '0')}:00:00`;
        slotsPayload.push({
          venue_id: venueId,
          sport: sportType,
          slot_date: dateStr,
          slot_time: timeStr,
          status: 'available',
          price: 400
        });
      }

      const { error } = await supabase
        .from('sports_slots')
        .upsert(slotsPayload, { onConflict: 'venue_id,sport,slot_date,slot_time' });

      if (error) throw error;
      toast.success('Generated 18 hourly slots for today!');
    } catch (err: any) {
      toast.error('Slot generation note: ' + err.message);
    } finally {
      setSlotGenLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-orange-500">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Sports Venues & Turfs" />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">Your Sports Venues</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Manage your courts, set pricing, and generate hourly booking slots.
              </p>
            </div>
            <Link
              href="/venues/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Sports Venue</span>
            </Link>
          </div>

          {/* Venues Grid */}
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-500" />
            </div>
          ) : venues.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-zinc-800 rounded-3xl bg-zinc-900/40 p-8">
              <div className="w-16 h-16 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto mb-4">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white">No sports venues listed yet</h3>
              <p className="text-sm text-zinc-400 max-w-md mx-auto mt-1 mb-6">
                Register your box cricket ground, turf or court to start accepting bookings from players on Passwala.
              </p>
              <Link
                href="/venues/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Register Venue Now</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => {
                const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80';
                const minPrice = venue.price_per_hour ? Math.min(...Object.values(venue.price_per_hour as Record<string, number>)) : 400;

                return (
                  <div
                    key={venue.id}
                    className="rounded-3xl bg-zinc-900 border border-zinc-800 overflow-hidden shadow-xl hover:border-zinc-700 transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Venue Banner */}
                      <div className="h-44 relative bg-zinc-800 overflow-hidden">
                        <img src={img} alt={venue.name} className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/90 text-white shadow">
                            {venue.status || 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Info Content */}
                      <div className="p-5 space-y-3">
                        <h3 className="text-lg font-black text-white truncate">{venue.name}</h3>

                        <div className="flex items-center gap-1.5 text-xs text-zinc-400">
                          <MapPin className="w-3.5 h-3.5 text-orange-400 shrink-0" />
                          <span className="capitalize font-semibold text-zinc-300 truncate">
                            {venue.address || venue.city || 'Ahmedabad'}
                          </span>
                        </div>

                        {/* Sports badges */}
                        {venue.sport_types && venue.sport_types.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {venue.sport_types.map((s: string) => (
                              <span
                                key={s}
                                className="px-2.5 py-1 rounded-lg bg-zinc-800 text-[11px] font-bold text-zinc-300 capitalize"
                              >
                                {s.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 flex items-baseline justify-between border-t border-zinc-800/80">
                          <span className="text-xs text-zinc-500 font-medium">Hourly Base Rate</span>
                          <span className="text-lg font-black text-orange-400">From ₹{minPrice}/hr</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="p-5 pt-0 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleGenerateSlots(venue.id, venue.sport_types?.[0])}
                        disabled={slotGenLoading === venue.id}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-zinc-800 hover:bg-zinc-700 text-xs font-bold text-white transition-all cursor-pointer disabled:opacity-50"
                      >
                        {slotGenLoading === venue.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-orange-400" />
                            <span>Auto Slots</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`http://localhost:3001/sports/${venue.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-500/10 hover:bg-orange-500/20 text-orange-400 border border-orange-500/30 text-xs font-bold transition-all"
                      >
                        <span>Buyer Preview</span>
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
