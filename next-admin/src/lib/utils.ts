import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function formatCurrency(amount: number | string | undefined | null): string {
  const num = typeof amount === 'string' ? parseFloat(amount) : (amount || 0);
  if (isNaN(num)) return '₹0';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2
  }).format(num);
}

export function formatDate(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  } catch {
    return '—';
  }
}

export function formatDateTime(dateStr: string | undefined | null): string {
  if (!dateStr) return '—';
  try {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return '—';
    return d.toLocaleString('en-IN', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '—';
  }
}

export function getStatusBadge(status: string | undefined | null): { bg: string; text: string; label: string } {
  const s = (status || '').toUpperCase();
  switch (s) {
    case 'ACTIVE':
    case 'CONFIRMED':
    case 'APPROVED':
    case 'COMPLETED':
    case 'VERIFIED':
      return { bg: 'bg-emerald-50 border-emerald-200 text-emerald-700', text: 'text-emerald-700', label: s };
    case 'PENDING':
    case 'UPCOMING':
      return { bg: 'bg-amber-50 border-amber-200 text-amber-700', text: 'text-amber-700', label: s };
    case 'REJECTED':
    case 'CANCELLED':
    case 'SUSPENDED':
    case 'FAILED':
      return { bg: 'bg-rose-50 border-rose-200 text-rose-700', text: 'text-rose-700', label: s };
    case 'ONGOING':
      return { bg: 'bg-blue-50 border-blue-200 text-blue-700', text: 'text-blue-700', label: s };
    default:
      return { bg: 'bg-slate-50 border-slate-200 text-slate-700', text: 'text-slate-700', label: s || 'UNKNOWN' };
  }
}

export function getRoleBadge(role: string | undefined | null): { bg: string; text: string; label: string } {
  const r = (role || 'BUYER').toUpperCase();
  switch (r) {
    case 'SUPERADMIN':
    case 'ADMIN':
      return { bg: 'bg-purple-50 border-purple-200 text-purple-700', text: 'text-purple-700', label: 'Admin' };
    case 'VENDOR':
      return { bg: 'bg-orange-50 border-orange-200 text-orange-700', text: 'text-orange-700', label: 'Vendor' };
    case 'ORGANIZER':
      return { bg: 'bg-indigo-50 border-indigo-200 text-indigo-700', text: 'text-indigo-700', label: 'Organizer' };
    case 'RIDER':
      return { bg: 'bg-blue-50 border-blue-200 text-blue-700', text: 'text-blue-700', label: 'Rider' };
    case 'BUYER':
    default:
      return { bg: 'bg-slate-100 border-slate-200 text-slate-700', text: 'text-slate-700', label: 'Customer' };
  }
}
