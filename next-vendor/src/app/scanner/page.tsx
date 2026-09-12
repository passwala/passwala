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
          booking: data.booking || null
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
    <div className="min-h-screen bg-slate-50 text-slate-900 selection:bg-orange-500 selection:text-white">
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

      <div className="lg:pl-64 flex flex-col min-h-screen">
        <Header onMenuClick={() => setSidebarOpen(true)} title="Live QR Gate Check-in" />

        <main className="flex-1 p-4 md:p-8 max-w-2xl mx-auto w-full space-y-6">
          <div className="text-center space-y-2">
            <div className="w-14 h-14 rounded-2xl bg-orange-50 text-orange-600 border border-orange-200 flex items-center justify-center mx-auto shadow-xs">
              <QrCode className="w-7 h-7" />
            </div>
            <h2 className="text-2xl font-black text-slate-900">Guest Admission Scanner</h2>
            <p className="text-xs text-slate-500">
              Verify {businessType === 'sports' ? 'court bookings' : 'event passes'} by entering or scanning the customer&apos;s QR code.
            </p>
          </div>

          {/* Verification Box */}
          <div className="rounded-3xl bg-white border border-slate-200 p-6 md:p-8 shadow-lg shadow-slate-200/50 space-y-6">
            <form
              onSubmit={(e) => {
                e.preventDefault();
                handleVerify(code);
              }}
              className="space-y-4"
            >
              <div className="space-y-2">
                <label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Ticket ID or Booking UUID
                </label>
                <div className="flex items-center rounded-2xl bg-slate-50 border-2 border-slate-200 px-4 py-3.5 focus-within:border-orange-500 focus-within:bg-white focus-within:ring-4 focus-within:ring-orange-500/10 transition-all">
                  <Search className="w-4 h-4 text-slate-400 mr-3 shrink-0" />
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value)}
                    placeholder="e.g. 5b2b8333... or TKT-XXXX"
                    className="bg-transparent flex-1 text-sm text-slate-900 font-mono font-bold placeholder:text-slate-400 outline-none"
                    autoFocus
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={loading || !code.trim()}
                className="w-full flex items-center justify-center gap-2 py-3.5 rounded-2xl bg-orange-600 hover:bg-orange-700 text-white font-bold text-sm shadow-md shadow-orange-600/20 transition-all disabled:opacity-50 cursor-pointer"
              >
                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verify & Check In'}
              </button>
            </form>

            {/* Verification Result Card */}
            {result && (
              <div
                className={`p-6 rounded-2xl border ${
                  result.status === 'SUCCESS'
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-900'
                    : 'bg-rose-50 border-rose-200 text-rose-900'
                }`}
              >
                <div className="flex items-center gap-3">
                  {result.status === 'SUCCESS' ? (
                    <CheckCircle2 className="w-8 h-8 text-emerald-600 shrink-0" />
                  ) : (
                    <XCircle className="w-8 h-8 text-rose-600 shrink-0" />
                  )}
                  <div>
                    <h4 className="font-bold text-base">
                      {result.status === 'SUCCESS' ? 'Admission Confirmed!' : 'Check-In Rejected'}
                    </h4>
                    <p className="text-xs opacity-90 mt-0.5">{result.message}</p>
                  </div>
                </div>

                {result.booking && (
                  <div className="mt-4 pt-4 border-t border-emerald-200/70 space-y-1 text-xs text-slate-700">
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
