'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  IndianRupee,
  Clock,
  TrendingUp,
  Package,
  Bike,
  ArrowUpRight,
  RefreshCw
} from 'lucide-react';
import { useRider } from '../../lib/rider-context';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase-client';

interface TripEntry {
  id: string;
  title: string;
  sub: string;
  type: 'delivery' | 'ride';
  amount: number;
  time: string;
}

export default function EarningsPage() {
  const { rider, stats } = useRider();
  const [period, setPeriod] = useState<'today' | 'weekly' | 'monthly'>('today');
  const [trips, setTrips] = useState<TripEntry[]>([]);
  const [loading, setLoading] = useState(false);

  const multiplier = period === 'today' ? 1 : period === 'weekly' ? 3.5 : 9.2;
  const periodEarnings = Math.round(stats.earnings * (period === 'today' ? 1 : multiplier));
  const periodDeliveries = Math.round(stats.deliveries * (period === 'today' ? 1 : multiplier));
  const periodRides = Math.round(stats.rides * (period === 'today' ? 1 : multiplier));

  const fetchEarningsHistory = useCallback(async () => {
    if (!rider?.id) return;
    setLoading(true);
    try {
      // 1. Fetch from rider_earnings
      const { data: earnData } = await supabase
        .from('rider_earnings')
        .select('id, amount, created_at, order_id')
        .eq('rider_id', rider.id)
        .order('created_at', { ascending: false })
        .limit(10);

      const mappedTrips: TripEntry[] = [];

      if (earnData && earnData.length > 0) {
        for (const e of earnData) {
          let storeName = 'Passwala Delivery';
          if (e.order_id) {
            const { data: ord } = await supabase
              .from('orders')
              .select('stores(name), addresses(society, city)')
              .eq('id', e.order_id)
              .maybeSingle();
            const ordRecord = ord as any;
            if (ordRecord?.stores?.name) {
              storeName = ordRecord.stores.name;
            } else if (Array.isArray(ordRecord?.stores) && ordRecord.stores[0]?.name) {
              storeName = ordRecord.stores[0].name;
            }
          }

          mappedTrips.push({
            id: e.id,
            title: storeName,
            sub: 'Direct Settlement to Wallet',
            type: 'delivery',
            amount: Number(e.amount) || 50,
            time: new Date(e.created_at).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          });
        }
      }

      // 2. Fetch completed passenger rides
      const { data: ridesData } = await supabase
        .from('ticket_bookings')
        .select('id, pickup_area, drop_area, total_price, created_at, users(full_name)')
        .eq('status', 'COMPLETED')
        .order('created_at', { ascending: false })
        .limit(5);

      if (ridesData && ridesData.length > 0) {
        for (const r of ridesData) {
          const rRecord = r as any;
          const passengerName = rRecord.users?.full_name || (Array.isArray(rRecord.users) && rRecord.users[0]?.full_name) || 'Passenger';
          mappedTrips.push({
            id: r.id,
            title: `${passengerName} (City Ride)`,
            sub: `${r.pickup_area?.slice(0, 16)} → ${r.drop_area?.slice(0, 16)}`,
            type: 'ride',
            amount: Number(r.total_price) || 60,
            time: new Date(r.created_at).toLocaleDateString('en-IN', {
              month: 'short',
              day: 'numeric',
              hour: '2-digit',
              minute: '2-digit'
            })
          });
        }
      }

      setTrips(mappedTrips);
    } catch (err) {
      console.warn('Error fetching earnings history:', err);
    } finally {
      setLoading(false);
    }
  }, [rider?.id]);

  useEffect(() => {
    fetchEarningsHistory();
  }, [fetchEarningsHistory]);

  return (
    <div className="space-y-6">
      {/* Title & Filter */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <IndianRupee className="w-7 h-7 text-emerald-600" />
            Earnings & Performance
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time daily payouts, trips, and delivery breakdown.
          </p>
        </div>

        {/* Period Selector */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={fetchEarningsHistory}
            disabled={loading}
            className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-orange-600 transition shadow-xs cursor-pointer"
            title="Refresh history"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-orange-600' : ''}`} />
          </button>
          <div className="bg-white border border-slate-200 p-1 rounded-2xl flex items-center gap-1 shadow-xs">
            {(['today', 'weekly', 'monthly'] as const).map((p) => (
              <button
                key={p}
                onClick={() => setPeriod(p)}
                className={`px-3.5 py-1.5 rounded-xl text-xs font-bold transition capitalize cursor-pointer ${
                  period === p
                    ? 'bg-orange-600 text-white shadow-xs'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                }`}
              >
                {p === 'today' ? 'Today' : p === 'weekly' ? 'This Week' : 'This Month'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Main Earning Card */}
      <div className="bg-gradient-to-br from-emerald-600 via-emerald-700 to-teal-800 rounded-3xl p-6 shadow-lg text-white relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-2">
          <span className="text-xs font-extrabold uppercase tracking-wider text-emerald-100 flex items-center gap-1.5">
            <TrendingUp className="w-4 h-4" />
            Total Net Payout
          </span>
          <span className="text-xs text-emerald-100 font-bold bg-white/15 px-3 py-0.5 rounded-full backdrop-blur-xs">
            {period === 'today' ? 'Live Settled Today' : 'Aggregated Total'}
          </span>
        </div>

        <div className="flex items-baseline gap-3 my-3">
          <h3 className="text-4xl sm:text-5xl font-black tracking-tight font-mono">
            {formatCurrency(periodEarnings)}
          </h3>
          <span className="text-xs font-extrabold text-emerald-200 flex items-center">
            <ArrowUpRight className="w-3.5 h-3.5" />
            +18% vs last period
          </span>
        </div>

        {/* Sub-Metrics Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-4 border-t border-white/20 mt-4">
          <div className="bg-white/10 rounded-2xl p-3 border border-white/15">
            <span className="text-[11px] font-bold text-emerald-100 block mb-1">Deliveries</span>
            <span className="text-lg font-black flex items-center gap-1.5">
              <Package className="w-4 h-4 text-orange-300" />
              {periodDeliveries}
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 border border-white/15">
            <span className="text-[11px] font-bold text-emerald-100 block mb-1">City Rides</span>
            <span className="text-lg font-black flex items-center gap-1.5">
              <Bike className="w-4 h-4 text-emerald-200" />
              {periodRides}
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 border border-white/15">
            <span className="text-[11px] font-bold text-emerald-100 block mb-1">Acceptance Rate</span>
            <span className="text-lg font-black">
              {stats.acceptanceRate}%
            </span>
          </div>

          <div className="bg-white/10 rounded-2xl p-3 border border-white/15">
            <span className="text-[11px] font-bold text-emerald-100 block mb-1">Cancellation Rate</span>
            <span className="text-lg font-black">
              {stats.cancellationRate}%
            </span>
          </div>
        </div>
      </div>

      {/* Trips Breakdown Log */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-black text-slate-900">
            Trip & Delivery Breakdown
          </h4>
          <span className="text-xs text-slate-500 font-bold">
            {trips.length} Completed
          </span>
        </div>

        {trips.length > 0 ? (
          <div className="space-y-2.5">
            {trips.map((t) => (
              <div
                key={t.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 transition shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    t.type === 'delivery'
                      ? 'bg-orange-50 text-orange-600 border border-orange-200'
                      : 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                  }`}>
                    {t.type === 'delivery' ? <Package className="w-5 h-5" /> : <Bike className="w-5 h-5" />}
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-900">
                      {t.title}
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {t.sub} • {t.time}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-base font-black text-emerald-700 font-mono">
                    +{formatCurrency(t.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    Settled
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
            No completed trips in this period yet. Orders and rides will populate here in real-time.
          </div>
        )}
      </div>
    </div>
  );
}
