'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/lib/vendor-context';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { supabase } from '@/lib/supabase-client';
import { toast } from 'react-hot-toast';
import { ArrowLeft, Trophy, MapPin, IndianRupee, Clock, Check, Loader2 } from 'lucide-react';
import Link from 'next/link';

export default function NewVenuePage() {
  const router = useRouter();
  const { vendor, store } = useVendor();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const [name, setName] = useState('');
  const [address, setAddress] = useState(store?.address || '');
  const [city, setCity] = useState(store?.city || 'Ahmedabad');
  const [basePrice, setBasePrice] = useState('400');
  const [selectedSports, setSelectedSports] = useState<string[]>(['box_cricket']);
  const [openTime, setOpenTime] = useState('06:00');
  const [closeTime, setCloseTime] = useState('23:00');

  const sportsList = [
    { id: 'box_cricket', label: 'Box Cricket' },
    { id: 'turf', label: 'Football Turf' },
    { id: 'badminton', label: 'Badminton Court' },
    { id: 'tennis', label: 'Tennis Court' },
    { id: 'pickleball', label: 'Pickleball' },
    { id: 'padel', label: 'Padel Tennis' },
    { id: 'table_tennis', label: 'Table Tennis' },
    { id: 'snooker', label: 'Snooker & Pool' },
  ];

  const toggleSport = (sportId: string) => {
    setSelectedSports(prev => 
      prev.includes(sportId) ? prev.filter(s => s !== sportId) : [...prev, sportId]
    );
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Please enter venue name');
      return;
    }
    if (!address.trim()) {
      toast.error('Please enter area/address (e.g. Paldi, Sindhu Bhavan Road)');
      return;
    }
    if (selectedSports.length === 0) {
      toast.error('Please select at least one sport');
      return;
    }

    setLoading(true);
    try {
      const priceMap: Record<string, number> = {};
      selectedSports.forEach(s => {
        priceMap[s] = parseFloat(basePrice) || 400;
      });

      const phone = vendor?.phone || localStorage.getItem('vPhone') || '';

      const payload = {
        name,
        address,
        city: city || 'Ahmedabad',
        sport_types: selectedSports,
        price_per_hour: priceMap,
        open_time: openTime,
        close_time: closeTime,
        slot_duration_mins: 60,
        owner_id: store?.id || vendor?.id,
        owner_name: vendor?.name || 'Partner',
        owner_phone: phone,
        description: `Premium sports arena located in ${address}. Available for hourly slot bookings.`,
        images: ['https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80'],
        status: 'approved'
      };

      const { data: newVenue, error } = await supabase
        .from('sports_venues')
        .insert(payload)
        .select()
        .single();

      if (error) throw error;

      // Automatically generate slots for today in venue_slots
      if (newVenue?.id) {
        try {
          const todayStr = new Date().toISOString().split('T')[0];
          const slotsPayload = [];
          for (const sp of selectedSports) {
            for (let h = 6; h <= 23; h++) {
              const startT = `${String(h).padStart(2, '0')}:00`;
              const endT = `${String(h + 1).padStart(2, '0')}:00`;
              slotsPayload.push({
                venue_id: newVenue.id,
                sport_type: sp,
                slot_date: todayStr,
                slot_time: startT,
                slot_end_time: endT,
                status: 'available',
                price: priceMap[sp] || 400
              });
            }
          }
          await supabase.from('venue_slots').upsert(slotsPayload, {
            onConflict: 'venue_id,sport_type,slot_date,slot_time',
            ignoreDuplicates: true
          });
        } catch {
          // non-blocking
        }
      }

      toast.success('🎉 Venue registered & hourly slots activated!');
      router.push('/venues');
    } catch (err: any) {
      toast.error('Failed to register venue: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Register New Venue" />

        <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
          <Link
            href="/venues"
            className="inline-flex items-center gap-2 text-xs font-bold text-slate-500 hover:text-slate-900 transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Venues</span>
          </Link>

          <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-10 shadow-lg shadow-slate-200/50 space-y-8">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Add Sports Venue / Turf</h2>
              <p className="text-xs text-slate-500 mt-1">
                Enter your turf details. It will appear live on the Buyer Web App immediately.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Venue Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Venue Name *
                </label>
                <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-600/10 transition-all">
                  <Trophy className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Sports Arena & Box Cricket"
                    className="bg-transparent flex-1 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none"
                  />
                </div>
              </div>

              {/* Area / Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Area / Locality / Physical Address *
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-600/10 transition-all">
                    <MapPin className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Paldi, Sindhu Bhavan Road..."
                      className="bg-transparent flex-1 text-sm text-slate-900 font-semibold placeholder:text-slate-400 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-slate-500">Shown directly on venue cards.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 text-sm text-slate-900 font-semibold focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Pricing & Timing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Base Rate (₹/hr) *
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-emerald-600 focus-within:bg-white focus-within:ring-4 focus-within:ring-emerald-600/10 transition-all">
                    <IndianRupee className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="number"
                      required
                      min={100}
                      step={50}
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="400"
                      className="bg-transparent flex-1 text-sm text-slate-900 font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 text-sm text-slate-900 font-semibold focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 outline-none transition-all"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 text-sm text-slate-900 font-semibold focus:border-emerald-600 focus:bg-white focus:ring-4 focus:ring-emerald-600/10 outline-none transition-all"
                  />
                </div>
              </div>

              {/* Sports Offered */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider block">
                  Select Sports Offered *
                </label>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
                  {sportsList.map((sport) => {
                    const isSelected = selectedSports.includes(sport.id);
                    return (
                      <button
                        type="button"
                        key={sport.id}
                        onClick={() => toggleSport(sport.id)}
                        className={`p-3 rounded-2xl border-2 text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-emerald-50 border-emerald-600 text-emerald-700 shadow-xs'
                            : 'bg-slate-50 border-slate-200 text-slate-600 hover:border-slate-300'
                        }`}
                      >
                        <span>{sport.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-emerald-600" />}
                      </button>
                    );
                  })}
                </div>
              </div>

              {/* Submit button */}
              <div className="pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-sm shadow-md shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Publish Venue to Passwala'}
                </button>
              </div>
            </form>
          </div>
        </main>
      </div>
    </div>
  );
}
