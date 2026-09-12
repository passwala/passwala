'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useVendor } from '@/lib/vendor-context';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency } from '@/lib/utils';
import { 
  IndianRupee, 
  TrendingUp, 
  ArrowUpRight, 
  Calendar, 
  Download, 
  CheckCircle2,
  Loader2 
} from 'lucide-react';

export default function EarningsPage() {
  const { vendor, businessType } = useVendor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [timeRange, setTimeRange] = useState<'WEEK' | 'MONTH' | 'YEAR'>('MONTH');
  const [transactions, setTransactions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEarnings = async () => {
      setLoading(true);
      try {
        if (businessType === 'sports') {
          const { data: bookings } = await supabase
            .from('sports_bookings')
            .select('*')
            .order('created_at', { ascending: false });

          if (bookings) {
            setTransactions(bookings);
          }
        } else {
          const { data: bookings } = await supabase
            .from('event_bookings')
            .select('*')
            .order('created_at', { ascending: false });

          if (bookings) {
            setTransactions(bookings);
          }
        }
      } catch (err) {
        console.error('Error fetching earnings:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchEarnings();
  }, [businessType, vendor]);

  const grossSales = transactions.reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);
  const platformFee = Math.round(grossSales * 0.05);
  const netPayout = grossSales - platformFee;
  const pendingSettlement = transactions
    .filter(t => t.status?.toLowerCase() === 'confirmed')
    .reduce((sum, t) => sum + (parseFloat(t.total_amount) || 0), 0);

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Revenue & Financials" />

        <main className="flex-1 p-4 md:p-8 max-w-7xl mx-auto w-full space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h2 className="text-2xl font-black text-slate-900">Earnings Analytics</h2>
              <p className="text-xs text-slate-500 mt-1">Track payouts, customer volume and net revenue.</p>
            </div>
            <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-slate-200 text-xs shadow-xs">
              {(['WEEK', 'MONTH', 'YEAR'] as const).map((r) => (
                <button
                  key={r}
                  onClick={() => setTimeRange(r)}
                  className={`px-3 py-1.5 rounded-lg font-bold transition-all cursor-pointer ${
                    timeRange === r ? 'bg-orange-600 text-white shadow-xs' : 'text-slate-600 hover:text-slate-900'
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          {/* Highlights */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Gross Booking Sales</span>
              <p className="text-3xl font-black text-slate-900">{formatCurrency(grossSales)}</p>
              <span className="text-xs text-emerald-600 font-bold flex items-center gap-0.5">
                <ArrowUpRight className="w-3.5 h-3.5" /> Real-time
              </span>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Net Partner Payout</span>
              <p className="text-3xl font-black text-emerald-600">{formatCurrency(netPayout)}</p>
              <span className="text-xs text-slate-500 font-medium">After 5% platform fee</span>
            </div>

            <div className="p-6 rounded-3xl bg-white border border-slate-200 space-y-2 shadow-xs">
              <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">Pending Settlement</span>
              <p className="text-3xl font-black text-orange-600">{formatCurrency(pendingSettlement)}</p>
              <span className="text-xs text-slate-500 font-medium">Auto-settled to linked bank</span>
            </div>
          </div>

          {/* Transactions Breakdown */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
            <h3 className="text-lg font-bold text-slate-900">Itemized Payout History</h3>
            
            {loading ? (
              <div className="py-12 flex justify-center">
                <Loader2 className="w-6 h-6 animate-spin text-orange-600" />
              </div>
            ) : transactions.length === 0 ? (
              <div className="text-center py-12 border border-dashed border-slate-200 rounded-2xl bg-slate-50">
                <p className="text-3xl mb-2">💰</p>
                <h4 className="text-sm font-bold text-slate-800">No earnings recorded yet</h4>
                <p className="text-xs text-slate-500 max-w-sm mx-auto mt-1">
                  Once customers book your sports turfs or buy event tickets, your itemized payouts and invoices will appear here.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {transactions.map((tx) => {
                  const amt = parseFloat(tx.total_amount) || 0;
                  const fee = Math.round(amt * 0.05);
                  const net = amt - fee;

                  return (
                    <div
                      key={tx.id}
                      className="flex flex-col sm:flex-row sm:items-center justify-between p-4 rounded-2xl bg-slate-50/70 border border-slate-200 gap-3 hover:bg-slate-50 transition-colors"
                    >
                      <div>
                        <h4 className="font-bold text-sm text-slate-900">
                          {tx.user_name ? `${tx.user_name} - ` : ''}
                          {businessType === 'sports' ? 'Sports Slot Booking' : 'Event Ticket Booking'}
                        </h4>
                        <p className="text-xs text-slate-500 font-mono mt-0.5">
                          #{tx.id.substring(0, 8)} • {tx.booking_date || tx.created_at?.substring(0, 10) || 'Recent'}
                        </p>
                      </div>

                      <div className="flex items-center justify-between sm:justify-end gap-6 text-xs">
                        <div>
                          <span className="text-slate-600 block">Gross: ₹{amt}</span>
                          <span className="text-slate-400">Fee: -₹{fee}</span>
                        </div>
                        <div className="text-right">
                          <span className="text-base font-black text-emerald-600 block">₹{net}</span>
                          <span className="text-[10px] font-bold text-emerald-700 uppercase bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200 inline-block mt-0.5">
                            {tx.status || 'Settled'}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
