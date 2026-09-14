'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { useAdmin } from '@/lib/admin-context';
import { formatDate, getStatusBadge } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { UserCheck, CheckCircle2, XCircle, FileText, Phone, Building, RefreshCw } from 'lucide-react';

export default function UpgradesPage() {
  const [requests, setRequests] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const { refreshCounters } = useAdmin();

  const loadRequests = async () => {
    try {
      setLoading(true);
      const res = await adminApi.fetchTable('event_organizer_requests');
      if (res.data) {
        setRequests(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load upgrade requests');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRequests();
  }, []);

  const handleApprove = async (req: any) => {
    try {
      setActionLoading(req.id);
      await adminApi.approveUpgrade(req.id);
      toast.success(`Upgrade approved! User promoted to Organizer`);
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'APPROVED' } : r))
      );
      refreshCounters();
    } catch (err: any) {
      toast.error(err.message || 'Approval failed');
    } finally {
      setActionLoading(null);
    }
  };

  const handleReject = async (req: any) => {
    const reason = prompt('Reason for rejection:', 'Incomplete documentation');
    if (reason === null) return;

    try {
      setActionLoading(req.id);
      await adminApi.rejectUpgrade(req.id, reason);
      toast.success('Upgrade request rejected');
      setRequests((prev) =>
        prev.map((r) => (r.id === req.id ? { ...r, status: 'REJECTED' } : r))
      );
      refreshCounters();
    } catch (err: any) {
      toast.error(err.message || 'Rejection failed');
    } finally {
      setActionLoading(null);
    }
  };

  const pendingList = requests.filter((r) => (r.status || 'PENDING') === 'PENDING');
  const pastList = requests.filter((r) => (r.status || 'PENDING') !== 'PENDING');

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black tracking-tight text-slate-900">
            Organizer & Partner Upgrades
          </h1>
          <p className="mt-1 text-xs font-semibold text-slate-500">
            Audit user applications requesting event organizer and partner privileges.
          </p>
        </div>

        <button
          onClick={loadRequests}
          className="rounded-xl border border-slate-200 bg-white p-2 text-slate-600 hover:bg-slate-50 cursor-pointer"
        >
          <RefreshCw className={`h-4 w-4 ${loading ? 'animate-spin text-purple-600' : ''}`} />
        </button>
      </div>

      {/* Pending Queue */}
      <div className="space-y-4">
        <div className="flex items-center gap-2">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            Pending Applications
          </h2>
          <span className="rounded-full bg-orange-100 px-2 py-0.5 text-xs font-bold text-orange-700">
            {pendingList.length} pending
          </span>
        </div>

        {loading ? (
          <div className="flex justify-center py-12">
            <RefreshCw className="h-6 w-6 animate-spin text-purple-600" />
          </div>
        ) : pendingList.length === 0 ? (
          <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-xs">
            <CheckCircle2 className="mx-auto h-8 w-8 text-emerald-500 mb-2" />
            <p className="font-bold text-xs text-slate-800">No pending upgrade requests</p>
            <p className="text-[11px] text-slate-500">All received applications have been reviewed.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            {pendingList.map((req) => (
              <div
                key={req.id}
                className="rounded-2xl border border-slate-200 bg-white p-5 shadow-xs space-y-3"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <Building className="h-4 w-4 text-purple-600" />
                      <h3 className="font-black text-slate-900 text-sm">
                        {req.organization_name || req.business_name || 'Individual Organizer'}
                      </h3>
                    </div>
                    <p className="text-xs text-slate-500 mt-1 flex items-center gap-1.5">
                      <Phone className="h-3 w-3 text-slate-400" />
                      <span>{req.contact_phone || req.phone || 'Phone not provided'}</span>
                    </p>
                  </div>
                  <span className="rounded-md bg-amber-100 px-2 py-0.5 text-[10px] font-black uppercase text-amber-800">
                    Pending
                  </span>
                </div>

                {req.notes && (
                  <p className="rounded-xl bg-slate-50 p-2.5 text-xs text-slate-600 font-medium">
                    &ldquo;{req.notes}&rdquo;
                  </p>
                )}

                <div className="flex items-center justify-between pt-2 border-t border-slate-100 text-[11px] text-slate-400">
                  <span>Applied: {formatDate(req.created_at)}</span>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleReject(req)}
                      disabled={actionLoading === req.id}
                      className="rounded-lg border border-rose-200 bg-rose-50 px-2.5 py-1 font-bold text-rose-700 hover:bg-rose-100 cursor-pointer disabled:opacity-50"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => handleApprove(req)}
                      disabled={actionLoading === req.id}
                      className="rounded-lg bg-emerald-600 px-3 py-1 font-bold text-white hover:bg-emerald-700 cursor-pointer disabled:opacity-50 shadow-xs"
                    >
                      Approve
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* History */}
      {pastList.length > 0 && (
        <div className="space-y-4 pt-4">
          <h2 className="text-sm font-black uppercase tracking-wider text-slate-900">
            Application History
          </h2>
          <div className="rounded-2xl border border-slate-200 bg-white overflow-hidden shadow-xs">
            <div className="divide-y divide-slate-100">
              {pastList.map((req) => {
                const badge = getStatusBadge(req.status);
                return (
                  <div key={req.id} className="flex items-center justify-between p-4 text-xs">
                    <div>
                      <p className="font-bold text-slate-900">
                        {req.organization_name || req.business_name || 'Organizer Application'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        {req.contact_phone || req.phone} &bull; {formatDate(req.created_at)}
                      </p>
                    </div>
                    <span className={`rounded-md border px-2 py-0.5 text-[10px] font-bold ${badge.bg}`}>
                      {badge.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
