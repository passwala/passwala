'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Bike, Phone, Key, ArrowRight, ShieldCheck, Sparkles, Check } from 'lucide-react';
import { useRider } from '../../lib/rider-context';
import { toast } from 'react-hot-toast';

export default function LoginPage() {
  const router = useRouter();
  const { login, loginAsDemoRider } = useRider();

  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState<'PHONE' | 'OTP'>('PHONE');
  const [submitting, setSubmitting] = useState(false);

  const handleSendOtp = (e: React.FormEvent) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) {
      toast.error('Please enter a valid 10-digit mobile number.');
      return;
    }
    setStep('OTP');
    toast.success(`OTP sent to +91 ${clean}! (Demo OTP: 123456)`);
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otp.length < 4) {
      toast.error('Please enter the verification OTP.');
      return;
    }
    setSubmitting(true);
    try {
      await login(phone);
      toast.success('🎉 Welcome back, Partner!');
      router.push('/');
    } catch (err) {
      toast.error('Verification failed. Try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDemoLogin = () => {
    loginAsDemoRider();
    toast.success('Signed in as Vikram Patel (Verified Partner)!');
    router.push('/');
  };

  return (
    <div className="min-h-[75vh] flex items-center justify-center py-6">
      <div className="w-full max-w-md bg-white border border-slate-200 rounded-3xl shadow-xl overflow-hidden">
        {/* Top Orange Brand Banner (Classic Passwala Identity) */}
        <div className="bg-gradient-to-br from-orange-500 via-orange-600 to-amber-600 p-8 text-center text-white relative">
          <div className="w-16 h-16 rounded-2xl bg-white text-orange-600 flex items-center justify-center mx-auto mb-3 shadow-md">
            <Bike className="w-9 h-9" />
          </div>
          <h2 className="text-2xl font-black tracking-tight text-white">
            Pass<span className="text-amber-200">wala</span> Rider
          </h2>
          <p className="text-xs text-orange-100 mt-1 font-semibold">
            Delivery & Passenger Mobility Partner
          </p>
        </div>

        <div className="p-6 sm:p-8 space-y-6">
          {step === 'PHONE' ? (
            <form onSubmit={handleSendOtp} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">
                  Enter Mobile Number
                </label>
                <div className="relative flex items-center">
                  <span className="absolute left-4 text-sm font-extrabold text-slate-500 font-mono">
                    +91
                  </span>
                  <input
                    type="tel"
                    maxLength={10}
                    required
                    placeholder="98765 43210"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    className="w-full pl-14 pr-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-mono font-bold text-base focus:outline-none focus:border-orange-500 focus:bg-white transition"
                  />
                </div>
              </div>

              <button
                type="submit"
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm tracking-wide transition shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Continue</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </form>
          ) : (
            <form onSubmit={handleVerifyOtp} className="space-y-4">
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="text-xs font-bold text-slate-700">
                    Enter 6-Digit OTP
                  </label>
                  <button
                    type="button"
                    onClick={() => setStep('PHONE')}
                    className="text-xs text-orange-600 font-bold hover:underline"
                  >
                    Change Number
                  </button>
                </div>
                <input
                  type="text"
                  maxLength={6}
                  required
                  autoFocus
                  placeholder="• • • • • •"
                  value={otp}
                  onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                  className="w-full py-3.5 px-4 text-center tracking-[0.4em] bg-slate-50 border border-slate-200 rounded-2xl text-slate-900 font-mono font-black text-xl focus:outline-none focus:border-orange-500 focus:bg-white transition"
                />
                <p className="text-[11px] text-slate-400 text-center mt-2">
                  Testing hint: Enter <span className="text-orange-600 font-bold">123456</span> or any 6 digits
                </p>
              </div>

              <button
                type="submit"
                disabled={submitting}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-orange-600 to-amber-500 hover:from-orange-500 hover:to-amber-400 text-white font-black text-sm tracking-wide transition shadow-md shadow-orange-600/20 flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
              >
                <Check className="w-4 h-4" />
                <span>Verify & Sign In</span>
              </button>
            </form>
          )}

          {/* Instant 1-Click Demo Login */}
          <div className="pt-4 border-t border-slate-100 text-center space-y-3">
            <button
              type="button"
              onClick={handleDemoLogin}
              className="w-full py-3 px-4 rounded-2xl bg-orange-50 hover:bg-orange-100 border border-orange-200 text-orange-700 text-xs font-black transition flex items-center justify-center gap-2 cursor-pointer"
            >
              <Sparkles className="w-4 h-4 text-orange-600" />
              <span>Instant Test Login (Vikram Patel • EV Scooter)</span>
            </button>

            <p className="text-[11px] text-slate-400">
              Passwala Partner Network • Secure Cloud Verification
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
