'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { toast } from 'react-hot-toast';
import { Bike, CheckCircle, XCircle, Star, Phone, ShieldCheck } from 'lucide-react';

export default function RidersPage() {
  const [riders, setRiders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchRiders = async () => {
    try {
      setLoading(true);
      const res = await adminApi.fetchTable('riders');
      if (res.data) {
        setRiders(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load riders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRiders();
  }, []);

  const handleToggleActive = async (rider: any) => {
    const nextStatus = !rider.is_active;
    try {
      await adminApi.upsertRecord('riders', {
        id: rider.id,
        is_active: nextStatus
      });
      toast.success(nextStatus ? 'Rider marked On-Duty' : 'Rider marked Off-Duty');
      setRiders((prev) =>
        prev.map((r) => (r.id === rider.id ? { ...r, is_active: nextStatus } : r))
      );
    } catch (err: any) {
      toast.error(err.message || 'Status update failed');
    }
  };

  const handleToggleVerification = async (rider: any) => {
    const nextStatus = !rider.is_verified;
    try {
      await adminApi.upsertRecord('riders', {
        id: rider.id,
        is_verified: nextStatus
      });
      toast.success(nextStatus ? 'Rider credentials approved' : 'Rider verification revoked');
      setRiders((prev) =>
        prev.map((r) => (r.id === rider.id ? { ...r, is_verified: nextStatus } : r))
      );
    } catch (err: any) {
      toast.error(err.message || 'Verification update failed');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'full_name',
      header: 'Rider Info',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-blue-50 text-blue-600 font-extrabold text-xs shrink-0 border border-blue-100">
            <Bike className="h-4 w-4" />
          </div>
          <div className="truncate">
            <p className="font-bold text-slate-900">{r.full_name || 'Fleet Member'}</p>
            <p className="text-[11px] text-slate-500 flex items-center gap-1">
              <Phone className="h-3 w-3 text-slate-400" />
              <span>{r.phone || 'No phone'}</span>
            </p>
          </div>
        </div>
      )
    },
    {
      key: 'vehicle_no',
      header: 'Vehicle & License',
      render: (r) => (
        <div>
          <p className="font-mono font-bold text-slate-900">{r.vehicle_no || '—'}</p>
          <p className="text-[10px] text-slate-400">Lic: {r.license_no || 'Not submitted'}</p>
        </div>
      )
    },
    {
      key: 'rating',
      header: 'Rating & Deliveries',
      render: (r) => (
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 text-amber-600 font-extrabold text-xs">
            <Star className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
            <span>{r.rating ? Number(r.rating).toFixed(1) : '5.0'}</span>
          </div>
          <span className="text-slate-400">&bull;</span>
          <span className="text-xs font-semibold text-slate-600">{r.total_deliveries || 0} trips</span>
        </div>
      )
    },
    {
      key: 'is_active',
      header: 'Duty Status',
      render: (r) => (
        <button
          onClick={() => handleToggleActive(r)}
          className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase cursor-pointer transition-colors ${
            r.is_active
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-slate-100 text-slate-600 border border-slate-200'
          }`}
        >
          <span className={`h-1.5 w-1.5 rounded-full ${r.is_active ? 'bg-emerald-500 animate-pulse' : 'bg-slate-400'}`} />
          <span>{r.is_active ? 'Online' : 'Offline'}</span>
        </button>
      )
    },
    {
      key: 'is_verified',
      header: 'Verification',
      render: (r) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
            r.is_verified
              ? 'bg-purple-100 text-purple-700 border border-purple-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}
        >
          {r.is_verified ? <ShieldCheck className="h-3 w-3" /> : null}
          <span>{r.is_verified ? 'Verified' : 'Pending'}</span>
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (r) => (
        <button
          onClick={() => handleToggleVerification(r)}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
            r.is_verified
              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
              : 'border-purple-200 bg-purple-50 text-purple-700 hover:bg-purple-100'
          }`}
        >
          {r.is_verified ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
          <span>{r.is_verified ? 'Revoke' : 'Approve'}</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Riders Fleet</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Manage delivery drivers, active dispatch status, ratings, and vehicle certifications.
        </p>
      </div>

      <DataTable
        title="Fleet Personnel"
        description="Monitor active couriers, vehicle numbers, and verify driver credentials"
        columns={columns}
        data={riders}
        loading={loading}
        onRefresh={fetchRiders}
        searchPlaceholder="Search rider, phone, vehicle plate..."
        searchKeys={['full_name', 'phone', 'vehicle_no', 'license_no']}
      />
    </div>
  );
}
