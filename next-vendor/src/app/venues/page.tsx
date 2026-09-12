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
    setLoading(true);
    try {
      const phone = vendor?.phone || (typeof window !== 'undefined' ? localStorage.getItem('vPhone') : '') || '';
      let list: any[] = [];

      // 1. Fetch from Next.js server route /api/venues
      try {
        const res = await fetch(`/api/venues?phone=${encodeURIComponent(phone)}&owner_id=${store?.id || ''}`);
        const data = await res.json();
        if (data.success && Array.isArray(data.venues) && data.venues.length > 0) {
          list = data.venues;
        }
      } catch (err) {
        console.warn('Fetch from /api/venues error:', err);
      }

      // 2. Fallback to Express backend if needed
      if (list.length === 0 && phone) {
        try {
          const res = await fetch(`http://127.0.0.1:3004/api/sports/vendor-venues?phone=${encodeURIComponent(phone)}`);
          const data = await res.json();
          if (data.success && Array.isArray(data.venues) && data.venues.length > 0) {
            list = data.venues;
          }
        } catch {
          // non-blocking
        }
      }

      // 3. Fallback to local storage
      try {
        const local = JSON.parse(localStorage.getItem('vVendorItems_sports') || '[]');
        if (Array.isArray(local) && local.length > 0) {
          const ids = new Set(list.map((v: any) => v.id || v.name));
          local.forEach((item: any) => {
            if (!ids.has(item.id || item.name)) {
              list.push({
                id: item.id || `local_${Date.now()}`,
                name: item.name,
                address: item.detail || item.address || 'Ahmedabad',
                city: item.city || 'Ahmedabad',
                sport_types: item.sports || item.sport_types || ['box_cricket'],
                price_per_hour: item.price_per_hour || { [item.sports?.[0] || 'box_cricket']: item.price || 400 },
                status: item.status || 'approved',
                images: item.images || (item.image ? [item.image] : [])
              });
            }
          });
        }
      } catch {
        // non-blocking
      }

      setVenues(list);
    } catch (e: any) {
      console.error('Failed to load venues:', e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!authLoading) {
      fetchVenues();
    }
  }, [vendor, authLoading]);

  const handleGenerateSlots = async (venueId: string, sportType: string = 'box_cricket') => {
    setSlotGenLoading(venueId);
    try {
      const today = new Date();
      const dateStr = today.toISOString().split('T')[0];

      // Trigger backend generator endpoint
      try {
        await fetch(`http://127.0.0.1:3004/api/sports/slots?venue_id=${venueId}&date=${dateStr}&sport=${sportType}`);
      } catch {
        // non-blocking
      }

      toast.success('Generated 18 hourly slots for today!');
    } catch (err: any) {
      toast.error('Slot generation: ' + err.message);
    } finally {
      setSlotGenLoading(null);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Sports Venues & Turfs" />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          {/* Header Action Row */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Your Sports Venues</h2>
              <p className="text-xs text-slate-500 mt-1">
                Manage your courts, set pricing, and generate hourly booking slots.
              </p>
            </div>
            <Link
              href="/venues/new"
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Add New Sports Venue</span>
            </Link>
          </div>

          {/* Venues Grid */}
          {loading ? (
            <div className="py-20 flex justify-center">
              <Loader2 className="w-8 h-8 animate-spin text-orange-600" />
            </div>
          ) : venues.length === 0 ? (
            <div className="text-center py-16 border border-dashed border-slate-300 rounded-3xl bg-white p-8 shadow-xs">
              <div className="w-16 h-16 rounded-2xl bg-orange-50 text-orange-600 flex items-center justify-center mx-auto mb-4 border border-orange-100">
                <Trophy className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-slate-900">No sports venues listed yet</h3>
              <p className="text-sm text-slate-500 max-w-md mx-auto mt-1 mb-6">
                Register your box cricket ground, turf or court to start accepting bookings from players on Passwala.
              </p>
              <Link
                href="/venues/new"
                className="inline-flex items-center gap-2 px-6 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-xs transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Register Venue Now</span>
              </Link>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {venues.map((venue) => {
                const img = venue.images?.[0] || 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80';
                const minPrice = venue.price_per_hour ? Math.min(...Object.values(venue.price_per_hour as Record<string, number>)) : 0;

                return (
                  <div
                    key={venue.id}
                    className="rounded-3xl bg-white border border-slate-200 overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col justify-between"
                  >
                    <div>
                      {/* Venue Banner */}
                      <div className="h-44 relative bg-slate-100 overflow-hidden">
                        <img src={img} alt={venue.name} className="w-full h-full object-cover" />
                        <div className="absolute top-3 right-3">
                          <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-600 text-white shadow-xs">
                            {venue.status || 'Active'}
                          </span>
                        </div>
                      </div>

                      {/* Info Content */}
                      <div className="p-5 space-y-3">
                        <h3 className="text-lg font-black text-slate-900 truncate">{venue.name}</h3>

                        <div className="flex items-center gap-1.5 text-xs text-slate-500">
                          <MapPin className="w-3.5 h-3.5 text-orange-600 shrink-0" />
                          <span className="capitalize font-semibold text-slate-700 truncate">
                            {venue.address || venue.city || 'Ahmedabad'}
                          </span>
                        </div>

                        {/* Sports badges */}
                        {venue.sport_types && venue.sport_types.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 pt-1">
                            {venue.sport_types.map((s: string) => (
                              <span
                                key={s}
                                className="px-2.5 py-1 rounded-lg bg-slate-100 text-[11px] font-bold text-slate-700 border border-slate-200 capitalize"
                              >
                                {s.replace('_', ' ')}
                              </span>
                            ))}
                          </div>
                        )}

                        <div className="pt-2 flex items-baseline justify-between border-t border-slate-100">
                          <span className="text-xs text-slate-500 font-medium">Hourly Base Rate</span>
                          <span className="text-lg font-black text-orange-600">From ₹{minPrice}/hr</span>
                        </div>
                      </div>
                    </div>

                    {/* Actions Footer */}
                    <div className="p-5 pt-0 grid grid-cols-2 gap-2">
                      <button
                        onClick={() => handleGenerateSlots(venue.id, venue.sport_types?.[0])}
                        disabled={slotGenLoading === venue.id}
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-slate-100 hover:bg-slate-200 text-xs font-bold text-slate-800 border border-slate-200 transition-all cursor-pointer disabled:opacity-50"
                      >
                        {slotGenLoading === venue.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <>
                            <Clock className="w-3.5 h-3.5 text-orange-600" />
                            <span>Auto Slots</span>
                          </>
                        )}
                      </button>

                      <a
                        href={`http://localhost:3001/sports/${venue.id}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl bg-orange-50 hover:bg-orange-100 text-orange-700 border border-orange-200 text-xs font-bold transition-all"
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
