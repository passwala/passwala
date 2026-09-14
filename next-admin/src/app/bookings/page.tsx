'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { formatCurrency, formatDateTime, getStatusBadge } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Ticket, Trophy } from 'lucide-react';

export default function BookingsPage() {
  const [activeTab, setActiveTab] = useState<'events' | 'sports'>('events');
  const [eventBookings, setEventBookings] = useState<any[]>([]);
  const [sportsBookings, setSportsBookings] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchBookings = async () => {
    try {
      setLoading(true);
      const [ebRes, sbRes] = await Promise.allSettled([
        adminApi.fetchTable('event_bookings'),
        adminApi.fetchTable('venue_bookings')
      ]);

      if (ebRes.status === 'fulfilled' && ebRes.value.data) {
        setEventBookings(ebRes.value.data);
      }
      if (sbRes.status === 'fulfilled' && sbRes.value.data) {
        setSportsBookings(sbRes.value.data);
      }
    } catch (err: any) {
      toast.error('Failed to load bookings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchBookings();
  }, []);

  const eventColumns: Column<any>[] = [
    {
      key: 'id',
      header: 'Booking ID',
      render: (b) => <span className="font-mono font-bold text-slate-800">#{String(b.id || '').slice(0, 8)}</span>
    },
    {
      key: 'user_id',
      header: 'Customer ID',
      render: (b) => <span className="font-mono text-slate-600 text-[11px]">{String(b.user_id || 'Guest').slice(0, 10)}...</span>
    },
    {
      key: 'ticket_count',
      header: 'Tickets',
      render: (b) => <span className="font-bold text-slate-900">{b.ticket_count || 1} pass(es)</span>
    },
    {
      key: 'total_amount',
      header: 'Amount Paid',
      render: (b) => <span className="font-extrabold text-slate-900">{formatCurrency(b.total_amount)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => {
        const badge = getStatusBadge(b.status);
        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
            {badge.label}
          </span>
        );
      }
    },
    {
      key: 'created_at',
      header: 'Date & Time',
      render: (b) => <span className="text-slate-500">{formatDateTime(b.created_at)}</span>
    }
  ];

  const sportsColumns: Column<any>[] = [
    {
      key: 'id',
      header: 'Booking ID',
      render: (b) => <span className="font-mono font-bold text-slate-800">#{String(b.id || '').slice(0, 8)}</span>
    },
    {
      key: 'user_id',
      header: 'Player / Customer',
      render: (b) => <span className="font-mono text-slate-600 text-[11px]">{String(b.user_id || 'Guest').slice(0, 10)}...</span>
    },
    {
      key: 'total_amount',
      header: 'Turf Fee',
      render: (b) => <span className="font-extrabold text-slate-900">{formatCurrency(b.total_amount)}</span>
    },
    {
      key: 'status',
      header: 'Status',
      render: (b) => {
        const badge = getStatusBadge(b.status);
        return (
          <span className={`inline-flex items-center rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
            {badge.label}
          </span>
        );
      }
    },
    {
      key: 'scheduled_at',
      header: 'Scheduled Slot',
      render: (b) => <span className="text-slate-700 font-semibold">{formatDateTime(b.scheduled_at || b.created_at)}</span>
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Bookings & Reservations</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Track customer ticket sales, QR verifications, and sports court bookings.
        </p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-200 pb-3">
        <button
          onClick={() => setActiveTab('events')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold cursor-pointer transition-colors ${
            activeTab === 'events'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Ticket className="h-4 w-4" />
          <span>Event Tickets ({eventBookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab('sports')}
          className={`flex items-center gap-2 rounded-xl px-4 py-2 text-xs font-extrabold cursor-pointer transition-colors ${
            activeTab === 'sports'
              ? 'bg-purple-600 text-white shadow-xs'
              : 'bg-white border border-slate-200 text-slate-600 hover:bg-slate-50'
          }`}
        >
          <Trophy className="h-4 w-4" />
          <span>Sports Courts ({sportsBookings.length})</span>
        </button>
      </div>

      {activeTab === 'events' ? (
        <DataTable
          title="Event Ticket Sales"
          description="Real-time ticket reservations and QR check-in status"
          columns={eventColumns}
          data={eventBookings}
          loading={loading}
          onRefresh={fetchBookings}
          searchPlaceholder="Search booking ID, user..."
          searchKeys={['id', 'user_id', 'status']}
        />
      ) : (
        <DataTable
          title="Sports Turf Reservations"
          description="Court bookings for cricket, football, and badminton"
          columns={sportsColumns}
          data={sportsBookings}
          loading={loading}
          onRefresh={fetchBookings}
          searchPlaceholder="Search booking ID, user..."
          searchKeys={['id', 'user_id', 'status']}
        />
      )}
    </div>
  );
}
