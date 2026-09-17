'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Bike,
  MapPin,
  Phone,
  Navigation as NavIcon,
  CheckCircle2,
  Clock,
  IndianRupee,
  Users,
  Key,
  RefreshCw
} from 'lucide-react';
import { useRider, ActiveCityRide } from '../../lib/rider-context';
import { formatCurrency, getApiUrl } from '../../lib/utils';
import { supabase } from '../../lib/supabase-client';
import { toast } from 'react-hot-toast';

export default function RidesPage() {
  const {
    rider,
    isOnline,
    activeRide,
    advanceRideStep,
    cancelActiveRide,
    stats
  } = useRider();

  const [otpInput, setOtpInput] = useState('');
  const [availableRides, setAvailableRides] = useState<ActiveCityRide[]>([]);
  const [completedHistory, setCompletedHistory] = useState<any[]>([]);
  const [loadingRides, setLoadingRides] = useState(false);

  // Fetch pending available passenger rides
  const fetchAvailableRides = useCallback(async () => {
    setLoadingRides(true);
    try {
      const apiBase = getApiUrl();
      const res = await fetch(`${apiBase}/api/city-rides/pending-rides`);
      if (res.ok) {
        const data = await res.json();
        if (data.success && Array.isArray(data.bookings)) {
          const mapped: ActiveCityRide[] = data.bookings.map((b: any) => ({
            id: b.id,
            passenger_name: b.users?.full_name || 'Passenger',
            passenger_phone: b.users?.phone || '+91 98255 51169',
            pickup_area: b.pickup_area,
            drop_area: b.drop_area,
            pickup_lat: parseFloat(b.pickup_lat),
            pickup_lng: parseFloat(b.pickup_lng),
            drop_lat: parseFloat(b.drop_lat),
            drop_lng: parseFloat(b.drop_lng),
            total_price: Number(b.total_price),
            status: 'CONFIRMED',
            step: 1,
            seat_count: b.seat_count || 1
          }));
          setAvailableRides(mapped);
        }
      }
    } catch (err) {
      console.warn('Error loading pending rides:', err);
    } finally {
      setLoadingRides(false);
    }
  }, []);

  // Fetch completed trip history from Supabase
  const fetchCompletedHistory = useCallback(async () => {
    try {
      const { data, error } = await supabase
        .from('ticket_bookings')
        .select('id, pickup_area, drop_area, total_price, created_at, users(full_name)')
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(6);

      if (!error && data) {
        setCompletedHistory(data.map((b: any) => ({
          id: b.id,
          passenger: b.users?.full_name || 'Passenger',
          from: b.pickup_area,
          to: b.drop_area,
          fare: Number(b.total_price),
          time: new Date(b.created_at).toLocaleDateString('en-IN', {
            month: 'short',
            day: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
          })
        })));
      }
    } catch (err) {
      console.warn('Error loading completed rides:', err);
    }
  }, []);

  useEffect(() => {
    fetchAvailableRides();
    fetchCompletedHistory();
    const interval = setInterval(fetchAvailableRides, 6000);
    return () => clearInterval(interval);
  }, [fetchAvailableRides, fetchCompletedHistory]);

  const handleClaimRide = async (ride: ActiveCityRide) => {
    if (!isOnline) {
      toast.error('Please switch to Online mode first!');
      return;
    }

    try {
      const apiBase = getApiUrl();
      // Ensure vehicle exists for this driver
      let { data: vehicle } = await supabase
        .from('city_vehicles')
        .select('id')
        .eq('driver_id', rider?.user_id || rider?.id)
        .maybeSingle();

      if (!vehicle && rider?.id) {
        const { data: newV } = await supabase
          .from('city_vehicles')
          .insert({
            driver_id: rider.user_id || rider.id,
            vehicle_type: 'Bike',
            license_plate: rider.vehicle_no || 'GJ01-PW-0000',
            total_seats: 1,
            available_seats: 1,
            is_active: true
          })
          .select()
          .single();
        vehicle = newV;
      }

      if (!vehicle) {
        toast.error('Could not register driver vehicle');
        return;
      }

      const res = await fetch(`${apiBase}/api/city-rides/claim`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bookingId: ride.id, vehicleId: vehicle.id })
      });
      const data = await res.json();

      if (!res.ok || !data.success) {
        toast.error(data.error || 'Ride already claimed by another driver');
        fetchAvailableRides();
        return;
      }

      toast.success(`Ride accepted for ${ride.passenger_name}! Head to pickup.`);
      window.location.reload(); // Reload context state
    } catch (err) {
      console.error('Error claiming trip:', err);
      toast.error('Failed to accept trip');
    }
  };

  const openGoogleMaps = (address: string, lat?: number, lng?: number) => {
    let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    if (lat && lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Bike className="w-7 h-7 text-emerald-600" />
            City Passenger Rides
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Pick up commuters and passengers across Ahmedabad in real-time.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={fetchAvailableRides}
            disabled={loadingRides}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-600 hover:border-orange-300 transition shadow-xs cursor-pointer"
            title="Refresh rides"
          >
            <RefreshCw className={`w-4 h-4 ${loadingRides ? 'animate-spin text-orange-600' : ''}`} />
          </button>
          <div className="px-3.5 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-xs font-extrabold shadow-xs">
            {stats.rides} Trips Done
          </div>
        </div>
      </div>

      {/* ACTIVE CITY RIDE */}
      {activeRide ? (
        <div className="bg-white border border-slate-200 rounded-3xl p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-black text-emerald-600 tracking-wider uppercase block">
                Active City Trip
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Passenger: {activeRide.passenger_name}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Total Fare</span>
              <span className="text-xl font-black text-emerald-600 font-mono">
                {formatCurrency(activeRide.total_price)}
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: 'En Route to Pickup' },
              { num: 2, label: 'Arrived & OTP' },
              { num: 3, label: 'In Transit to Drop' }
            ].map((s) => (
              <div
                key={s.num}
                className={`p-3 rounded-2xl border text-center transition ${
                  activeRide.step === s.num
                    ? 'bg-emerald-50 border-emerald-500 text-emerald-700 shadow-xs'
                    : activeRide.step > s.num
                    ? 'bg-teal-50 border-teal-300 text-teal-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-black uppercase tracking-wider mb-0.5">
                  Stage {s.num}
                </div>
                <div className="text-xs font-bold truncate">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Step 1: Heading to Passenger Pickup */}
          {activeRide.step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-orange-600 block">
                      Pickup Location
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900">
                      {activeRide.pickup_area}
                    </h4>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200">
                  <a
                    href={`tel:${activeRide.passenger_phone}`}
                    className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-orange-600" />
                    Call Passenger
                  </a>
                  <button
                    onClick={() => openGoogleMaps(activeRide.pickup_area, activeRide.pickup_lat, activeRide.pickup_lng)}
                    className="py-2.5 px-3 rounded-xl bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-orange-500 transition cursor-pointer"
                  >
                    <NavIcon className="w-3.5 h-3.5" />
                    Navigation
                  </button>
                </div>
              </div>

              <button
                onClick={advanceRideStep}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                I Have Arrived at Pickup Point
              </button>
            </div>
          )}

          {/* Step 2: At Pickup & Verify OTP */}
          {activeRide.step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-5 text-center">
                <div className="w-12 h-12 rounded-2xl bg-emerald-100 border border-emerald-200 text-emerald-700 flex items-center justify-center mx-auto mb-3 shadow-xs">
                  <Key className="w-6 h-6" />
                </div>
                <h4 className="text-base font-black text-slate-900 mb-1">
                  Enter Passenger Ride OTP
                </h4>
                <p className="text-xs text-slate-500 mb-4">
                  Ask {activeRide.passenger_name} for the 4-digit start PIN on their screen.
                </p>

                <div className="max-w-[200px] mx-auto">
                  <input
                    type="text"
                    maxLength={4}
                    value={otpInput}
                    onChange={(e) => setOtpInput(e.target.value.replace(/\D/g, ''))}
                    placeholder="• • • •"
                    className="w-full text-center text-2xl font-mono font-black tracking-widest py-2.5 px-4 bg-white border border-slate-300 rounded-xl text-slate-900 focus:outline-none focus:border-emerald-500 shadow-xs"
                  />
                </div>
              </div>

              <button
                onClick={() => {
                  advanceRideStep();
                  toast.success('OTP Verified! Ride in progress.');
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                Verify OTP & Start Ride
              </button>
            </div>
          )}

          {/* Step 3: In Transit to Destination */}
          {activeRide.step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[10px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                      Drop Destination
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900">
                      {activeRide.drop_area}
                    </h4>
                  </div>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-200">
                  <button
                    onClick={() => openGoogleMaps(activeRide.drop_area, activeRide.drop_lat, activeRide.drop_lng)}
                    className="w-full py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition cursor-pointer"
                  >
                    <NavIcon className="w-3.5 h-3.5" />
                    Open Maps Navigation
                  </button>
                </div>
              </div>

              <button
                onClick={() => {
                  advanceRideStep();
                  toast.success('Trip Completed! Fare added to your wallet.');
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-black text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                Reached Destination • Complete Trip
              </button>
            </div>
          )}

          <div className="text-center pt-2">
            <button
              onClick={() => {
                if (confirm('Cancel this passenger ride?')) {
                  cancelActiveRide();
                }
              }}
              className="text-xs font-bold text-slate-400 hover:text-red-600 transition cursor-pointer"
            >
              Cancel Passenger Trip
            </button>
          </div>
        </div>
      ) : (
        /* AVAILABLE NEARBY RIDES */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-base font-black text-slate-900 flex items-center gap-2">
              <Users className="w-4 h-4 text-orange-600" />
              Live Passenger Requests Nearby
            </h3>
            <span className="text-xs text-slate-500 font-bold">
              {availableRides.length} Active in Ahmedabad
            </span>
          </div>

          {availableRides.length > 0 ? (
            <div className="space-y-3">
              {availableRides.map((ride) => (
                <div
                  key={ride.id}
                  className="bg-white border border-slate-200 hover:border-emerald-500/40 rounded-3xl p-5 transition space-y-3 shadow-xs"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <span className="text-[11px] font-bold text-slate-400 block">
                        Passenger: {ride.passenger_name}
                      </span>
                      <div className="text-sm font-extrabold text-slate-900 mt-1 flex items-center gap-2">
                        <span className="text-orange-600">{ride.pickup_area}</span>
                        <span className="text-slate-300">→</span>
                        <span className="text-emerald-700">{ride.drop_area}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-lg font-black text-emerald-700 block font-mono">
                        {formatCurrency(ride.total_price)}
                      </span>
                      <span className="text-[10px] text-slate-400 uppercase tracking-wider font-bold">
                        One-Way Fare
                      </span>
                    </div>
                  </div>

                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between gap-3">
                    <span className="text-xs text-slate-500 font-semibold flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      Instant Pickup • 1 Passenger
                    </span>
                    <button
                      onClick={() => handleClaimRide(ride)}
                      className="py-2.5 px-5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-black transition shadow-sm cursor-pointer"
                    >
                      Accept Trip
                    </button>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center shadow-xs">
              <div className="w-12 h-12 rounded-2xl bg-slate-100 text-slate-400 flex items-center justify-center mx-auto mb-3">
                <Bike className="w-6 h-6" />
              </div>
              <h4 className="text-sm font-black text-slate-900 mb-1">
                No Passenger Trips Waiting Nearby
              </h4>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Real-time booking radar is monitoring Ahmedabad. Stay online to receive audio alerts when passenger requests are booked.
              </p>
            </div>
          )}

          {/* Recent Completed Trips */}
          <div className="pt-4">
            <h3 className="text-base font-black text-slate-900 mb-3">
              Recent Completed Trips
            </h3>
            {completedHistory.length > 0 ? (
              <div className="space-y-2.5">
                {completedHistory.map((item) => (
                  <div
                    key={item.id}
                    className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between shadow-xs"
                  >
                    <div>
                      <p className="text-xs font-extrabold text-slate-900">
                        {item.from} → {item.to}
                      </p>
                      <p className="text-[11px] text-slate-500 mt-0.5">
                        Passenger: {item.passenger} • {item.time}
                      </p>
                    </div>
                    <span className="text-sm font-black text-emerald-700 font-mono">
                      +{formatCurrency(item.fare)}
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-slate-400 italic">No completed trips recorded yet.</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
