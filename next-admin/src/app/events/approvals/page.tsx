'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { useAdmin } from '@/lib/admin-context';
import { formatCurrency, formatDateTime } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { ShieldCheck, CheckCircle2, XCircle, Calendar, MapPin, Tag, RefreshCw, ArrowLeft } from 'lucide-react';
import Link from 'next/link';

export default function EventApprovalsPage() {
  const [pendingEvents, setPendingEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { refreshCounters } = useAdmin();

  const loadPending = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getPendingEvents();
      if (res.events) {
        setPendingEvents(res.events);
      }
    } catch (err: any) {
      toast.error('Failed to load pending events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadPending();
  }, []);

  const handleApprove = async (event: any) => {
    try {
      setActionLoading(event.id);
      await adminApi.approveEvent(event.id);
      toast.success(`Event "${event.title}" approved and published!`);
      setPendingEvents((prev) => prev.filter((e) => e.id !== event.id));
      refreshCounters();
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (event: any) => {
    const reason = prompt(`Reason for rejecting "${event.title}":`, 'Details missing or policy violation');
    if (reason === null) return;

    try {
      setActionLoading(event.id);
      await adminApi.rejectEvent(event.id, reason);
      toast.success(`Event "${event.title}" rejected`);
      setPendingEvents((prev) => prev.filter((e) => e.id !== event.id));
      refreshCounters();
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-3">
        <Link
          href="/events"
          className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50 hover:text-slate-900 cursor-pointer"
        >
          <ArrowLeft className="h-4 w-4" />
        </Link>
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Event Approvals Queue</h1>
          <p className="text-xs font-semibold text-slate-500">
            Audit and approve community & partner submitted events before they go live.
          </p>
        </div>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-20">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
        </div>
      ) : pendingEvents.length === 0 ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-12 text-center shadow-xs">
          <div className="mx-auto mb-3 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-50 text-emerald-600 border border-emerald-100">
            <CheckCircle2 className="h-8 w-8" />
          </div>
          <h2 className="text-base font-black text-slate-900">All Event Approvals Clear</h2>
          <p className="mt-1 text-xs text-slate-500 max-w-sm mx-auto">
            There are currently no organizer events waiting for administrative review.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {pendingEvents.map((event) => (
            <div
              key={event.id}
              className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs flex flex-col justify-between space-y-4"
            >
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-amber-100 px-2.5 py-0.5 text-[10px] font-black uppercase text-amber-800 border border-amber-200">
                      Pending Review
                    </span>
                    <span className="text-xs font-bold text-slate-500">{event.category || 'Event'}</span>
                  </div>
                  <span className="text-xs font-black text-purple-700">
                    From {formatCurrency(event.starting_price || 0)}
                  </span>
                </div>

                <div>
                  <h3 className="text-base font-black text-slate-900">{event.title}</h3>
                  <div className="mt-2 space-y-1 text-xs text-slate-600 font-medium">
                    <p className="flex items-center gap-1.5">
                      <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{event.venue_name || 'Venue to be announced'}</span>
                    </p>
                    <p className="flex items-center gap-1.5">
                      <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
                      <span>{formatDateTime(event.event_date)}</span>
                    </p>
                  </div>
                </div>

                {event.banner_url && (
                  <div className="h-32 w-full overflow-hidden rounded-2xl bg-slate-100">
                    <img src={event.banner_url} alt="" className="h-full w-full object-cover" />
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex items-center gap-3 pt-3 border-t border-slate-100">
                <button
                  onClick={() => handleReject(event)}
                  disabled={actionLoading === event.id}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl border border-rose-200 bg-rose-50 py-2.5 text-xs font-black text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="h-4 w-4" />
                  <span>Reject</span>
                </button>
                <button
                  onClick={() => handleApprove(event)}
                  disabled={actionLoading === event.id}
                  className="flex-1 flex items-center justify-center gap-1.5 rounded-xl bg-emerald-600 py-2.5 text-xs font-black text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-50 shadow-xs"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  <span>Approve & Publish</span>
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
