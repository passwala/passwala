'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { EventWizardModal } from '@/components/EventWizardModal';
import { formatCurrency, formatDateTime, getStatusBadge } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Sparkles, Plus, Trash2, Calendar, MapPin, CheckCircle, ShieldCheck } from 'lucide-react';
import Link from 'next/link';

export default function EventsPage() {
  const [events, setEvents] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showWizard, setShowWizard] = useState(false);

  const fetchEvents = async () => {
    try {
      setLoading(true);
      const res = await adminApi.fetchTable('events');
      if (res.data) {
        setEvents(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchEvents();
  }, []);

  const handleDeleteEvent = async (event: any) => {
    if (!confirm(`Are you sure you want to delete event "${event.title}"?`)) return;
    try {
      await adminApi.deleteRecord('events', event.id);
      toast.success('Event deleted');
      setEvents((prev) => prev.filter((e) => e.id !== event.id));
    } catch (err: any) {
      toast.error(err.message || 'Failed to delete event');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'title',
      header: 'Event Details',
      render: (e) => (
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-purple-50 text-purple-600 font-extrabold text-xs shrink-0 border border-purple-100 overflow-hidden">
            {e.banner_url ? (
              <img src={e.banner_url} alt="" className="h-full w-full object-cover" />
            ) : (
              <Sparkles className="h-5 w-5" />
            )}
          </div>
          <div className="truncate max-w-xs">
            <div className="flex items-center gap-1.5">
              <p className="font-bold text-slate-900 truncate">{e.title}</p>
              {e.is_admin_organized && (
                <span className="rounded-md bg-purple-100 px-1 py-0.2 text-[9px] font-black text-purple-700 uppercase shrink-0">
                  Official
                </span>
              )}
            </div>
            <p className="text-[11px] text-slate-500">{e.category || 'Event'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'venue_name',
      header: 'Venue',
      render: (e) => (
        <div className="flex items-center gap-1 text-slate-600 max-w-xs truncate">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{e.venue_name || 'Ahmedabad'}</span>
        </div>
      )
    },
    {
      key: 'event_date',
      header: 'Date & Schedule',
      render: (e) => (
        <div className="flex items-center gap-1.5 text-slate-700">
          <Calendar className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span>{formatDateTime(e.event_date)}</span>
        </div>
      )
    },
    {
      key: 'starting_price',
      header: 'Starting Price',
      render: (e) => (
        <span className="font-bold text-slate-900">
          {Number(e.starting_price) > 0 ? formatCurrency(e.starting_price) : 'Free Entry'}
        </span>
      )
    },
    {
      key: 'status',
      header: 'Status',
      render: (e) => {
        const badge = getStatusBadge(e.status);
        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
            {badge.label}
          </span>
        );
      }
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (e) => (
        <button
          onClick={() => handleDeleteEvent(e)}
          title="Delete Event"
          className="rounded-lg border border-slate-200 p-1.5 text-slate-400 hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600 cursor-pointer transition-colors"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Events Console</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Curate live events, configure ticket tiers, and view organizer submissions.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            href="/events/approvals"
            className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-white px-3.5 py-2.5 text-xs font-bold text-slate-700 hover:bg-slate-50 transition-all cursor-pointer shadow-xs"
          >
            <ShieldCheck className="h-4 w-4 text-purple-600" />
            <span>Review Approvals</span>
          </Link>
          <button
            onClick={() => setShowWizard(true)}
            className="flex items-center gap-1.5 rounded-2xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white hover:bg-purple-700 transition-all cursor-pointer shadow-sm"
          >
            <Plus className="h-4 w-4" />
            <span>Create Event</span>
          </button>
        </div>
      </div>

      <DataTable
        title="Live Events Directory"
        description="Filter events by category, status or search by title"
        columns={columns}
        data={events}
        loading={loading}
        onRefresh={fetchEvents}
        searchPlaceholder="Search event title, category, venue..."
        searchKeys={['title', 'category', 'venue_name']}
        filterKey="status"
        filterOptions={[
          { label: 'Upcoming', value: 'UPCOMING' },
          { label: 'Ongoing', value: 'ONGOING' },
          { label: 'Completed', value: 'COMPLETED' },
          { label: 'Cancelled', value: 'CANCELLED' }
        ]}
      />

      <EventWizardModal
        isOpen={showWizard}
        onClose={() => setShowWizard(false)}
        onSuccess={fetchEvents}
      />
    </div>
  );
}
