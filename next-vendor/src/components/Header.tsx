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
    <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-zinc-800/80 bg-zinc-950/80 px-4 md:px-8 backdrop-blur-md">
      <div className="flex items-center gap-3">
        <button
          onClick={onMenuClick}
          className="p-2 rounded-xl border border-zinc-800 text-zinc-400 hover:text-white hover:bg-zinc-900 lg:hidden cursor-pointer"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div>
          <h1 className="text-lg font-black tracking-tight text-white capitalize">
            {title || `${businessType === 'sports' ? 'Sports Turf' : 'Event'} Console`}
          </h1>
          <p className="text-[11px] text-zinc-500 hidden sm:block">
            {store?.address ? `📍 ${store.address}` : 'Passwala Partner Network'}
          </p>
        </div>
      </div>

      <div className="flex items-center gap-3">
        {/* Live Operating Status Toggle */}
        <button
          onClick={() => setIsOpen(!isOpen)}
          className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-bold border transition-all cursor-pointer ${
            isOpen
              ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
              : 'bg-zinc-900 text-zinc-500 border-zinc-800'
          }`}
        >
          <span className={`w-2 h-2 rounded-full ${isOpen ? 'bg-emerald-500 animate-pulse' : 'bg-zinc-600'}`} />
          <span className="hidden sm:inline">{isOpen ? 'Accepting Bookings' : 'Paused'}</span>
        </button>

        {/* Quick QR Scanner button */}
        <Link
          href="/scanner"
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-zinc-900 border border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-800 text-xs font-bold transition-all"
        >
          <QrCode className="w-3.5 h-3.5 text-orange-400" />
          <span className="hidden sm:inline">Check-in</span>
        </Link>

        {/* Primary Action Button */}
        {businessType === 'sports' ? (
          <Link
            href="/venues/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-orange-500 hover:bg-orange-600 text-white text-xs font-bold shadow-md shadow-orange-500/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Add Venue</span>
          </Link>
        ) : (
          <Link
            href="/events/new"
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-purple-600 hover:bg-purple-700 text-white text-xs font-bold shadow-md shadow-purple-600/20 transition-all"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Create Event</span>
          </Link>
        )}
      </div>
    </header>
  );
}
