'use client';

import React from 'react';
import Link from 'next/link';
import { Bike, Power, Clock, ShieldCheck } from 'lucide-react';
import { useRider } from '../lib/rider-context';

export default function Header() {
  const { rider, isOnline, toggleOnlineStatus, onlineDuration } = useRider();

  return (
    <header className="sticky top-0 z-40 bg-white/95 backdrop-blur-xl border-b border-slate-200/80 px-4 py-3 sm:px-6 shadow-xs">
      <div className="max-w-7xl mx-auto flex items-center justify-between gap-4">
        {/* Rider Profile Link */}
        <Link href="/profile" className="flex items-center gap-3 group">
          <div className="relative w-11 h-11 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 p-0.5 shadow-sm group-hover:scale-105 transition">
            <div className="w-full h-full rounded-[14px] bg-white flex items-center justify-center overflow-hidden">
              <Bike className="w-6 h-6 text-blue-600" />
            </div>
            {isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-emerald-500 border-2 border-white rounded-full animate-pulse" />
            )}
          </div>

          <div>
            <div className="flex items-center gap-1.5">
              <h1 className="text-sm font-extrabold text-slate-900 tracking-tight group-hover:text-blue-600 transition">
                {rider?.name || 'Passwala Partner'}
              </h1>
              {rider?.is_verified && (
                <ShieldCheck className="w-3.5 h-3.5 text-emerald-600" />
              )}
            </div>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <span className="font-semibold">{rider?.vehicle_no || 'GJ 01 AB 8842'}</span>
              {isOnline && (
                <>
                  <span className="text-slate-300">•</span>
                  <span className="text-emerald-600 font-bold flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {onlineDuration}
                  </span>
                </>
              )}
            </div>
          </div>
        </Link>

        {/* Online / Offline Toggle Button */}
        <button
          onClick={toggleOnlineStatus}
          className={`flex items-center gap-2 px-4 py-2 rounded-2xl font-extrabold text-xs transition-all shadow-xs cursor-pointer ${
            isOnline
              ? 'bg-emerald-50 border border-emerald-200 text-emerald-700 hover:bg-emerald-100 shadow-emerald-500/5'
              : 'bg-slate-100 border border-slate-200 text-slate-600 hover:bg-slate-200'
          }`}
          title={isOnline ? 'Go Offline' : 'Go Online'}
        >
          <span className="relative flex h-2.5 w-2.5">
            {isOnline && (
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-500 opacity-75" />
            )}
            <span
              className={`relative inline-flex rounded-full h-2.5 w-2.5 ${
                isOnline ? 'bg-emerald-500' : 'bg-slate-400'
              }`}
            />
          </span>
          <span className="tracking-wide uppercase">
            {isOnline ? 'Online' : 'Offline'}
          </span>
          <Power className="w-3.5 h-3.5 opacity-60" />
        </button>
      </div>
    </header>
  );
}
