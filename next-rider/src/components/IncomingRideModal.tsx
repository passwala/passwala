'use client';

import React, { useState, useEffect } from 'react';
import { Bike, MapPin, IndianRupee, X, Check } from 'lucide-react';
import { useRider } from '../lib/rider-context';
import { formatCurrency } from '../lib/utils';

export default function IncomingRideModal() {
  const { incomingRide, acceptIncomingRide, rejectIncomingRide } = useRider();
  const [secondsLeft, setSecondsLeft] = useState(30);

  useEffect(() => {
    if (!incomingRide) {
      setSecondsLeft(30);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          rejectIncomingRide();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingRide, rejectIncomingRide]);

  if (!incomingRide) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white border-2 border-emerald-500/40 rounded-3xl p-6 shadow-2xl text-slate-900 relative overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-emerald-700">
              City Passenger Ride Offer
            </span>
          </div>
          <div className="w-9 h-9 rounded-full bg-emerald-50 border-2 border-emerald-500 flex items-center justify-center text-xs font-black text-emerald-700 shadow-xs">
            {secondsLeft}s
          </div>
        </div>

        <div className="bg-emerald-50 border border-emerald-200/80 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-0.5">Estimated Fare</span>
            <span className="text-2xl font-black text-slate-900 flex items-center">
              {formatCurrency(incomingRide.total_price)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Passenger</span>
            <span className="text-sm font-black text-slate-900">
              {incomingRide.passenger_name}
            </span>
          </div>
        </div>

        <div className="space-y-3 mb-6">
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider block">
                Pickup Point
              </span>
              <p className="text-sm font-extrabold text-slate-900 truncate">
                {incomingRide.pickup_area}
              </p>
            </div>
          </div>

          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                Destination
              </span>
              <p className="text-sm font-extrabold text-slate-900 truncate">
                {incomingRide.drop_area}
              </p>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={rejectIncomingRide}
            className="w-full py-3.5 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Decline
          </button>
          <button
            onClick={acceptIncomingRide}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white text-sm font-black transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            Accept Ride
          </button>
        </div>
      </div>
    </div>
  );
}
