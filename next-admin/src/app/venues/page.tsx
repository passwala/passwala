'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { toast } from 'react-hot-toast';
import { Trophy, MapPin, Plus, Star, CheckCircle, XCircle, Trash2 } from 'lucide-react';

export default function SportsVenuesPage() {
  const [venues, setVenues] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    address: '',
    rating: 5.0,
    is_active: true
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchVenues = async () => {
    try {
      setLoading(true);
      const res = await adminApi.fetchTable('sports_venues');
      if (res.data) {
        setVenues(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load sports venues');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVenues();
  }, []);

  const handleToggleActive = async (venue: any) => {
    const nextStatus = !venue.is_active;
    try {
      await adminApi.upsertRecord('sports_venues', {
        id: venue.id,
        is_active: nextStatus
      });
      toast.success(nextStatus ? 'Venue activated' : 'Venue paused');
      setVenues((prev) =>
        prev.map((v) => (v.id === venue.id ? { ...v, is_active: nextStatus } : v))
      );
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const handleCreateVenue = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.address.trim()) return;

    try {
      setIsSubmitting(true);
      await adminApi.upsertRecord('sports_venues', formData);
      toast.success('Sports venue added successfully');
      setShowAddModal(false);
      setFormData({ name: '', address: '', rating: 5.0, is_active: true });
      fetchVenues();
    } catch (err: any) {
      toast.error(err.message || 'Failed to add venue');
    } finally {
      setIsSubmitting(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'name',
      header: 'Venue & Complex',
      render: (v) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-emerald-50 text-emerald-700 font-extrabold text-xs shrink-0 border border-emerald-100">
            <Trophy className="h-4 w-4" />
          </div>
          <div>
            <p className="font-bold text-slate-900">{v.name}</p>
            <p className="text-[11px] text-slate-500">Box Cricket & Multi-Sport</p>
          </div>
        </div>
      )
    },
    {
      key: 'address',
      header: 'Location / Area',
      render: (v) => (
        <div className="flex items-center gap-1.5 text-slate-600 max-w-sm truncate">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{v.address || 'Ahmedabad, Gujarat'}</span>
        </div>
      )
    },
    {
      key: 'rating',
      header: 'Rating',
      render: (v) => (
        <div className="flex items-center gap-1 text-amber-600 font-extrabold">
          <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
          <span>{v.rating ? Number(v.rating).toFixed(1) : '5.0'}</span>
        </div>
      )
    },
    {
      key: 'is_active',
      header: 'Booking Status',
      render: (v) => (
        <button
          onClick={() => handleToggleActive(v)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase cursor-pointer ${
            v.is_active
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${v.is_active ? 'bg-emerald-500' : 'bg-slate-400'}`} />
          <span>{v.is_active ? 'Accepting Slots' : 'Paused'}</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Sports Venues & Arenas</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Manage box crickets, football turfs, pickleball courts, and slot reservations.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-emerald-600 px-4 py-2.5 text-xs font-black text-white hover:bg-emerald-700 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>Add Arena</span>
        </button>
      </div>

      <DataTable
        title="Sports Facilities"
        description="Active turfs and indoor courts across the city"
        columns={columns}
        data={venues}
        loading={loading}
        onRefresh={fetchVenues}
        searchPlaceholder="Search venue name, address..."
        searchKeys={['name', 'address']}
      />

      {/* Add Arena Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900">Add Sports Venue</h3>
            <p className="mt-1 text-xs text-slate-500">Register a new sports turf or arena to the system.</p>

            <form onSubmit={handleCreateVenue} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Venue Name *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Ahmedabad Box Cricket Turf"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div>
                <label className="block font-bold text-slate-700 mb-1">Address / Landmark *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Near Vaishnodevi Circle, SG Highway"
                  value={formData.address}
                  onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-semibold text-slate-900 focus:border-emerald-600 focus:outline-none"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2 font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-emerald-600 px-4 py-2 font-black text-white hover:bg-emerald-700 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Add Venue'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
