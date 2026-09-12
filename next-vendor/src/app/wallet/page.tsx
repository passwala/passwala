'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { 
  Wallet, 
  IndianRupee, 
  Building2, 
  ArrowDownRight, 
  ShieldCheck, 
  CheckCircle2, 
  Clock 
} from 'lucide-react';

export default function WalletPage() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance, setBalance] = useState(14500);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [accountNo, setAccountNo] = useState('91201004829104');
  const [ifsc, setIfsc] = useState('HDFC0000123');
  const [holderName, setHolderName] = useState('Passwala Partner');
  const [withdrawSuccess, setWithdrawSuccess] = useState(false);

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid withdrawal amount');
      return;
    }
    if (amt > balance) {
      toast.error('Insufficient wallet balance');
      return;
    }

    setBalance(prev => prev - amt);
    setWithdrawAmount('');
    setWithdrawSuccess(true);
    toast.success(`Withdrawal request of ₹${amt} submitted to bank!`);
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-orange-500">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Wallet & Payouts" />

        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Wallet Balance Hero Card */}
          <div className="rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-8 shadow-2xl relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6">
            <div className="space-y-2 relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-200">
                Available Wallet Balance
              </span>
              <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                {formatCurrency(balance)}
              </h2>
              <p className="text-xs text-orange-100/80">
                Zero lock-in period • Direct NEFT/IMPS payout within 2 hours
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/20 border border-white/10 backdrop-blur-sm relative z-10 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-300 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white">Direct Bank Link</p>
                <p className="text-orange-100/80">Verified & Auto-settled</p>
              </div>
            </div>
          </div>

          {/* Bank & Withdrawal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Withdrawal Form */}
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 md:p-8 space-y-6">
              <div>
                <h3 className="text-lg font-bold text-white">Instant Withdrawal</h3>
                <p className="text-xs text-zinc-400 mt-1">Transfer funds directly to your registered bank account.</p>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                    Amount to Withdraw (₹)
                  </label>
                  <div className="flex items-center rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 focus-within:border-orange-500">
                    <IndianRupee className="w-4 h-4 text-zinc-500 mr-2 shrink-0" />
                    <input
                      type="number"
                      required
                      min={100}
                      max={balance}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder="e.g. 5000"
                      className="bg-transparent flex-1 text-sm text-white font-bold outline-none"
                    />
                  </div>
                </div>

                <div className="flex gap-2">
                  {[1000, 2500, 5000, balance].map((amt, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setWithdrawAmount(String(amt))}
                      className="flex-1 py-1.5 rounded-xl bg-zinc-800 text-[11px] font-bold text-zinc-300 hover:text-white hover:bg-zinc-700 transition-all cursor-pointer"
                    >
                      {amt === balance ? 'Max' : `₹${amt}`}
                    </button>
                  ))}
                </div>

                <button
                  type="submit"
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-500 hover:bg-orange-600 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all cursor-pointer"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Withdraw to Bank</span>
                </button>
              </form>
            </div>

            {/* Linked Bank Account Details */}
            <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 md:p-8 space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white">Beneficiary Bank</h3>
                  <p className="text-xs text-zinc-400 mt-1">Settlement destination for ticket payouts.</p>
                </div>
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Verified
                </span>
              </div>

              <div className="space-y-4 text-sm">
                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">Account Holder</span>
                  <p className="font-bold text-white">{holderName}</p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">Bank Account Number</span>
                  <p className="font-mono font-bold text-white">{accountNo}</p>
                </div>

                <div className="p-4 rounded-2xl bg-zinc-950 border border-zinc-800 space-y-1">
                  <span className="text-[10px] font-bold uppercase text-zinc-500">IFSC Code</span>
                  <p className="font-mono font-bold text-orange-400">{ifsc}</p>
                </div>
              </div>
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
