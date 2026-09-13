'use client';

import React from 'react';
import { Bike, ShieldAlert, Check } from 'lucide-react';
import { useRider } from '../lib/rider-context';

export default function LocationDisclosureModal() {
  const { showLocationDisclosure, setShowLocationDisclosure, toggleOnlineStatus } = useRider();

  if (!showLocationDisclosure) return null;

  const handleAccept = () => {
    localStorage.setItem('passwala_location_consent', 'accepted');
    setShowLocationDisclosure(false);
    toggleOnlineStatus();
  };

  const handleDecline = () => {
    setShowLocationDisclosure(false);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-slate-900 relative overflow-hidden">
        {/* Top Icon */}
        <div className="w-14 h-14 rounded-2xl bg-orange-50 border border-orange-200 flex items-center justify-center text-orange-600 mx-auto mb-4 shadow-xs">
          <Bike className="w-7 h-7" />
        </div>

        <h3 className="text-xl font-extrabold text-center text-slate-900 mb-2">
          Background Location Access
        </h3>

        <p className="text-sm text-slate-600 leading-relaxed mb-4 text-center">
          Passwala Rider collects location data to display your real-time coordinates to customers and merchants, calculate optimal delivery routes, and provide accurate ETAs, <strong className="text-orange-600">even when the app is closed or minimized</strong>, while your status is set to <strong className="text-emerald-600">Online</strong>.
        </p>

        <div className="bg-slate-50 border border-slate-200/80 rounded-2xl p-4 mb-6 text-xs text-slate-600 space-y-2">
          <div className="font-extrabold text-slate-800 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
            <ShieldAlert className="w-4 h-4 text-orange-600" />
            Why Passwala requires this permission:
          </div>
          <ul className="list-disc list-inside space-y-1 text-slate-500 pl-1">
            <li>Live customer & merchant tracking along delivery routes</li>
            <li>Instant dispatching of orders nearest to your current location</li>
            <li>Accurate payout distance calculations</li>
          </ul>
        </div>

        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={handleDecline}
            className="w-full py-3 px-4 rounded-xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-bold transition cursor-pointer"
          >
            Decline
          </button>
          <button
            onClick={handleAccept}
            className="w-full py-3 px-4 rounded-xl bg-orange-600 hover:bg-orange-500 text-white text-sm font-bold transition shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-4 h-4" />
            Accept & Go Online
          </button>
        </div>
      </div>
    </div>
  );
}
