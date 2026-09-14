'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { formatCurrency, formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { Tag, Plus, Trash2, Percent, IndianRupee } from 'lucide-react';

export default function PromoCodesPage() {
  const [promos, setPromos] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [showAddModal, setShowAddModal] = useState(false);
  const [formData, setFormData] = useState({
    code: '',
    type: 'percentage',
    value: 10,
    min_order: 100,
    max_discount: 150,
    max_uses: 100,
    expires_at: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchPromos = async () => {
    try {
      setLoading(true);
      const res = await adminApi.fetchTable('promo_codes');
      if (res.data) {
        setPromos(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load promo codes');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPromos();
  }, []);

  const handleCreatePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.code.trim()) return;

    try {
      setIsSubmitting(true);
      await adminApi.upsertRecord('promo_codes', {
        ...formData,
        code: formData.code.toUpperCase().trim()
      });
      toast.success('Promo code created successfully');
      setShowAddModal(false);
      setFormData({
        code: '',
        type: 'percentage',
        value: 10,
        min_order: 100,
        max_discount: 150,
        max_uses: 100,
        expires_at: ''
      });
      fetchPromos();
    } catch (err: any) {
      toast.error(err.message || 'Failed to create promo code');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (promo: any) => {
    if (!confirm(`Delete coupon "${promo.code}"?`)) return;
    try {
      await adminApi.deleteRecord('promo_codes', promo.id);
      toast.success('Coupon deleted');
      setPromos((prev) => prev.filter((p) => p.id !== promo.id));
    } catch (err: any) {
      toast.error(err.message || 'Deletion failed');
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'code',
      header: 'Coupon Code',
      render: (p) => (
        <div className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-purple-50 text-purple-600 font-black text-xs border border-purple-100">
            <Tag className="h-4 w-4" />
          </div>
          <span className="font-mono font-black text-slate-900 uppercase text-sm tracking-wider">
            {p.code}
          </span>
        </div>
      )
    },
    {
      key: 'value',
      header: 'Discount Offer',
      render: (p) => (
        <span className="font-extrabold text-emerald-700">
          {p.type === 'percentage' ? `${p.value}% OFF` : `₹${p.value} FLAT OFF`}
        </span>
      )
    },
    {
      key: 'min_order',
      header: 'Min. Order Required',
      render: (p) => <span>{formatCurrency(p.min_order || 0)}</span>
    },
    {
      key: 'expires_at',
      header: 'Expiry Date',
      render: (p) => <span className="text-slate-500">{p.expires_at ? formatDate(p.expires_at) : 'Never'}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (p) => (
        <button
          onClick={() => handleDelete(p)}
          title="Delete coupon"
          className="rounded-lg p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
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
          <h1 className="text-2xl font-black tracking-tight text-slate-900">Promo & Discount Codes</h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Manage promotional campaigns, coupon redemptions, and cart discount rules.
          </p>
        </div>

        <button
          onClick={() => setShowAddModal(true)}
          className="flex items-center gap-1.5 rounded-2xl bg-purple-600 px-4 py-2.5 text-xs font-black text-white hover:bg-purple-700 transition-all cursor-pointer shadow-sm shrink-0"
        >
          <Plus className="h-4 w-4" />
          <span>New Coupon</span>
        </button>
      </div>

      <DataTable
        title="Active Promo Codes"
        description="Discount codes available for buyers at event and ticket checkout"
        columns={columns}
        data={promos}
        loading={loading}
        onRefresh={fetchPromos}
        searchPlaceholder="Search coupon code..."
        searchKeys={['code']}
      />

      {/* Add Coupon Modal */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900">Create Promo Code</h3>
            <p className="mt-1 text-xs text-slate-500">Set discount rules and validity for this code.</p>

            <form onSubmit={handleCreatePromo} className="mt-4 space-y-3 text-xs">
              <div>
                <label className="block font-bold text-slate-700 mb-1">Coupon Code *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. PASSWALA50"
                  value={formData.code}
                  onChange={(e) => setFormData({ ...formData, code: e.target.value.toUpperCase() })}
                  className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 font-mono font-bold uppercase text-slate-900 focus:border-purple-600 focus:outline-none"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Type</label>
                  <select
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 font-bold text-slate-800 focus:outline-none"
                  >
                    <option value="percentage">Percentage (%)</option>
                    <option value="flat">Flat Amount (₹)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Value</label>
                  <input
                    type="number"
                    min="1"
                    required
                    value={formData.value}
                    onChange={(e) => setFormData({ ...formData, value: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-bold text-slate-900 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Min Order (₹)</label>
                  <input
                    type="number"
                    min="0"
                    value={formData.min_order}
                    onChange={(e) => setFormData({ ...formData, min_order: Number(e.target.value) })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
                <div>
                  <label className="block font-bold text-slate-700 mb-1">Expires On</label>
                  <input
                    type="date"
                    value={formData.expires_at}
                    onChange={(e) => setFormData({ ...formData, expires_at: e.target.value })}
                    className="w-full rounded-xl border border-slate-200 px-3 py-2.5 font-semibold text-slate-900 focus:outline-none"
                  />
                </div>
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
                  className="rounded-xl bg-purple-600 px-4 py-2 font-black text-white hover:bg-purple-700 cursor-pointer shadow-xs"
                >
                  {isSubmitting ? 'Saving...' : 'Create Code'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
