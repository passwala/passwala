'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useVendor } from '@/lib/vendor-context';
import { toast } from 'react-hot-toast';
import { 
  Phone, 
  MessageSquare, 
  ArrowRight, 
  ShieldCheck, 
  Sparkles, 
  Trophy, 
  Ticket, 
  Store, 
  CheckCircle2, 
  Loader2 
} from 'lucide-react';

export default function VendorLoginPage() {
  const router = useRouter();
  const { login } = useVendor();

  const [phone, setPhone] = useState('');
  const [otpVal, setOtpVal] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [loading, setLoading] = useState(false);

  const cleanPhone = phone.replace(/\D/g, '');

  const handleSendOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (cleanPhone.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number');
      return;
    }

    setLoading(true);
    try {
      const BASE_API = 'http://127.0.0.1:3004';
      const res = await fetch(`${BASE_API}/api/users/send-whatsapp-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setStep('OTP');
        if (data.provider === 'mock' && data.otp) {
          toast.success(`[MOCK OTP]: ${data.otp}`, { duration: 8000 });
        } else {
          toast.success('OTP sent successfully on WhatsApp!');
        }
      } else {
        toast.error(data.error || 'Failed to send OTP. Please try again.');
      }
    } catch {
      toast.error('Network error. Failed to reach server.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOtp = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (otpVal.length !== 6) {
      toast.error('Please enter the 6-digit OTP');
      return;
    }

    setLoading(true);
    try {
      const BASE_API = 'http://127.0.0.1:3004';
      const res = await fetch(`${BASE_API}/api/users/verify-whatsapp-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: cleanPhone, otp: otpVal, role: 'VENDOR' })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('Welcome to Passwala Partner Suite!');
        await login(cleanPhone, data.user);
        router.replace('/dashboard');
      } else {
        toast.error(data.error || 'Invalid OTP code');
      }
    } catch {
      toast.error('Verification failed. Check network connection.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col md:flex-row bg-zinc-950 text-white selection:bg-orange-500 selection:text-white">
      {/* Left Form Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 md:p-14 lg:p-20 z-10 max-w-xl mx-auto w-full">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-zinc-900 border border-zinc-800 p-2 flex items-center justify-center shadow-lg">
            <img src="/logo.png" alt="Passwala Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-white">Passwala</span>
              <span className="text-[10px] font-black uppercase tracking-widest px-2 py-0.5 rounded-full bg-orange-500/20 text-orange-400 border border-orange-500/30">
                Partner
              </span>
            </div>
            <p className="text-xs text-zinc-500 font-medium">Business Suite</p>
          </div>
        </div>

        {/* Main Form Area */}
        <div className="my-10 space-y-8">
          <div>
            <h1 className="text-3xl lg:text-4xl font-extrabold tracking-tight text-white leading-tight">
              {step === 'PHONE' ? 'Grow your business with Passwala' : 'Verify your mobile number'}
            </h1>
            <p className="text-sm text-zinc-400 mt-2">
              {step === 'PHONE' 
                ? 'Sign in with your WhatsApp number to manage venues, events, orders, and payouts.'
                : `Enter the 6-digit OTP code sent to +91 ${cleanPhone}`
              }
            </p>
          </div>

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  WhatsApp Number
                </label>
                <div className="flex items-center rounded-2xl bg-zinc-900/90 border border-zinc-800 focus-within:border-orange-500 focus-within:ring-2 focus-within:ring-orange-500/20 transition-all p-1">
                  <span className="px-4 text-sm font-bold text-zinc-400 border-r border-zinc-800 flex items-center gap-1.5">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit mobile number"
                    className="flex-1 bg-transparent px-4 py-3 text-sm text-white placeholder:text-zinc-600 outline-none"
                    autoFocus
                  />
                  <Phone className="w-4 h-4 text-zinc-600 mr-4" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cleanPhone.length !== 10}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
              >
                {loading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <>
                    <MessageSquare className="w-4 h-4" />
                    <span>Continue with WhatsApp</span>
                    <ArrowRight className="w-4 h-4 ml-1" />
                  </>
                )}
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div className="space-y-2">
                <label className="text-xs font-semibold text-zinc-300 uppercase tracking-wider">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpVal}
                  onChange={(e) => setOtpVal(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3 rounded-2xl bg-zinc-900 border border-zinc-800 text-white focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20 outline-none transition-all"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpVal.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Open Dashboard'}
              </button>

              <div className="flex items-center justify-between text-xs text-zinc-400 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="hover:text-white transition-colors cursor-pointer"
                >
                  ← Change Number
                </button>
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  className="text-orange-400 hover:text-orange-300 transition-colors cursor-pointer font-medium"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}
        </div>

        {/* Security Footer Note */}
        <div className="flex items-center gap-2 text-xs text-zinc-500">
          <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
          <span>Secured with RBI compliant 256-bit encryption & OTP verification.</span>
        </div>
      </div>

      {/* Right Perks & Showcase Panel */}
      <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-zinc-900 via-zinc-950 to-black p-12 lg:p-20 flex-col justify-between border-l border-zinc-800/60 overflow-hidden">
        {/* Glow circles */}
        <div className="absolute -top-20 -right-20 w-96 h-96 bg-orange-600/10 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-20 -left-20 w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex justify-end">
          <span className="flex items-center gap-2 text-xs text-zinc-400 bg-zinc-900/80 px-3 py-1.5 rounded-full border border-zinc-800">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Ecosystem • Port 3002
          </span>
        </div>

        <div className="relative z-10 max-w-md space-y-8 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-500/10 border border-orange-500/20 text-orange-400 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5" />
            All-In-One Merchant Platform
          </div>

          <h2 className="text-3xl lg:text-4xl font-black text-white leading-tight">
            One powerful suite for sports turfs, event creators & merchants.
          </h2>

          <div className="space-y-4">
            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-xl bg-blue-500/10 text-blue-400 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Sports Turf & Court Booking</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Automated hourly slot scheduling, box cricket, turf, badminton & instant client reminders.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Event Ticketing & Check-In</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Tiered pricing, VIP passes, multi-date shows, and built-in QR camera scanner for zero duplicate entries.</p>
              </div>
            </div>

            <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-zinc-900/60 border border-zinc-800/80 backdrop-blur-sm">
              <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-white">Direct Settlements & Growth</h4>
                <p className="text-xs text-zinc-400 mt-0.5">Daily bank payouts, zero hidden deductions, transparent GST invoices, and comprehensive analytics.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-zinc-500 border-t border-zinc-900 pt-6">
          <span>© 2026 Passwala Technologies</span>
          <span className="flex items-center gap-1 text-zinc-400">
            <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
            Verified Partner Portal
          </span>
        </div>
      </div>
    </div>
  );
}
