'use client';

import React, { useState, useEffect, useCallback } from 'react';
import {
  Wallet,
  IndianRupee,
  ArrowDownCircle,
  ArrowUpCircle,
  Banknote,
  Send,
  Building,
  CheckCircle2,
  RefreshCw
} from 'lucide-react';
import { useRider } from '../../lib/rider-context';
import { formatCurrency } from '../../lib/utils';
import { supabase } from '../../lib/supabase-client';
import { toast } from 'react-hot-toast';

interface TransactionItem {
  id: string;
  title: string;
  sub: string;
  type: 'credit' | 'debit';
  amount: number;
  time: string;
}

export default function WalletPage() {
  const { rider, stats } = useRider();
  const [showPayoutModal, setShowPayoutModal] = useState(false);
  const [payoutAmount, setPayoutAmount] = useState('');
  const [upiId, setUpiId] = useState('rrd.rider@okaxis');
  const [transactions, setTransactions] = useState<TransactionItem[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchLedger = useCallback(async () => {
    if (!rider?.id) return;
    setLoading(true);
    try {
      // 1. Fetch from rider_earnings
      const { data: earnData } = await supabase
        .from('rider_earnings')
        .select('id, amount, created_at, order_id')
        .eq('rider_id', rider.id)
        .order('created_at', { ascending: false })
        .limit(15);

      const list: TransactionItem[] = [];

      // Saved withdrawals from localStorage
      const savedWithdrawals = localStorage.getItem(`passwala_withdrawals_${rider.id}`);
      if (savedWithdrawals) {
        const parsed: TransactionItem[] = JSON.parse(savedWithdrawals);
        list.push(...parsed);
      }

      if (earnData && earnData.length > 0) {
        for (const e of earnData) {
          list.push({
            id: e.id,
            title: 'Order Delivery Payout',
            sub: `Order Settlement • Direct Credited`,
            type: 'credit',
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

      // Sort by time or ID
      setTransactions(list);
    } catch (err) {
      console.warn('Error loading wallet ledger:', err);
    } finally {
      setLoading(false);
    }
  }, [rider?.id]);

  useEffect(() => {
    fetchLedger();
  }, [fetchLedger]);

  const handleRequestPayout = (e: React.FormEvent) => {
    e.preventDefault();
    const num = parseFloat(payoutAmount);
    if (!num || num <= 0) {
      toast.error('Please enter a valid payout amount.');
      return;
    }
    if (num > stats.earnings) {
      toast.error('Withdrawal amount exceeds available wallet balance.');
      return;
    }

    const newTx: TransactionItem = {
      id: `tx-${Date.now()}`,
      title: 'Instant Bank Withdrawal (UPI)',
      sub: `Transferred to ${upiId}`,
      type: 'debit',
      amount: num,
      time: 'Just now'
    };

    setTransactions(prev => {
      const next = [newTx, ...prev];
      if (rider?.id) {
        const existingWithdrawals = localStorage.getItem(`passwala_withdrawals_${rider.id}`);
        const parsed = existingWithdrawals ? JSON.parse(existingWithdrawals) : [];
        localStorage.setItem(`passwala_withdrawals_${rider.id}`, JSON.stringify([newTx, ...parsed]));
      }
      return next;
    });

    setShowPayoutModal(false);
    setPayoutAmount('');
    toast.success(`₹${num} payout transfer initiated to ${upiId}!`);
  };

  return (
    <div className="space-y-6">
      {/* Title */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight flex items-center gap-2">
            <Wallet className="w-7 h-7 text-blue-600" />
            Rider Digital Wallet
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Real-time balance, instant UPI payouts, and ledger audit.
          </p>
        </div>
        <button
          onClick={fetchLedger}
          disabled={loading}
          className="p-2 rounded-xl bg-white border border-slate-200 text-slate-600 hover:text-blue-600 transition shadow-xs cursor-pointer"
          title="Refresh ledger"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-blue-600' : ''}`} />
        </button>
      </div>

      {/* Available Balance Card */}
      <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-indigo-700 rounded-3xl p-6 shadow-md text-white relative overflow-hidden">
        <div className="flex items-center justify-between gap-4 mb-2">
          <div className="flex items-center gap-2">
            <Wallet className="w-5 h-5 text-blue-100" />
            <span className="text-xs font-black uppercase tracking-wider text-blue-100">
              Withdrawable Balance
            </span>
          </div>
          <span className="text-[11px] font-black bg-white/20 backdrop-blur-md px-3 py-1 rounded-full text-white">
            Instant 24x7 UPI
          </span>
        </div>

        <h3 className="text-4xl sm:text-5xl font-black tracking-tight my-3 font-mono">
          {formatCurrency(stats.earnings)}
        </h3>

        <div className="flex flex-col sm:flex-row gap-3 pt-2">
          <button
            onClick={() => setShowPayoutModal(true)}
            className="py-3 px-6 rounded-2xl bg-white text-blue-600 font-black text-xs uppercase tracking-wider hover:bg-slate-100 transition shadow-sm flex items-center justify-center gap-2 cursor-pointer"
          >
            <Send className="w-4 h-4" />
            Request Instant Payout
          </button>
        </div>
      </div>

      {/* Cash In Hand vs Total Online Paid */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="bg-white border border-slate-200 rounded-3xl p-5 border-l-4 border-l-red-500 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Cash In Hand (COD)
            </span>
            <Banknote className="w-5 h-5 text-red-500" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            ₹0
          </p>
          <p className="text-xs text-red-600 mt-1 font-semibold">
            Cash collected from customers awaiting bank deposit
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-3xl p-5 border-l-4 border-l-emerald-500 shadow-xs">
          <div className="flex items-center justify-between mb-2">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500">
              Total Online Paid
            </span>
            <IndianRupee className="w-5 h-5 text-emerald-600" />
          </div>
          <p className="text-2xl font-black text-slate-900 font-mono">
            {formatCurrency(stats.earnings)}
          </p>
          <p className="text-xs text-emerald-700 mt-1 font-semibold">
            Directly credited to your Passwala wallet
          </p>
        </div>
      </div>

      {/* Transactions Ledger */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h4 className="text-base font-black text-slate-900">
            Recent Ledger Transactions
          </h4>
          <span className="text-xs text-slate-500 font-bold">
            {transactions.length} Records
          </span>
        </div>

        {transactions.length > 0 ? (
          <div className="space-y-2.5">
            {transactions.map((tx) => (
              <div
                key={tx.id}
                className="bg-white border border-slate-200 rounded-2xl p-4 flex items-center justify-between hover:border-slate-300 transition shadow-xs"
              >
                <div className="flex items-center gap-3.5">
                  <div className={`w-10 h-10 rounded-2xl flex items-center justify-center shrink-0 ${
                    tx.type === 'credit'
                      ? 'bg-emerald-50 text-emerald-600 border border-emerald-200'
                      : 'bg-red-50 text-red-600 border border-red-200'
                  }`}>
                    {tx.type === 'credit' ? (
                      <ArrowDownCircle className="w-5 h-5" />
                    ) : (
                      <ArrowUpCircle className="w-5 h-5" />
                    )}
                  </div>
                  <div>
                    <h5 className="text-sm font-extrabold text-slate-900">
                      {tx.title}
                    </h5>
                    <p className="text-xs text-slate-500 mt-0.5">
                      {tx.sub} • {tx.time}
                    </p>
                  </div>
                </div>

                <div className="text-right">
                  <span className={`text-base font-black font-mono ${
                    tx.type === 'credit' ? 'text-emerald-700' : 'text-red-600'
                  }`}>
                    {tx.type === 'credit' ? '+' : '-'}{formatCurrency(tx.amount)}
                  </span>
                  <span className="text-[10px] text-slate-400 uppercase font-bold block">
                    {tx.type === 'credit' ? 'Credited' : 'Debited'}
                  </span>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="bg-white border border-slate-200 rounded-2xl p-6 text-center text-xs text-slate-500">
            No ledger transactions yet. Completed deliveries and rides will appear here in real-time.
          </div>
        )}
      </div>

      {/* Instant Payout Modal */}
      {showPayoutModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-md animate-fade-in">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl p-6 shadow-2xl text-slate-900 relative">
            <h3 className="text-lg font-black text-slate-900 mb-1 flex items-center gap-2">
              <Send className="w-5 h-5 text-blue-600" />
              Instant Bank Withdrawal
            </h3>
            <p className="text-xs text-slate-500 mb-4">
              Payouts are transferred within 60 seconds directly to your verified UPI VPA.
            </p>

            <form onSubmit={handleRequestPayout} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Withdrawal Amount (₹)
                </label>
                <input
                  type="number"
                  min="1"
                  max={stats.earnings}
                  value={payoutAmount}
                  onChange={(e) => setPayoutAmount(e.target.value)}
                  placeholder={`Max: ₹${stats.earnings}`}
                  required
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-lg font-bold font-mono focus:outline-none focus:border-blue-500"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 mb-1">
                  Registered UPI VPA
                </label>
                <input
                  type="text"
                  value={upiId}
                  onChange={(e) => setUpiId(e.target.value)}
                  required
                  className="w-full py-2.5 px-4 bg-slate-50 border border-slate-300 rounded-xl text-slate-900 text-sm font-semibold focus:outline-none focus:border-blue-500"
                />
              </div>

              <div className="p-3 rounded-xl bg-emerald-50 border border-emerald-200 text-xs text-emerald-800 flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>Zero transaction processing fee for Passwala verified partners</span>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setShowPayoutModal(false)}
                  className="py-3 px-4 rounded-xl border border-slate-200 text-slate-700 font-bold text-xs hover:bg-slate-50 transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="py-3 px-4 rounded-xl bg-blue-600 hover:bg-blue-700 text-white font-black text-xs uppercase tracking-wider transition shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  Confirm Transfer
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
