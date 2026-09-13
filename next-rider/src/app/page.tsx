'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  Package,
  Store,
  MapPin,
  Phone,
  Navigation as NavIcon,
  CheckCircle2,
  Clock,
  IndianRupee,
  ShieldAlert,
  ArrowRight,
  TrendingUp,
  Bike,
  Key,
  Radio
} from 'lucide-react';
import { useRider } from '../lib/rider-context';
import { formatCurrency } from '../lib/utils';
import { toast } from 'react-hot-toast';

export default function DashboardPage() {
  const {
    rider,
    isOnline,
    toggleOnlineStatus,
    stats,
    onlineDuration,
    activeOrder,
    advanceOrderStep,
    cancelActiveOrder,
    activeRide,
    advanceRideStep,
    cancelActiveRide
  } = useRider();

  const [collectedCash, setCollectedCash] = useState(false);
  const [otpInput, setOtpInput] = useState('');

  const openGoogleMaps = (address: string, lat?: number, lng?: number) => {
    let url = `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`;
    if (lat && lng) {
      url = `https://www.google.com/maps/dir/?api=1&destination=${lat},${lng}`;
    }
    window.open(url, '_blank');
  };

  return (
    <div className="space-y-6">
      {/* Rider Shift Status Card */}
      <div className={`relative overflow-hidden rounded-3xl p-6 transition-all shadow-md ${
        isOnline
          ? 'bg-gradient-to-r from-orange-500 via-amber-500 to-orange-600 text-white shadow-orange-500/20'
          : 'bg-white border border-slate-200 text-slate-900 shadow-slate-200/50'
      }`}>
        <div className="relative z-10 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1.5">
              <span className={`inline-block w-2.5 h-2.5 rounded-full ${
                isOnline ? 'bg-white animate-ping' : 'bg-slate-400'
              }`} />
              <span className={`text-xs font-black tracking-wider uppercase ${
                isOnline ? 'text-amber-100' : 'text-slate-500'
              }`}>
                {isOnline ? 'Live Real-Time Radar Active' : 'Off-Duty Standby'}
              </span>
            </div>
            <h2 className={`text-2xl font-black tracking-tight ${
              isOnline ? 'text-white' : 'text-slate-900'
            }`}>
              {isOnline ? 'Listening For Real-Time Orders' : 'Go Online to Start Earning'}
            </h2>
            <p className={`text-xs mt-1 ${
              isOnline ? 'text-orange-100' : 'text-slate-500'
            }`}>
              {isOnline
                ? `GPS radar live • Online shift: ${onlineDuration} • Realtime WebSocket connected`
                : 'Turn on duty shift to receive live food, grocery, and passenger ride dispatches.'}
            </p>
          </div>

          <button
            onClick={toggleOnlineStatus}
            className={`py-3 px-6 rounded-2xl font-black text-xs uppercase tracking-wider transition shadow-md shrink-0 cursor-pointer ${
              isOnline
                ? 'bg-white/20 hover:bg-white/30 text-white backdrop-blur-md border border-white/30'
                : 'bg-orange-600 hover:bg-orange-500 text-white shadow-orange-600/30'
            }`}
          >
            {isOnline ? 'End Duty Shift' : 'Go Online Now'}
          </button>
        </div>

        {/* Metric Chips */}
        <div className={`grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t ${
          isOnline ? 'border-white/20' : 'border-slate-100'
        }`}>
          <div className={`rounded-2xl p-3.5 border ${
            isOnline ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200/80 text-slate-900'
          }`}>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider block mb-1 ${
              isOnline ? 'text-orange-100' : 'text-slate-500'
            }`}>
              Today's Earnings
            </span>
            <span className="text-xl font-black flex items-center">
              {formatCurrency(stats.earnings)}
            </span>
          </div>

          <div className={`rounded-2xl p-3.5 border ${
            isOnline ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200/80 text-slate-900'
          }`}>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider block mb-1 ${
              isOnline ? 'text-orange-100' : 'text-slate-500'
            }`}>
              Deliveries Done
            </span>
            <span className="text-xl font-black">
              {stats.deliveries} orders
            </span>
          </div>

          <div className={`rounded-2xl p-3.5 border ${
            isOnline ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200/80 text-slate-900'
          }`}>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider block mb-1 ${
              isOnline ? 'text-orange-100' : 'text-slate-500'
            }`}>
              City Rides Done
            </span>
            <span className="text-xl font-black">
              {stats.rides} trips
            </span>
          </div>

          <div className={`rounded-2xl p-3.5 border ${
            isOnline ? 'bg-white/10 border-white/20 text-white' : 'bg-slate-50 border-slate-200/80 text-slate-900'
          }`}>
            <span className={`text-[11px] font-extrabold uppercase tracking-wider block mb-1 ${
              isOnline ? 'text-orange-100' : 'text-slate-500'
            }`}>
              Shift Time
            </span>
            <span className="text-xl font-black">
              {isOnline ? onlineDuration : '0h 0m'}
            </span>
          </div>
        </div>
      </div>

      {/* ACTIVE CITY RIDE IN PROGRESS */}
      {activeRide && (
        <div className="bg-white border-2 border-emerald-500/50 rounded-3xl p-6 shadow-md space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-black text-emerald-600 tracking-wider uppercase block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping inline-block" />
                Live Passenger Trip in Progress
              </span>
              <h3 className="text-xl font-black text-slate-900">
                Passenger: {activeRide.passenger_name}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Trip Fare</span>
              <span className="text-xl font-black text-emerald-600 font-mono">
                {formatCurrency(activeRide.total_price)}
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: 'En Route to Pickup' },
              { num: 2, label: 'Arrived & Verify OTP' },
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
      )}

      {/* ACTIVE DELIVERY ORDER JOURNEY */}
      {activeOrder && (
        <div className="bg-white border-2 border-orange-500/50 rounded-3xl p-6 shadow-md space-y-6">
          {/* Order Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-4">
            <div>
              <span className="text-xs font-black text-orange-600 tracking-wider uppercase block flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-orange-500 animate-ping inline-block" />
                Live Delivery Order In Progress
              </span>
              <h3 className="text-xl font-black text-slate-900">
                {activeOrder.order_number}
              </h3>
            </div>
            <div className="text-right">
              <span className="text-xs text-slate-500 block">Rider Payout</span>
              <span className="text-xl font-black text-emerald-600">
                {formatCurrency(activeOrder.delivery_fee)}
              </span>
            </div>
          </div>

          {/* Stepper Progress Bar */}
          <div className="grid grid-cols-3 gap-2">
            {[
              { num: 1, label: 'Store Pickup' },
              { num: 2, label: 'Verify Items' },
              { num: 3, label: 'Customer Handover' }
            ].map((s) => (
              <div
                key={s.num}
                className={`p-3 rounded-2xl border text-center transition ${
                  activeOrder.step === s.num
                    ? 'bg-orange-50 border-orange-500 text-orange-700 shadow-xs'
                    : activeOrder.step > s.num
                    ? 'bg-emerald-50 border-emerald-300 text-emerald-700'
                    : 'bg-slate-50 border-slate-200 text-slate-400'
                }`}
              >
                <div className="text-[11px] font-black uppercase tracking-wider mb-0.5">
                  Step {s.num}
                </div>
                <div className="text-xs font-bold truncate">
                  {s.label}
                </div>
              </div>
            ))}
          </div>

          {/* Step 1: Head to Store */}
          {activeOrder.step === 1 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0">
                    <Store className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-orange-600 block">
                      Pickup Merchant
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900">
                      {activeOrder.store_name}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {activeOrder.store_address}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200">
                  <a
                    href={`tel:${activeOrder.store_phone}`}
                    className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-orange-600" />
                    Call Merchant
                  </a>
                  <button
                    onClick={() => openGoogleMaps(activeOrder.store_address, activeOrder.store_lat, activeOrder.store_lng)}
                    className="py-2.5 px-3 rounded-xl bg-orange-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-orange-500 transition cursor-pointer"
                  >
                    <NavIcon className="w-3.5 h-3.5" />
                    Maps Navigation
                  </button>
                </div>
              </div>

              <button
                onClick={advanceOrderStep}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm transition shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                I Have Reached The Store
              </button>
            </div>
          )}

          {/* Step 2: At Store & Verify Items */}
          {activeOrder.step === 2 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <h4 className="text-sm font-extrabold text-slate-900 mb-2 flex items-center gap-2">
                  <Package className="w-4 h-4 text-orange-600" />
                  Verify Order Items with Merchant:
                </h4>
                <div className="space-y-2 mt-3">
                  {activeOrder.items.map((item, idx) => (
                    <div key={idx} className="flex items-center justify-between p-3 rounded-xl bg-white border border-slate-200 text-xs">
                      <span className="font-extrabold text-slate-800">
                        {item.quantity}x {item.name}
                      </span>
                      <span className="text-slate-500 font-mono font-bold">
                        {formatCurrency(item.price)}
                      </span>
                    </div>
                  ))}
                </div>
              </div>

              <button
                onClick={advanceOrderStep}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                Items Verified • Start Delivery to Customer
              </button>
            </div>
          )}

          {/* Step 3: In Transit to Customer */}
          {activeOrder.step === 3 && (
            <div className="space-y-4 animate-fade-in">
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-4">
                <div className="flex items-start gap-3">
                  <div className="w-10 h-10 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0">
                    <MapPin className="w-5 h-5" />
                  </div>
                  <div>
                    <span className="text-[11px] font-extrabold uppercase tracking-wider text-emerald-700 block">
                      Customer Delivery Address
                    </span>
                    <h4 className="text-base font-extrabold text-slate-900">
                      {activeOrder.customer_name}
                    </h4>
                    <p className="text-xs text-slate-600 mt-0.5">
                      {activeOrder.customer_address}
                    </p>
                  </div>
                </div>

                {/* COD or Prepaid Notice */}
                <div className={`mt-3 p-3 rounded-xl border flex items-center justify-between text-xs ${
                  activeOrder.payment_mode === 'COD'
                    ? 'bg-amber-50 border-amber-300 text-amber-900'
                    : 'bg-emerald-50 border-emerald-300 text-emerald-900'
                }`}>
                  <span className="font-extrabold">
                    {activeOrder.payment_mode === 'COD'
                      ? '⚠️ Collect Cash From Customer'
                      : '✅ Order Prepaid Online'}
                  </span>
                  <span className="font-black text-sm">
                    {formatCurrency(activeOrder.total_amount)}
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 mt-4 pt-3 border-t border-slate-200">
                  <a
                    href={`tel:${activeOrder.customer_phone}`}
                    className="py-2.5 px-3 rounded-xl bg-white border border-slate-200 text-slate-800 text-xs font-bold flex items-center justify-center gap-2 hover:bg-slate-100 transition"
                  >
                    <Phone className="w-3.5 h-3.5 text-emerald-700" />
                    Call Customer
                  </a>
                  <button
                    onClick={() => openGoogleMaps(activeOrder.customer_address, activeOrder.customer_lat, activeOrder.customer_lng)}
                    className="py-2.5 px-3 rounded-xl bg-emerald-600 text-white text-xs font-bold flex items-center justify-center gap-2 hover:bg-emerald-500 transition cursor-pointer"
                  >
                    <NavIcon className="w-3.5 h-3.5" />
                    Maps Navigation
                  </button>
                </div>
              </div>

              {activeOrder.payment_mode === 'COD' && (
                <label className="flex items-center gap-3 p-3.5 rounded-2xl bg-amber-50 border border-amber-200 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={collectedCash}
                    onChange={(e) => setCollectedCash(e.target.checked)}
                    className="w-5 h-5 rounded border-slate-300 text-orange-600 focus:ring-orange-500"
                  />
                  <span className="text-xs font-extrabold text-amber-900">
                    I have collected ₹{activeOrder.total_amount} in cash from the customer
                  </span>
                </label>
              )}

              <button
                onClick={() => {
                  if (activeOrder.payment_mode === 'COD' && !collectedCash) {
                    toast.error('Please confirm cash collection before completing delivery!');
                    return;
                  }
                  advanceOrderStep();
                }}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-emerald-600 to-teal-500 hover:from-emerald-500 hover:to-teal-400 text-white font-black text-sm transition shadow-md shadow-emerald-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <CheckCircle2 className="w-5 h-5" />
                Handover Completed • Finish Order
              </button>
            </div>
          )}

          <div className="text-center pt-2">
            <button
              onClick={() => {
                if (confirm('Cancel this delivery assignment?')) {
                  cancelActiveOrder();
                }
              }}
              className="text-xs font-bold text-slate-400 hover:text-red-600 transition cursor-pointer"
            >
              Report Issue / Cancel Assignment
            </button>
          </div>
        </div>
      )}

      {/* IDLE RADAR STATE (WHEN NO ACTIVE ORDER OR RIDE) */}
      {!activeOrder && !activeRide && (
        <div className="bg-white border border-slate-200 rounded-3xl p-8 text-center relative overflow-hidden shadow-xs">
          {isOnline ? (
            <div className="space-y-4 max-w-md mx-auto">
              <div className="relative w-24 h-24 mx-auto flex items-center justify-center">
                <div className="absolute inset-0 rounded-full bg-orange-100 animate-ping" />
                <div className="absolute inset-2 rounded-full bg-orange-50 animate-pulse" />
                <div className="relative w-16 h-16 rounded-full bg-white border-2 border-orange-500 flex items-center justify-center text-orange-600 shadow-md">
                  <Radio className="w-8 h-8 animate-pulse" />
                </div>
              </div>
              <div>
                <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-[11px] font-black uppercase tracking-wider mb-2">
                  <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping" />
                  Live Radar Connected
                </span>
                <h3 className="text-lg font-black text-slate-900">
                  Listening For Nearby Dispatches
                </h3>
                <p className="text-xs text-slate-500 leading-relaxed mt-1">
                  Connected to Passwala database in real-time. Incoming merchant deliveries and passenger rides in Ahmedabad will alert you immediately with an audio ping.
                </p>
              </div>

              {/* Rider Vehicle Info */}
              <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3 flex items-center justify-between text-xs text-left">
                <div>
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Active Partner</span>
                  <span className="font-extrabold text-slate-900">{rider?.name}</span>
                </div>
                <div className="text-right">
                  <span className="text-[10px] uppercase font-bold text-slate-400 block">Vehicle</span>
                  <span className="font-mono font-extrabold text-orange-600 uppercase">{rider?.vehicle_no}</span>
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-4 max-w-sm mx-auto">
              <div className="w-16 h-16 rounded-full bg-slate-100 border border-slate-200 flex items-center justify-center text-slate-400 mx-auto">
                <Clock className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-black text-slate-900">
                You Are Currently Offline
              </h3>
              <p className="text-xs text-slate-500 leading-relaxed">
                Turn on your shift whenever you're ready to start receiving nearby orders and passenger rides.
              </p>
              <button
                onClick={toggleOnlineStatus}
                className="py-3 px-6 rounded-2xl bg-orange-600 hover:bg-orange-500 text-white font-black text-xs uppercase tracking-wider transition shadow-md shadow-orange-600/20 cursor-pointer"
              >
                Go Online Now
              </button>
            </div>
          )}
        </div>
      )}

      {/* Quick Navigation Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Link
          href="/rides"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-orange-500/50 transition group flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-orange-50 text-orange-600 flex items-center justify-center border border-orange-100">
              <TrendingUp className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-orange-600 transition">
                City Passenger Rides
              </h4>
              <p className="text-xs text-slate-500">Pick up local commuters</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
        </Link>

        <Link
          href="/wallet"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-emerald-500/50 transition group flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center border border-emerald-100">
              <IndianRupee className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-emerald-700 transition">
                Digital Wallet
              </h4>
              <p className="text-xs text-slate-500">Instant UPI payouts</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
        </Link>

        <Link
          href="/profile"
          className="p-4 rounded-2xl bg-white border border-slate-200 hover:border-slate-300 transition group flex items-center justify-between shadow-xs"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-slate-100 text-slate-600 flex items-center justify-center border border-slate-200">
              <ShieldAlert className="w-5 h-5" />
            </div>
            <div>
              <h4 className="text-sm font-extrabold text-slate-900 group-hover:text-slate-700 transition">
                Safety & KYC
              </h4>
              <p className="text-xs text-slate-500">Documents & 24x7 SOS</p>
            </div>
          </div>
          <ArrowRight className="w-4 h-4 text-slate-400 group-hover:translate-x-1 transition" />
        </Link>
      </div>
    </div>
  );
}
