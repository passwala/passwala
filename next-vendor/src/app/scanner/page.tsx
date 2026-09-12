'use client';

import React, { useState } from 'react';
import { Sidebar } from '@/components/Sidebar';
import { Header } from '@/components/Header';
import { useVendor } from '@/lib/vendor-context';
import { toast } from 'react-hot-toast';
import { 
  QrCode, 
  CheckCircle2, 
  XCircle, 
  Search, 
  Ticket, 
  Trophy, 
  Calendar, 
  User, 
  Loader2 
} from 'lucide-react';

export default function ScannerPage() {
  const { businessType } = useVendor();
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [code, setCode] = useState('');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);

  const handleVerify = async (ticketCode: string) => {
    const cleanCode = (ticketCode || code).trim();
    if (!cleanCode) {
      toast.error('Please enter a ticket or booking ID');
      return;
    }

    setLoading(true);
    setResult(null);
    try {
      const BASE_URL = 'http://127.0.0.1:3004';
      const endpoint = businessType === 'sports' 
        ? `${BASE_URL}/api/sports/checkin` 
        : `${BASE_URL}/api/events/checkin`;

      const payload = businessType === 'sports' 
        ? { booking_id: cleanCode } 
        : { booking_id: cleanCode, ticket_code: cleanCode };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();

      if (res.ok && data.success) {
        toast.success('✅ Admitted Successfully!');
        setResult({
          status: 'SUCCESS',
          message: data.message || 'Pass verified and check-in recorded',
          booking: data.booking || { id: cleanCode, user_name: 'Admitted Player' }
        });
      } else {
        toast.error(data.error || 'Verification Failed');
        setResult({
          status: 'ERROR',
          message: data.error || 'Ticket is invalid, expired or already used.'
        });
      }
    } catch (e: any) {
      toast.error('Network check-in failed: ' + e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-white selection:bg-orange-500">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Live QR Gate Check-in" />

        <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-500/10 text-orange-500 flex items-center justify-center mx-auto shadow-lg">
              <QrCode className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-white">Guest Admission Scanner</h2>
            <p className="text-xs text-zinc-400">
              Verify {businessType === 'sports' ? 'court bookings' : 'event passes'} by entering or scanning the customer&apos;s QR code.
            </p>
          </div>

          {/* Verification Box */}
          <div className="rounded-3xl bg-zinc-900 border border-zinc-800 p-6 md:p-8 shadow-2xl space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(code);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider">
                  Ticket ID or Booking UUID
                </label>
                <div className="flex items-center rounded-2xl bg-zinc-950 border border-zinc-800 px-4 py-3 focus-within:border-orange-500 transition-all">
                  <Search className="w-4 h-4 text-zinc-500 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. 5b2b8333... or TKT-XXXX"
                    className="bg-transparent flex-1 text-sm text-white font-mono placeholder:text-zinc-600 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-gradient-to-r from-orange-500 to-amber-600 hover:from-orange-600 hover:to-amber-700 text-white font-bold text-sm shadow-lg shadow-orange-500/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Check In'}
              </button>
            </form>

            {/* Verification Result Card */}
            {result && (
              <div
                className={`p-6 rounded-2xl border ${
                  result.status === 'SUCCESS'
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : 'bg-red-950/40 border-red-500/40 text-red-300'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-400 shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-red-400 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-base text-white">
                      {result.status === 'SUCCESS' ? 'Admission Confirmed!' : 'Check-In Rejected'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">{result.message}</p>
                  </div>
                </div>

                {result.booking && (
                  <div className="mt-4 pt-4 border-t border-emerald-500/20 space-y-1 text-xs text-zinc-300">
                    <p><strong>Holder:</strong> {result.booking.user_name || 'Guest'}</p>
                    <p><strong>Code:</strong> {result.booking.id}</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
