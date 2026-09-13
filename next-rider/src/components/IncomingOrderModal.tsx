'use client';

import React, { useState, useEffect } from 'react';
import { Package, Store, MapPin, IndianRupee, X, Check } from 'lucide-react';
import { useRider } from '../lib/rider-context';
import { formatCurrency } from '../lib/utils';

export default function IncomingOrderModal() {
  const { incomingOrder, acceptIncomingOrder, rejectIncomingOrder } = useRider();
  const [secondsLeft, setSecondsLeft] = useState(45);

  useEffect(() => {
    if (!incomingOrder) {
      setSecondsLeft(45);
      return;
    }

    const timer = setInterval(() => {
      setSecondsLeft((prev) => {
        if (prev <= 1) {
          rejectIncomingOrder();
          return 45;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [incomingOrder, rejectIncomingOrder]);

  if (!incomingOrder) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
      <div className="w-full max-w-md bg-white border-2 border-orange-500/40 rounded-3xl p-6 shadow-2xl text-slate-900 relative overflow-hidden">
        {/* Top Header & Countdown */}
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-orange-600 animate-ping" />
            <span className="text-xs font-black uppercase tracking-wider text-orange-600">
              New Delivery Order Offer
            </span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold text-slate-500">
              {secondsLeft}s
            </span>
            <div className="w-9 h-9 rounded-full bg-orange-50 border-2 border-orange-500 flex items-center justify-center text-xs font-black text-orange-600 shadow-xs">
              {secondsLeft}
            </div>
          </div>
        </div>

        {/* Payout Highlight */}
        <div className="bg-orange-50 border border-orange-200/80 rounded-2xl p-4 mb-4 flex items-center justify-between">
          <div>
            <span className="text-xs text-slate-500 font-bold block mb-0.5">Delivery Payout</span>
            <span className="text-2xl font-black text-slate-900 flex items-center">
              {formatCurrency(incomingOrder.delivery_fee)}
            </span>
          </div>
          <div className="text-right">
            <span className="text-[11px] font-bold text-slate-500 block mb-0.5">Payment</span>
            <span className={`text-xs font-extrabold px-2.5 py-1 rounded-full ${
              incomingOrder.payment_mode === 'COD'
                ? 'bg-amber-100 text-amber-800 border border-amber-300'
                : 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            }`}>
              {incomingOrder.payment_mode === 'COD' ? 'Cash On Delivery' : 'Prepaid Online'}
            </span>
          </div>
        </div>

        {/* Store & Customer Route Cards */}
        <div className="space-y-3 mb-4">
          {/* Pickup Store */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-orange-100 border border-orange-200 flex items-center justify-center text-orange-600 shrink-0 mt-0.5">
              <Store className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-orange-600 uppercase tracking-wider block">
                Pickup Store
              </span>
              <p className="text-sm font-extrabold text-slate-900 truncate">
                {incomingOrder.store_name}
              </p>
              <p className="text-xs text-slate-500 line-clamp-1">
                {incomingOrder.store_address}
              </p>
            </div>
          </div>

          {/* Delivery Customer */}
          <div className="bg-slate-50 border border-slate-200 rounded-2xl p-3.5 flex items-start gap-3">
            <div className="w-9 h-9 rounded-xl bg-emerald-100 border border-emerald-200 flex items-center justify-center text-emerald-700 shrink-0 mt-0.5">
              <MapPin className="w-5 h-5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="text-[10px] font-extrabold text-emerald-700 uppercase tracking-wider block">
                Deliver To
              </span>
              <p className="text-sm font-extrabold text-slate-900 truncate">
                {incomingOrder.customer_name}
              </p>
              <p className="text-xs text-slate-500 line-clamp-1">
                {incomingOrder.customer_address}
              </p>
            </div>
          </div>
        </div>

        {/* Items Summary Pill */}
        <div className="bg-slate-100 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-700 flex items-center justify-between mb-6">
          <span className="text-slate-500 font-semibold">Items ({incomingOrder.items.length})</span>
          <span className="font-bold text-slate-800 truncate max-w-[200px]">
            {incomingOrder.items.map(i => `${i.quantity}x ${i.name}`).join(', ')}
          </span>
        </div>

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-3">
          <button
            onClick={rejectIncomingOrder}
            className="w-full py-3.5 px-4 rounded-2xl border border-slate-200 bg-white text-slate-700 hover:bg-slate-50 text-sm font-extrabold transition flex items-center justify-center gap-2 cursor-pointer"
          >
            <X className="w-4 h-4" />
            Decline
          </button>
          <button
            onClick={acceptIncomingOrder}
            className="w-full py-3.5 px-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white text-sm font-black transition shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
          >
            <Check className="w-5 h-5" />
            Accept Order
          </button>
        </div>
      </div>
    </div>
  );
}
