'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { formatCurrency } from '@/lib/utils';
import { 
  IndianRupee, 
  TrendingUp, 
  ArrowUpRight, 
  Calendar, 
  Download, 
  CheckCircle2 
} from 'lucide-react';

export default function EarningsPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'WEEK' | 'MONTH' | 'YEAR'>('MONTH');

  const transactions = [
    { id: 'TXN-9021', title: 'Box Cricket Slot - Evening', date: 'Today, 06:00 PM', amount: 800, net: 760, fee: 40, status: 'Settled' },
    { id: 'TXN-9020', title: 'Football Turf - 2 Hours', date: 'Yesterday, 08:00 PM', amount: 1200, net: 1140, fee: 60, status: 'Settled' },
    { id: 'TXN-9019', title: 'VIP Concert Pass x2', date: '10 Sep 2026', amount: 1998, net: 1898, fee: 100, status: 'Settled' },
    { id: 'TXN-9018', title: 'Box Cricket Slot - Morning', date: '09 Sep 2026', amount: 400, net: 380, fee: 20, status: 'Settled' },
  ];

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-orange-500">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Revenue & Financials" />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-white">Earnings Analytics</h2>
              <p className="text-xs text-zinc-400 mt-1">Track payouts, customer volume and net revenue.</p>
            </div>
            <div className="flex items-center gap-1.5 bg-zinc-900 p-1 rounded-xl border border-zinc-800 text-xs">
              {(['WEEK', 'MONTH', 'YEAR'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    timeRange === r ? 'bg-orange-500 text-white shadow' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Gross Booking Sales</span>
              <p className="text-3xl font-black text-white">{formatCurrency(38400)}</p>
              <span className="text-xs text-emerald-400 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> +24% vs last period
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Net Partner Payout</span>
              <p className="text-3xl font-black text-emerald-400">{formatCurrency(36480)}</p>
              <span className="text-xs text-zinc-500 font-medium">After 5% platform fee</span>
            </div>

            <div className="p-6 rounded-3xl bg-zinc-900 border border-zinc-800 space-y-2">
              <span className="text-xs font-bold text-zinc-400 uppercase tracking-wider">Pending Settlement</span>
              <p className="text-3xl font-black text-orange-400">{formatCurrency(4800)}</p>
              <span className="text-xs text-zinc-400 font-medium">Scheduled for next batch</span>
            </div>
          </div>

          {/* Transactions Breakdown */}
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 md:p-8 space-y-6">
            <h3 className="text-lg font-bold text-white">Itemized Payout History</h3>
            <div className="space-y-3">
              {transactions.map((tx) => (
                <div
                  key={tx.id}
                  className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-zinc-950/80 border border-zinc-800 gap-3"
                >
                  <div>
                    <h4 className="font-bold text-sm text-white">{tx.title}</h4>
                    <p className="text-xs text-zinc-500 font-mono mt-0.5">
                      {tx.id} • {tx.date}
                    </p>
                  </div>

                  <div className="flex items-center justify-between sm:justify-end gap-6 text-xs">
                    <div>
                      <span className="text-zinc-400 block">Gross: ₹{tx.amount}</span>
                      <span className="text-zinc-500">Fee: -₹{tx.fee}</span>
                    </div>
                    <div className="text-right">
                      <span className="text-base font-black text-emerald-400 block">₹{tx.net}</span>
                      <span className="text-[10px] font-bold text-emerald-500 uppercase">{tx.status}</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
