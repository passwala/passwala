'use client';

import React, { useState, useEffect } from 'react';
import { adminApi } from '@/lib/api-client';
import { DataTable, Column } from '@/components/DataTable';
import { getRoleBadge, formatDate } from '@/lib/utils';
import { toast } from 'react-hot-toast';
import { UserCheck, UserX, Shield, Edit, Trash2 } from 'lucide-react';

export default function UsersPage() {
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedUser, setSelectedUser] = useState<any | null>(null);
  const [newRole, setNewRole] = useState('');
  const [isUpdating, setIsUpdating] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminApi.fetchTable('users');
      if (res.data) {
        setUsers(res.data);
      }
    } catch (err: any) {
      toast.error('Failed to load users');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, []);

  const handleToggleSuspend = async (user: any) => {
    const isCurrentlySuspended = !!user.is_suspended;
    try {
      await adminApi.upsertRecord('users', {
        id: user.id,
        is_suspended: !isCurrentlySuspended
      });
      toast.success(isCurrentlySuspended ? 'User reactivated' : 'User account suspended');
      setUsers((prev) =>
        prev.map((u) => (u.id === user.id ? { ...u, is_suspended: !isCurrentlySuspended } : u))
      );
    } catch (err: any) {
      toast.error(err.message || 'Action failed');
    }
  };

  const handleUpdateRole = async () => {
    if (!selectedUser || !newRole) return;
    try {
      setIsUpdating(true);
      await adminApi.upsertRecord('users', {
        id: selectedUser.id,
        role: newRole
      });
      toast.success(`Role updated to ${newRole}`);
      setUsers((prev) =>
        prev.map((u) => (u.id === selectedUser.id ? { ...u, role: newRole } : u))
      );
      setSelectedUser(null);
    } catch (err: any) {
      toast.error(err.message || 'Failed to update role');
    } finally {
      setIsUpdating(false);
    }
  };

  const columns: Column<any>[] = [
    {
      key: 'full_name',
      header: 'User Info',
      render: (u) => (
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-purple-50 text-purple-700 font-extrabold text-xs shrink-0 border border-purple-100">
            {u.full_name ? u.full_name.charAt(0).toUpperCase() : (u.phone ? u.phone.slice(-2) : 'U')}
          </div>
          <div className="truncate">
            <p className="font-bold text-slate-900">{u.full_name || 'Passwala User'}</p>
            <p className="text-[11px] text-slate-500">{u.email || u.phone || 'No contact'}</p>
          </div>
        </div>
      )
    },
    {
      key: 'phone',
      header: 'Phone Number',
      render: (u) => <span className="font-semibold text-slate-800">{u.phone || '—'}</span>
    },
    {
      key: 'role',
      header: 'Platform Role',
      render: (u) => {
        const badge = getRoleBadge(u.role);
        return (
          <span className={`inline-flex items-center rounded-lg border px-2.5 py-1 text-[11px] font-bold ${badge.bg}`}>
            {badge.label}
          </span>
        );
      }
    },
    {
      key: 'is_suspended',
      header: 'Account Status',
      render: (u) => (
        <span
          className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-black uppercase ${
            u.is_suspended
              ? 'bg-rose-100 text-rose-700 border border-rose-200'
              : 'bg-emerald-100 text-emerald-700 border border-emerald-200'
          }`}
        >
          {u.is_suspended ? 'Suspended' : 'Active'}
        </span>
      )
    },
    {
      key: 'created_at',
      header: 'Joined Date',
      render: (u) => <span className="text-slate-500">{formatDate(u.created_at)}</span>
    },
    {
      key: 'actions',
      header: 'Actions',
      className: 'text-right',
      render: (u) => (
        <div className="flex items-center justify-end gap-2">
          <button
            onClick={() => {
              setSelectedUser(u);
              setNewRole(u.role || 'BUYER');
            }}
            title="Change Role"
            className="flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2 py-1 text-slate-700 hover:bg-slate-50 cursor-pointer text-[11px] font-bold"
          >
            <Edit className="h-3 w-3 text-purple-600" />
            <span>Role</span>
          </button>
          <button
            onClick={() => handleToggleSuspend(u)}
            title={u.is_suspended ? 'Reactivate' : 'Suspend'}
            className={`flex items-center gap-1 rounded-lg border px-2 py-1 cursor-pointer text-[11px] font-bold ${
              u.is_suspended
                ? 'border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100'
                : 'border-rose-200 bg-rose-50 text-rose-700 hover:bg-rose-100'
            }`}
          >
            {u.is_suspended ? <UserCheck className="h-3 w-3" /> : <UserX className="h-3 w-3" />}
            <span>{u.is_suspended ? 'Reactivate' : 'Suspend'}</span>
          </button>
        </div>
      )
    }
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black tracking-tight text-slate-900">Users Directory</h1>
        <p className="mt-1 text-xs font-semibold text-slate-500">
          Manage buyer accounts, platform roles, permissions, and security status.
        </p>
      </div>

      <DataTable
        title="Registered Accounts"
        description="Search by name, phone, or filter by user role"
        columns={columns}
        data={users}
        loading={loading}
        onRefresh={fetchUsers}
        searchPlaceholder="Search by name, phone, email..."
        searchKeys={['full_name', 'phone', 'email']}
        filterKey="role"
        filterOptions={[
          { label: 'Buyers', value: 'BUYER' },
          { label: 'Vendors', value: 'VENDOR' },
          { label: 'Organizers', value: 'ORGANIZER' },
          { label: 'Riders', value: 'RIDER' },
          { label: 'Admins', value: 'SUPERADMIN' }
        ]}
      />

      {/* Edit Role Modal */}
      {selectedUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4">
          <div className="w-full max-w-sm rounded-3xl bg-white p-6 shadow-xl border border-slate-100">
            <h3 className="text-base font-black text-slate-900">Change User Role</h3>
            <p className="mt-1 text-xs text-slate-500">
              Update platform permissions for <strong className="text-slate-900">{selectedUser.full_name || selectedUser.phone}</strong>.
            </p>

            <div className="mt-4 space-y-2">
              {['BUYER', 'VENDOR', 'ORGANIZER', 'RIDER', 'SUPERADMIN'].map((r) => (
                <label
                  key={r}
                  className={`flex items-center justify-between rounded-xl border p-3 cursor-pointer text-xs font-bold transition-all ${
                    newRole === r ? 'border-purple-600 bg-purple-50/60 text-purple-900' : 'border-slate-200 text-slate-700 hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <Shield className="h-4 w-4 text-purple-600" />
                    <span>{r}</span>
                  </div>
                  <input
                    type="radio"
                    name="roleOption"
                    value={r}
                    checked={newRole === r}
                    onChange={(e) => setNewRole(e.target.value)}
                    className="accent-purple-600"
                  />
                </label>
              ))}
            </div>

            <div className="mt-6 flex items-center justify-end gap-2">
              <button
                onClick={() => setSelectedUser(null)}
                className="rounded-xl border border-slate-200 px-3.5 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 cursor-pointer"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateRole}
                disabled={isUpdating}
                className="rounded-xl bg-purple-600 px-4 py-2 text-xs font-black text-white hover:bg-purple-700 disabled:opacity-50 cursor-pointer shadow-xs"
              >
                {isUpdating ? 'Saving...' : 'Save Role'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
