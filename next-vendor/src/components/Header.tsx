'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useVendor } from '@/lib/vendor-context';
import { 
  Menu, 
  Plus, 
  QrCode, 
  Trophy, 
  Ticket, 
  CheckCircle2, 
  Sparkles,
  ExternalLink 
} from 'lucide-react';

export function Header({ onMenuClick, title }: { onMenuClick?: () => void; title?: string }) {
  const { store, businessType } = useVendor();
  const [isOpen, setIsOpen] = useState(true);

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-slate-200 bg-white/95 px-4 md:px-8 backdrop-blur-md shadow-xs">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl border border-slate-200 text-slate-600 hover:text-slate-900 hover:bg-slate-100 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-black tracking-tight text-slate-900 capitalize">
            {title || `${businessType === 'sports' ? 'Sports Turf' : 'Event'} Console`}
          </h1>
          <p className="text-[11px] text-slate-500 hidden sm:block">
            {store?.address ? `📍 ${store.address}` : 'Passwala Partner Network'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2.5">
        {/* Live Operating Status Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            isOpen
              ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
              : 'bg-slate-100 text-slate-500 border-slate-200'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span className="hidden sm:inline">{isOpen ? 'Accepting Bookings' : 'Paused'}</span>
        </button>

        {/* Quick QR Scanner button */}
        <Link
          href="/scanner"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 border border-slate-200 text-slate-700 text-xs font-bold transition-all"
        >
          <QrCode className="w-3.5 h-3.5 text-orange-600" />
          <span className="hidden sm:inline">Check-in</span>
        </Link>

        {/* Primary Action Button */}
        {businessType === 'sports' ? (
          <Link
            href="/venues/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Venue</span>
          </Link>
        ) : (
          <Link
            href="/events/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-xs transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Event</span>
          </Link>
        )}
      </div>
    </header>
  );
}
