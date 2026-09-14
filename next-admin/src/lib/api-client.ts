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
    if (res.token) {
      sessionStorage.setItem('admin_token', res.token);
      sessionStorage.setItem('admin_session', 'true');
    }
    return res;
  },

  // Stats & Dashboard
  async getStats() {
    return adminRequest<{ success: boolean; stats: any }>('/api/admin/stats');
  },

  // Generic Table Operations
  async fetchTable<T = any>(table: string) {
    return adminRequest<{ success: boolean; data: T[]; table: string }>(`/api/admin/fetch?table=${encodeURIComponent(table)}`);
  },

  async upsertRecord(table: string, record: any) {
    return adminRequest<{ success: boolean; data: any }>('/api/admin/upsert', {
      method: 'POST',
      body: JSON.stringify({ table, record })
    });
  },

  async deleteRecord(table: string, id: string | number) {
    return adminRequest<{ success: boolean }>('/api/admin/delete', {
      method: 'DELETE',
      body: JSON.stringify({ table, id })
    });
  },

  // Event Approvals
  async getPendingEvents() {
    return adminRequest<{ success: boolean; events: any[] }>('/api/admin/events/pending');
  },

  async approveEvent(eventId: string, commissionPct?: number) {
    return adminRequest<{ success: boolean; event: any }>('/api/admin/events/approve', {
      method: 'POST',
      body: JSON.stringify({ eventId, commissionPct })
    });
  },

  async rejectEvent(eventId: string, reason?: string) {
    return adminRequest<{ success: boolean; event: any }>('/api/admin/events/reject', {
      method: 'POST',
      body: JSON.stringify({ eventId, reason })
    });
  },

  // Organizer/Vendor Upgrade Requests
  async approveUpgrade(requestId: string) {
    return adminRequest<{ success: boolean }>('/api/admin/upgrade/approve', {
      method: 'POST',
      body: JSON.stringify({ requestId })
    });
  },

  async rejectUpgrade(requestId: string, reason?: string) {
    return adminRequest<{ success: boolean }>('/api/admin/upgrade/reject', {
      method: 'POST',
      body: JSON.stringify({ requestId, reason })
    });
  },

  // People & Fleet Map
  async getPeopleMap() {
    return adminRequest<{ success: boolean; markers: any[] }>('/api/admin/people_map');
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
