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
  Loader2,
  Lock
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
        toast.success(data.otp ? `OTP sent: ${data.otp}` : 'OTP sent successfully on WhatsApp!');
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
    <div className="min-h-screen flex flex-col md:flex-row bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      {/* Left Form Panel */}
      <div className="flex-1 flex flex-col justify-between p-6 sm:p-10 md:p-14 lg:p-20 z-10 max-w-xl mx-auto w-full">
        {/* Brand Header */}
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-white border border-slate-200 p-2 flex items-center justify-center shadow-sm">
            <img src="/logo.png" alt="Passwala Logo" className="w-full h-full object-contain" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xl font-black tracking-tight text-slate-900">Passwala</span>
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-orange-100 text-orange-600 border border-orange-200">
                Partner
              </span>
            </div>
            <p className="text-xs text-slate-500 font-medium">Business Suite • Port 3002</p>
          </div>
        </div>

        {/* Main Form Box */}
        <div className="my-8 sm:my-10 bg-white rounded-3xl p-6 sm:p-10 border border-slate-200/80 shadow-xl shadow-slate-200/40 space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-black tracking-tight text-slate-900 leading-tight">
              {step === 'PHONE' ? 'Grow your business with Passwala' : 'Verify your number'}
            </h1>
            <p className="text-sm text-slate-600 mt-2 leading-relaxed">
              {step === 'PHONE' 
                ? 'Sign in with your WhatsApp number to manage venues, events, orders, and payouts.'
                : `Enter the 6-digit OTP code sent to +91 ${cleanPhone}`
              }
            </p>
          </div>

          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider flex items-center gap-1.5">
                  <span>WhatsApp Mobile Number</span>
                </label>
                <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 hover:border-slate-300 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all p-1">
                  <span className="px-3.5 text-sm font-bold text-slate-700 border-r border-slate-200 flex items-center gap-1.5">
                    🇮🇳 +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    placeholder="Enter 10-digit number"
                    className="flex-1 bg-transparent px-3 py-2.5 text-slate-900 font-semibold text-sm placeholder:text-slate-400 outline-none"
                    autoFocus
                  />
                  <Phone className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || cleanPhone.length !== 10}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-bold text-sm shadow-lg shadow-emerald-600/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
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
            <form onSubmit={handleVerifyOtp} className="space-y-5">
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  6-Digit OTP Code
                </label>
                <input
                  type="text"
                  maxLength={6}
                  value={otpVal}
                  onChange={(e) => setOtpVal(e.target.value.replace(/\D/g, ''))}
                  placeholder="000000"
                  className="w-full text-center text-2xl tracking-[0.5em] font-mono py-3.5 rounded-2xl bg-slate-50 border-2 border-slate-200 focus:bg-white text-slate-900 focus:border-orange-500 focus:ring-4 focus:ring-orange-500/10 outline-none transition-all font-bold"
                  autoFocus
                />
              </div>

              <button
                type="submit"
                disabled={loading || otpVal.length !== 6}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-lg shadow-orange-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Open Dashboard'}
              </button>

              <div className="flex items-center justify-between text-xs text-slate-500 pt-2">
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="hover:text-slate-900 transition-colors cursor-pointer font-medium"
                >
                  ← Change Number
                </button>
                <button
                  type="button"
                  onClick={() => handleSendOtp()}
                  className="text-orange-600 hover:text-orange-700 transition-colors cursor-pointer font-bold"
                >
                  Resend OTP
                </button>
              </div>
            </form>
          )}

          <div className="text-[11px] text-slate-500 text-center leading-relaxed">
            By continuing, you agree to Passwala&apos;s Partner Terms of Service and Privacy Policy.
          </div>
        </div>

        {/* Security Footer Note */}
        <div className="flex items-center gap-2 text-xs text-slate-500 justify-center sm:justify-start">
          <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <span>Secured with RBI compliant 256-bit encryption & OTP verification.</span>
        </div>
      </div>

      {/* Right Perks & Showcase Panel */}
      <div className="hidden md:flex flex-1 relative bg-gradient-to-br from-orange-50/70 via-slate-50 to-amber-50/50 p-10 lg:p-16 flex-col justify-between border-l border-slate-200/80 overflow-hidden">
        {/* Subtle decorative circles */}
        <div className="absolute -top-24 -right-24 w-96 h-96 bg-orange-200/30 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-24 -left-24 w-96 h-96 bg-amber-200/30 rounded-full blur-3xl pointer-events-none" />

        <div className="relative z-10 flex justify-end">
          <span className="flex items-center gap-2 text-xs text-slate-700 bg-white/90 backdrop-blur-sm px-3.5 py-1.5 rounded-full border border-slate-200 shadow-xs font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Ecosystem • Port 3002
          </span>
        </div>

        <div className="relative z-10 max-w-md space-y-6 my-auto">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-orange-100 border border-orange-200 text-orange-700 text-xs font-bold">
            <Sparkles className="w-3.5 h-3.5 text-orange-600" />
            All-In-One Merchant Platform
          </div>

          <h2 className="text-3xl lg:text-4xl font-black text-slate-900 leading-tight">
            One powerful suite for sports turfs, event creators & merchants.
          </h2>

          <div className="space-y-3.5">
            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/95 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-orange-200 transition-all">
              <div className="p-2.5 rounded-xl bg-blue-50 text-blue-600 border border-blue-100 shrink-0">
                <Trophy className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Sports Turf & Court Booking</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">Automated hourly slot scheduling, box cricket, turf, badminton & instant client reminders.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/95 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-purple-200 transition-all">
              <div className="p-2.5 rounded-xl bg-purple-50 text-purple-600 border border-purple-100 shrink-0">
                <Ticket className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Event Ticketing & Check-In</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">Tiered pricing, VIP passes, multi-date shows, and built-in QR camera scanner for zero duplicate entries.</p>
              </div>
            </div>

            <div className="flex items-start gap-3.5 p-4 rounded-2xl bg-white/95 border border-slate-200/80 shadow-xs hover:shadow-md hover:border-emerald-200 transition-all">
              <div className="p-2.5 rounded-xl bg-emerald-50 text-emerald-600 border border-emerald-100 shrink-0">
                <Store className="w-5 h-5" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-slate-900">Direct Settlements & Growth</h4>
                <p className="text-xs text-slate-600 mt-1 leading-relaxed">Daily bank payouts, zero hidden deductions, transparent GST invoices, and comprehensive analytics.</p>
              </div>
            </div>
          </div>
        </div>

        <div className="relative z-10 flex items-center justify-between text-xs text-slate-500 border-t border-slate-200/80 pt-6">
          <span>© 2026 Passwala Technologies</span>
          <span className="flex items-center gap-1.5 text-slate-700 font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Verified Partner Portal
          </span>
        </div>
      </div>
    </div>
  );
}
