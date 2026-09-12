'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/lib/vendor-context';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
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
        owner_user_id: vendor?.user_id || vendor?.id,
        owner_name: vendor?.name || 'Partner',
        owner_phone: vendor?.phone || localStorage.getItem('vPhone') || '',
        description: `Premium sports arena located in ${address}. Available for hourly slot bookings.`,
        images: ['https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=800&q=80']
      };

      const res = await fetch('http://127.0.0.1:3004/api/sports/venues', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('🎉 Venue registered successfully!');
        router.push('/venues');
      } else {
        toast.error(data.error || 'Failed to register venue');
      }
    } catch (err: any) {
      toast.error('Error connecting to backend: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-orange-500">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Register New Venue" />

        <main className="flex-1 p-4 md:p-8 max-w-3xl mx-auto w-full space-y-6">
          <Link
            href="/venues"
            className="inline-flex items-center gap-2 text-xs font-bold text-zinc-400 hover:text-white transition-colors mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Back to Venues</span>
          </Link>

          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 md:p-10 shadow-2xl space-y-8">
            <div>
              <h2 className="text-2xl font-black text-white">Add Sports Venue / Turf</h2>
              <p className="text-xs text-zinc-400 mt-1">
                Enter your turf details. It will appear live on the Buyer Web App immediately.
              </p>
            </div>

            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Venue Name */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Venue Name *
                </label>
                <div className="flex items-center rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 focus-within:border-orange-500">
                  <Trophy className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
                  <input
                    type="text"
                    required
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. Apex Sports Arena & Box Cricket"
                    className="bg-transparent flex-1 text-sm text-white placeholder:text-zinc-600 outline-none"
                  />
                </div>
              </div>

              {/* Area / Address */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Area / Locality / Physical Address *
                  </label>
                  <div className="flex items-center rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 focus-within:border-orange-500">
                    <MapPin className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
                    <input
                      type="text"
                      required
                      value={address}
                      onChange={(e) => setAddress(e.target.value)}
                      placeholder="e.g. Paldi, Sindhu Bhavan Road..."
                      className="bg-transparent flex-1 text-sm text-white placeholder:text-zinc-600 outline-none"
                    />
                  </div>
                  <p className="text-[11px] text-zinc-500">Shown directly on venue cards.</p>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    City
                  </label>
                  <input
                    type="text"
                    value={city}
                    onChange={(e) => setCity(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Pricing & Timing */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Base Rate (₹/hr) *
                  </label>
                  <div className="flex items-center rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 focus-within:border-orange-500">
                    <IndianRupee className="w-4 h-4 text-zinc-500 mr-2 shrink-0" />
                    <input
                      type="number"
                      required
                      min={100}
                      step={50}
                      value={basePrice}
                      onChange={(e) => setBasePrice(e.target.value)}
                      placeholder="400"
                      className="bg-transparent flex-1 text-sm text-white outline-none font-bold"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Opening Time
                  </label>
                  <input
                    type="time"
                    value={openTime}
                    onChange={(e) => setOpenTime(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>

                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Closing Time
                  </label>
                  <input
                    type="time"
                    value={closeTime}
                    onChange={(e) => setCloseTime(e.target.value)}
                    className="w-full rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 text-sm text-white outline-none"
                  />
                </div>
              </div>

              {/* Sports Offered */}
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider block">
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
                        className={`p-3 rounded-2xl border text-xs font-bold transition-all flex items-center justify-between cursor-pointer ${
                          isSelected
                            ? 'bg-orange-500/10 border-orange-500 text-orange-400'
                            : 'bg-zinc-950 border-zinc-800 text-zinc-400 hover:text-white'
                        }`}
                      >
                        <span>{sport.label}</span>
                        {isSelected && <Check className="w-3.5 h-3.5 text-orange-500" />}
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
                  className="w-full flex items-center justify-center gap-2 py-4 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-xl shadow-orange-500/20 transition-all cursor-pointer disabled:opacity-50"
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
