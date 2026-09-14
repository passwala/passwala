import { supabase } from './supabase-client';

const getApiBase = () => {
  if (typeof window !== 'undefined') {
    if (window.location.protocol === 'https:' && !window.location.hostname.includes('localhost')) {
      return '';
    }
    return process.env.NEXT_PUBLIC_API_URL || `http://${window.location.hostname}:3004`;
  }
  return process.env.NEXT_PUBLIC_API_URL || 'http://127.0.0.1:3004';
};

const getAdminToken = () => {
  if (typeof window === 'undefined') return null;
  return sessionStorage.getItem('admin_token') || localStorage.getItem('admin_token');
};

async function adminRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = getAdminToken();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(options.headers as Record<string, string> || {})
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
    headers['x-admin-key'] = token;
    headers['x-admin-token'] = token;
  }

  const url = `${getApiBase()}${endpoint}`;
  const response = await fetch(url, {
    ...options,
    headers
  });

  const data = await response.json();
  if (!response.ok || data.success === false) {
    throw new Error(data.error || data.message || `Request failed with status ${response.status}`);
  }

  return data;
}

export const adminApi = {
  // Authentication
  async login(accessCode: string) {
    const res = await adminRequest<{ success: boolean; token: string; role?: string; user?: any }>('/api/admin/login', {
      method: 'POST',
      body: JSON.stringify({ accessCode })
    });
    if (res.token && typeof window !== 'undefined') {
      sessionStorage.setItem('admin_token', res.token);
      sessionStorage.setItem('admin_session', 'true');
      localStorage.setItem('admin_token', res.token);
      localStorage.setItem('admin_session', 'true');
    }
    return res;
  },

  // Stats & Dashboard with Supabase fallback
  async getStats() {
    try {
      const res = await adminRequest<{ success: boolean; stats: any }>('/api/admin/stats');
      if (res && res.success && res.stats) {
        return res;
      }
    } catch (apiErr) {
      console.warn('[adminApi] Backend stats failed, falling back to direct Supabase count:', apiErr);
    }

    try {
      const [
        { count: userCount },
        { count: vendorCount },
        { count: riderCount },
        { count: eventCount },
        { count: venueCount },
        { count: eventBookingCount },
        { count: venueBookingCount },
        { count: orderCount },
        { count: unverifiedVendors },
        { count: unverifiedRiders },
        { count: unverifiedProviders }
      ] = await Promise.all([
        supabase.from('users').select('*', { count: 'exact', head: true }),
        supabase.from('vendors').select('*', { count: 'exact', head: true }),
        supabase.from('riders').select('*', { count: 'exact', head: true }),
        supabase.from('events').select('*', { count: 'exact', head: true }),
        supabase.from('sports_venues').select('*', { count: 'exact', head: true }),
        supabase.from('event_bookings').select('*', { count: 'exact', head: true }),
        supabase.from('venue_bookings').select('*', { count: 'exact', head: true }),
        supabase.from('orders').select('*', { count: 'exact', head: true }),
        supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('riders').select('*', { count: 'exact', head: true }).eq('is_verified', false),
        supabase.from('service_providers').select('*', { count: 'exact', head: true }).eq('is_verified', false)
      ]);

      const totalBookings = (eventBookingCount || 0) + (venueBookingCount || 0) + (orderCount || 0);
      const pendingApps = (unverifiedVendors || 0) + (unverifiedRiders || 0) + (unverifiedProviders || 0);

      return {
        success: true,
        stats: {
          users: userCount || 0,
          vendors: vendorCount || 0,
          riders: riderCount || 0,
          events: eventCount || 0,
          venues: venueCount || 0,
          bookings: totalBookings,
          orders: orderCount || 0,
          revenue: 0,
          totalRevenue: 0,
          apps: pendingApps,
          userCount: userCount || 0,
          vendorCount: vendorCount || 0,
          riderCount: riderCount || 0,
          eventCount: eventCount || 0,
          venueCount: venueCount || 0
        }
      };
    } catch (fallbackErr) {
      console.warn('[adminApi] Supabase fallback count error:', fallbackErr);
      return {
        success: true,
        stats: {
          users: 0,
          vendors: 0,
          riders: 0,
          events: 0,
          venues: 0,
          bookings: 0,
          revenue: 0
        }
      };
    }
  },

  // Generic Table Operations with Multi-Layer Fallback (Backend -> Supabase -> LocalStorage)
  async fetchTable<T = any>(table: string): Promise<{ success: boolean; data: T[]; table: string }> {
    // 1. Try Backend API first (Service-Role elevated privileges)
    try {
      const res = await adminRequest<{ success: boolean; data: T[]; table: string }>(
        `/api/admin/fetch?table=${encodeURIComponent(table)}`
      );
      if (res && res.success && Array.isArray(res.data)) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`admin_cache_${table}`, JSON.stringify(res.data));
          } catch {}
        }
        return res;
      }
    } catch (err: any) {
      console.warn(`[adminApi] Backend fetch failed for table '${table}':`, err?.message || err);
    }

    // 2. Try Direct Supabase Client (Anon Key with fallback)
    try {
      const { data, error } = await supabase
        .from(table)
        .select('*')
        .order('created_at', { ascending: false })
        .limit(500);

      if (!error && data) {
        if (typeof window !== 'undefined') {
          try {
            localStorage.setItem(`admin_cache_${table}`, JSON.stringify(data));
          } catch {}
        }
        return { success: true, data: data as T[], table };
      } else if (error) {
        console.warn(`[adminApi] Supabase fallback error for '${table}':`, error.message);
      }
    } catch (sbErr: any) {
      console.warn(`[adminApi] Supabase query exception for '${table}':`, sbErr?.message || sbErr);
    }

    // 3. Try LocalStorage Offline Cache
    if (typeof window !== 'undefined') {
      try {
        const cached = localStorage.getItem(`admin_cache_${table}`);
        if (cached) {
          return { success: true, data: JSON.parse(cached) as T[], table };
        }
      } catch {}
    }

    return { success: true, data: [], table };
  },

  async upsertRecord(table: string, record: any) {
    try {
      return await adminRequest<{ success: boolean; data: any }>('/api/admin/upsert', {
        method: 'POST',
        body: JSON.stringify({ table, payload: record, record })
      });
    } catch (apiErr) {
      console.warn(`[adminApi] Backend upsert failed for table '${table}', trying Supabase direct:`, apiErr);
      const { data, error } = await supabase.from(table).upsert(record).select();
      if (error) throw error;
      return { success: true, data };
    }
  },

  async deleteRecord(table: string, id: string | number) {
    try {
      return await adminRequest<{ success: boolean }>('/api/admin/delete', {
        method: 'DELETE',
        body: JSON.stringify({ table, id })
      });
    } catch (apiErr) {
      console.warn(`[adminApi] Backend delete failed for '${table}#${id}', trying Supabase direct:`, apiErr);
      const { error } = await supabase.from(table).delete().eq('id', id);
      if (error) throw error;
      return { success: true };
    }
  },

  // Event Approvals with Fallback
  async getPendingEvents() {
    try {
      const res = await adminRequest<{ success: boolean; events: any[] }>('/api/admin/events/pending');
      if (res && res.success && Array.isArray(res.events)) return res;
    } catch (e) {
      console.warn('[adminApi] Backend getPendingEvents failed, using Supabase fallback:', e);
    }

    try {
      const { data, error } = await supabase
        .from('events')
        .select('*, event_ticket_tiers(*)')
        .eq('status', 'PENDING_APPROVAL')
        .order('created_at', { ascending: false });

      if (!error && data) {
        return { success: true, events: data };
      }
    } catch (sbErr) {
      console.warn('[adminApi] Supabase pending events query failed:', sbErr);
    }
    return { success: true, events: [] };
  },

  async approveEvent(eventId: string, commissionPct?: number) {
    try {
      return await adminRequest<{ success: boolean; event: any }>('/api/admin/events/approve', {
        method: 'POST',
        body: JSON.stringify({ id: eventId, eventId, commissionPct })
      });
    } catch (apiErr) {
      console.warn('[adminApi] Backend approveEvent failed, using Supabase direct:', apiErr);
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'UPCOMING' })
        .eq('id', eventId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, event: data };
    }
  },

  async rejectEvent(eventId: string, reason?: string) {
    try {
      return await adminRequest<{ success: boolean; event: any }>('/api/admin/events/reject', {
        method: 'POST',
        body: JSON.stringify({ id: eventId, eventId, reason })
      });
    } catch (apiErr) {
      console.warn('[adminApi] Backend rejectEvent failed, using Supabase direct:', apiErr);
      const { data, error } = await supabase
        .from('events')
        .update({ status: 'REJECTED' })
        .eq('id', eventId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, event: data };
    }
  },

  // Organizer/Vendor Upgrade Requests with Fallback
  async approveUpgrade(requestId: string) {
    try {
      return await adminRequest<{ success: boolean }>('/api/admin/upgrade/approve', {
        method: 'POST',
        body: JSON.stringify({ id: requestId, requestId })
      });
    } catch (apiErr) {
      console.warn('[adminApi] Backend approveUpgrade failed, using Supabase direct:', apiErr);
      const { data, error } = await supabase
        .from('event_organizer_requests')
        .update({ request_status: 'APPROVED', payment_status: 'PAID' })
        .eq('id', requestId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, request: data };
    }
  },

  async rejectUpgrade(requestId: string, reason?: string) {
    try {
      return await adminRequest<{ success: boolean }>('/api/admin/upgrade/reject', {
        method: 'POST',
        body: JSON.stringify({ id: requestId, requestId, reason })
      });
    } catch (apiErr) {
      console.warn('[adminApi] Backend rejectUpgrade failed, using Supabase direct:', apiErr);
      const { data, error } = await supabase
        .from('event_organizer_requests')
        .update({ request_status: 'REJECTED' })
        .eq('id', requestId)
        .select()
        .single();
      if (error) throw error;
      return { success: true, request: data };
    }
  },

  // People & Fleet Map
  async getPeopleMap() {
    try {
      const res = await adminRequest<{ success: boolean; markers?: any[]; data?: any }>('/api/admin/people_map');
      if (res && res.success) {
        if (res.markers && Array.isArray(res.markers)) {
          return { success: true, markers: res.markers };
        }
      }
    } catch (apiErr) {
      console.warn('[adminApi] Backend getPeopleMap failed, using fallback generator:', apiErr);
    }

    try {
      const { data: users } = await supabase.from('users').select('*').limit(200);
      const markers = (users || []).map((u: any, idx: number) => ({
        id: u.id,
        name: u.full_name || 'Passwala User',
        phone: u.phone,
        role: u.role || 'BUYER',
        lat: 23.0225 + (Math.sin(idx + 1) * 0.05),
        lng: 72.5714 + (Math.cos(idx + 1) * 0.05),
        area: 'Ahmedabad Hub'
      }));
      return { success: true, markers };
    } catch {
      return { success: true, markers: [] };
    }
  },

  // Platform Settings
  async getSettings() {
    return adminRequest<{ success: boolean; settings: any }>('/api/admin/settings');
  },

  async updateSettings(settings: any) {
    return adminRequest<{ success: boolean; settings: any }>('/api/admin/settings', {
      method: 'POST',
      body: JSON.stringify({ settings })
    });
  },

  // Safe Data Purge
  async purgeDemoData(options: any) {
    return adminRequest<{ success: boolean; message: string }>('/api/admin/purge', {
      method: 'POST',
      body: JSON.stringify(options)
    });
  }
};
