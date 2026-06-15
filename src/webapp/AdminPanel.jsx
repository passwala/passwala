import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import {
  BarChart3,
  ShoppingBag,
  Wrench,
  Tag,
  Sparkles,
  Users,
  FileText,
  LogOut,
  Plus,
  Trash2,
  ChevronRight,
  Database,
  ArrowLeft,
  Search,
  CheckCircle,
  XCircle,
  Edit2,
  X,
  History,
  TrendingUp,
  Package,
  Menu,
  Bike,
  CreditCard,
  MessageSquare,
  Bell,
  Settings,
  ShieldCheck,
  UserPlus,
  Truck,
  Heart,
  Briefcase,
  Calendar,
  MapPin,
  Map,
  Navigation,
  Layers,
  Clock,
  Download
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import GoogleMapWrapper from '../utils/GoogleMapWrapper';
import './AdminPanel.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a secure client using the public anon key for real-time order updates
const adminSupabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

const API_URL = window.location.protocol === 'https:' 
  ? '' 
  : (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3004`);
const ActivityFeed = ({ onLogout }) => {
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = useCallback(async () => {
    try {
      const adminKey = sessionStorage.getItem('admin_token') || '';
      const res = await fetch(`${API_URL}/api/admin/fetch?table=orders`, { headers: { 'x-admin-key': adminKey } });
      if (res.status === 401) {
        if (onLogout) onLogout();
        return;
      }
      const json = await res.json();
      if (json.success && json.data) {
        setRecent(json.data.slice(0, 5));
      } else {
        // Fallback to local cache if offline
        const cached = localStorage.getItem('admin_cache_orders');
        if (cached) {
          setRecent(JSON.parse(cached).slice(0, 5));
        }
      }
    } catch (err) { 
      console.error(err); 
      // Fallback to local cache if offline
      const cached = localStorage.getItem('admin_cache_orders');
      if (cached) {
        setRecent(JSON.parse(cached).slice(0, 5));
      }
    } finally { 
      setLoading(false); 
    }
  }, [onLogout]);

  useEffect(() => {
    fetchRecent();

    if (!adminSupabase) return;

    // ⚡ REAL-TIME: Listen for any new orders platform-wide
    const channel = adminSupabase
      .channel('admin-activity-pulse')
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'orders'
      }, (payload) => {
        setRecent(prev => [payload.new, ...prev].slice(0, 5));
        toast.success("New platform order detected!");
      })
      .subscribe();

    return () => {
      adminSupabase.removeChannel(channel);
    };
  }, [fetchRecent]);

  if (loading) return <div style={{ padding: '1rem', color: '#64748b' }}>Syncing feed...</div>;

  return (
    <div className="activity-list">
      {recent.length === 0 ? <p style={{ padding: '1rem', color: '#64748b' }}>No recent activity.</p> :
        recent.map(b => (
          <div className="trend-item" key={b.id} style={{ borderLeft: '3px solid #6366f1', paddingLeft: '10px', marginBottom: '8px' }}>
            <strong>New Order:</strong> <span>#{b.id.substring(0, 6)} (₹{b.total_amount || 0})</span>
            <div style={{ fontSize: '10px', color: '#94a3b8' }}>{new Date(b.created_at).toLocaleTimeString()}</div>
          </div>
        ))
      }
    </div>
  );
};

const TABLE_SCHEMAS = {
  users: { phone: '', full_name: '', email: '', role: 'BUYER', photo_url: '', is_suspended: false },
  admins: { username: '', password_hash: '', role: 'SUPERADMIN' },
  vendors: { phone: '', full_name: '', name: '', user_id: '', business_name: '', aadhar_no: '', license_no: '', address: '', category: '', is_verified: false, profile_completed: false },
  riders: { phone: '', full_name: '', user_id: '', vehicle_no: '', license_no: '', id_proof: '', is_active: false, is_verified: false, rating: 0, total_deliveries: 0 },
  service_providers: { phone: '', full_name: '', user_id: '', business_name: '', aadhar_no: '', license_no: '', is_verified: false },
  services: { provider_id: '', category_id: '', title: '', description: '', price: 0, duration_minutes: 0 },
  products: { store_id: '', category_id: '', name: '', description: '', price: 0, discount_price: 0, image_url: '', is_active: true },
  service_bookings: { user_id: '', service_id: '', provider_id: '', address_id: '', status: 'PENDING', total_amount: 0, scheduled_at: '' },
  deals: { store_id: '', title: '', discount_percentage: 0, valid_until: '' },
  posts: { user_id: '', content: '', image_url: '', likes_count: 0 },
  notifications: { user_id: '', title: '', message: '', is_read: false },
  service_areas: { city: 'Ahmedabad', area_name: '', is_active: true },
  stores: { vendor_id: '', name: '', description: '', address: '', is_open: true, rating: 0 },
  service_categories: { name: '', icon_url: '' },
  orders: { user_id: '', store_id: '', address_id: '', status: 'PENDING', subtotal: 0, delivery_fee: 0, total_amount: 0, payment_status: 'PENDING' },
  events: { title: '', category: '', venue_name: '', venue_lat: 23.0225, venue_lng: 72.5714, event_date: '', ends_at: '', status: 'UPCOMING', banner_url: '', starting_price: 0, show_type: 'single', visibility: 'public', is_online: false, booking_start: '', booking_end: '' },
  event_bookings: { user_id: '', event_id: '', tier_id: '', ticket_count: 0, total_amount: 0, status: 'CONFIRMED' },
  city_routes: { start_area: '', end_area: '', distance_km: 0, base_price: 0, is_active: true },
  city_vehicles: { driver_id: '', vehicle_type: '', license_plate: '', total_seats: 0, available_seats: 0, is_active: true },
  ticket_bookings: { user_id: '', route_id: '', vehicle_id: '', pickup_area: '', drop_area: '', total_price: 0, seat_count: 0, status: 'CONFIRMED' }
};

const DATABASE_SCHEMAS = {
  users: ['phone', 'full_name', 'email', 'photo_url', 'role', 'is_suspended'],
  vendors: ['user_id', 'phone', 'is_verified', 'name', 'business_name', 'aadhar_no', 'license_no', 'address', 'category', 'profile_completed'],
  riders: ['user_id', 'vehicle_no', 'license_no', 'id_proof', 'is_active', 'is_verified', 'rating', 'total_deliveries'],
  service_providers: ['user_id', 'business_name', 'about', 'rating', 'is_verified', 'phone', 'full_name', 'name', 'aadhar_no', 'license_no', 'address', 'profile_completed'],
  services: ['provider_id', 'category_id', 'title', 'description', 'price', 'duration_minutes'],
  products: ['store_id', 'category_id', 'name', 'description', 'price', 'discount_price', 'image_url', 'is_active'],
  service_bookings: ['user_id', 'service_id', 'provider_id', 'address_id', 'status', 'total_amount', 'scheduled_at'],
  deals: ['store_id', 'title', 'discount_percentage', 'valid_until'],
  posts: ['user_id', 'content', 'image_url', 'likes_count'],
  notifications: ['user_id', 'title', 'message', 'is_read'],
  service_areas: ['city', 'area_name', 'is_active'],
  admins: ['username', 'role'],
  stores: ['vendor_id', 'name', 'description', 'logo_url', 'banner_url', 'address', 'lat', 'lng', 'is_open', 'rating'],
  orders: ['user_id', 'store_id', 'address_id', 'status', 'subtotal', 'delivery_fee', 'total_amount', 'payment_status'],
  events: ['title', 'category', 'venue_name', 'venue_lat', 'venue_lng', 'event_date', 'ends_at', 'status', 'banner_url', 'starting_price', 'show_type', 'visibility', 'is_online', 'booking_start', 'booking_end'],
  event_bookings: ['user_id', 'event_id', 'tier_id', 'ticket_count', 'total_amount', 'status'],
  city_routes: ['start_area', 'end_area', 'distance_km', 'base_price', 'is_active'],
  city_vehicles: ['driver_id', 'vehicle_type', 'license_plate', 'total_seats', 'available_seats', 'is_active'],
  ticket_bookings: ['user_id', 'route_id', 'vehicle_id', 'pickup_area', 'drop_area', 'total_price', 'seat_count', 'status']
};

const tabSections = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard_panel', label: 'Dashboard', icon: BarChart3 },
      { id: 'people_map_panel', label: 'People Map', icon: Map, table: 'users' },
      { id: 'users_panel', label: 'Users', icon: Users, table: 'users' },
      { id: 'vendors_panel', label: 'Vendors', icon: ShoppingBag, table: 'vendors' },
      { id: 'riders_panel', label: 'Riders', icon: Truck, table: 'riders' },
    ]
  },
  {
    label: 'Services',
    items: [
      { id: 'providers_panel', label: 'Service Providers', icon: Heart, table: 'service_providers' },
      { id: 'services_panel', label: 'Service List', icon: Briefcase, table: 'services' },
      { id: 'bookings_panel', label: 'Bookings', icon: Calendar, table: 'service_bookings' },
    ]
  },
  {
    label: 'Marketplace',
    items: [
      { id: 'stores_panel', label: 'Stores', icon: ShoppingBag, table: 'stores' },
      { id: 'products_panel', label: 'Products', icon: Package, table: 'products' },
      { id: 'orders_panel', label: 'Product Orders', icon: ShoppingBag, table: 'orders' },
      { id: 'payments_panel', label: 'Payments', icon: CreditCard, table: 'service_bookings' },
      { id: 'deals_panel', label: 'Deals & Offers', icon: Tag, table: 'deals' },
    ]
  },
  {
    label: 'Content',
    items: [
      { id: 'community_panel', label: 'Community', icon: MessageSquare, table: 'posts' },
      { id: 'notifications_panel', label: 'Notifications', icon: Bell, table: 'notifications' },
    ]
  },
  {
    label: 'City & Events',
    items: [
      { id: 'city_routes_panel', label: 'City Routes', icon: Navigation, table: 'city_routes' },
      { id: 'city_vehicles_panel', label: 'City Vehicles', icon: Truck, table: 'city_vehicles' },
      { id: 'ticket_bookings_panel', label: 'Ride Bookings', icon: MapPin, table: 'ticket_bookings' },
      { id: 'events_panel', label: 'Events', icon: Sparkles, table: 'events' },
      { id: 'event_bookings_panel', label: 'Event Bookings', icon: Calendar, table: 'event_bookings' },
      { id: 'event_approvals_panel', label: 'Event Approvals', icon: ShieldCheck },
      { id: 'upgrade_requests_panel', label: 'Upgrade Requests', icon: ShieldCheck },
    ]
  },
  {
    label: 'System',
    items: [
      { id: 'areas_panel', label: 'Service Areas', icon: MapPin, table: 'service_areas' },
      { id: 'reports_panel', label: 'Reports', icon: TrendingUp },
      { id: 'settings_panel', label: 'Settings', icon: Settings },
    ]
  }
];

// Mock data removed as platform is now fully integrated with Supabase.

// --- Google Maps SVG Icons for Admin Map ---
const getAdminMapMarkerSvg = (color) => `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
  <ellipse cx="16" cy="38" rx="8" ry="4" fill="rgba(0,0,0,0.2)"/>
  <path d="M16 0C8.27 0 2 6.27 2 14c0 9.75 14 28 14 28S30 23.75 30 14C30 6.27 23.73 0 16 0z" fill="${color}"/>
  <circle cx="16" cy="14" r="7" fill="white" fill-opacity="0.8"/>
</svg>`;

const ADMIN_MARKER_COLORS = {
  red: '#ef4444',
  green: '#22c55e',
  orange: '#f97316',
  violet: '#a855f7',
  blue: '#3b82f6'
};

const TABS = tabSections.flatMap(s => s.items);

const formatDateForInput = (val) => {
  if (!val) return '';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return '';
    const pad = (n) => String(n).padStart(2, '0');
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  } catch (e) {
    return '';
  }
};

// ── Event Approvals Panel ─────────────────────────────────────────
const EventApprovalsPanel = ({ API_URL }) => {
  const [events, setEvents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(null);

  const adminKey = sessionStorage.getItem('admin_token') || '';

  const fetchPending = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/events/pending`, {
        headers: { 'x-admin-key': adminKey }
      });
      const data = await res.json();
      setEvents(data.events || []);
    } catch (err) {
      toast.error('Failed to load pending events');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchPending(); }, []);

  const handleAction = async (id, action) => {
    setActionLoading(id + action);
    try {
      const res = await fetch(`${API_URL}/api/admin/events/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'approve' ? '✅ Event approved! Visible to buyers.' : '❌ Event rejected.');
        setEvents(prev => prev.filter(e => e.id !== id));
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  return (
    <div style={{ padding: '0 0 4rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="admin-hero-title" style={{ marginBottom: '0.25rem' }}>Event Approvals</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            Review and approve events before they go live to buyers.
          </p>
        </div>
        <span style={{ marginLeft: 'auto', background: '#ff6b00', color: '#fff', borderRadius: '20px', padding: '4px 14px', fontWeight: 700, fontSize: '0.85rem' }}>
          {events.length} Pending
        </span>
        <button onClick={fetchPending} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading pending events...</div>
      ) : events.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
          <ShieldCheck size={48} color="#22c55e" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#166534', margin: '0 0 0.5rem' }}>All Clear!</h3>
          <p style={{ color: '#64748b', margin: 0 }}>No events are pending approval right now.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {events.map(event => {
            const minPrice = event.event_ticket_tiers?.length
              ? Math.min(...event.event_ticket_tiers.map(t => t.price))
              : 0;
            return (
              <div key={event.id} style={{ background: '#fff', borderRadius: '20px', overflow: 'hidden', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0', display: 'flex', gap: 0 }}>
                {/* Banner */}
                <div style={{ width: '200px', minWidth: '200px', height: '160px', background: '#1e293b', flexShrink: 0, position: 'relative' }}>
                  {event.banner_url && (
                    <img src={event.banner_url} alt={event.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  )}
                  <span style={{ position: 'absolute', top: 10, left: 10, background: '#f59e0b', color: '#fff', borderRadius: '10px', padding: '3px 10px', fontSize: '0.7rem', fontWeight: 700 }}>
                    ⏳ PENDING
                  </span>
                </div>

                {/* Details */}
                <div style={{ flex: 1, padding: '1.25rem 1.5rem', display: 'flex', flexDirection: 'column', gap: '0.4rem' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                    <div>
                      <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{event.title}</h3>
                      <span style={{ background: '#f1f5f9', color: '#475569', borderRadius: '8px', padding: '2px 10px', fontSize: '0.75rem', fontWeight: 600 }}>{event.category}</span>
                    </div>
                    <span style={{ fontWeight: 800, fontSize: '1.1rem', color: '#ff6b00' }}>from ₹{minPrice}</span>
                  </div>

                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: '0.25rem 0', lineHeight: 1.5 }}>
                    {event.description?.slice(0, 120)}{event.description?.length > 120 ? '...' : ''}
                  </p>

                  <div style={{ display: 'flex', gap: '1.5rem', fontSize: '0.8rem', color: '#64748b', marginTop: '0.25rem' }}>
                    <span>📅 {formatDate(event.event_date)}</span>
                    <span>📍 {event.venue_name}</span>
                    <span>🎟 {event.event_ticket_tiers?.length || 0} tier(s)</span>
                  </div>

                  {/* Actions */}
                  <div style={{ display: 'flex', gap: '0.75rem', marginTop: 'auto', paddingTop: '0.75rem', borderTop: '1px dashed #e2e8f0' }}>
                    <button
                      onClick={() => handleAction(event.id, 'approve')}
                      disabled={actionLoading === event.id + 'approve'}
                      style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: actionLoading === event.id + 'approve' ? 0.6 : 1 }}
                    >
                      {actionLoading === event.id + 'approve' ? 'Approving...' : '✅ Approve'}
                    </button>
                    <button
                      onClick={() => handleAction(event.id, 'reject')}
                      disabled={actionLoading === event.id + 'reject'}
                      style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: actionLoading === event.id + 'reject' ? 0.6 : 1 }}
                    >
                      {actionLoading === event.id + 'reject' ? 'Rejecting...' : '❌ Reject'}
                    </button>
                    <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#94a3b8', alignSelf: 'center' }}>
                      Submitted {formatDate(event.created_at)}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};

// ── Upgrade Requests Panel ─────────────────────────────────────────
const UpgradeRequestsPanel = ({ API_URL }) => {
  const [requests, setRequests] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [actionLoading, setActionLoading] = React.useState(null);

  const adminKey = sessionStorage.getItem('admin_token') || '';

  const fetchRequests = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/fetch?table=event_organizer_requests`, {
        headers: { 'x-admin-key': adminKey }
      });
      const data = await res.json();
      if (data.success) {
        const sorted = (data.data || []).sort((a, b) => {
          if (a.request_status === 'SUBMITTED' && b.request_status !== 'SUBMITTED') return -1;
          if (a.request_status !== 'SUBMITTED' && b.request_status === 'SUBMITTED') return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
        setRequests(sorted);
      } else {
        toast.error(data.error || 'Failed to load requests');
      }
    } catch (err) {
      toast.error('Failed to load upgrade requests');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => { fetchRequests(); }, []);

  const handleAction = async (id, action) => {
    setActionLoading(id + action);
    try {
      const res = await fetch(`${API_URL}/api/admin/upgrade/${action}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'x-admin-key': adminKey },
        body: JSON.stringify({ id })
      });
      const data = await res.json();
      if (data.success) {
        toast.success(action === 'approve' ? '✅ Upgrade approved! Vendor role is now EVENT_ORGANIZER.' : '❌ Upgrade rejected.');
        fetchRequests();
      } else {
        toast.error(data.error || 'Action failed');
      }
    } catch (err) {
      toast.error('Network error');
    } finally {
      setActionLoading(null);
    }
  };

  const formatDate = (d) => d ? new Date(d).toLocaleString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—';

  const pendingCount = requests.filter(r => r.request_status === 'SUBMITTED').length;

  return (
    <div style={{ padding: '0 0 4rem 0' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <div>
          <h1 className="admin-hero-title" style={{ marginBottom: '0.25rem' }}>Upgrade Requests</h1>
          <p style={{ color: '#64748b', margin: 0 }}>
            Approve shop vendors requesting to unlock Event Organizer privileges.
          </p>
        </div>
        <span style={{ marginLeft: 'auto', background: '#ff6b00', color: '#fff', borderRadius: '20px', padding: '4px 14px', fontWeight: 700, fontSize: '0.85rem' }}>
          {pendingCount} Pending
        </span>
        <button onClick={fetchRequests} style={{ background: '#f1f5f9', border: 'none', borderRadius: '10px', padding: '8px 16px', cursor: 'pointer', fontWeight: 600, fontSize: '0.85rem' }}>
          ↻ Refresh
        </button>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '4rem', color: '#94a3b8' }}>Loading requests...</div>
      ) : requests.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '4rem 2rem', background: '#f8fafc', borderRadius: '20px', border: '2px dashed #e2e8f0' }}>
          <ShieldCheck size={48} color="#22c55e" style={{ marginBottom: '1rem' }} />
          <h3 style={{ color: '#166534', margin: '0 0 0.5rem' }}>All Clear!</h3>
          <p style={{ color: '#64748b', margin: 0 }}>No upgrade requests found in the system.</p>
        </div>
      ) : (
        <div style={{ display: 'grid', gap: '1.5rem' }}>
          {requests.map(req => (
            <div key={req.id} style={{ background: '#fff', borderRadius: '20px', padding: '1.5rem', boxShadow: '0 2px 12px rgba(0,0,0,0.07)', border: '1px solid #e2e8f0', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div>
                  <h3 style={{ margin: '0 0 0.25rem', fontSize: '1.1rem', fontWeight: 800, color: '#0f172a' }}>{req.business_name}</h3>
                  <p style={{ color: '#64748b', fontSize: '0.85rem', margin: 0 }}>
                    Vendor User ID: <span style={{ fontFamily: 'monospace', background: '#f1f5f9', padding: '2px 6px', borderRadius: '4px' }}>{req.user_id}</span>
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{
                    background: req.request_status === 'PENDING' ? '#f59e0b' : req.request_status === 'APPROVED' ? '#22c55e' : '#ef4444',
                    color: '#fff',
                    borderRadius: '10px',
                    padding: '4px 12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    display: 'inline-block',
                    marginBottom: '0.25rem'
                  }}>
                    {req.request_status}
                  </span>
                  <div style={{ fontSize: '0.8rem', color: '#64748b' }}>
                    Payment: <span style={{ fontWeight: 700, color: req.payment_status === 'PAID' ? '#22c55e' : '#f59e0b' }}>{req.payment_status}</span> (₹{req.payment_amount})
                  </div>
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '1rem', background: '#f8fafc', padding: '1rem', borderRadius: '12px', fontSize: '0.85rem' }}>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Requested Console</span>
                  <strong style={{ color: '#ff6b00', textTransform: 'uppercase' }}>{req.target_console || 'event'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Aadhaar Card No.</span>
                  <strong style={{ color: '#0f172a' }}>{req.aadhar_no || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Phone Contact</span>
                  <strong style={{ color: '#0f172a' }}>{req.phone || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Payment ID</span>
                  <strong style={{ color: '#0f172a', fontFamily: 'monospace' }}>{req.payment_id || '—'}</strong>
                </div>
                <div>
                  <span style={{ color: '#64748b', display: 'block' }}>Submitted At</span>
                  <strong style={{ color: '#0f172a' }}>{formatDate(req.created_at)}</strong>
                </div>
              </div>

              {req.request_status === 'SUBMITTED' && (
                <div style={{ display: 'flex', gap: '0.75rem', borderTop: '1px dashed #e2e8f0', paddingTop: '1rem' }}>
                  <button
                    onClick={() => handleAction(req.id, 'approve')}
                    disabled={actionLoading === req.id + 'approve'}
                    style={{ background: '#22c55e', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: actionLoading === req.id + 'approve' ? 0.6 : 1 }}
                  >
                    {actionLoading === req.id + 'approve' ? 'Approving...' : '✅ Approve & Upgrade'}
                  </button>
                  <button
                    onClick={() => handleAction(req.id, 'reject')}
                    disabled={actionLoading === req.id + 'reject'}
                    style={{ background: '#ef4444', color: '#fff', border: 'none', padding: '8px 20px', borderRadius: '10px', fontWeight: 700, cursor: 'pointer', fontSize: '0.85rem', opacity: actionLoading === req.id + 'reject' ? 0.6 : 1 }}
                  >
                    {actionLoading === req.id + 'reject' ? 'Rejecting...' : '❌ Reject'}
                  </button>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const AdminPanel = ({ onLogout, location, setLocation }) => {
  const handleLocationClick = async () => {
    if (!navigator.geolocation) {
      toast.error('Geolocation is not supported by your browser');
      return;
    }

    toast.loading('Detecting your GPS location...', { id: 'admin-geo' });

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18`, {
            headers: {
              'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)'
            }
          });
          const data = await res.json();
          if (data.address) {
            const area = data.address.suburb || data.address.neighbourhood || data.address.residential || data.address.village || '';
            const city = data.address.city || data.address.town || data.address.state_district || '';
            
            if (area && city) {
              const fullAddr = `${area}, ${city}`;
              if (setLocation) setLocation(fullAddr, { lat: latitude, lng: longitude });
              toast.success(`Location updated to: ${area}`, { id: 'admin-geo' });
            } else if (city) {
              const state = data.address.state || '';
              const fullAddr = `${city}${state ? `, ${state}` : ''}`;
              if (setLocation) setLocation(fullAddr, { lat: latitude, lng: longitude });
              toast.success(`Location updated to: ${city}`, { id: 'admin-geo' });
            } else {
              toast.error('Could not determine city name from coordinates.', { id: 'admin-geo' });
            }
          } else {
            toast.error('Failed to resolve address.', { id: 'admin-geo' });
          }
        } catch (err) {
          console.error(err);
          toast.error('Error reverse geocoding location.', { id: 'admin-geo' });
        }
      },
      (error) => {
        console.error('GPS error:', error);
        toast.error(`GPS access failed: ${error.message}`, { id: 'admin-geo' });
      },
      { timeout: 10000, maximumAge: 60000, enableHighAccuracy: true }
    );
  };

  const [activeAdminTab, setActiveAdminTab] = useState(() => localStorage.getItem('admin_active_tab') || 'dashboard_panel');
  const [eventWizardStep, setEventWizardStep] = useState(1);
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [userRoleFilter, setUserRoleFilter] = useState('ALL');
  const [stats, setStats] = useState({ users: 0, services: 0, apps: 0, bookings: 0 });
  const [platformSettings, setPlatformSettings] = useState(() => {
    const saved = localStorage.getItem('passwala_platform_settings');
    return saved ? JSON.parse(saved) : {
      appName: 'Passwala',
      supportEmail: 'ops@passwala.com',
      maintenanceMode: false,
      maxDeliveryRange: 10,
      baseDeliveryFee: 30,
      freeDeliveryThreshold: 499,
      liveSync: true,
      ridePricePerKm: 8
    };
  });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const mainViewRef = useRef(null);

  // Auto-scroll to top on tab change
  useEffect(() => {
    if (mainViewRef.current) {
      mainViewRef.current.scrollTo({ top: 0 });
    }
    window.scrollTo(0, 0);
  }, [activeAdminTab]);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainViewRef.current) {
      mainViewRef.current.scrollTo(0, 0);
    }
  }, []);

  // Validate Session Token existence on mount
  useEffect(() => {
    const adminKey = sessionStorage.getItem('admin_token');
    if (!adminKey) {
      toast.error('Session expired or missing. Please login.');
      onLogout();
    }
  }, [onLogout]);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState('cloud'); // 'cloud' or 'offline'

  const downloadAdminSalesReport = async () => {
    if (!adminSupabase) {
      toast.error("Supabase client not initialized.");
      return;
    }
    const toastId = toast.loading("Generating sales report...");

    try {
      const reportRows = [];

      // 1. Fetch Store Orders
      const { data: storeOrders } = await adminSupabase
        .from('orders')
        .select('id, created_at, status, total_amount, stores(name)')
        .order('created_at', { ascending: false });
      
      if (storeOrders) {
        storeOrders.forEach(o => {
          reportRows.push({
            id: o.id,
            date: o.created_at ? new Date(o.created_at).toLocaleString() : 'N/A',
            type: 'Store Order',
            details: o.stores?.name ? `Store: ${o.stores.name}` : 'Marketplace Shop Order',
            status: o.status || 'PENDING',
            amount: o.total_amount || 0
          });
        });
      }

      // 2. Fetch Service Bookings
      const { data: serviceBookings } = await adminSupabase
        .from('service_bookings')
        .select('id, scheduled_at, status, total_amount, services(title)')
        .order('scheduled_at', { ascending: false });

      if (serviceBookings) {
        serviceBookings.forEach(sb => {
          reportRows.push({
            id: sb.id,
            date: sb.scheduled_at ? new Date(sb.scheduled_at).toLocaleString() : 'N/A',
            type: 'Home Service',
            details: sb.services?.title ? `Service: ${sb.services.title}` : 'Home Booking',
            status: sb.status || 'PENDING',
            amount: sb.total_amount || 0
          });
        });
      }

      // 3. Fetch Ride Bookings
      const { data: rideBookings } = await adminSupabase
        .from('ticket_bookings')
        .select('id, created_at, status, total_price, city_routes(start_area, end_area)')
        .order('created_at', { ascending: false });

      if (rideBookings) {
        rideBookings.forEach(rb => {
          const route = rb.city_routes;
          const routeStr = route ? `Ride: ${route.start_area} to ${route.end_area}` : 'City Ride Ticket';
          reportRows.push({
            id: rb.id,
            date: rb.created_at ? new Date(rb.created_at).toLocaleString() : 'N/A',
            type: 'City Ride',
            details: routeStr,
            status: rb.status || 'CONFIRMED',
            amount: rb.total_price || 0
          });
        });
      }

      // 4. Fetch Event Bookings
      const { data: eventBookings } = await adminSupabase
        .from('event_bookings')
        .select('id, created_at, status, total_amount, events(title, show_type)')
        .order('created_at', { ascending: false });

      if (eventBookings) {
        eventBookings.forEach(eb => {
          const ev = eb.events;
          const evStr = ev ? `Event: ${ev.title} (${ev.show_type || 'single'})` : 'Event Pass Booking';
          reportRows.push({
            id: eb.id,
            date: eb.created_at ? new Date(eb.created_at).toLocaleString() : 'N/A',
            type: 'Event Ticket',
            details: evStr,
            status: eb.status || 'CONFIRMED',
            amount: eb.total_amount || 0
          });
        });
      }

      toast.dismiss(toastId);

      if (reportRows.length === 0) {
        toast.error("No sales records found to export.");
        return;
      }

      // Sort by Date (newest first)
      reportRows.sort((a, b) => new Date(b.date) - new Date(a.date));

      // Generate CSV
      const headers = ['Order/Booking ID', 'Date & Time', 'Sales Type', 'Items / Booking Details', 'Fulfillment Status', 'Revenue (INR)'];
      const csvContent = [
        headers.join(','),
        ...reportRows.map(row => [
          `"${row.id}"`,
          `"${row.date}"`,
          `"${row.type}"`,
          `"${row.details.replace(/"/g, '""')}"`,
          `"${row.status}"`,
          row.amount
        ].join(','))
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.setAttribute("href", url);
      link.setAttribute("download", `passwala_platform_sales_report_${new Date().toISOString().split('T')[0]}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      toast.success("Excel/CSV sales report downloaded!");
    } catch (e) {
      toast.dismiss(toastId);
      console.error(e);
      toast.error(`Failed to export report: ${e.message}`);
    }
  };

  // --- Relational Reference States ---
  const [vendorsList, setVendorsList] = useState([]);
  const [storesList, setStoresList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [providersList, setProvidersList] = useState([]);
  const [productCategoriesList, setProductCategoriesList] = useState([]);
  const [serviceCategoriesList, setServiceCategoriesList] = useState([]);
  const [servicesList, setServicesList] = useState([]);
  const [addressesList, setAddressesList] = useState([]);
  const [pendingEvents, setPendingEvents] = useState([]);
  const [pendingEventsLoading, setPendingEventsLoading] = useState(false);

  const fetchReferences = useCallback(async () => {
    try {
      const fetchTable = async (table) => {
        const adminKey = sessionStorage.getItem('admin_token') || '';
        const res = await fetch(`${API_URL}/api/admin/fetch?table=${table}`, { headers: { 'x-admin-key': adminKey } });
        if (res.status === 401) {
          toast.error('Session expired. Please login again.');
          onLogout();
          return [];
        }
        const json = await res.json();
        return json.success ? json.data : [];
      };

      const [u, v, s, p, pc, sc, sv, addr] = await Promise.all([
        fetchTable('users'),
        fetchTable('vendors'),
        fetchTable('stores'),
        fetchTable('service_providers'),
        fetchTable('product_categories'),
        fetchTable('service_categories'),
        fetchTable('services'),
        fetchTable('addresses')
      ]);

      if (u) setUsersList(u);
      if (v) setVendorsList(v);
      if (s) setStoresList(s);
      if (p) setProvidersList(p);
      if (pc) setProductCategoriesList(pc);
      if (sc) setServiceCategoriesList(sc);
      if (sv) setServicesList(sv);
      if (addr) setAddressesList(addr);
    } catch (err) {
      console.error('Failed to fetch references:', err);
    }
  }, [onLogout]);

  // --- People Map States ---
  const [peopleMapData, setPeopleMapData] = useState([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleRoleFilter, setPeopleRoleFilter] = useState('All');
  const [selectedPersonCoords, setSelectedPersonCoords] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);

  const currentTab = useMemo(() => TABS.find(t => t.id === activeAdminTab) || TABS[0], [activeAdminTab]);

  const fetchStats = useCallback(async () => {
    try {
      const adminKey = sessionStorage.getItem('admin_token') || '';
      const res = await fetch(`${API_URL}/api/admin/stats`, { headers: { 'x-admin-key': adminKey } });
      if (res.status === 401) {
        toast.error('Session expired. Please login again.');
        onLogout();
        return;
      }
      const json = await res.json();
      if (json.success && json.stats) {
        setStats(json.stats);
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  }, [onLogout]);

  const fetchPlatformSettings = useCallback(async () => {
    try {
      const adminKey = sessionStorage.getItem('admin_token') || '';
      const res = await fetch(`${API_URL}/api/admin/settings`, {
        headers: { 'x-admin-key': adminKey }
      });
      if (res.status === 401) {
        toast.error('Session expired. Please login again.');
        onLogout();
        return;
      }
      const json = await res.json();
      if (json.success && json.settings) {
        setPlatformSettings(json.settings);
        localStorage.setItem('passwala_platform_settings', JSON.stringify(json.settings));
      }
    } catch (err) {
      console.error('Failed to fetch platform settings:', err);
    }
  }, [onLogout]);

  const handlePurgeMockData = () => {
    setShowPurgeConfirm(true);
  };

  const executePurge = async () => {
    setShowPurgeConfirm(false);
    try {
      toast.loading('Performing deep purge of platform residue...', { id: 'purge' });
      
      const adminKey = sessionStorage.getItem('admin_token') || '';
      const res = await fetch(`${API_URL}/api/admin/purge`, { 
        method: 'POST',
        headers: { 'x-admin-key': adminKey }
      });
      if (res.status === 401) {
        toast.dismiss('purge');
        toast.error('Session expired. Please login again.');
        onLogout();
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to purge data');

      toast.success('Platform is now clean and production-pure!', { id: 'purge' });
      fetchStats();
    } catch (err) {
      console.error('Purge error:', err);
      toast.error('Purge failed: ' + err.message, { id: 'purge' });
    }
  };

  const fetchPeopleMapData = useCallback(async () => {
    try {
      setMapLoading(true);
      const combined = [];

      const adminKey = sessionStorage.getItem('admin_token') || '';
      const res = await fetch(`${API_URL}/api/admin/people_map`, {
        headers: { 'x-admin-key': adminKey }
      });
      if (res.status === 401) {
        toast.error('Session expired. Please login again.');
        onLogout();
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch people map data');

      const { usersList, vendorsList, ridersList, providersList, storesList, addressesList, riderLocationsList } = json.data;

      const storeMap = {};
      if (storesList) {
        storesList.forEach(s => {
          storeMap[s.vendor_id] = s;
        });
      }

      // Address mapping for buyers (users)
      const userAddressMap = {};
      if (addressesList) {
        addressesList.forEach(addr => {
          if (addr.lat && addr.lng) {
            if (!userAddressMap[addr.user_id] || addr.is_default) {
              userAddressMap[addr.user_id] = { lat: parseFloat(addr.lat), lng: parseFloat(addr.lng) };
            }
          }
        });
      }

      // Rider location mapping
      const riderLocMap = {};
      if (riderLocationsList) {
        riderLocationsList.forEach(rl => {
          if (rl.lat && rl.lng) {
            riderLocMap[rl.rider_id] = { lat: parseFloat(rl.lat), lng: parseFloat(rl.lng) };
          }
        });
      }

      // Map Users (Buyers)
      if (usersList) {
        usersList.forEach(user => {
          if (user.role === 'BUYER' || !user.role) {
            const coords = userAddressMap[user.id];
            if (coords) {
              combined.push({
                id: user.id,
                name: user.full_name || 'Buyer ' + user.phone.slice(-4),
                phone: user.phone,
                email: user.email || 'N/A',
                role: 'Buyer',
                status: 'Active',
                iconColor: 'green',
                lat: coords.lat,
                lng: coords.lng,
                meta: { role: 'BUYER', email: user.email }
              });
            }
          }
        });
      }

      // Map Vendors (joined with store locations)
      if (vendorsList) {
        vendorsList.forEach(vendor => {
          const store = storeMap[vendor.id];
          const lat = (store && store.lat) ? parseFloat(store.lat) : (vendor.lat ? parseFloat(vendor.lat) : null);
          const lng = (store && store.lng) ? parseFloat(store.lng) : (vendor.lng ? parseFloat(vendor.lng) : null);
          if (lat && lng) {
            combined.push({
              id: vendor.id,
              name: vendor.business_name || vendor.name || (store ? store.name : 'Merchant Partner'),
              phone: vendor.phone,
              email: vendor.category || 'General Store',
              role: 'Vendor',
              status: vendor.is_verified ? 'Verified Partner' : 'Pending Verification',
              iconColor: 'orange',
              lat,
              lng,
              meta: { category: vendor.category, license: vendor.license_no, storeName: store?.name }
            });
          }
        });
      }

      // Map Riders
      if (ridersList) {
        ridersList.forEach(rider => {
          const lat = riderLocMap[rider.id]?.lat || (rider.lat ? parseFloat(rider.lat) : null);
          const lng = riderLocMap[rider.id]?.lng || (rider.lng ? parseFloat(rider.lng) : null);
          if (lat && lng) {
            combined.push({
              id: rider.id,
              name: 'Rider ' + (rider.vehicle_no || rider.id.slice(0, 4)),
              phone: rider.license_no || 'N/A',
              email: rider.vehicle_no || 'Standard Transport',
              role: 'Rider',
              status: rider.is_active ? 'On Duty' : 'Offline',
              iconColor: 'red',
              lat,
              lng,
              meta: { rating: rider.rating || '4.8', deliveries: rider.total_deliveries || '120+' }
            });
          }
        });
      }

      // Map Service Providers
      if (providersList) {
        providersList.forEach(provider => {
          const lat = provider.lat ? parseFloat(provider.lat) : null;
          const lng = provider.lng ? parseFloat(provider.lng) : null;
          if (lat && lng) {
            combined.push({
              id: provider.id,
              name: provider.business_name || provider.name || 'Home Expert',
              phone: provider.phone,
              email: provider.category_id || 'Services',
              role: 'Provider',
              status: provider.is_verified ? 'Verified Expert' : 'Regular Provider',
              iconColor: 'violet',
              lat,
              lng,
              meta: { business: provider.business_name, rating: provider.rating || '4.5' }
            });
          }
        });
      }

      setPeopleMapData(combined);
    } catch (err) {
      console.error('Error fetching people map data:', err);
      toast.error('Failed to load live people coordinates');
    } finally {
      setMapLoading(false);
    }
  }, [onLogout]);

  const fetchData = useCallback(async () => {
    if (['dashboard_panel', 'people_map_panel', 'reports_panel', 'settings_panel', 'event_approvals_panel', 'upgrade_requests_panel'].includes(activeAdminTab)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const currentTable = TABS.find(t => t.id === activeAdminTab)?.table || activeAdminTab;

    try {
      const adminKey = sessionStorage.getItem('admin_token') || '';
      const res = await fetch(`${API_URL}/api/admin/fetch?table=${currentTable}`, { headers: { 'x-admin-key': adminKey } });
      if (res.status === 401) {
        toast.error('Session expired. Please login again.');
        onLogout();
        return;
      }
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch cloud data');
      const suData = json.data;

      // Update State & Cache
      let filteredData = suData || [];
      if (currentTable === 'products') {
        filteredData = filteredData.filter(p => p.description !== 'Service item auto-registered');
      }

      // Merge local untracked offline records so they show in the table
      const localKey = `admin_local_${currentTable}`;
      const localAdded = JSON.parse(localStorage.getItem(localKey) || '[]');
      if (localAdded.length > 0) {
        const serverIds = new Set(filteredData.map(item => item.id));
        const unsyncedLocal = localAdded.filter(item => !serverIds.has(item.id));
        filteredData = [...unsyncedLocal, ...filteredData];
      }

      setData(filteredData);
      localStorage.setItem(`admin_cache_${currentTable}`, JSON.stringify(filteredData));
      setSyncStatus('cloud');
      toast.dismiss('offline-toast'); // Clear any previous offline warnings
    } catch (err) {
      console.error('Fetch Error:', err);

      // Check for missing table error
      if (err.message && (err.message.includes('Could not find the table') || err.message.includes('does not exist'))) {
        toast.error(`Table '${currentTable}' is missing in Supabase!`, { duration: 6000, id: 'missing-table-toast' });
        setSyncStatus('missing_table');
      } else {
        setSyncStatus('offline');
      }

      // Fallback to cache
      const cached = localStorage.getItem(`admin_cache_${currentTable}`);
      if (cached) {
        setData(JSON.parse(cached));
        toast('Showing local cache (Offline)', {
          id: 'offline-toast',
          icon: '📦',
          duration: 4000,
          action: {
            label: 'Retry Sync',
            onClick: () => fetchData()
          }
        });
      } else {
        setData([]);
      }
    } finally {
      setLoading(false);
    }
  }, [activeAdminTab, onLogout]);

  // Load static system settings and statistics once on mount
  useEffect(() => {
    fetchStats();
    fetchReferences();
    fetchPlatformSettings();
  }, [fetchStats, fetchReferences, fetchPlatformSettings]);

  // Sync active tab data instantly when switching tabs
  useEffect(() => {
    // Custom panels that manage their own data — just reset sync status
    const customPanels = ['event_approvals_panel', 'upgrade_requests_panel'];
    if (customPanels.includes(activeAdminTab)) {
      setSyncStatus('cloud');
      setLoading(false);
    } else if (activeAdminTab === 'people_map_panel') {
      fetchPeopleMapData();
    } else {
      fetchData();
    }
    localStorage.setItem('admin_active_tab', activeAdminTab);
  }, [activeAdminTab, fetchData, fetchPeopleMapData]);

  // Refresh dashboard analytics specifically when visiting the dashboard tab
  useEffect(() => {
    if (activeAdminTab === 'dashboard_panel') {
      fetchStats();
    }
  }, [activeAdminTab, fetchStats]);

  const handleExecuteDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      const isTemp = typeof deleteConfirmId === 'string' && deleteConfirmId.startsWith('temp_');

      if (!isTemp) {
        const adminKey = sessionStorage.getItem('admin_token') || '';
        const res = await fetch(`${API_URL}/api/admin/delete`, {
          method: 'DELETE',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-key': adminKey 
          },
          body: JSON.stringify({
            table: currentTab.table,
            id: deleteConfirmId
          })
        });
        if (res.status === 401) {
          toast.error('Session expired. Please login again.');
          onLogout();
          return;
        }
        const json = await res.json();
        if (!json.success) throw new Error(json.error || 'Failed to delete via cloud');
      }

      // Remove from local storage to clean up any stuck items
      const localKey = `admin_local_${currentTab.table}`;
      const localAdded = JSON.parse(localStorage.getItem(localKey) || '[]');
      const newLocal = localAdded.filter(item =>
        (item.id && item.id !== deleteConfirmId) &&
        (item.uid && item.uid !== deleteConfirmId) &&
        (item.phone && item.phone !== deleteConfirmId)
      );
      localStorage.setItem(localKey, JSON.stringify(newLocal));

      const cacheKey = `admin_cache_${currentTab.table}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      const newCached = cached.filter(item =>
        (item.id && item.id !== deleteConfirmId) &&
        (item.uid && item.uid !== deleteConfirmId) &&
        (item.phone && item.phone !== deleteConfirmId)
      );
      localStorage.setItem(cacheKey, JSON.stringify(newCached));

      setData(prev => prev.filter(item =>
        (item.id && item.id !== deleteConfirmId) &&
        (item.uid && item.uid !== deleteConfirmId) &&
        (item.phone && item.phone !== deleteConfirmId)
      ));

      toast.success('Removed successfully');
      setDeleteConfirmId(null);
      fetchStats();
      fetchData(); // Trigger fresh fetch to be absolutely sure
    } catch (err) {
      console.error(err);
      toast.error('Operation failed: ' + err.message);
      setDeleteConfirmId(null);
    }
  };

  const handleUpsert = async (e) => {
    e.preventDefault();
    try {
      if (formData.phone && formData.phone.length !== 10) {
        toast.error('Phone number must be exactly 10 digits');
        return;
      }
      setSaving(true);
      // 1. Prepare payload and Update Local State (Optimistic)
      let payload = { ...formData };
      if (editingItem) {
        payload.id = editingItem.id;
      }
      if (payload.aadhar_no) {
        payload.aadhar_no = payload.aadhar_no.replace(/\s/g, '');
      }
      if (payload.id_proof) {
        payload.id_proof = payload.id_proof.replace(/\s/g, '');
      }

      // Temporary local ID if missing
      if (!editingItem && !payload.id) {
        payload.id = 'temp_' + Date.now();
      }

      const localKey = `admin_local_${currentTab.table}`;
      const localAdded = JSON.parse(localStorage.getItem(localKey) || '[]');
      const cacheKey = `admin_cache_${currentTab.table}`;
      const cachedList = JSON.parse(localStorage.getItem(cacheKey) || '[]');

      if (editingItem) {
        setData(data.map(item => item.id === editingItem.id ? { ...item, ...payload } : item));
        localStorage.setItem(cacheKey, JSON.stringify(cachedList.map(item => item.id === editingItem.id ? { ...item, ...payload } : item)));
      } else {
        const newRecord = { ...payload, created_at: new Date().toISOString() };
        setData([newRecord, ...data]);
        localStorage.setItem(localKey, JSON.stringify([newRecord, ...localAdded]));
        localStorage.setItem(cacheKey, JSON.stringify([newRecord, ...cachedList]));
      }

      // 2. Attempt Background Cloud Sync
      try {
        const adminKey = sessionStorage.getItem('admin_token') || '';
        
        if (currentTab.table === 'events' && (payload.show_type === 'multiple' || payload.show_type === 'festival') && payload.schedule_slots && payload.schedule_slots.length > 0) {
          for (const slot of payload.schedule_slots) {
            const slotPayload = {
              ...payload,
              event_date: slot.date ? `${slot.date}T${slot.starts || '19:00'}:00` : new Date().toISOString(),
              ends_at: slot.date ? `${slot.date}T${slot.ends || '22:00'}:00` : new Date().toISOString(),
              venue_name: slot.venue_name || 'Venue TBA'
            };
            delete slotPayload.schedule_slots; // clean up client-only field
            
            const response = await fetch(`${API_URL}/api/admin/upsert`, {
              method: 'POST',
              headers: { 
                'Content-Type': 'application/json',
                'x-admin-key': adminKey 
              },
              body: JSON.stringify({
                table: currentTab.table,
                payload: slotPayload
              })
            });
            if (response.status === 401) {
              toast.error('Session expired. Please login again.');
              onLogout();
              return;
            }
            const result = await response.json();
            if (!result.success) {
              throw new Error(result.error || 'Failed to sync with backend');
            }
          }
          toast.success(`Published ${payload.schedule_slots.length} shows to Cloud! ☁️`, { id: 'offline-toast' });
          setSyncStatus('cloud');
          fetchData();
        } else {
          let finalPayload = { ...payload };
          delete finalPayload.schedule_slots; // clean up client-only field
          const response = await fetch(`${API_URL}/api/admin/upsert`, {
            method: 'POST',
            headers: { 
              'Content-Type': 'application/json',
              'x-admin-key': adminKey 
            },
            body: JSON.stringify({
              table: currentTab.table,
              payload: finalPayload
            })
          });
          if (response.status === 401) {
            toast.error('Session expired. Please login again.');
            onLogout();
            return;
          }
          const result = await response.json();
          if (!result.success) {
            throw new Error(result.error || 'Failed to sync with backend');
          }

          const returnedItem = result.data;
          if (returnedItem) {
            setData(prev => prev.map(item => item.id === payload.id ? returnedItem : item));
            const localAddedCurrent = JSON.parse(localStorage.getItem(localKey) || '[]');
            const newLocal = localAddedCurrent.map(item => item.id === payload.id ? returnedItem : item);
            localStorage.setItem(localKey, JSON.stringify(newLocal));

            const cachedListCurrent = JSON.parse(localStorage.getItem(cacheKey) || '[]');
            const newCached = cachedListCurrent.map(item => item.id === payload.id ? returnedItem : item);
            localStorage.setItem(cacheKey, JSON.stringify(newCached));
          }

          toast.success('Synced with Cloud! ☁️', { id: 'offline-toast' });
          setSyncStatus('cloud');
          fetchData(); // Instantly pull latest joined relations
        }
      } catch (syncErr) {
        console.warn('Sync failed, record kept in Local Storage:', syncErr);
        setSyncStatus('offline');
        toast('Offline Mode: Saved locally 🏠', { icon: '🏠', id: 'offline-toast' });
      }

      setShowModal(false);
      setEditingItem(null);
      fetchStats();
    } catch (err) {
      toast.error('Operation failed: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleToggleVerify = async (item) => {
    try {
      const nextVerified = !item.is_verified;
      const adminKey = sessionStorage.getItem('admin_token') || '';
      const response = await fetch(`${API_URL}/api/admin/upsert`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey 
        },
        body: JSON.stringify({
          table: currentTab.table,
          payload: { ...item, is_verified: nextVerified }
        })
      });
      if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        onLogout();
        return;
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update verification status');
      }

      toast.success(nextVerified ? 'Verified partner successfully! ✅' : 'Unverified partner successfully!');
      
      // Update local state
      setData(prev => prev.map(d => d.id === item.id ? { ...d, is_verified: nextVerified } : d));
      
      // Update cache
      const cacheKey = `admin_cache_${currentTab.table}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      localStorage.setItem(cacheKey, JSON.stringify(cached.map(d => d.id === item.id ? { ...d, is_verified: nextVerified } : d)));
    } catch (err) {
      console.error(err);
      toast.error('Verification failed: ' + err.message);
    }
  };

  const handleToggleSuspend = async (item) => {
    try {
      const nextSuspended = !item.is_suspended;
      const adminKey = sessionStorage.getItem('admin_token') || '';
      const response = await fetch(`${API_URL}/api/admin/upsert`, {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey 
        },
        body: JSON.stringify({
          table: 'users',
          payload: { ...item, is_suspended: nextSuspended }
        })
      });
      if (response.status === 401) {
        toast.error('Session expired. Please login again.');
        onLogout();
        return;
      }
      const result = await response.json();
      if (!result.success) {
        throw new Error(result.error || 'Failed to update suspension status');
      }

      toast.success(nextSuspended ? 'User suspended successfully! 🚫' : 'User unsuspended successfully! ✅');
      
      // Update local state
      setData(prev => prev.map(d => d.id === item.id ? { ...d, is_suspended: nextSuspended } : d));
      
      // Update cache
      const cacheKey = `admin_cache_${currentTab.table}`;
      const cached = JSON.parse(localStorage.getItem(cacheKey) || '[]');
      localStorage.setItem(cacheKey, JSON.stringify(cached.map(d => d.id === item.id ? { ...d, is_suspended: nextSuspended } : d)));
    } catch (err) {
      console.error(err);
      toast.error('Suspension update failed: ' + err.message);
    }
  };

  const openModal = (item = null) => {
    fetchReferences(); // Lazy-load fresh lookup relations for select dropdowns
    setEditingItem(item);
    setEventWizardStep(1);
    const schema = TABLE_SCHEMAS[currentTab.table];

    if (item) {
      if (schema) {
        const cleanData = {};
        Object.keys(schema).forEach(key => {
          // Avoid rendering nested objects directly
          cleanData[key] = (item[key] !== undefined && typeof item[key] !== 'object') ? item[key] : schema[key];
        });
        // Since phone/full_name may come from joined users, populate them if we have them in item
        if (item.phone) cleanData.phone = item.phone;
        if (item.full_name) cleanData.full_name = item.full_name;
        
        if (currentTab.table === 'events') {
          cleanData.ticket_tiers = [];
          const adminKey = sessionStorage.getItem('admin_token') || '';
          fetch(`${API_URL}/api/admin/fetch?table=event_ticket_tiers`, { headers: { 'x-admin-key': adminKey } })
            .then(res => res.json())
            .then(json => {
              if (json.success && json.data) {
                const eventTiers = json.data.filter(t => t.event_id === item.id);
                setFormData(prev => ({ ...prev, ticket_tiers: eventTiers.length > 0 ? eventTiers : [{ id: 'temp_' + Date.now(), tier_name: 'General Admission', price: 0, total_seats: 100, available_seats: 100 }] }));
              }
            });
        }
        
        setFormData(cleanData);
      } else {
        const cleanData = { ...item };
        // Keep ID for updates!
        delete cleanData.uid;
        delete cleanData.created_at;
        delete cleanData.updated_at;
        delete cleanData.users;
        setFormData(cleanData);
      }
    } else {
      if (schema) {
        const initialForm = { ...schema };
        if (currentTab.table === 'events') {
          initialForm.ticket_tiers = [
            { id: 'temp_' + Date.now(), tier_name: 'General Admission', price: 0, total_seats: 100, available_seats: 100 }
          ];
          initialForm.schedule_slots = [
            { id: Date.now(), date: '', starts: '19:00', ends: '22:00', venue_name: '' }
          ];
        }
        setFormData(initialForm);
      } else if (data.length > 0) {
        const blankSchema = {};
        Object.keys(data[0]).forEach(key => {
          if (key !== 'id' && key !== 'uid' && key !== 'created_at' && key !== 'updated_at' && key !== 'users') {
            blankSchema[key] = typeof data[0][key] === 'boolean' ? false : '';
          }
        });
        setFormData(blankSchema);
      } else {
        // Fallback: If no schema and no data, show at least common fields
        setFormData({ phone: '', full_name: '' });
      }
    }
    setShowModal(true);
  };

  const renderTable = () => {
    const currentTabLabel = currentTab.label;
    if (loading) return <div className="admin-loading"><History className="animate-spin" /> Syncing Cloud Data...</div>;

    const filtered = data.filter(item =>
      Object.values(item).some(val =>
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    // Client-side deduplication for "same data not a show" requirement
    const uniqueEntries = [];
    const seenSignatures = new Set();
    filtered.forEach(item => {
      // Filter based on selected userRoleFilter in the Users tab
      if (currentTab.table === 'users') {
        const role = item.role ? item.role.toUpperCase() : 'BUYER';
        if (userRoleFilter === 'BUYER' && role !== 'BUYER' && role !== 'USER') {
          return;
        }
        if (userRoleFilter === 'RIDER' && role !== 'RIDER') {
          return;
        }
        if (userRoleFilter === 'VENDOR' && role !== 'VENDOR' && role !== 'SERVICE_PROVIDER') {
          return;
        }
      }

      const isPeopleTable = ['users', 'vendors', 'riders', 'service_providers'].includes(currentTab.table);
      const signature = isPeopleTable
        ? `${item.phone || ''}_${item.full_name || item.business_name || item.name || ''}`.toLowerCase().trim()
        : item.id;
      if (!seenSignatures.has(signature)) {
        uniqueEntries.push(item);
        seenSignatures.add(signature);
      }
    });

    const displayData = uniqueEntries;

    return (
      <div className="admin-table-container">
        {currentTab.table === 'users' && (
          <div className="user-role-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem', flexWrap: 'wrap' }}>
            {[
              { id: 'ALL', label: 'All Users' },
              { id: 'BUYER', label: 'Buyer Side' },
              { id: 'VENDOR', label: 'Vendor Side' },
              { id: 'RIDER', label: 'Rider Side' }
            ].map(tab => (
              <button
                key={tab.id}
                type="button"
                onClick={() => setUserRoleFilter(tab.id)}
                style={{
                  background: userRoleFilter === tab.id ? '#0f172a' : '#f1f5f9',
                  color: userRoleFilter === tab.id ? 'white' : '#475569',
                  border: 'none',
                  borderRadius: '30px',
                  padding: '8px 18px',
                  fontWeight: 600,
                  fontSize: '0.82rem',
                  cursor: 'pointer',
                  transition: 'all 0.2s',
                  boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                }}
              >
                {tab.label}
              </button>
            ))}
          </div>
        )}
        <div className="table-actions">
          <div className="search-admin">
            <Search size={18} />
            <input type="text" placeholder={`Search ${currentTabLabel}...`} value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
          </div>
          <button className="add-btn" onClick={() => openModal()}><Plus size={18} /> Add New</button>
        </div>

        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>ID</th>
                {(() => {
                  const schema = TABLE_SCHEMAS[currentTab.table];
                  let keys = [];
                  if (schema) {
                    keys = Object.keys(schema);
                  } else if (data.length > 0) {
                    keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'created_at' && k !== 'uid' && k !== 'users');
                  } else {
                    keys = ['PHONE', 'FULL_NAME'];
                  }

                  return keys.map(key => (
                    <th key={key}>{key.toUpperCase()}</th>
                  ));
                })()}
                <th>CONTROL</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((item) => {
                const schema = TABLE_SCHEMAS[currentTab.table];
                let keys = [];
                if (schema) {
                  keys = Object.keys(schema);
                } else if (data.length > 0) {
                  keys = Object.keys(data[0]).filter(k => k !== 'id' && k !== 'created_at' && k !== 'uid' && k !== 'users');
                } else {
                  keys = ['PHONE', 'FULL_NAME'];
                }

                return (
                  <tr key={item.id}>
                    <td className="id-col">
                      {String(item.id).startsWith('temp_') ? (
                        <span style={{ 
                          background: 'rgba(249, 115, 22, 0.1)', 
                          color: '#f97316', 
                          border: '1px solid rgba(249, 115, 22, 0.2)', 
                          padding: '2px 6px', 
                          borderRadius: '4px', 
                          fontSize: '0.75rem', 
                          fontWeight: 700 
                        }}>Local</span>
                      ) : (
                        `#${String(item.id).slice(-4)}`
                      )}
                    </td>
                    {keys.map(k => {
                      let v = item[k];
                      
                      // Flatten relation data for display in the table cells
                      if (k === 'user_id' && item.users) {
                        v = `${item.users?.full_name || 'No Name'} (${item.users?.phone || 'No Phone'})`;
                      } else if (k === 'service_id' && item.services) {
                        v = item.services?.title;
                      } else if (k === 'provider_id' && item.service_providers) {
                        v = item.service_providers?.business_name || 'No Name';
                      } else if (k === 'address_id' && item.addresses) {
                        v = `${item.addresses?.address_line_1 || ''} (${item.addresses?.society || item.addresses?.city || ''})`.trim();
                        if (v === '()') v = 'N/A';
                      } else if (k === 'store_id' && item.stores) {
                        v = item.stores?.name;
                      } else if (k === 'category_id') {
                        if (currentTab.table === 'products' && item.product_categories) {
                          v = item.product_categories?.name;
                        } else if (currentTab.table === 'services' && item.service_categories) {
                          v = item.service_categories?.name;
                        }
                      } else if (k === 'vendor_id' && item.vendors) {
                        v = item.vendors?.business_name || item.vendors?.name || item.vendors?.phone;
                      }

                      // Flatten joined user data for display, or fall back if reference is missing/null
                      if (item.users) {
                        if (k === 'phone' && !v) v = item.users?.phone;
                        if (k === 'full_name' && !v) v = item.users?.full_name;
                      } else {
                        if (k === 'phone' && !v) v = item.phone;
                        if (k === 'full_name' && !v) v = item.full_name || item.name || item.business_name || 'No User Linked';
                      }

                       let displayVal = v === null || v === undefined ? 'N/A' : String(v);
                      if (k === 'phone' && displayVal.startsWith('np_')) {
                        const rawId = displayVal.replace('np_', '');
                        if (rawId.startsWith('tc-') && rawId.length > 3) {
                          displayVal = `Placeholder (${rawId.substring(3)})`;
                        } else {
                          displayVal = `Placeholder (${rawId.substring(0, 8)}...)`;
                        }
                      } else if (['price', 'discount_price', 'total_amount', 'amount', 'subtotal', 'delivery_fee'].includes(k) && v !== null && v !== undefined) {
                        displayVal = `₹${parseFloat(v).toLocaleString()}`;
                      } else if ((k === 'id_proof' || k === 'aadhar_no') && displayVal.length === 12 && /^\d+$/.test(displayVal)) {
                        const parts = [];
                        for (let i = 0; i < displayVal.length; i += 4) {
                          parts.push(displayVal.slice(i, i + 4));
                        }
                        displayVal = parts.join(' ');
                      }

                       return (
                        <td key={k}>
                          {k === 'is_suspended' ? (
                            v ? (
                              <span className="status-badge" style={{ backgroundColor: 'rgba(239, 68, 68, 0.1)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>Suspended</span>
                            ) : (
                              <span className="status-badge" style={{ backgroundColor: 'rgba(16, 185, 129, 0.1)', color: '#10b981', border: '1px solid rgba(16, 185, 129, 0.2)', padding: '4px 8px', borderRadius: '6px', fontSize: '0.8rem', fontWeight: 600 }}>Active</span>
                            )
                          ) : k === 'status' || k === 'role' ? (
                            <span className={`status-badge ${v}`}>{v}</span>
                          ) : typeof v === 'boolean' ? (
                            v ? <span style={{color: '#10b981', fontWeight: 800}}>✅</span> : <span style={{color: '#ef4444', fontWeight: 800}}>❌</span>
                          ) : displayVal === 'N/A' ? (
                            <span style={{ color: '#94a3b8', fontStyle: 'italic', fontWeight: 500, fontSize: '0.85rem' }}>N/A</span>
                          ) : (
                            <span className="truncate-cell">{displayVal}</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="actions-cell">
                      <div className="control-cell">
                        {currentTab.table === 'users' && (
                          <button 
                            className="suspend-btn" 
                            style={{
                              background: item.is_suspended ? 'rgba(16, 185, 129, 0.1)' : 'rgba(239, 68, 68, 0.1)',
                              color: item.is_suspended ? '#10b981' : '#ef4444',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }} 
                            title={item.is_suspended ? "Unsuspend User" : "Suspend User"}
                            onClick={() => handleToggleSuspend(item)}
                          >
                            {item.is_suspended ? <CheckCircle size={16} /> : <XCircle size={16} />}
                          </button>
                        )}
                        {['vendors', 'service_providers', 'riders'].includes(currentTab.table) && (
                          <button 
                            className="verify-btn" 
                            style={{
                              background: item.is_verified ? 'rgba(16, 185, 129, 0.1)' : 'rgba(249, 115, 22, 0.1)',
                              color: item.is_verified ? '#10b981' : '#f97316',
                              border: 'none',
                              borderRadius: '8px',
                              padding: '6px',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              transition: 'all 0.2s',
                              outline: 'none'
                            }} 
                            title={item.is_verified ? "Unverify Partner" : "Verify Partner"}
                            onClick={() => handleToggleVerify(item)}
                          >
                            <ShieldCheck size={16} />
                          </button>
                        )}
                        <button className="edit-btn" onClick={() => openModal(item)}><Edit2 size={16} /></button>
                        <button className="delete-btn" onClick={() => setDeleteConfirmId(item.id)}><Trash2 size={16} /></button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    );
  };


  const renderPeopleMap = () => {
    const filteredPeople = peopleMapData.filter(p => {
      const matchesSearch = p.name.toLowerCase().includes(peopleSearch.toLowerCase()) || 
                            p.phone.toLowerCase().includes(peopleSearch.toLowerCase()) ||
                            (p.email || '').toLowerCase().includes(peopleSearch.toLowerCase());
      const matchesRole = peopleRoleFilter === 'All' || p.role === peopleRoleFilter;
      return matchesSearch && matchesRole;
    });

    return (
      <div className="people-map-container animate-fade-in" style={{ padding: '1rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.5rem' }}>
          <div>
            <h1 className="admin-hero-title" style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#0f172a' }}>Live Community Locator</h1>
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Real-time Google Maps tracking of Users, Riders, and Merchant Partners across Ahmedabad.</p>
          </div>
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <button 
              type="button"
              onClick={fetchPeopleMapData}
              style={{ 
                background: '#f1f5f9', 
                color: '#475569', 
                border: 'none', 
                padding: '12px', 
                borderRadius: '12px', 
                fontWeight: 600, 
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '8px',
                transition: 'all 0.2s'
              }}
              title="Refresh Locations"
            >
              <History size={20} className={mapLoading ? 'animate-spin' : ''} />
            </button>
          </div>
        </div>

        {/* Filters and Search Row */}
        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '1.5rem' }}>
          <div style={{ flex: '1', minWidth: '280px', maxWidth: '400px', margin: 0, background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px', display: 'flex', alignItems: 'center', padding: '10px 14px' }}>
            <Search size={18} color="#64748b" style={{ marginRight: '8px' }} />
            <input 
              type="text" 
              placeholder="Search name, phone, or keyword..." 
              value={peopleSearch}
              onChange={(e) => setPeopleSearch(e.target.value)}
              style={{ border: 'none', outline: 'none', width: '100%', fontSize: '0.9rem', color: '#0f172a' }}
            />
          </div>
          
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', alignItems: 'center' }}>
            {['All', 'Buyer', 'Vendor', 'Rider', 'Provider'].map(role => {
              const count = peopleMapData.filter(p => role === 'All' || p.role === role).length;
              let dotColor = '#3b82f6';
              if (role === 'Buyer') dotColor = '#22c55e';
              else if (role === 'Vendor') dotColor = '#f97316';
              else if (role === 'Rider') dotColor = '#ef4444';
              else if (role === 'Provider') dotColor = '#a855f7';

              return (
                <button
                  key={role}
                  type="button"
                  onClick={() => setPeopleRoleFilter(role)}
                  style={{
                    background: peopleRoleFilter === role ? '#0f172a' : 'white',
                    color: peopleRoleFilter === role ? 'white' : '#475569',
                    border: '1px solid #e2e8f0',
                    borderRadius: '30px',
                    padding: '8px 16px',
                    fontSize: '0.82rem',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    transition: 'all 0.2s',
                    boxShadow: '0 2px 5px rgba(0,0,0,0.02)'
                  }}
                >
                  <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: dotColor }} />
                  {role === 'All' ? 'All Roles' : role + 's'}
                  <span style={{ 
                    fontSize: '0.75rem', 
                    background: peopleRoleFilter === role ? 'rgba(255,255,255,0.2)' : '#f1f5f9', 
                    color: peopleRoleFilter === role ? 'white' : '#64748b',
                    padding: '2px 6px',
                    borderRadius: '10px',
                    marginLeft: '4px'
                  }}>{count}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main interactive map split layout */}
        <div style={{ display: 'flex', gap: '1.5rem', flexWrap: 'wrap-reverse' }}>
          {/* Map Column */}
          <div style={{ flex: '1', minWidth: '320px', background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.04)' }}>
            <div style={{ height: '550px', width: '100%', position: 'relative' }}>
              {mapLoading ? (
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#64748b' }}>
                  <p style={{ fontWeight: 600 }}>Syncing map coordinates...</p>
                </div>
              ) : (
                <GoogleMapWrapper
                  center={selectedPersonCoords ? [selectedPersonCoords.lat, selectedPersonCoords.lng] : [23.0225, 72.5714]}
                  zoom={selectedPersonCoords ? 15 : 13}
                  style={{ height: '100%', width: '100%', zIndex: 1 }}
                  markers={filteredPeople
                    .filter(p => p.lat && p.lng && !isNaN(p.lat) && !isNaN(p.lng))
                    .map(person => ({
                      position: [person.lat, person.lng],
                      svgIcon: getAdminMapMarkerSvg(ADMIN_MARKER_COLORS[person.iconColor] || ADMIN_MARKER_COLORS.blue),
                      iconSize: [32, 42],
                      iconAnchor: [16, 42],
                      title: `${person.name} (${person.role}) — ${person.phone}`,
                      onClick: () => setSelectedPersonCoords({ lat: person.lat, lng: person.lng })
                    }))
                  }
                />
              )}
            </div>
          </div>

          {/* Sidebar Column */}
          <div style={{ width: '320px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div style={{ background: 'white', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '1rem', boxShadow: '0 4px 15px rgba(0,0,0,0.04)', maxHeight: '550px', display: 'flex', flexDirection: 'column' }}>
              <div style={{ borderBottom: '1px solid #f1f5f9', paddingBottom: '0.75rem', marginBottom: '0.75rem' }}>
                <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Active Members ({filteredPeople.length})</h3>
                <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Click target to track position on Map.</p>
              </div>

              <div style={{ overflowY: 'auto', flex: 1, display: 'flex', flexDirection: 'column', gap: '8px', paddingRight: '4px' }}>
                {filteredPeople.map(person => (
                  <div 
                    key={person.id}
                    onClick={() => setSelectedPersonCoords({ lat: person.lat, lng: person.lng })}
                    style={{ 
                      display: 'flex', 
                      alignItems: 'center', 
                      justifyContent: 'space-between', 
                      padding: '8px 12px', 
                      background: selectedPersonCoords?.lat === person.lat ? '#fff7f2' : '#f8fafc',
                      border: selectedPersonCoords?.lat === person.lat ? '1.5px solid #ff7622' : '1px solid #f1f5f9',
                      borderRadius: '12px', 
                      cursor: 'pointer',
                      transition: 'all 0.15s'
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                      <div style={{ 
                        width: '32px', height: '32px', borderRadius: '50%', 
                        background: person.iconColor === 'green' ? '#22c55e' : (person.iconColor === 'orange' ? '#f97316' : (person.iconColor === 'red' ? '#ef4444' : '#a855f7')),
                        color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.8rem'
                      }}>
                        {person.name.slice(0, 2).toUpperCase()}
                      </div>
                      <div>
                        <h4 style={{ margin: 0, fontSize: '0.82rem', fontWeight: 700, color: '#0f172a' }}>{person.name.replace(' (Simulated)', '')}</h4>
                        <p style={{ margin: 0, fontSize: '0.72rem', color: '#64748b' }}>{person.role} • {person.status}</p>
                      </div>
                    </div>
                    <button type="button" style={{ background: 'none', border: 'none', color: '#ff7622', cursor: 'pointer' }}>
                      <Navigation size={14} />
                    </button>
                  </div>
                ))}

                {filteredPeople.length === 0 && (
                  <div style={{ textAlign: 'center', padding: '2rem 0', color: '#94a3b8' }}>
                    <p style={{ fontSize: '0.85rem' }}>No matching results found.</p>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderDashboard = () => (
    <div className="dashboard-grid animate-fade-in">
      <div className="main-stats-container">
        <div className="main-stats">
          <div className="stat-card p-gradient">
            <div className="stat-main">
              <Users size={32} />
              <div>
                <span>Total Users</span>
                <h3>{stats.users}</h3>
              </div>
            </div>
            <p>Active platform members</p>
          </div>
          <div className="stat-card o-gradient">
            <div className="stat-main">
              <FileText size={32} />
              <div>
                <span>Pending Approvals</span>
                <h3>{stats.apps}</h3>
              </div>
            </div>
            <p>Verification requests</p>
          </div>
          <div className="stat-card b-gradient">
            <div className="stat-main">
              <ShoppingBag size={32} />
              <div>
                <span>Total Services</span>
                <h3>{stats.services}</h3>
              </div>
            </div>
            <p>Active listing items</p>
          </div>
        </div>
        <div className="dashboard-actions-row" style={{ marginTop: '2rem' }}>
          <button className="purge-btn" onClick={handlePurgeMockData} style={{
            background: 'linear-gradient(135deg, #ef4444 0%, #f87171 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(239, 68, 68, 0.3)'
          }}>
            <Trash2 size={20} /> Purge Production Mock Residue
          </button>
        </div>
      </div>


      <div className="recent-activity glass">
        <div className="activity-header">
          <h4 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><History size={18} /> Recent Logs</h4>
        </div>
        <div className="trend-content">
          <ActivityFeed onLogout={onLogout} />
        </div>

        <div className="notification-preview" style={{ marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px' }}>
          <h5 style={{ fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '8px' }}>SYSTEM ALERTS</h5>
          <div style={{ fontSize: '0.8rem', color: '#0f172a', fontWeight: 600 }}>
            ⚠️ Server load increased by 12% in last 10 mins.
          </div>
        </div>
      </div>
    </div>
  );

  const renderReports = () => {
    return (
      <div className="reports-container animate-fade-in" style={{ padding: '1rem 0' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
          <div>
            <h1 className="admin-hero-title" style={{ margin: 0 }}>Business Performance & Analytics</h1>
            <p style={{ color: '#64748b', margin: 0 }}>Comprehensive performance reporting and metric evaluations.</p>
          </div>
          <button 
            onClick={downloadAdminSalesReport}
            style={{ 
              background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 24px', 
              borderRadius: '14px', 
              fontWeight: 800, 
              display: 'flex', 
              alignItems: 'center', 
              gap: '10px', 
              cursor: 'pointer',
              boxShadow: '0 10px 20px rgba(16, 185, 129, 0.15)',
              fontSize: '0.95rem'
            }}
          >
            <Download size={18} />
            Download Sales Report (Excel)
          </button>
        </div>

        <div className="main-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.15)' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Revenue</span>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0', color: '#ffffff' }}>₹{stats?.totalRevenue?.toLocaleString() || 0}</h3>
            <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9, color: '#ffffff' }}>Real-time earnings</p>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 10px 25px rgba(249, 115, 22, 0.15)' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Average Order Value</span>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0', color: '#ffffff' }}>₹{stats?.averageOrderValue?.toLocaleString() || 0}</h3>
            <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9, color: '#ffffff' }}>🎯 Optimized delivery margins</p>
          </div>
          <div className="stat-card" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 10px 25px rgba(6, 182, 212, 0.15)' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Orders Completed</span>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0', color: '#ffffff' }}>{stats?.ordersCompleted || 0}</h3>
            <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9, color: '#ffffff' }}>⚡ 98.4% Fulfillment rate</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.02)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Weekly Revenue Trend</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', paddingTop: '10px' }}>
              {(stats?.weeklyRevenue || [
                { label: 'Mon', val: 0 },
                { label: 'Tue', val: 0 },
                { label: 'Wed', val: 0 },
                { label: 'Thu', val: 0 },
                { label: 'Fri', val: 0 },
                { label: 'Sat', val: 0 },
                { label: 'Sun', val: 0 }
              ]).map((item, idx) => {
                const maxVal = stats?.weeklyRevenue ? Math.max(...stats.weeklyRevenue.map(d => d.val), 1) : 120;
                return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                  <div style={{ position: 'relative', width: '28px', height: '120px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(item.val / maxVal) * 100}%`, background: 'linear-gradient(to top, #6366f1, #818cf8)', borderRadius: '8px', transition: 'height 1s ease' }}></div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{item.label}</span>
                </div>
              )})}
            </div>
          </div>

          <div className="glass" style={{ padding: '2rem', borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.02)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Sales by Category</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', height: '180px' }}>
              {(stats?.salesByCategory || [
                { name: 'Grocery & Essentials', percent: 0, color: '#10b981' },
                { name: 'Expert Services', percent: 0, color: '#6366f1' },
                { name: 'Food Delivery', percent: 0, color: '#f59e0b' }
              ]).map((cat, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontWeight: 700, color: '#334155' }}>
                    <span>{cat.name}</span>
                    <span>{cat.percent}%</span>
                  </div>
                  <div style={{ height: '8px', background: '#f1f5f9', borderRadius: '4px', overflow: 'hidden' }}>
                    <div style={{ height: '100%', width: `${cat.percent}%`, background: cat.color, borderRadius: '4px' }}></div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  };

  const renderSettings = () => {
    const handleSaveLocalSettings = async () => {
      try {
        const adminKey = sessionStorage.getItem('admin_token') || '';
        const response = await fetch(`${API_URL}/api/admin/settings`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'x-admin-key': adminKey 
          },
          body: JSON.stringify({ settings: platformSettings })
        });
        if (response.status === 401) {
          toast.error('Session expired. Please login again.');
          onLogout();
          return;
        }
        const result = await response.json();
        if (result.success) {
          localStorage.setItem('passwala_platform_settings', JSON.stringify(platformSettings));
          toast.success('System settings saved successfully!');
        } else {
          throw new Error(result.error || 'Failed to save settings');
        }
      } catch (err) {
        console.error(err);
        toast.error('Failed to save settings: ' + err.message);
      }
    };

    const handleClearCache = () => {
      localStorage.clear();
      toast.success('Admin local cache cleared! Refreshing...');
      setTimeout(() => window.location.reload(), 1000);
    };

    return (
      <div className="settings-container animate-fade-in" style={{ padding: '1rem 0' }}>
        <h1 className="admin-hero-title">Platform Preferences</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Configure global settings, thresholds, and developer preferences.</p>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.02)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <Settings size={20} color="#6366f1" /> General Settings
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>PLATFORM NAME</label>
                <input
                  type="text"
                  value={platformSettings.appName}
                  onChange={e => setPlatformSettings({ ...platformSettings, appName: e.target.value })}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>SUPPORT EMAIL</label>
                <input
                  type="email"
                  value={platformSettings.supportEmail}
                  onChange={e => setPlatformSettings({ ...platformSettings, supportEmail: e.target.value })}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
                />
              </div>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0' }}>
                <div>
                  <span style={{ fontSize: '0.9rem', fontWeight: 700, color: '#1e293b' }}>Maintenance Mode</span>
                  <p style={{ margin: '2px 0 0 0', fontSize: '0.75rem', color: '#64748b' }}>Restrict user portal access during updates</p>
                </div>
                <input
                  type="checkbox"
                  checked={platformSettings.maintenanceMode}
                  onChange={e => setPlatformSettings({ ...platformSettings, maintenanceMode: e.target.checked })}
                  style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                />
              </div>
            </div>
          </div>

          <div className="glass" style={{ padding: '2rem', borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.02)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <MapPin size={20} color="#f97316" /> Logistics & Fees
            </h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>MAX DELIVERY RANGE (KM)</label>
                <input
                  type="number"
                  value={platformSettings.maxDeliveryRange}
                  onChange={e => setPlatformSettings({ ...platformSettings, maxDeliveryRange: parseInt(e.target.value) || 0 })}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>BASE DELIVERY FEE (₹)</label>
                <input
                  type="number"
                  value={platformSettings.baseDeliveryFee}
                  onChange={e => setPlatformSettings({ ...platformSettings, baseDeliveryFee: parseInt(e.target.value) || 0 })}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>FREE DELIVERY THRESHOLD (₹)</label>
                <input
                  type="number"
                  value={platformSettings.freeDeliveryThreshold}
                  onChange={e => setPlatformSettings({ ...platformSettings, freeDeliveryThreshold: parseInt(e.target.value) || 0 })}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
                />
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontSize: '0.8rem', fontWeight: 800, color: '#475569' }}>RIDE PRICE PER KM (₹)</label>
                <input
                  type="number"
                  value={platformSettings.ridePricePerKm !== undefined ? platformSettings.ridePricePerKm : 8}
                  onChange={e => setPlatformSettings({ ...platformSettings, ridePricePerKm: parseInt(e.target.value) || 0 })}
                  style={{ padding: '12px 16px', borderRadius: '12px', border: '1.5px solid #e2e8f0', outline: 'none', fontSize: '0.95rem', fontWeight: 600, color: '#0f172a' }}
                />
              </div>
            </div>
          </div>

          <div className="glass" style={{ padding: '2rem', borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.02)', gridColumn: '1 / -1' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '8px' }}>
              <ShieldCheck size={20} color="#10b981" /> System Controls & Maintenance
            </h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1.5rem', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <span style={{ fontSize: '0.95rem', fontWeight: 800, color: '#1e293b' }}>Local Application Cache</span>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.8rem', color: '#64748b', maxWidth: '500px' }}>
                  If you are experiencing state desynchronization or offline lag, you can purge the admin dashboard cache and force a complete server-side pull.
                </p>
              </div>
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button
                  onClick={handleSaveLocalSettings}
                  style={{ background: 'linear-gradient(135deg, #4f46e5 0%, #6366f1 100%)', color: 'white', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', boxShadow: '0 4px 15px rgba(99, 102, 241, 0.2)', transition: 'all 0.2s' }}
                >
                  Save Settings
                </button>
                <button
                  onClick={handleClearCache}
                  style={{ background: '#f1f5f9', color: '#475569', border: 'none', padding: '14px 28px', borderRadius: '14px', fontWeight: 700, cursor: 'pointer', transition: 'all 0.2s' }}
                >
                  Clear Admin Cache
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="admin-layout">
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      <aside className={`admin-sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', gap: '10px', borderBottom: '1px solid #1e293b' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="admin-logo-box">
              <img src="/logo.png" alt="Passwala Logo" className="admin-sidebar-logo" />
            </div>
            <div className="admin-brand-info">
              <h2>Passwala</h2>
              <span>SYSTEM OPS</span>
            </div>
          </div>
          <div 
            className="brand-tagline-location live-address clickable-location"
            onClick={handleLocationClick}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '6px', 
              color: '#ffffff', 
              fontSize: '0.82rem', 
              marginTop: '4px',
              padding: '6px 12px',
              background: 'rgba(255, 255, 255, 0.05)',
              borderRadius: '8px',
              width: '100%',
              border: '1px solid rgba(255, 255, 255, 0.08)',
              cursor: 'pointer'
            }}
          >
            <MapPin size={14} color="var(--primary)" className="tag-pin-icon" />
            <strong style={{ fontWeight: 600, color: '#ffffff' }}>{location || 'My Location, Ahmedabad'}</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabSections.map((section) => (
            <React.Fragment key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((tab) => (
                <button
                  key={tab.id}
                  className={`admin-nav-item ${activeAdminTab === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveAdminTab(tab.id);
                    setIsSidebarOpen(false);
                  }}
                >
                  <tab.icon size={18} />
                  <span>{tab.label}</span>
                </button>
              ))}
            </React.Fragment>
          ))}
        </nav>

        <button className="logout-btn-admin" onClick={onLogout}>
          <LogOut size={18} /> <span>Terminate Session</span>
        </button>
      </aside>

      <main className="admin-main-view" ref={mainViewRef}>
        <header className="admin-top-bar">
          <div className="top-bar-left">
            <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="breadcrumb">
              <Database size={14} className="mobile-hide" /> <span className="mobile-hide">/ MASTER CONTROL /</span> <strong>{currentTab.label.toUpperCase()}</strong>
            </div>
          </div>
          <div className="admin-profile-pill">
            <span className={`sync-indicator ${syncStatus}`}>
              {syncStatus === 'cloud' ? '☁️ Cloud Sync Active' : '🏠 Offline Mode'}
            </span>
          </div>
        </header>

        <div className="admin-scroll-content">
          <AnimatePresence mode='wait'>
            <Motion.div
              key={activeAdminTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeAdminTab === 'dashboard_panel' ? (
                <>
                  <h1 className="admin-hero-title">Platform Intelligence</h1>
                  <p style={{ color: '#64748b', marginBottom: '2rem' }}>Overview of your entire business ecosystem.</p>
                  {renderDashboard()}
                </>
              ) : activeAdminTab === 'people_map_panel' ? (
                renderPeopleMap()
              ) : activeAdminTab === 'reports_panel' ? (
                renderReports()
              ) : activeAdminTab === 'settings_panel' ? (
                renderSettings()
              ) : activeAdminTab === 'event_approvals_panel' ? (
                <EventApprovalsPanel API_URL={API_URL} />
              ) : activeAdminTab === 'upgrade_requests_panel' ? (
                <UpgradeRequestsPanel API_URL={API_URL} />
              ) : syncStatus === 'missing_table' ? (
                <div className="missing-table-notice animate-fade-in" style={{ padding: '3rem', background: '#fff1f2', borderRadius: '24px', border: '2px dashed #f43f5e', textAlign: 'center' }}>
                  <Database size={48} color="#f43f5e" style={{ marginBottom: '1rem' }} />
                  <h2 style={{ color: '#9f1239' }}>Database Setup Required</h2>
                  <p style={{ color: '#be123c', maxWidth: '500px', margin: '1rem auto' }}>
                    The table <strong>'{currentTab.table}'</strong> does not exist in your Supabase database.
                    Please run the following SQL command in your Supabase SQL Editor to fix this:
                  </p>
                  <pre style={{ background: '#1e293b', color: '#f8fafc', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', fontSize: '0.8rem', overflowX: 'auto', margin: '2rem 0' }}>
                    {`-- Run this in Supabase SQL Editor
CREATE TABLE IF NOT EXISTS service_areas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    city VARCHAR(100) DEFAULT 'Ahmedabad',
    area_name VARCHAR(100) UNIQUE NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);`}
                  </pre>
                  <button
                    onClick={() => fetchData()}
                    style={{ background: '#f43f5e', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 600, cursor: 'pointer' }}
                  >
                    I've run the SQL, Refresh Now
                  </button>
                </div>
              ) : (
                <>
                  <div className="table-header-row">
                    <div>
                      <h2 className="table-title">{currentTab.label}</h2>
                      <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Manage and monitor entries in real-time.</p>
                    </div>
                    <span className="count-chip">{data.length} Total Records</span>
                  </div>
                  {renderTable()}
                </>
              )}
            </Motion.div>
          </AnimatePresence>
        </div>
      </main>

      {/* Modal logic remains similar but with better styling in CSS */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className={`admin-modal ${currentTab.table === 'events' ? 'wide-modal' : ''}`}>
            <div className="modal-header">
              <h3>Modify Platform Resource</h3>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpsert} className="admin-form">
              {currentTab.table === 'events' ? (
                eventWizardStep === 1 ? (
                  <div className="event-type-selection-container">
                    <p className="event-type-subtitle">We'll tailor the setup based on what you're planning. You can switch later.</p>
                    <div className="event-type-cards">
                      {/* Card 1: Single Show */}
                      <div 
                        className={`event-type-card ${formData.show_type === 'single' || !formData.show_type ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, show_type: 'single' })}
                      >
                        <div className="card-top-row">
                          <div className="card-icon-box purple-tint">
                            <Clock size={20} color="#4f46e5" />
                          </div>
                          <div className="card-badge-container">
                            <span className="card-badge-most-common">Most common</span>
                            <div className={`card-check-circle ${(formData.show_type === 'single' || !formData.show_type) ? 'checked' : ''}`}>
                              {(formData.show_type === 'single' || !formData.show_type) && (
                                <div className="card-checkmark-fill">✓</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <h4 className="card-title">Single show</h4>
                        <p className="card-desc">One date, one venue and one show time. Perfect for concerts, comedy nights and workshops.</p>
                        <span className="card-duration-info">Takes about 2 minutes.</span>
                      </div>

                      {/* Card 2: Multiple Shows */}
                      <div 
                        className={`event-type-card ${formData.show_type === 'multiple' ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, show_type: 'multiple' })}
                      >
                        <div className="card-top-row">
                          <div className="card-icon-box blue-tint">
                            <Layers size={20} color="#3b82f6" />
                          </div>
                          <div className="card-badge-container">
                            <div className={`card-check-circle ${formData.show_type === 'multiple' ? 'checked' : ''}`}>
                              {formData.show_type === 'multiple' && (
                                <div className="card-checkmark-fill">✓</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <h4 className="card-title">Multiple shows</h4>
                        <p className="card-desc">One event across several dates or times, such as a theatre run or weekly comedy night.</p>
                        <span className="card-duration-info">Manage every show from a simple schedule.</span>
                      </div>

                      {/* Card 3: Festival or Tour */}
                      <div 
                        className={`event-type-card ${formData.show_type === 'festival' ? 'selected' : ''}`}
                        onClick={() => setFormData({ ...formData, show_type: 'festival' })}
                      >
                        <div className="card-top-row">
                          <div className="card-icon-box orange-tint">
                            <MapPin size={20} color="#f97316" />
                          </div>
                          <div className="card-badge-container">
                            <span className="card-badge-advanced">Advanced</span>
                            <div className={`card-check-circle ${formData.show_type === 'festival' ? 'checked' : ''}`}>
                              {formData.show_type === 'festival' && (
                                <div className="card-checkmark-fill">✓</div>
                              )}
                            </div>
                          </div>
                        </div>
                        <h4 className="card-title">Festival or tour</h4>
                        <p className="card-desc">Multiple venues, multi-day festivals, tours, custom passes or complex per-slot setup.</p>
                        <span className="card-duration-info">Opens the complete step-by-step advanced setup.</span>
                      </div>
                    </div>
                    
                    <div className="event-type-footer">
                      <span className="event-type-selected-text">
                        Selected: <strong>{formData.show_type === 'festival' ? 'Festival or tour' : formData.show_type === 'multiple' ? 'Multiple shows' : 'Single show'}</strong>
                      </span>
                      <button 
                        type="button" 
                        className="event-type-continue-btn"
                        onClick={() => setEventWizardStep(2)}
                      >
                        Continue
                      </button>
                    </div>
                  </div>
                ) : formData.show_type === 'multiple' ? (
                  eventWizardStep === 2 ? (
                    // STEP 1 of Multiple Shows: Basics
                    <div className="single-event-wizard-step animate-fade-in">
                      {/* Visual Stepper */}
                      <div className="wizard-stepper-bar">
                        <div className="step-item active">
                          <span className="step-number">1</span>
                          <span className="step-label">Basics</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">2</span>
                          <span className="step-label">Schedule</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos & details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <div className="wizard-back-indicator">
                          <span className="current-selection-badge">Multiple shows</span>
                          <button type="button" className="change-selection-btn" onClick={() => setEventWizardStep(1)}>Change</button>
                        </div>
                        <h2 className="wizard-title">Create multiple shows</h2>
                        <p className="wizard-subtitle">Build a multi-date or multi-time event without using the advanced setup.</p>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Basics</h4>
                          <span className="required-badge">Required</span>
                        </div>
                        <p className="section-card-desc">Name the event once. Each show gets its own schedule row next.</p>

                        <div className="wizard-fields-stack">
                          <div className="form-field">
                            <label>Event name *</label>
                            <input 
                              type="text" 
                              placeholder="e.g. Friday night comedy run" 
                              required
                              value={formData.title || ''} 
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                          </div>

                          <div className="form-field">
                            <label>Event visibility *</label>
                            <div className="visibility-cards-row">
                              <div 
                                className={`visibility-card ${(formData.visibility === 'public' || !formData.visibility) ? 'selected' : ''}`}
                                onClick={() => setFormData({ ...formData, visibility: 'public' })}
                              >
                                <div className="visibility-circle">
                                  {(formData.visibility === 'public' || !formData.visibility) && <div className="checkmark" />}
                                </div>
                                <div className="visibility-info">
                                  <strong>Public</strong>
                                  <span>Visible on Showmates listings.</span>
                                </div>
                              </div>
                              <div 
                                className={`visibility-card ${formData.visibility === 'private' ? 'selected' : ''}`}
                                onClick={() => setFormData({ ...formData, visibility: 'private' })}
                              >
                                <div className="visibility-circle">
                                  {formData.visibility === 'private' && <div className="checkmark" />}
                                </div>
                                <div className="visibility-info">
                                  <strong>Private</strong>
                                  <span>Accessible only by private access links.</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="online-checkbox-card">
                            <input 
                              type="checkbox" 
                              id="is_online_evt_mult"
                              checked={!!formData.is_online}
                              onChange={(e) => setFormData({ ...formData, is_online: e.target.checked })}
                            />
                            <label htmlFor="is_online_evt_mult">
                              <strong>Online event</strong>
                              <span>Online events use listing cities for each show instead of physical venues.</span>
                            </label>
                          </div>

                          <div className="form-field">
                            <label>Category *</label>
                            <select 
                              required 
                              value={formData.category || ''} 
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              className="admin-select"
                            >
                              <option value="">Search group or category</option>
                              <option value="Music & Concerts">Music & Concerts</option>
                              <option value="Comedy & Theatre">Comedy & Theatre</option>
                              <option value="Workshops & Classes">Workshops & Classes</option>
                              <option value="Parties & Nightlife">Parties & Nightlife</option>
                              <option value="Festivals & Fairs">Festivals & Fairs</option>
                              <option value="Sports & Fitness">Sports & Fitness</option>
                              <option value="Corporate & Business">Corporate & Business</option>
                              <option value="Other Events">Other Events</option>
                            </select>
                          </div>

                          <div className="booking-window-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                            <div className="form-field">
                              <label>Booking Opens *</label>
                              <input 
                                type="datetime-local" 
                                required
                                value={formData.booking_start ? new Date(formData.booking_start).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  setFormData({ ...formData, booking_start: e.target.value ? new Date(e.target.value).toISOString() : '' });
                                }}
                              />
                            </div>
                            <div className="form-field">
                              <label>Booking Closes *</label>
                              <input 
                                type="datetime-local" 
                                required
                                value={formData.booking_end ? new Date(formData.booking_end).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  setFormData({ ...formData, booking_end: e.target.value ? new Date(e.target.value).toISOString() : '' });
                                }}
                              />
                            </div>
                          </div>

                          <div className="organizer-info-box">
                            <strong>Organizer</strong>
                            <span>Current organizer: Admin Panel Organizer</span>
                          </div>
                        </div>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(1)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="button" className="wizard-next-btn" onClick={() => {
                            if (!formData.title || !formData.category) {
                              toast.error("Please fill in required fields!");
                              return;
                            }
                            setEventWizardStep(3);
                          }}>Next: Schedule</button>
                        </div>
                      </div>
                    </div>
                  ) : eventWizardStep === 3 ? (
                    // STEP 2: Schedule
                    <div className="single-event-wizard-step animate-fade-in">
                      {/* Visual Stepper */}
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Basics</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">2</span>
                          <span className="step-label">Schedule</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos & details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Event Schedule</h2>
                        <p className="wizard-subtitle">Add each date and time slot for your shows.</p>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Schedules ({(formData.schedule_slots || []).length})</h4>
                        </div>
                        
                        <div className="schedule-slots-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {(formData.schedule_slots || []).map((slot, index) => (
                            <div key={slot.id || index} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', background: '#f8fafc', position: 'relative' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#ff6b00' }}>
                                <span>Show #{index + 1}</span>
                                {formData.schedule_slots.length > 1 && (
                                  <button type="button" style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => {
                                    setFormData({ ...formData, schedule_slots: formData.schedule_slots.filter(s => s.id !== slot.id) });
                                  }}><Trash2 size={16} /></button>
                                )}
                              </div>
                              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                <div className="form-field">
                                  <label>Date *</label>
                                  <input type="date" required value={slot.date || ''} onChange={(e) => {
                                    const slots = [...formData.schedule_slots];
                                    slots[index] = { ...slot, date: e.target.value };
                                    setFormData({ ...formData, schedule_slots: slots });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Starts *</label>
                                  <input type="time" required value={slot.starts || '19:00'} onChange={(e) => {
                                    const slots = [...formData.schedule_slots];
                                    slots[index] = { ...slot, starts: e.target.value };
                                    setFormData({ ...formData, schedule_slots: slots });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Ends *</label>
                                  <input type="time" required value={slot.ends || '22:00'} onChange={(e) => {
                                    const slots = [...formData.schedule_slots];
                                    slots[index] = { ...slot, ends: e.target.value };
                                    setFormData({ ...formData, schedule_slots: slots });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Venue *</label>
                                  <input type="text" required placeholder="Search venue..." value={slot.venue_name || ''} onChange={(e) => {
                                    const slots = [...formData.schedule_slots];
                                    slots[index] = { ...slot, venue_name: e.target.value };
                                    setFormData({ ...formData, schedule_slots: slots });
                                  }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button type="button" className="add-tier-dashed-btn" style={{ marginTop: '1rem' }} onClick={() => {
                          const slots = [...(formData.schedule_slots || [])];
                          slots.push({ id: Date.now(), date: '', starts: '19:00', ends: '22:00', venue_name: '' });
                          setFormData({ ...formData, schedule_slots: slots });
                        }}>+ Add another show date/time</button>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(2)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="button" className="wizard-next-btn" onClick={() => {
                            const invalid = formData.schedule_slots?.some(s => !s.date || !s.venue_name);
                            if (invalid || !formData.schedule_slots?.length) {
                              toast.error("Please fill in date and venue for all scheduled shows!");
                              return;
                            }
                            setEventWizardStep(4);
                          }}>Next: Tickets</button>
                        </div>
                      </div>
                    </div>
                  ) : eventWizardStep === 4 ? (
                    // STEP 3: Tickets
                    <div className="single-event-wizard-step animate-fade-in">
                      {/* Visual Stepper */}
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Basics</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">2</span>
                          <span className="step-label">Schedule</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos & details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Tickets</h2>
                        <p className="wizard-subtitle">Define the pricing tiers for your multiple shows.</p>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Tickets</h4>
                          <span className="sell-badge">Tiers: {formData.ticket_tiers?.length || 0}</span>
                        </div>

                        <div className="ticket-tiers-list">
                          {(formData.ticket_tiers || []).map((tier, index) => (
                            <div className="ticket-tier-row-card" key={tier.id || index}>
                              <div className="tier-row-header">
                                <span className="tier-index-number">{index + 1}</span>
                                <span className="tier-badge-type">{parseFloat(tier.price) === 0 ? 'Free' : 'Paid'}</span>
                                {formData.ticket_tiers.length > 1 && (
                                  <button type="button" className="delete-tier-btn" onClick={() => {
                                    setFormData({ ...formData, ticket_tiers: formData.ticket_tiers.filter((_, idx) => idx !== index) });
                                  }}><Trash2 size={16} /></button>
                                )}
                              </div>
                              <div className="tier-inputs-grid">
                                <div className="form-field">
                                  <label>Name *</label>
                                  <input type="text" placeholder="General Admission" required value={tier.tier_name || ''} onChange={(e) => {
                                    const nextTiers = [...formData.ticket_tiers];
                                    nextTiers[index] = { ...tier, tier_name: e.target.value };
                                    setFormData({ ...formData, ticket_tiers: nextTiers });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Price *</label>
                                  <input type="number" placeholder="₹ 0" required value={tier.price === 0 ? '' : tier.price} onChange={(e) => {
                                    const nextTiers = [...formData.ticket_tiers];
                                    nextTiers[index] = { ...tier, price: parseFloat(e.target.value) || 0 };
                                    setFormData({ ...formData, ticket_tiers: nextTiers });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Quantity *</label>
                                  <input type="number" placeholder="100" required value={tier.total_seats || ''} onChange={(e) => {
                                    const nextTiers = [...formData.ticket_tiers];
                                    nextTiers[index] = { ...tier, total_seats: parseInt(e.target.value) || 0, available_seats: parseInt(e.target.value) || 0 };
                                    setFormData({ ...formData, ticket_tiers: nextTiers });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Entries per ticket *</label>
                                  <input type="number" defaultValue={1} required />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button type="button" className="add-tier-dashed-btn" onClick={() => {
                          const nextTiers = [...(formData.ticket_tiers || [])];
                          nextTiers.push({ id: 'temp_' + Date.now(), tier_name: '', price: 0, total_seats: 100, available_seats: 100 });
                          setFormData({ ...formData, ticket_tiers: nextTiers });
                        }}>+ Add another ticket type</button>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(3)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="button" className="wizard-next-btn" onClick={() => {
                            if (!formData.ticket_tiers?.length || formData.ticket_tiers.some(t => !t.tier_name)) {
                              toast.error("Please add at least one complete ticket tier!");
                              return;
                            }
                            setEventWizardStep(5);
                          }}>Next: Photos & details</button>
                        </div>
                      </div>
                    </div>
                  ) : eventWizardStep === 5 ? (
                    // STEP 4: Photos & details
                    <div className="single-event-wizard-step animate-fade-in">
                      {/* Visual Stepper */}
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Basics</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">2</span>
                          <span className="step-label">Schedule</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos & details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Event Banner & Description</h2>
                        <p className="wizard-subtitle">Upload assets to publish your multiple shows listing.</p>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Banner Image</h4>
                        </div>
                        <div className="form-field">
                          <label>Banner URL *</label>
                          <input type="text" placeholder="https://example.com/banner.jpg" required value={formData.banner_url || ''} onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })} />
                        </div>
                        {formData.banner_url && (
                          <div className="banner-preview-box">
                            <img src={formData.banner_url} alt="Event Preview" />
                          </div>
                        )}
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Event Description</h4>
                        </div>
                        <div className="form-field">
                          <label>Description *</label>
                          <textarea placeholder="Describe your event in detail..." required rows={6} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="wizard-textarea" />
                        </div>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(4)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="button" className="wizard-next-btn" onClick={() => {
                            if (!formData.banner_url || !formData.description) {
                              toast.error("Please add banner image and description!");
                              return;
                            }
                            setEventWizardStep(6);
                          }}>Next: Review</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // STEP 5: Review
                    <div className="single-event-wizard-step animate-fade-in">
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Basics</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">2</span>
                          <span className="step-label">Schedule</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos & details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Review Event Details</h2>
                        <p className="wizard-subtitle">Verify the details before publishing multiple shows live.</p>
                      </div>

                      <div className="wizard-section-card review-summary-card">
                        <div className="review-banner">
                          {formData.banner_url && <img src={formData.banner_url} alt="Banner" />}
                          <span className="review-status-badge">UPCOMING</span>
                        </div>
                        <div className="review-content">
                          <h3 className="review-title">{formData.title || 'Untitled Event'}</h3>
                          <div className="review-meta-row">
                            <span className="review-category-tag">{formData.category}</span>
                            <span className="review-visibility-tag">{formData.visibility || 'public'}</span>
                          </div>

                          <div style={{ margin: '1.5rem 0' }}>
                            <strong>📅 Scheduled Shows ({(formData.schedule_slots || []).length})</strong>
                            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                              {(formData.schedule_slots || []).map((s, idx) => (
                                <div key={s.id || idx} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Show #{idx + 1}: {s.date} ({s.starts} - {s.ends})</span>
                                  <strong>📍 {s.venue_name}</strong>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="review-tickets-section">
                            <strong>Ticket Tiers ({formData.ticket_tiers?.length || 0})</strong>
                            <div className="review-tiers-list">
                              {(formData.ticket_tiers || []).map((t, idx) => (
                                <div className="review-tier-item" key={t.id || idx}>
                                  <div className="tier-left">
                                    <strong>{t.tier_name}</strong>
                                    <span>Capacity: {t.total_seats} seats</span>
                                  </div>
                                  <span className="tier-price-tag">₹{t.price}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(5)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="submit" className="wizard-publish-btn" disabled={isSaving}>
                            {isSaving ? 'Publishing...' : 'Publish Multiple Shows'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : formData.show_type === 'festival' ? (
                  // Festival/Tour Wizard
                  eventWizardStep === 2 ? (
                    // STEP 1: Basic Event Details
                    <div className="single-event-wizard-step animate-fade-in">
                      <div className="wizard-stepper-bar">
                        <div className="step-item active">
                          <span className="step-number">1</span>
                          <span className="step-label">Basic Details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">2</span>
                          <span className="step-label">Venues</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <div className="wizard-back-indicator">
                          <span className="current-selection-badge">Festival or tour</span>
                          <button type="button" className="change-selection-btn" onClick={() => setEventWizardStep(1)}>Change</button>
                        </div>
                        <h2 className="wizard-title">Create Festival or Tour</h2>
                        <p className="wizard-subtitle">Use this flow for complex schedules, multiple venues, tours or advanced setup.</p>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Basic Event Details</h4>
                        </div>
                        <div className="wizard-fields-stack">
                          <div className="form-field">
                            <label>Event Title *</label>
                            <input type="text" placeholder="Enter captivating event title" required value={formData.title || ''} onChange={(e) => setFormData({ ...formData, title: e.target.value })} />
                          </div>

                          <div className="form-grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
                            <div className="form-field">
                              <label>Event Category *</label>
                              <select required value={formData.category || ''} onChange={(e) => setFormData({ ...formData, category: e.target.value })} className="admin-select">
                                <option value="">Select event category</option>
                                <option value="Music & Concerts">Music & Concerts</option>
                                <option value="Comedy & Theatre">Comedy & Theatre</option>
                                <option value="Workshops & Classes">Workshops & Classes</option>
                                <option value="Parties & Nightlife">Parties & Nightlife</option>
                                <option value="Festivals & Fairs">Festivals & Fairs</option>
                                <option value="Sports & Fitness">Sports & Fitness</option>
                              </select>
                            </div>
                            <div className="form-field">
                              <label>Visibility *</label>
                              <select required value={formData.visibility || 'public'} onChange={(e) => setFormData({ ...formData, visibility: e.target.value })} className="admin-select">
                                <option value="public">Public - Visible to anyone</option>
                                <option value="private">Private - Invitation only</option>
                              </select>
                            </div>
                          </div>

                          <div className="booking-window-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '0.75rem' }}>
                            <div className="form-field">
                              <label>Booking Opens *</label>
                              <input 
                                type="datetime-local" 
                                required
                                value={formData.booking_start ? new Date(formData.booking_start).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  setFormData({ ...formData, booking_start: e.target.value ? new Date(e.target.value).toISOString() : '' });
                                }}
                              />
                            </div>
                            <div className="form-field">
                              <label>Booking Closes *</label>
                              <input 
                                type="datetime-local" 
                                required
                                value={formData.booking_end ? new Date(formData.booking_end).toISOString().slice(0, 16) : ''}
                                onChange={(e) => {
                                  setFormData({ ...formData, booking_end: e.target.value ? new Date(e.target.value).toISOString() : '' });
                                }}
                              />
                            </div>
                          </div>

                          <div className="form-field">
                            <label>Event Description *</label>
                            <textarea placeholder="Describe your event in detail. What can attendees expect?" required rows={5} value={formData.description || ''} onChange={(e) => setFormData({ ...formData, description: e.target.value })} className="wizard-textarea" />
                          </div>

                          <div className="online-checkbox-card">
                            <input type="checkbox" id="is_online_fest" checked={!!formData.is_online} onChange={(e) => setFormData({ ...formData, is_online: e.target.checked })} />
                            <label htmlFor="is_online_fest">
                              <strong>This is an online event</strong>
                              <span>Virtual events use video conferencing platforms instead of physical venues.</span>
                            </label>
                          </div>
                        </div>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(1)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="button" className="wizard-next-btn" onClick={() => {
                            if (!formData.title || !formData.category || !formData.description) {
                              toast.error("Please fill in title, category and description!");
                              return;
                            }
                            setEventWizardStep(3);
                          }}>Next: Venues</button>
                        </div>
                      </div>
                    </div>
                  ) : eventWizardStep === 3 ? (
                    // STEP 2: Venues (Stops)
                    <div className="single-event-wizard-step animate-fade-in">
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Basic Details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">2</span>
                          <span className="step-label">Venues</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Tour stops & Venues</h2>
                        <p className="wizard-subtitle">Define where and when each stop of the tour/festival occurs.</p>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Venues ({(formData.schedule_slots || []).length})</h4>
                        </div>
                        <div className="schedule-slots-list" style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                          {(formData.schedule_slots || []).map((slot, index) => (
                            <div key={slot.id || index} style={{ border: '1px solid #e2e8f0', borderRadius: '16px', padding: '1rem', background: '#f8fafc' }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem', fontWeight: 'bold', fontSize: '0.85rem', color: '#ff6b00' }}>
                                <span>Stop #{index + 1}</span>
                                {formData.schedule_slots.length > 1 && (
                                  <button type="button" style={{ border: 'none', background: 'none', color: '#ef4444', cursor: 'pointer' }} onClick={() => {
                                    setFormData({ ...formData, schedule_slots: formData.schedule_slots.filter(s => s.id !== slot.id) });
                                  }}><Trash2 size={16} /></button>
                                )}
                              </div>
                              <div className="form-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '1rem' }}>
                                <div className="form-field">
                                  <label>Venue / City *</label>
                                  <input type="text" required placeholder="Venue name and city" value={slot.venue_name || ''} onChange={(e) => {
                                    const slots = [...formData.schedule_slots];
                                    slots[index] = { ...slot, venue_name: e.target.value };
                                    setFormData({ ...formData, schedule_slots: slots });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Date *</label>
                                  <input type="date" required value={slot.date || ''} onChange={(e) => {
                                    const slots = [...formData.schedule_slots];
                                    slots[index] = { ...slot, date: e.target.value };
                                    setFormData({ ...formData, schedule_slots: slots });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Starts *</label>
                                  <input type="time" required value={slot.starts || '19:00'} onChange={(e) => {
                                    const slots = [...formData.schedule_slots];
                                    slots[index] = { ...slot, starts: e.target.value };
                                    setFormData({ ...formData, schedule_slots: slots });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Ends *</label>
                                  <input type="time" required value={slot.ends || '22:00'} onChange={(e) => {
                                    const slots = [...formData.schedule_slots];
                                    slots[index] = { ...slot, ends: e.target.value };
                                    setFormData({ ...formData, schedule_slots: slots });
                                  }} />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button type="button" className="add-tier-dashed-btn" style={{ marginTop: '1rem' }} onClick={() => {
                          const slots = [...(formData.schedule_slots || [])];
                          slots.push({ id: Date.now(), date: '', starts: '19:00', ends: '22:00', venue_name: '' });
                          setFormData({ ...formData, schedule_slots: slots });
                        }}>+ Add another tour stop</button>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(2)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="button" className="wizard-next-btn" onClick={() => {
                            if (formData.schedule_slots?.some(s => !s.date || !s.venue_name)) {
                              toast.error("Please fill in date and venue details for all tour stops!");
                              return;
                            }
                            setEventWizardStep(4);
                          }}>Next: Tickets</button>
                        </div>
                      </div>
                    </div>
                  ) : eventWizardStep === 4 ? (
                    // STEP 3: Tickets
                    <div className="single-event-wizard-step animate-fade-in">
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Basic Details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">2</span>
                          <span className="step-label">Venues</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Ticket Tiers</h2>
                        <p className="wizard-subtitle">Create pricing categories for this tour/festival.</p>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Tickets</h4>
                        </div>
                        <div className="ticket-tiers-list">
                          {(formData.ticket_tiers || []).map((tier, index) => (
                            <div className="ticket-tier-row-card" key={tier.id || index}>
                              <div className="tier-row-header">
                                <span className="tier-index-number">{index + 1}</span>
                                <span className="tier-badge-type">{parseFloat(tier.price) === 0 ? 'Free' : 'Paid'}</span>
                                {formData.ticket_tiers.length > 1 && (
                                  <button type="button" className="delete-tier-btn" onClick={() => {
                                    setFormData({ ...formData, ticket_tiers: formData.ticket_tiers.filter((_, idx) => idx !== index) });
                                  }}><Trash2 size={16} /></button>
                                )}
                              </div>
                              <div className="tier-inputs-grid">
                                <div className="form-field">
                                  <label>Name *</label>
                                  <input type="text" placeholder="General Admission" required value={tier.tier_name || ''} onChange={(e) => {
                                    const nextTiers = [...formData.ticket_tiers];
                                    nextTiers[index] = { ...tier, tier_name: e.target.value };
                                    setFormData({ ...formData, ticket_tiers: nextTiers });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Price *</label>
                                  <input type="number" placeholder="₹ 0" required value={tier.price === 0 ? '' : tier.price} onChange={(e) => {
                                    const nextTiers = [...formData.ticket_tiers];
                                    nextTiers[index] = { ...tier, price: parseFloat(e.target.value) || 0 };
                                    setFormData({ ...formData, ticket_tiers: nextTiers });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Quantity *</label>
                                  <input type="number" placeholder="100" required value={tier.total_seats || ''} onChange={(e) => {
                                    const nextTiers = [...formData.ticket_tiers];
                                    nextTiers[index] = { ...tier, total_seats: parseInt(e.target.value) || 0, available_seats: parseInt(e.target.value) || 0 };
                                    setFormData({ ...formData, ticket_tiers: nextTiers });
                                  }} />
                                </div>
                                <div className="form-field">
                                  <label>Entries per ticket *</label>
                                  <input type="number" defaultValue={1} required />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                        <button type="button" className="add-tier-dashed-btn" onClick={() => {
                          const nextTiers = [...(formData.ticket_tiers || [])];
                          nextTiers.push({ id: 'temp_' + Date.now(), tier_name: '', price: 0, total_seats: 100, available_seats: 100 });
                          setFormData({ ...formData, ticket_tiers: nextTiers });
                        }}>+ Add another ticket type</button>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(3)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="button" className="wizard-next-btn" onClick={() => {
                            if (!formData.ticket_tiers?.length || formData.ticket_tiers.some(t => !t.tier_name)) {
                              toast.error("Please add at least one complete ticket tier!");
                              return;
                            }
                            setEventWizardStep(5);
                          }}>Next: Photos & details</button>
                        </div>
                      </div>
                    </div>
                  ) : eventWizardStep === 5 ? (
                    // STEP 4: Photos
                    <div className="single-event-wizard-step animate-fade-in">
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Basic Details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">2</span>
                          <span className="step-label">Venues</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Event Banner</h2>
                        <p className="wizard-subtitle">Add a banner image to attract attendees to your festival/tour stops.</p>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Banner Image</h4>
                        </div>
                        <div className="form-field">
                          <label>Banner URL *</label>
                          <input type="text" placeholder="https://example.com/banner.jpg" required value={formData.banner_url || ''} onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })} />
                        </div>
                        {formData.banner_url && (
                          <div className="banner-preview-box">
                            <img src={formData.banner_url} alt="Event Preview" />
                          </div>
                        )}
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(4)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="button" className="wizard-next-btn" onClick={() => {
                            if (!formData.banner_url) {
                              toast.error("Please add a banner image URL!");
                              return;
                            }
                            setEventWizardStep(6);
                          }}>Next: Review</button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // STEP 5: Review
                    <div className="single-event-wizard-step animate-fade-in">
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Basic Details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">2</span>
                          <span className="step-label">Venues</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">3</span>
                          <span className="step-label">Tickets</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">4</span>
                          <span className="step-label">Photos</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">5</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Review Tour Details</h2>
                        <p className="wizard-subtitle">Verify the details before publishing your tour stops live.</p>
                      </div>

                      <div className="wizard-section-card review-summary-card">
                        <div className="review-banner">
                          {formData.banner_url && <img src={formData.banner_url} alt="Banner" />}
                          <span className="review-status-badge">UPCOMING</span>
                        </div>
                        <div className="review-content">
                          <h3 className="review-title">{formData.title || 'Untitled Tour/Festival'}</h3>
                          <div className="review-meta-row">
                            <span className="review-category-tag">{formData.category}</span>
                            <span className="review-visibility-tag">{formData.visibility || 'public'}</span>
                          </div>

                          <div style={{ margin: '1.5rem 0' }}>
                            <strong>📅 Tour Stops / Venues ({(formData.schedule_slots || []).length})</strong>
                            <div style={{ display: 'grid', gap: '0.5rem', marginTop: '0.5rem' }}>
                              {(formData.schedule_slots || []).map((s, idx) => (
                                <div key={s.id || idx} style={{ padding: '8px 12px', background: '#f8fafc', borderRadius: '8px', fontSize: '0.85rem', display: 'flex', justifyContent: 'space-between' }}>
                                  <span>Stop #{idx + 1}: {s.venue_name}</span>
                                  <strong>📍 {s.date} ({s.starts} - {s.ends})</strong>
                                </div>
                              ))}
                            </div>
                          </div>

                          <div className="review-tickets-section">
                            <strong>Ticket Tiers ({formData.ticket_tiers?.length || 0})</strong>
                            <div className="review-tiers-list">
                              {(formData.ticket_tiers || []).map((t, idx) => (
                                <div className="review-tier-item" key={t.id || idx}>
                                  <div className="tier-left">
                                    <strong>{t.tier_name}</strong>
                                    <span>Capacity: {t.total_seats} seats</span>
                                  </div>
                                  <span className="tier-price-tag">₹{t.price}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button type="button" className="wizard-back-btn" onClick={() => setEventWizardStep(5)}>← Back</button>
                        <div className="wizard-right-actions">
                          <button type="submit" className="wizard-publish-btn" disabled={isSaving}>
                            {isSaving ? 'Publishing...' : 'Publish Tour / Festival'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (formData.show_type === 'single' || !formData.show_type) ? (
                  eventWizardStep === 2 ? (
                    // STEP 1 of visual stepper: Create your show (basics, when/where, tickets)
                    <div className="single-event-wizard-step animate-fade-in">
                      {/* Visual Stepper */}
                      <div className="wizard-stepper-bar">
                        <div className="step-item active">
                          <span className="step-number">1</span>
                          <span className="step-label">Create your show</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">2</span>
                          <span className="step-label">Photos & details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <div className="wizard-back-indicator">
                          <span className="current-selection-badge">Single show</span>
                          <button type="button" className="change-selection-btn" onClick={() => setEventWizardStep(1)}>Change</button>
                        </div>
                        <h2 className="wizard-title">Create your show</h2>
                        <p className="wizard-subtitle">Everything needed to start selling, all in one place. We'll save your progress as you go.</p>
                      </div>

                      {/* Section 1: The basics */}
                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>The basics</h4>
                          <span className="required-badge">Required</span>
                        </div>
                        <p className="section-card-desc">Name the event and choose the category guests will browse under.</p>

                        <div className="wizard-fields-stack">
                          <div className="form-field">
                            <label>Event name *</label>
                            <input 
                              type="text" 
                              placeholder="e.g. An evening with Prateek Kuhad" 
                              required
                              value={formData.title || ''} 
                              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                            />
                          </div>

                          <div className="form-field">
                            <label>Event visibility *</label>
                            <div className="visibility-cards-row">
                              <div 
                                className={`visibility-card ${(formData.visibility === 'public' || !formData.visibility) ? 'selected' : ''}`}
                                onClick={() => setFormData({ ...formData, visibility: 'public' })}
                              >
                                <div className="visibility-circle">
                                  {(formData.visibility === 'public' || !formData.visibility) && <div className="checkmark" />}
                                </div>
                                <div className="visibility-info">
                                  <strong>Public</strong>
                                  <span>Visible on Showmate listings.</span>
                                </div>
                              </div>
                              <div 
                                className={`visibility-card ${formData.visibility === 'private' ? 'selected' : ''}`}
                                onClick={() => setFormData({ ...formData, visibility: 'private' })}
                              >
                                <div className="visibility-circle">
                                  {formData.visibility === 'private' && <div className="checkmark" />}
                                </div>
                                <div className="visibility-info">
                                  <strong>Private</strong>
                                  <span>Accessible only by private access links.</span>
                                </div>
                              </div>
                            </div>
                          </div>

                          <div className="online-checkbox-card">
                            <input 
                              type="checkbox" 
                              id="is_online_evt"
                              checked={!!formData.is_online}
                              onChange={(e) => setFormData({ ...formData, is_online: e.target.checked })}
                            />
                            <label htmlFor="is_online_evt">
                              <strong>Online event</strong>
                              <span>Virtual events use video conferencing details instead of a physical venue.</span>
                            </label>
                          </div>

                          <div className="form-field">
                            <label>Category *</label>
                            <select 
                              required 
                              value={formData.category || ''} 
                              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
                              className="admin-select"
                            >
                              <option value="">Search group or category</option>
                              <option value="Music & Concerts">Music & Concerts</option>
                              <option value="Comedy & Theatre">Comedy & Theatre</option>
                              <option value="Workshops & Classes">Workshops & Classes</option>
                              <option value="Parties & Nightlife">Parties & Nightlife</option>
                              <option value="Festivals & Fairs">Festivals & Fairs</option>
                              <option value="Sports & Fitness">Sports & Fitness</option>
                              <option value="Corporate & Business">Corporate & Business</option>
                              <option value="Other Events">Other Events</option>
                            </select>
                          </div>

                          <div className="organizer-info-box">
                            <strong>Organizer</strong>
                            <span>Current organizer is set from your signed-in account.</span>
                          </div>
                        </div>
                      </div>

                      {/* Section 2: When and where */}
                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>When and where</h4>
                        </div>
                        <p className="section-card-desc">Set the single public show date, time and venue.</p>

                        <div className="when-where-grid">
                          <div className="form-field">
                            <label>Date *</label>
                            <input 
                              type="date" 
                              required
                              value={formData.event_date ? formData.event_date.split('T')[0] : ''}
                              onChange={(e) => {
                                const timePart = formData.event_date && formData.event_date.includes('T') ? formData.event_date.split('T')[1] : '19:00';
                                setFormData({ ...formData, event_date: `${e.target.value}T${timePart}` });
                              }}
                            />
                          </div>
                          <div className="form-field">
                            <label>Starts *</label>
                            <input 
                              type="time" 
                              required
                              value={formData.event_date && formData.event_date.includes('T') ? formData.event_date.split('T')[1].substring(0, 5) : '19:00'}
                              onChange={(e) => {
                                const datePart = formData.event_date ? formData.event_date.split('T')[0] : new Date().toISOString().split('T')[0];
                                setFormData({ ...formData, event_date: `${datePart}T${e.target.value}:00` });
                              }}
                            />
                          </div>
                          <div className="form-field">
                            <label>Ends *</label>
                            <input 
                              type="time" 
                              required
                              value={formData.ends_at && formData.ends_at.includes('T') ? formData.ends_at.split('T')[1].substring(0, 5) : '22:00'}
                              onChange={(e) => {
                                const datePart = formData.ends_at ? formData.ends_at.split('T')[0] : (formData.event_date ? formData.event_date.split('T')[0] : new Date().toISOString().split('T')[0]);
                                setFormData({ ...formData, ends_at: `${datePart}T${e.target.value}:00` });
                              }}
                            />
                          </div>
                        </div>

                        <div className="when-where-grid" style={{ marginTop: '1.25rem' }}>
                          <div className="form-field">
                            <label>Booking Opens *</label>
                            <input 
                              type="datetime-local" 
                              required
                              value={formData.booking_start ? new Date(formData.booking_start).toISOString().slice(0, 16) : ''}
                              onChange={(e) => {
                                setFormData({ ...formData, booking_start: e.target.value ? new Date(e.target.value).toISOString() : '' });
                              }}
                            />
                          </div>
                          <div className="form-field">
                            <label>Booking Closes *</label>
                            <input 
                              type="datetime-local" 
                              required
                              value={formData.booking_end ? new Date(formData.booking_end).toISOString().slice(0, 16) : ''}
                              onChange={(e) => {
                                setFormData({ ...formData, booking_end: e.target.value ? new Date(e.target.value).toISOString() : '' });
                              }}
                            />
                          </div>
                        </div>

                        <div className="venue-search-row">
                          <div className="form-field" style={{ flex: 1 }}>
                            <label>Venue *</label>
                            <input 
                              type="text" 
                              placeholder="Search venue..." 
                              required={!formData.is_online}
                              disabled={!!formData.is_online}
                              value={formData.is_online ? 'Online Virtual Venue' : (formData.venue_name || '')} 
                              onChange={(e) => setFormData({ ...formData, venue_name: e.target.value })}
                            />
                          </div>
                        </div>
                      </div>

                      {/* Section 3: Tickets */}
                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Tickets</h4>
                          <div className="ticket-capacity-badges">
                            <span className="cap-badge">Capacity: {formData.ticket_tiers?.reduce((sum, t) => sum + (parseInt(t.total_seats) || 0), 0) || 0}</span>
                            <span className="sell-badge">Sellout: {formData.ticket_tiers?.reduce((sum, t) => sum + (parseInt(t.total_seats) || 0), 0) || 0}</span>
                          </div>
                        </div>
                        <p className="section-card-desc">Each ticket type automatically applies to this one show.</p>

                        <div className="ticket-tiers-list">
                          {(formData.ticket_tiers || []).map((tier, index) => (
                            <div className="ticket-tier-row-card" key={tier.id || index}>
                              <div className="tier-row-header">
                                <span className="tier-index-number">{index + 1}</span>
                                <span className="tier-badge-type">{parseFloat(tier.price) === 0 ? 'Free' : 'Paid'}</span>
                                {formData.ticket_tiers.length > 1 && (
                                  <button 
                                    type="button" 
                                    className="delete-tier-btn"
                                    onClick={() => {
                                      const nextTiers = formData.ticket_tiers.filter((_, idx) => idx !== index);
                                      setFormData({ ...formData, ticket_tiers: nextTiers });
                                    }}
                                  >
                                    <Trash2 size={16} />
                                  </button>
                                )}
                              </div>

                              <div className="tier-inputs-grid">
                                <div className="form-field">
                                  <label>Name *</label>
                                  <input 
                                    type="text" 
                                    placeholder="General Admission" 
                                    required
                                    value={tier.tier_name || ''} 
                                    onChange={(e) => {
                                      const nextTiers = [...formData.ticket_tiers];
                                      nextTiers[index] = { ...tier, tier_name: e.target.value };
                                      setFormData({ ...formData, ticket_tiers: nextTiers });
                                    }}
                                  />
                                </div>
                                <div className="form-field">
                                  <label>Price *</label>
                                  <input 
                                    type="number" 
                                    placeholder="₹ 0" 
                                    required
                                    value={tier.price === 0 ? '' : tier.price} 
                                    onChange={(e) => {
                                      const nextTiers = [...formData.ticket_tiers];
                                      nextTiers[index] = { ...tier, price: parseFloat(e.target.value) || 0 };
                                      setFormData({ ...formData, ticket_tiers: nextTiers });
                                    }}
                                  />
                                </div>
                                <div className="form-field">
                                  <label>Quantity *</label>
                                  <input 
                                    type="number" 
                                    placeholder="100" 
                                    required
                                    value={tier.total_seats || ''} 
                                    onChange={(e) => {
                                      const nextTiers = [...formData.ticket_tiers];
                                      nextTiers[index] = { ...tier, total_seats: parseInt(e.target.value) || 0, available_seats: parseInt(e.target.value) || 0 };
                                      setFormData({ ...formData, ticket_tiers: nextTiers });
                                    }}
                                  />
                                </div>
                                <div className="form-field">
                                  <label>Entries per ticket *</label>
                                  <input 
                                    type="number" 
                                    placeholder="1" 
                                    required
                                    defaultValue={1}
                                  />
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>

                        <button 
                          type="button" 
                          className="add-tier-dashed-btn"
                          onClick={() => {
                            const nextTiers = [...(formData.ticket_tiers || [])];
                            nextTiers.push({ id: 'temp_' + Date.now(), tier_name: '', price: 0, total_seats: 100, available_seats: 100 });
                            setFormData({ ...formData, ticket_tiers: nextTiers });
                          }}
                        >
                          + Add another ticket type
                        </button>
                      </div>

                      {/* Step Navigation Bar */}
                      <div className="wizard-navigation-footer">
                        <button 
                          type="button" 
                          className="wizard-back-btn" 
                          onClick={() => setEventWizardStep(1)}
                        >
                          ← Back
                        </button>
                        <div className="wizard-right-actions">
                          <span className="save-status-indicator">Draft is not saved yet</span>
                          <button 
                            type="button" 
                            className="wizard-save-draft-btn"
                            onClick={() => {
                              toast.success("Draft state updated locally!");
                            }}
                          >
                            Save draft
                          </button>
                          <button 
                            type="button" 
                            className="wizard-next-btn"
                            onClick={() => {
                              if (!formData.title || !formData.category) {
                                toast.error("Please fill in the required basic fields!");
                                return;
                              }
                              setEventWizardStep(3);
                            }}
                          >
                            Next: Photos & details
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : eventWizardStep === 3 ? (
                    // STEP 2: Photos & details
                    <div className="single-event-wizard-step animate-fade-in">
                      {/* Visual Stepper */}
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Create your show</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">2</span>
                          <span className="step-label">Photos & details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item">
                          <span className="step-number">3</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Event Banner & Description</h2>
                        <p className="wizard-subtitle">Add rich details to attract attendees and make your listing premium.</p>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Banner Image</h4>
                        </div>
                        <div className="form-field">
                          <label>Banner URL *</label>
                          <input 
                            type="text" 
                            placeholder="https://example.com/banner.jpg" 
                            required
                            value={formData.banner_url || ''} 
                            onChange={(e) => setFormData({ ...formData, banner_url: e.target.value })}
                          />
                        </div>
                        {formData.banner_url && (
                          <div className="banner-preview-box">
                            <img src={formData.banner_url} alt="Event Preview" />
                          </div>
                        )}
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Event Description</h4>
                        </div>
                        <div className="form-field">
                          <label>Description *</label>
                          <textarea 
                            placeholder="Describe your event in detail..." 
                            required
                            rows={6}
                            value={formData.description || ''} 
                            onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                            className="wizard-textarea"
                          />
                        </div>
                      </div>

                      <div className="wizard-section-card">
                        <div className="section-card-header">
                          <h4>Status & Custom fields</h4>
                        </div>
                        <div className="form-grid">
                          <div className="form-field">
                            <label>Status *</label>
                            <select 
                              value={formData.status || 'UPCOMING'} 
                              onChange={(e) => setFormData({ ...formData, status: e.target.value })}
                              className="admin-select"
                            >
                              <option value="UPCOMING">UPCOMING</option>
                              <option value="ONGOING">ONGOING</option>
                              <option value="COMPLETED">COMPLETED</option>
                              <option value="CANCELLED">CANCELLED</option>
                              <option value="SOLD_OUT">SOLD_OUT</option>
                            </select>
                          </div>
                        </div>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button 
                          type="button" 
                          className="wizard-back-btn" 
                          onClick={() => setEventWizardStep(2)}
                        >
                          ← Back
                        </button>
                        <div className="wizard-right-actions">
                          <button 
                            type="button" 
                            className="wizard-next-btn"
                            onClick={() => {
                              if (!formData.banner_url || !formData.description) {
                                toast.error("Please add banner image and description details!");
                                return;
                              }
                              const minPrice = formData.ticket_tiers?.length > 0 
                                ? Math.min(...formData.ticket_tiers.map(t => parseFloat(t.price) || 0))
                                : 0;
                              setFormData(prev => ({ ...prev, starting_price: minPrice }));
                              setEventWizardStep(4);
                            }}
                          >
                            Next: Review
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    // STEP 3: Review
                    <div className="single-event-wizard-step animate-fade-in">
                      {/* Visual Stepper */}
                      <div className="wizard-stepper-bar">
                        <div className="step-item active-past">
                          <span className="step-number">1</span>
                          <span className="step-label">Create your show</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active-past">
                          <span className="step-number">2</span>
                          <span className="step-label">Photos & details</span>
                        </div>
                        <div className="step-divider">›</div>
                        <div className="step-item active">
                          <span className="step-number">3</span>
                          <span className="step-label">Review</span>
                        </div>
                      </div>

                      <div className="wizard-step-header">
                        <h2 className="wizard-title">Review event details</h2>
                        <p className="wizard-subtitle">Verify the details before publishing this event live.</p>
                      </div>

                      <div className="wizard-section-card review-summary-card">
                        <div className="review-banner">
                          {formData.banner_url ? (
                            <img src={formData.banner_url} alt={formData.title} />
                          ) : (
                            <div className="no-banner-placeholder">No Banner URL Provided</div>
                          )}
                          <span className="review-status-badge">{formData.status || 'UPCOMING'}</span>
                        </div>

                        <div className="review-content">
                          <h3 className="review-title">{formData.title || 'Untitled Event'}</h3>
                          <div className="review-meta-row">
                            <span className="review-category-tag">{formData.category || 'Category'}</span>
                            <span className="review-visibility-tag">{formData.visibility || 'public'}</span>
                          </div>

                          <div className="review-info-grid">
                            <div className="review-info-item">
                              <strong>📅 Date & Time</strong>
                              <span>{formData.event_date ? new Date(formData.event_date).toLocaleString() : 'Not Set'}</span>
                            </div>
                            <div className="review-info-item">
                              <strong>📍 Venue</strong>
                              <span>{formData.is_online ? 'Online Virtual Event' : (formData.venue_name || 'Not Set')}</span>
                            </div>
                          </div>

                          <div className="review-description-section">
                            <strong>Description</strong>
                            <p>{formData.description || 'No description provided.'}</p>
                          </div>

                          <div className="review-tickets-section">
                            <strong>Ticket Tiers ({formData.ticket_tiers?.length || 0})</strong>
                            <div className="review-tiers-list">
                              {(formData.ticket_tiers || []).map((t, idx) => (
                                <div className="review-tier-item" key={t.id || idx}>
                                  <div className="tier-left">
                                    <strong>{t.tier_name || 'General Admission'}</strong>
                                    <span>Capacity: {t.total_seats || 100} seats</span>
                                  </div>
                                  <span className="tier-price-tag">{parseFloat(t.price) === 0 ? 'Free' : `₹${t.price}`}</span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="wizard-navigation-footer">
                        <button 
                          type="button" 
                          className="wizard-back-btn" 
                          onClick={() => setEventWizardStep(3)}
                        >
                          ← Back
                        </button>
                        <div className="wizard-right-actions">
                          <button type="submit" className="wizard-publish-btn" disabled={isSaving}>
                            {isSaving ? 'Publishing...' : 'Publish Event'}
                          </button>
                        </div>
                      </div>
                    </div>
                  )
                ) : (
                  <>
                    <div className="form-grid">
                      {Object.keys(formData).map(key => {
                        const hiddenFields = ['id', 'uid', 'created_at', 'updated_at', 'users', 'show_type', 'ticket_tiers'];
                        if (hiddenFields.includes(key)) return null;

                        const isBoolean = typeof formData[key] === 'boolean';
                        const isForeignKey = ['user_id', 'vendor_id', 'store_id', 'provider_id', 'category_id', 'service_id', 'address_id'].includes(key);

                        return (
                          <div className="form-field" key={key} style={isBoolean ? { flexDirection: 'row', alignItems: 'center', gap: '0.5rem' } : {}}>
                            <label>{key.replace(/_/g, ' ').toUpperCase()}</label>
                            {isBoolean ? (
                              <input
                                type="checkbox"
                                checked={formData[key]}
                                onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                                style={{ width: 'auto', marginBottom: 0 }}
                              />
                            ) : isForeignKey ? (
                              <select
                                value={formData[key] || ''}
                                onChange={(e) => setFormData({ ...formData, [key]: e.target.value || null })}
                                className="admin-select"
                              >
                                <option value="">-- Select {key.replace(/_/g, ' ').toUpperCase()} --</option>
                                {key === 'vendor_id' && vendorsList.map(v => (
                                  <option key={v.id} value={v.id}>{v.business_name || v.name || 'No Name'}</option>
                                ))}
                              </select>
                            ) : (
                              <input
                                type={key === 'event_date' || key === 'ends_at' ? 'datetime-local' : (typeof (TABLE_SCHEMAS.events?.[key]) === 'number' ? 'number' : 'text')}
                                value={key === 'event_date' || key === 'ends_at' ? formatDateForInput(formData[key]) : (formData[key] !== undefined && formData[key] !== null ? formData[key] : '')}
                                onChange={(e) => {
                                  let val = e.target.value;
                                  if (typeof (TABLE_SCHEMAS.events?.[key]) === 'number') {
                                    val = val === '' ? 0 : Number(val);
                                  }
                                  setFormData({ ...formData, [key]: val });
                                }}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                    <div className="event-wizard-buttons-row" style={{ display: 'flex', gap: '1rem', marginTop: '2rem' }}>
                      <button 
                        type="button" 
                        className="event-type-back-btn" 
                        onClick={() => setEventWizardStep(1)}
                        style={{ flex: 1, padding: '14px', borderRadius: '12px', border: '1.5px solid #e2e8f0', background: '#f8fafc', fontWeight: 'bold', cursor: 'pointer', color: '#64748b' }}
                      >
                        Back
                      </button>
                      <button type="submit" className="submit-form-btn" style={{ flex: 2, marginTop: 0 }} disabled={isSaving}>
                        {isSaving ? 'Saving...' : 'Save Changes'}
                      </button>
                    </div>
                  </>
                )
              ) : (
                <>
                  <div className="form-grid">
                    {Object.keys(formData).length > 0 ? Object.keys(formData).map(key => {
                      const hiddenFields = ['id', 'uid', 'created_at', 'updated_at', 'users'];
                      if (hiddenFields.includes(key)) return null;

                      const isBoolean = typeof formData[key] === 'boolean';
                      const isForeignKey = ['user_id', 'vendor_id', 'store_id', 'provider_id', 'category_id', 'service_id', 'address_id'].includes(key);

                      return (
                        <div className="form-field" key={key} style={isBoolean ? { flexDirection: 'row', alignItems: 'center', gap: '0.5rem' } : {}}>
                          <label>{key.replace(/_/g, ' ').toUpperCase()}</label>
                          {isBoolean ? (
                            <input
                              type="checkbox"
                              checked={formData[key]}
                              onChange={(e) => setFormData({ ...formData, [key]: e.target.checked })}
                              style={{ width: 'auto', marginBottom: 0 }}
                            />
                          ) : isForeignKey ? (
                            <select
                              value={formData[key] || ''}
                              onChange={(e) => {
                                const val = e.target.value || null;
                                const nextData = { ...formData, [key]: val };
                                
                                // Automatically pre-populate price/amount based on selection
                                if (key === 'service_id' && val && currentTab.table === 'service_bookings') {
                                  const serv = servicesList.find(s => s.id === val);
                                  if (serv) {
                                    if (serv.price) {
                                      nextData.total_amount = serv.price;
                                    }
                                    if (serv.provider_id) {
                                      nextData.provider_id = serv.provider_id;
                                    }
                                  }
                                }

                                // Automatically pre-populate phone and name when linking an existing user
                                if (key === 'user_id' && val) {
                                  const selectedUser = usersList.find(u => u.id === val);
                                  if (selectedUser) {
                                    if (nextData.phone !== undefined) nextData.phone = selectedUser.phone || '';
                                    if (nextData.full_name !== undefined) nextData.full_name = selectedUser.full_name || '';
                                    if (nextData.name !== undefined) nextData.name = selectedUser.full_name || '';
                                  }
                                }
                                
                                setFormData(nextData);
                              }}
                              className="admin-select"
                            >
                              <option value="">-- Select {key.replace(/_/g, ' ').toUpperCase()} --</option>
                              {key === 'user_id' && usersList.map(u => (
                                <option key={u.id} value={u.id}>{u.full_name || 'No Name'} ({u.phone})</option>
                              ))}
                              {key === 'vendor_id' && vendorsList.map(v => (
                                <option key={v.id} value={v.id}>{v.business_name || v.name || 'No Name'}</option>
                              ))}
                              {key === 'store_id' && storesList.map(s => (
                                <option key={s.id} value={s.id}>{s.name}</option>
                              ))}
                              {key === 'provider_id' && providersList.map(p => (
                                <option key={p.id} value={p.id}>{p.business_name || 'No Name'}</option>
                              ))}
                              {key === 'service_id' && servicesList.map(sv => (
                                <option key={sv.id} value={sv.id}>{sv.title}</option>
                              ))}
                              {key === 'address_id' && addressesList
                                .filter(addr => !formData.user_id || addr.user_id === formData.user_id)
                                .map(addr => {
                                  const uName = usersList.find(u => u.id === addr.user_id)?.full_name || 'Unknown User';
                                  return (
                                    <option key={addr.id} value={addr.id}>
                                      {addr.address_line_1}{addr.address_line_2 ? `, ${addr.address_line_2}` : ''}, {addr.city || ''} ({uName})
                                    </option>
                                  );
                                })
                              }
                              {key === 'category_id' && (
                                currentTab.table === 'products'
                                  ? productCategoriesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                                  : serviceCategoriesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                              )}
                            </select>
                          ) : (
                            <input
                              type={['scheduled_at', 'valid_until', 'event_date'].includes(key) ? 'datetime-local' : (typeof (TABLE_SCHEMAS[currentTab.table]?.[key]) === 'number' ? 'number' : 'text')}
                              value={['scheduled_at', 'valid_until', 'event_date'].includes(key) ? formatDateForInput(formData[key]) : (formData[key] !== undefined && formData[key] !== null ? formData[key] : '')}
                              maxLength={key === 'phone' ? 10 : (key === 'aadhar_no' ? 14 : (key === 'license_no' ? 14 : (key === 'id_proof' ? (formData[key] && /^\d+$/.test(formData[key].replace(/[^A-Z0-9]/g, '')) ? 14 : 10) : undefined)))}
                              onChange={(e) => {
                                let val = e.target.value;
                                if (key === 'phone') {
                                  val = val.replace(/\D/g, '').slice(0, 10);
                                } else if (key === 'aadhar_no') {
                                  const clean = val.replace(/\D/g, '').slice(0, 12);
                                  const parts = [];
                                  for (let i = 0; i < clean.length; i += 4) {
                                    parts.push(clean.slice(i, i + 4));
                                  }
                                  val = parts.join(' ');
                                } else if (key === 'license_no') {
                                  val = val.replace(/\D/g, '').slice(0, 14);
                                } else if (key === 'id_proof') {
                                  val = val.toUpperCase().replace(/[^A-Z0-9]/g, '');
                                  const isNumeric = /^\d+$/.test(val) || val.length === 0;
                                  if (isNumeric) {
                                    const sliced = val.slice(0, 12);
                                    const parts = [];
                                    for (let i = 0; i < sliced.length; i += 4) {
                                      parts.push(sliced.slice(i, i + 4));
                                    }
                                    val = parts.join(' ');
                                  } else {
                                    val = val.slice(0, 10);
                                  }
                                }
                                
                                if (typeof (TABLE_SCHEMAS[currentTab.table]?.[key]) === 'number') {
                                  val = val === '' ? 0 : Number(val);
                                }
                                
                                setFormData({ ...formData, [key]: val });
                              }}
                            />
                          )}
                        </div>
                      );
                    }) : <p style={{ color: 'var(--text-secondary)' }}>Open a populated table first to configure new data.</p>}
                  </div>
                  <button type="submit" className="submit-form-btn" disabled={isSaving}>
                    {isSaving ? 'Saving...' : 'Save Changes'}
                  </button>
                </>
              )}
            </form>
          </div>
        </div>
      )}

      {/* Custom Delete Confirmation Modal */}
      {deleteConfirmId && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '400px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 color="#ef4444" size={24} /> Confirm Deletion</h3>
            </div>
            <div style={{ padding: '1.5rem', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
              Are you sure you want to permanently delete this {currentTab.label.replace(/s$/, '')}? <br /><br />
              <strong style={{ color: '#0f172a' }}>This action cannot be undone.</strong>
            </div>
            <div style={{ padding: '1.5rem', paddingTop: 0, display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setDeleteConfirmId(null)}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: 600, color: '#475569', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteDelete}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: 600, color: 'white', background: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.39)' }}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Purge Confirmation Modal */}
      {showPurgeConfirm && (
        <div className="admin-modal-overlay">
          <div className="admin-modal" style={{ maxWidth: '450px' }}>
            <div className="modal-header" style={{ borderBottom: 'none', paddingBottom: 0 }}>
              <h3 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}><Trash2 color="#ef4444" size={24} /> Confirm Deep Purge</h3>
            </div>
            <div style={{ padding: '1.5rem', color: '#64748b', fontSize: '0.9rem', lineHeight: '1.5' }}>
              This will permanently delete ALL mock data, test entries, and gibberish names (Super Plumber, nnknn, Test Vendor, etc.) from the platform database. <br /><br />
              <strong style={{ color: '#ef4444' }}>Warning: This action cannot be undone and affects production state.</strong>
            </div>
            <div style={{ padding: '1.5rem', paddingTop: 0, display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
              <button
                type="button"
                onClick={() => setShowPurgeConfirm(false)}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: 600, color: '#475569', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                type="button"
                onClick={executePurge}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: 600, color: 'white', background: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.39)' }}>
                Purge Database
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
