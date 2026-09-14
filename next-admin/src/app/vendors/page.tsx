'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Store, CheckCircle, XCircle, ShieldAlert, Phone, MapPin } from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const res = await adminApi.fetchTable('vendors');
      if (res.data) {
        setVendors(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load vendors list');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleToggleVerification = async (vendor: any) => {
    const nextStatus = !vendor.is_verified;
    try {
      await adminApi.upsertRecord('vendors', {
        id: vendor.id,
        is_verified: nextStatus
      });
      toast.success(nextStatus ? 'Vendor verified successfully' : 'Verification badge revoked');
      setVendors((prev) =>
        prev.map((v) => (v.id === vendor.id ? { ...v, is_verified: nextStatus } : v))
      );
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'business_name',
      header: 'Business & Store',
      render: (v) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-orange-50 text-orange-600 font-extrabold text-xs shrink-0 border border-orange-100">
            <Store className="h-4 w-4" />
          </div>
          <div className="truncate">
            <p className="font-bold text-slate-900">{v.business_name || v.name || 'Unnamed Partner'}</p>
            <p className="text-[11px] text-slate-500">{v.category || 'General Merchant'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'name',
      header: 'Contact Person',
      render: (v) => (
        <div>
          <p className="font-semibold text-slate-800">{v.name || v.full_name || '—'}</p>
          <p className="text-[11px] text-slate-500 flex items-center gap-1">
            <Phone className="h-3 w-3 text-slate-400" />
            <span>{v.phone || 'No phone'}</span>
          </p>
        </div>
      )
    },
    {
      key: 'address',
      header: 'Location / City',
      render: (v) => (
        <div className="flex items-center gap-1 text-slate-600 max-w-xs truncate">
          <MapPin className="h-3.5 w-3.5 text-slate-400 shrink-0" />
          <span className="truncate">{v.address || 'Ahmedabad, Gujarat'}</span>
        </div>
      )
    },
    {
      key: 'is_verified',
      header: 'KYC & Verification',
      render: (v) => (
        <span
          className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-black uppercase ${
            v.is_verified
              ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
              : 'bg-amber-100 text-amber-700 border border-amber-200'
          }`}
        >
          {v.is_verified ? <CheckCircle className="h-3 w-3" /> : <ShieldAlert className="h-3 w-3" />}
          <span>{v.is_verified ? 'Verified Partner' : 'Unverified'}</span>
        </span>
      )
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (v) => (
        <button
          onClick={() => handleToggleVerification(v)}
          className={`inline-flex items-center gap-1 rounded-lg border px-2.5 py-1 text-xs font-bold transition-all cursor-pointer ${
            v.is_verified
              ? 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
              : 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
          }`}
        >
          {v.is_verified ? <XCircle className="h-3 w-3" /> : <CheckCircle className="h-3 w-3" />}
          <span>{v.is_verified ? 'Revoke Badge' : 'Verify Vendor'}</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Vendors & Partners</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Monitor merchant stores, organizers, and verified partner business profiles.
        </p>
      </div>

      <DataTable
        title="Partner Merchants"
        description="Review businesses, toggle verification status, and audit licenses"
        columns={columns}
        data={vendors}
        loading={loading}
        onRefresh={fetchVendors}
        searchPlaceholder="Search business, owner, category, phone..."
        searchKeys={['business_name', 'name', 'category', 'phone', 'address']}
      />
    </div>
  );
}
