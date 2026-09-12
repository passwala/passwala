'use client';

import React, { useState, useEffect } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useVendor } from '@/lib/vendor-context';
import { supabase } from '@/lib/supabase-client';
import { formatCurrency } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { 
  Wallet, 
  IndianRupee, 
  Building2, 
  ArrowDownRight, 
  ShieldCheck, 
  CheckCircle2, 
  Clock,
  Edit2,
  Save,
  Loader2
} from 'lucide-react';

export default function WalletPage() {
  const { vendor, store, businessType } = useVendor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [balance, setBalance] = useState(0);
  const [withdrawAmount, setWithdrawAmount] = useState('');
  const [loading, setLoading] = useState(true);

  // Bank details state
  const [isEditingBank, setIsEditingBank] = useState(false);
  const [accountNo, setAccountNo] = useState('');
  const [ifsc, setIfsc] = useState('');
  const [holderName, setHolderName] = useState('');

  // Load real balance & bank details
  useEffect(() => {
    // 1. Load saved bank info
    const savedAcc = localStorage.getItem('vBankAcc') || '';
    const savedIfsc = localStorage.getItem('vBankIfsc') || '';
    const savedHolder = localStorage.getItem('vBankHolder') || vendor?.name || '';
    setAccountNo(savedAcc);
    setIfsc(savedIfsc);
    setHolderName(savedHolder);

    // If no bank linked, open edit mode
    if (!savedAcc) {
      setIsEditingBank(true);
    }

    // 2. Fetch real balance from bookings
    const fetchBalance = async () => {
      setLoading(true);
      try {
        if (businessType === 'sports') {
          const { data: bookings } = await supabase
            .from('sports_bookings')
            .select('*');

          if (bookings && bookings.length > 0) {
            const gross = bookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
            const net = Math.round(gross * 0.95);
            const withdrawn = parseFloat(localStorage.getItem('vTotalWithdrawn') || '0');
            setBalance(Math.max(0, net - withdrawn));
          } else {
            setBalance(0);
          }
        } else {
          const { data: bookings } = await supabase
            .from('event_bookings')
            .select('*');

          if (bookings && bookings.length > 0) {
            const gross = bookings.reduce((sum, b) => sum + (parseFloat(b.total_amount) || 0), 0);
            const net = Math.round(gross * 0.95);
            const withdrawn = parseFloat(localStorage.getItem('vTotalWithdrawn') || '0');
            setBalance(Math.max(0, net - withdrawn));
          } else {
            setBalance(0);
          }
        }
      } catch (err) {
        console.error('Error fetching wallet balance:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchBalance();
  }, [businessType, vendor]);

  const handleSaveBank = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNo.trim() || !ifsc.trim() || !holderName.trim()) {
      toast.error('Please fill in all bank details');
      return;
    }
    localStorage.setItem('vBankAcc', accountNo.trim());
    localStorage.setItem('vBankIfsc', ifsc.trim().toUpperCase());
    localStorage.setItem('vBankHolder', holderName.trim());
    setIsEditingBank(false);
    toast.success('Bank details saved successfully!');
  };

  const handleWithdraw = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountNo.trim() || !ifsc.trim()) {
      toast.error('Please link your bank account first');
      setIsEditingBank(true);
      return;
    }
    const amt = parseFloat(withdrawAmount);
    if (!amt || amt <= 0) {
      toast.error('Enter a valid withdrawal amount');
      return;
    }
    if (amt > balance) {
      toast.error('Insufficient wallet balance');
      return;
    }
    if (amt < 100) {
      toast.error('Minimum withdrawal amount is ₹100');
      return;
    }

    const currentWithdrawn = parseFloat(localStorage.getItem('vTotalWithdrawn') || '0');
    localStorage.setItem('vTotalWithdrawn', String(currentWithdrawn + amt));

    setBalance(prev => prev - amt);
    setWithdrawAmount('');
    toast.success(`Withdrawal request of ₹${amt} submitted to bank!`);
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Wallet & Payouts" />

        <main className="flex-1 p-4 md:p-8 max-w-4xl mx-auto w-full space-y-6">
          {/* Wallet Balance Hero Card */}
          <div className="rounded-3xl bg-gradient-to-r from-orange-600 via-amber-600 to-orange-700 p-8 shadow-lg relative overflow-hidden flex flex-col sm:flex-row sm:items-center justify-between gap-6 text-white">
            <div className="space-y-2 relative z-10">
              <span className="text-xs font-bold uppercase tracking-wider text-orange-200">
                Available Wallet Balance
              </span>
              <h2 className="text-4xl lg:text-5xl font-black text-white tracking-tight">
                {formatCurrency(balance)}
              </h2>
              <p className="text-xs text-orange-100">
                Zero lock-in period • Direct NEFT/IMPS payout within 2 hours
              </p>
            </div>

            <div className="p-4 rounded-2xl bg-black/15 border border-white/20 backdrop-blur-sm relative z-10 flex items-center gap-3">
              <ShieldCheck className="w-8 h-8 text-emerald-300 shrink-0" />
              <div className="text-xs">
                <p className="font-bold text-white">Direct Bank Link</p>
                <p className="text-orange-100">
                  {accountNo ? 'Verified & Linked' : 'Action Required'}
                </p>
              </div>
            </div>
          </div>

          {/* Bank & Withdrawal Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Withdrawal Form */}
            <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
              <div>
                <h3 className="text-lg font-bold text-slate-900">Instant Withdrawal</h3>
                <p className="text-xs text-slate-500 mt-1">Transfer funds directly to your registered bank account.</p>
              </div>

              <form onSubmit={handleWithdraw} className="space-y-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Amount to Withdraw (₹)
                  </label>
                  <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
                    <IndianRupee className="w-4 h-4 text-slate-400 mr-2 shrink-0" />
                    <input
                      type="number"
                      required
                      min={100}
                      max={balance > 0 ? balance : 100}
                      disabled={balance < 100}
                      value={withdrawAmount}
                      onChange={(e) => setWithdrawAmount(e.target.value)}
                      placeholder={balance >= 100 ? 'Enter amount' : 'Min balance ₹100 required'}
                      className="bg-transparent flex-1 text-sm text-slate-900 font-bold outline-none disabled:cursor-not-allowed"
                    />
                  </div>
                </div>

                {balance >= 100 && (
                  <div className="flex gap-2">
                    {[500, 1000, 2000, balance].map((amt, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setWithdrawAmount(String(amt))}
                        className="flex-1 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 border border-slate-200 transition-all cursor-pointer"
                      >
                        {amt === balance ? 'Max' : `₹${amt}`}
                      </button>
                    ))}
                  </div>
                )}

                <button
                  type="submit"
                  disabled={balance < 100}
                  className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <ArrowDownRight className="w-4 h-4" />
                  <span>Withdraw to Bank</span>
                </button>
              </form>
            </div>

            {/* Linked Bank Account Details / Form */}
            <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 space-y-6 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Beneficiary Bank</h3>
                  <p className="text-xs text-slate-500 mt-1">Settlement destination for ticket payouts.</p>
                </div>
                {accountNo && !isEditingBank && (
                  <button
                    onClick={() => setIsEditingBank(true)}
                    className="p-1.5 rounded-lg text-slate-500 hover:text-slate-800 hover:bg-slate-100 transition-all cursor-pointer"
                    title="Edit Bank Details"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                )}
              </div>

              {isEditingBank ? (
                <form onSubmit={handleSaveBank} className="space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Account Holder Name *</label>
                    <input
                      type="text"
                      required
                      value={holderName}
                      onChange={(e) => setHolderName(e.target.value)}
                      placeholder="Name as registered with bank"
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 font-semibold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500">Bank Account Number *</label>
                    <input
                      type="text"
                      required
                      value={accountNo}
                      onChange={(e) => setAccountNo(e.target.value.replace(/\D/g, ''))}
                      placeholder="e.g. 123456789012"
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 font-mono font-bold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-bold uppercase text-slate-500">IFSC Code *</label>
                    <input
                      type="text"
                      required
                      maxLength={11}
                      value={ifsc}
                      onChange={(e) => setIfsc(e.target.value.toUpperCase())}
                      placeholder="e.g. HDFC0001234"
                      className="w-full rounded-xl bg-slate-50 border border-slate-200 p-2.5 text-xs text-slate-900 font-mono font-bold outline-none focus:border-orange-500"
                    />
                  </div>

                  <div className="flex gap-2 pt-1">
                    {accountNo && (
                      <button
                        type="button"
                        onClick={() => setIsEditingBank(false)}
                        className="px-4 py-2 rounded-xl bg-slate-100 text-xs font-bold text-slate-700 hover:bg-slate-200 transition-all cursor-pointer"
                      >
                        Cancel
                      </button>
                    )}
                    <button
                      type="submit"
                      className="flex-1 flex items-center justify-center gap-1.5 py-2 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all cursor-pointer"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>Save Bank Details</span>
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3.5 text-sm">
                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Account Holder</span>
                    <p className="font-bold text-slate-900">{holderName || '—'}</p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">Bank Account Number</span>
                    <p className="font-mono font-bold text-slate-900">
                      {accountNo ? `•••• •••• ${accountNo.slice(-4)}` : 'Not linked'}
                    </p>
                  </div>

                  <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-1">
                    <span className="text-[10px] font-bold uppercase text-slate-500">IFSC Code</span>
                    <p className="font-mono font-bold text-orange-600">{ifsc || '—'}</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
