'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAdmin } from '@/lib/admin-context';
import { ShieldCheck, Lock, ArrowRight, Sparkles } from 'lucide-react';

export default function AdminLoginPage() {
  const [accessCode, setAccessCode] = useState('');
  const [loading, setLoading] = useState(false);
  const { login, isAuthenticated } = useAdmin();
  const router = useRouter();

  useEffect(() => {
    if (isAuthenticated) {
      router.replace('/');
    }
  }, [isAuthenticated, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!accessCode.trim()) return;
    setLoading(true);
    await login(accessCode);
    setLoading(false);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-radial from-purple-900/10 via-slate-900 to-slate-950 p-4">
      <div className="relative w-full max-w-md overflow-hidden rounded-3xl border border-slate-800 bg-slate-900/90 p-8 shadow-2xl backdrop-blur-xl">
        {/* Glow Effects */}
        <div className="absolute -left-20 -top-20 h-40 w-40 rounded-full bg-purple-600/30 blur-3xl" />
        <div className="absolute -right-20 -bottom-20 h-40 w-40 rounded-full bg-orange-600/20 blur-3xl" />

        {/* Content */}
        <div className="relative z-10 flex flex-col items-center text-center">
          {/* Badge & Icon */}
          <div className="mb-6 flex h-20 w-20 items-center justify-center rounded-3xl bg-gradient-to-tr from-purple-600 to-indigo-500 p-4 text-white shadow-xl shadow-purple-600/20 ring-8 ring-purple-500/10">
            <ShieldCheck className="h-10 w-10 stroke-[1.75]" />
          </div>

          <div className="inline-flex items-center gap-1.5 rounded-full border border-purple-500/30 bg-purple-500/10 px-3 py-1 text-[11px] font-black uppercase tracking-wider text-purple-400">
            <Sparkles className="h-3 w-3" />
            <span>Passwala Operations</span>
          </div>

          <h1 className="mt-4 text-2xl font-black tracking-tight text-white sm:text-3xl">
            SuperAdmin Portal
          </h1>
          <p className="mt-2 text-xs font-medium text-slate-400 max-w-xs">
            Restricted strictly for authorized Passwala staff and systems operators.
          </p>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-8 w-full space-y-4">
            <div className="relative text-left">
              <label className="block text-[11px] font-black uppercase tracking-wider text-slate-400 mb-1.5">
                Staff Access Code
              </label>
              <div className="relative">
                <Lock className="absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-500" />
                <input
                  type="password"
                  required
                  autoFocus
                  placeholder="Enter system access code"
                  value={accessCode}
                  onChange={(e) => setAccessCode(e.target.value)}
                  className="w-full rounded-2xl border border-slate-700 bg-slate-800/80 py-3 pl-10 pr-4 text-sm font-semibold text-white placeholder:text-slate-500 focus:border-purple-500 focus:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-purple-500/20"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading || !accessCode.trim()}
              className="group flex w-full items-center justify-center gap-2 rounded-2xl bg-gradient-to-r from-purple-600 to-indigo-600 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-purple-600/25 transition-all hover:brightness-110 disabled:opacity-50 cursor-pointer"
            >
              <span>{loading ? 'Verifying Credentials...' : 'Authorize & Enter'}</span>
              <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
            </button>

            <div className="pt-2 text-center">
              <button
                type="button"
                onClick={() => setAccessCode('passwala_admin_2026')}
                className="text-[11px] font-medium text-slate-400 hover:text-purple-400 transition-colors cursor-pointer"
              >
                Auto-fill default access code (<span className="font-mono text-purple-400">passwala_admin_2026</span>)
              </button>
            </div>
          </form>

          <p className="mt-6 text-[11px] font-semibold text-slate-500">
            End-to-End Encrypted Session &bull; Port 3005
          </p>
        </div>
      </div>
    </div>
  );
}
