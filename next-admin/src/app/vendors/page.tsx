'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { toast } from 'react-hot-toast';
import { Store, CheckCircle, XCircle, ShieldAlert, Phone, MapPin, Sparkles, Wrench } from 'lucide-react';

export default function VendorsPage() {
  const [vendors, setVendors] = useState<any[]>([]);
  const [filterType, setFilterType] = useState<'ALL' | 'SHOP' | 'SERVICE' | 'EVENT'>('ALL');
  const [loading, setLoading] = useState(true);

  const fetchVendors = async () => {
    try {
      setLoading(true);
      const [vRes, spRes] = await Promise.allSettled([
        adminApi.fetchTable('vendors'),
        adminApi.fetchTable('service_providers')
      ]);

      const merged: any[] = [];
      if (vRes.status === 'fulfilled' && Array.isArray(vRes.value.data)) {
        vRes.value.data.forEach((v: any) => {
          merged.push({
            ...v,
            vendor_type: 'Shop',
            source_table: 'vendors'
          });
        });
      }

      if (spRes.status === 'fulfilled' && Array.isArray(spRes.value.data)) {
        spRes.value.data.forEach((sp: any) => {
          const isEvent = sp.category?.toLowerCase().includes('event') ||
                          sp.category?.toLowerCase().includes('concert') ||
                          sp.category?.toLowerCase().includes('theatre') ||
                          sp.users?.role === 'EVENT_ORGANIZER';
          merged.push({
            ...sp,
            vendor_type: isEvent ? 'Event' : (sp.category || 'Service'),
            source_table: 'service_providers'
          });
        });
      }

      setVendors(merged);
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
    const targetTable = vendor.source_table || 'vendors';
    try {
      await adminApi.upsertRecord(targetTable, {
        id: vendor.id,
        is_verified: nextStatus
      });
      toast.success(nextStatus ? 'Partner verified successfully' : 'Verification badge revoked');
      setVendors((prev) =>
        prev.map((v) => (v.id === vendor.id ? { ...v, is_verified: nextStatus } : v))
      );
    } catch (err: any) {
      toast.error(err.message || 'Update failed');
    }
  };

  const filteredVendors = vendors.filter((v) => {
    if (filterType === 'ALL') return true;
    if (filterType === 'SHOP') return v.vendor_type === 'Shop';
    if (filterType === 'EVENT') return v.vendor_type === 'Event';
    if (filterType === 'SERVICE') return v.vendor_type !== 'Shop' && v.vendor_type !== 'Event';
    return true;
  });

  const columns: Column<any>[] = [
    {
      key: 'business_name',
      header: 'Business & Type',
      render: (v) => {
        const isShop = v.vendor_type === 'Shop';
        const isEvent = v.vendor_type === 'Event';
        return (
          <div className="flex items-center gap-3">
            <div className={`flex h-9 w-9 items-center justify-center rounded-xl font-extrabold text-xs shrink-0 border ${
              isShop ? 'bg-orange-50 text-orange-600 border-orange-100' :
              isEvent ? 'bg-purple-50 text-purple-600 border-purple-100' :
              'bg-blue-50 text-blue-600 border-blue-100'
            }`}>
              {isShop ? <Store className="h-4 w-4" /> : isEvent ? <Sparkles className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
            </div>
            <div className="truncate">
              <div className="flex items-center gap-2">
                <p className="font-bold text-slate-900">{v.business_name || v.name || 'Unnamed Partner'}</p>
                <span className={`inline-flex items-center rounded-md px-1.5 py-0.2 text-[10px] font-black uppercase tracking-wider ${
                  isShop ? 'bg-orange-100 text-orange-800' :
                  isEvent ? 'bg-purple-100 text-purple-800' :
                  'bg-blue-100 text-blue-800'
                }`}>
                  {v.vendor_type}
                </span>
              </div>
              <p className="text-[11px] text-slate-500">{v.category || (isShop ? 'Retail Merchant' : 'Service Provider')}</p>
            </div>
          </div>
        );
      }
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
          <span>{v.is_verified ? 'Revoke Badge' : 'Verify Partner'}</span>
        </button>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Vendors & Partners</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Monitor merchant stores, organizers, and verified partner business profiles across Ahmedabad.
          </p>
        </div>

        {/* Filter Pills */}
        <div className="flex items-center gap-1.5 rounded-2xl border border-slate-200 bg-slate-100 p-1">
          {(['ALL', 'SHOP', 'EVENT', 'SERVICE'] as const).map((t) => (
            <button
              key={t}
              onClick={() => setFilterType(t)}
              className={`rounded-xl px-3 py-1.5 text-xs font-extrabold transition-all cursor-pointer ${
                filterType === t
                  ? 'bg-white text-slate-900 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {t === 'ALL' ? `All (${vendors.length})` :
               t === 'SHOP' ? 'Shops' :
               t === 'EVENT' ? 'Organizers' : 'Services'}
            </button>
          ))}
        </div>
      </div>

      <DataTable
        title="Partner Merchants & Providers"
        description="Review businesses, toggle verification status, and audit licenses"
        columns={columns}
        data={filteredVendors}
        loading={loading}
        onRefresh={fetchVendors}
        searchPlaceholder="Search business, owner, category, phone..."
        searchKeys={['business_name', 'name', 'category', 'phone', 'address']}
      />
    </div>
  );
}
