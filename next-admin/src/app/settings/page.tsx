'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { toast } from 'react-hot-toast';
import { Settings, Save, AlertTriangle, Trash2, Shield, Percent, IndianRupee, RefreshCw } from 'lucide-react';

export default function SettingsPage() {
  const [settings, setSettings] = useState<any>({
    event_commission_pct: 10,
    sports_commission_pct: 10,
    convenience_fee_fixed: 20,
    base_delivery_fee: 30,
    free_delivery_threshold: 499,
    maintenance_mode: false,
    support_phone: '+91 98765 43210',
    support_email: 'support@passwala.com'
  });
  const [loading, setLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [isPurging, setIsPurging] = useState(false);

  const loadSettings = async () => {
    try {
      setLoading(true);
      const res = await adminApi.getSettings();
      if (res.settings) {
        setSettings((prev: any) => ({ ...prev, ...res.settings }));
      }
    } catch (err: any) {
      console.warn('Could not load settings from server, using local defaults', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSettings();
  }, []);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setIsSaving(true);
      await adminApi.updateSettings(settings);
      toast.success('Platform settings saved successfully');
    } catch (err: any) {
      toast.error(err.message || 'Failed to save settings');
    } finally {
      setIsSaving(false);
    }
  };

  const handlePurge = async () => {
    const confirmation = prompt(
      'Type "PURGE-CONFIRM" to clean up test and mock bookings in the database:'
    );
    if (confirmation !== 'PURGE-CONFIRM') {
      toast.error('Purge cancelled - confirmation phrase did not match');
      return;
    }

    try {
      setIsPurging(true);
      const res = await adminApi.purgeDemoData({ mode: 'safe_test_data' });
      toast.success(res.message || 'Test data cleanup complete');
    } catch (err: any) {
      toast.error(err.message || 'Purge failed');
    } finally {
      setIsPurging(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-24">
        <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-4xl">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Platform Settings</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Configure financial commissions, booking convenience fees, and operational policies.
        </p>
      </div>

      <form onSubmit={handleSave} className="space-y-6">
        {/* Fees & Commission */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <Percent className="h-5 w-5 text-purple-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Commissions & Service Fees
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Event Commission Rate (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.event_commission_pct}
                onChange={(e) => setSettings({ ...settings, event_commission_pct: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-purple-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">Deducted from organizer ticket payout.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Sports Venue Commission (%)
              </label>
              <input
                type="number"
                min="0"
                max="100"
                value={settings.sports_commission_pct}
                onChange={(e) => setSettings({ ...settings, sports_commission_pct: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-purple-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">Platform share per court slot booking.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Convenience Fee per Ticket (₹)
              </label>
              <input
                type="number"
                min="0"
                value={settings.convenience_fee_fixed}
                onChange={(e) => setSettings({ ...settings, convenience_fee_fixed: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-purple-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">Fixed internet handling fee paid by customer.</p>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">
                Free Delivery Threshold (₹)
              </label>
              <input
                type="number"
                min="0"
                value={settings.free_delivery_threshold}
                onChange={(e) => setSettings({ ...settings, free_delivery_threshold: Number(e.target.value) })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-bold text-slate-900 focus:border-purple-600 focus:outline-none"
              />
              <p className="mt-1 text-[11px] text-slate-400">Orders above this qualify for free courier shipping.</p>
            </div>
          </div>
        </div>

        {/* Operational Contacts */}
        <div className="rounded-3xl border border-slate-200 bg-white p-6 shadow-xs space-y-5">
          <div className="flex items-center gap-2.5 border-b border-slate-100 pb-4">
            <Shield className="h-5 w-5 text-purple-600" />
            <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
              Operations & Support Contact
            </h2>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Helpline</label>
              <input
                type="text"
                value={settings.support_phone}
                onChange={(e) => setSettings({ ...settings, support_phone: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-purple-600 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1">Support Email</label>
              <input
                type="email"
                value={settings.support_email}
                onChange={(e) => setSettings({ ...settings, support_email: e.target.value })}
                className="w-full rounded-xl border border-slate-200 px-3.5 py-2.5 text-xs font-semibold text-slate-900 focus:border-purple-600 focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className="flex justify-end">
          <button
            type="submit"
            disabled={isSaving}
            className="flex items-center gap-2 rounded-2xl bg-purple-600 px-6 py-3 text-xs font-black text-white hover:bg-purple-700 transition-all cursor-pointer shadow-sm disabled:opacity-50"
          >
            <Save className="h-4 w-4" />
            <span>{isSaving ? 'Saving Changes...' : 'Save Configuration'}</span>
          </button>
        </div>
      </form>

      {/* Danger Zone: Data Purge */}
      <div className="rounded-3xl border border-rose-200 bg-rose-50/50 p-6 space-y-4">
        <div className="flex items-center gap-2 text-rose-800">
          <AlertTriangle className="h-5 w-5" />
          <h3 className="text-sm font-black uppercase tracking-wider">Danger Zone & Database Maintenance</h3>
        </div>
        <p className="text-xs text-rose-700">
          Purge test data, sample event bookings, or mock records generated during development. Production user records will be safely preserved.
        </p>
        <button
          onClick={handlePurge}
          disabled={isPurging}
          className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-xs font-black text-white hover:bg-rose-700 transition-all cursor-pointer shadow-xs disabled:opacity-50"
        >
          <Trash2 className="h-4 w-4" />
          <span>{isPurging ? 'Purging Data...' : 'Purge Test & Demo Records'}</span>
        </button>
      </div>
    </div>
  );
}
