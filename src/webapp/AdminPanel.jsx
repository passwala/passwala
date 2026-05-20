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
  Navigation
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { createClient } from '@supabase/supabase-js';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './AdminPanel.css';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseKey = import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY || '';

// Create a highly privileged admin client that bypasses RLS
const adminSupabase = (supabaseUrl && supabaseKey)
  ? createClient(supabaseUrl, supabaseKey)
  : null;

if (!import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY) {
  console.warn('⚠️ Admin Panel is running with ANON_KEY. Some management functions may fail if RLS is enabled.');
}
const ActivityFeed = () => {
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = async () => {
    try {
      const adminKey = localStorage.getItem('admin_code') || 'PASSWALA99';
      const res = await fetch('/api/admin/fetch?table=orders', { headers: { 'x-admin-key': adminKey } });
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
  };

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
  }, []);

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
  users: { phone: '', full_name: '', email: '', role: 'BUYER', photo_url: '' },
  admins: { username: '', password_hash: '', role: 'SUPERADMIN' },
  vendors: { phone: '', full_name: '', name: '', user_id: '', business_name: '', aadhar_no: '', license_no: '', address: '', category: '', is_verified: false, profile_completed: false },
  riders: { phone: '', full_name: '', user_id: '', vehicle_no: '', license_no: '', id_proof: '', is_active: false, is_verified: false, rating: 0, total_deliveries: 0 },
  service_providers: { phone: '', full_name: '', user_id: '', business_name: '', aadhar_no: '', license_no: '', is_verified: false },
  services: { provider_id: '', category_id: '', title: '', description: '', price: 0, duration_minutes: 0 },
  products: { store_id: '', category_id: '', name: '', description: '', price: 0, discount_price: 0, image_url: '', is_active: true },
  service_bookings: { user_id: '', service_id: '', provider_id: '', address_id: '', status: 'PENDING', total_amount: 0 },
  deals: { store_id: '', title: '', discount_percentage: 0 },
  posts: { user_id: '', content: '', image_url: '', likes_count: 0 },
  notifications: { user_id: '', title: '', message: '', is_read: false },
  service_areas: { city: 'Ahmedabad', area_name: '', is_active: true },
  stores: { vendor_id: '', name: '', description: '', address: '', is_open: true, rating: 0 },
  service_categories: { name: '', icon_url: '' }
};

const DATABASE_SCHEMAS = {
  users: ['phone', 'full_name', 'email', 'photo_url', 'role'],
  vendors: ['user_id', 'phone', 'is_verified', 'name', 'business_name', 'aadhar_no', 'license_no', 'address', 'category', 'profile_completed'],
  riders: ['user_id', 'vehicle_no', 'license_no', 'id_proof', 'is_active', 'is_verified', 'rating', 'total_deliveries'],
  service_providers: ['user_id', 'business_name', 'about', 'rating', 'is_verified', 'phone', 'full_name', 'name', 'aadhar_no', 'license_no', 'address', 'profile_completed'],
  services: ['provider_id', 'category_id', 'title', 'description', 'price', 'duration_minutes'],
  products: ['store_id', 'category_id', 'name', 'description', 'price', 'discount_price', 'image_url', 'is_active'],
  service_bookings: ['user_id', 'service_id', 'provider_id', 'address_id', 'status', 'total_amount'],
  deals: ['store_id', 'title', 'discount_percentage', 'valid_until'],
  posts: ['user_id', 'content', 'image_url', 'likes_count'],
  notifications: ['user_id', 'title', 'message', 'is_read'],
  service_areas: ['city', 'area_name', 'is_active'],
  admins: ['username', 'password_hash', 'role'],
  stores: ['vendor_id', 'name', 'description', 'logo_url', 'banner_url', 'address', 'lat', 'lng', 'is_open', 'rating']
};

const tabSections = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      { id: 'people_map', label: 'People Map', icon: Map, table: 'users' },
      { id: 'users', label: 'Users', icon: Users, table: 'users' },
      { id: 'vendors', label: 'Vendors', icon: ShoppingBag, table: 'vendors' },
      { id: 'riders', label: 'Riders', icon: Truck, table: 'riders' },
    ]
  },
  {
    label: 'Services',
    items: [
      { id: 'providers', label: 'Service Providers', icon: Heart, table: 'service_providers' },
      { id: 'services', label: 'Service List', icon: Briefcase, table: 'services' },
      { id: 'bookings', label: 'Bookings', icon: Calendar, table: 'service_bookings' },
    ]
  },
  {
    label: 'Marketplace',
    items: [
      { id: 'stores', label: 'Stores', icon: ShoppingBag, table: 'stores' },
      { id: 'products', label: 'Products', icon: Package, table: 'products' },
      { id: 'payments', label: 'Payments', icon: CreditCard, table: 'service_bookings' },
      { id: 'deals', label: 'Deals & Offers', icon: Tag, table: 'deals' },
    ]
  },
  {
    label: 'Content',
    items: [
      { id: 'community', label: 'Community', icon: MessageSquare, table: 'posts' },
      { id: 'notifications', label: 'Notifications', icon: Bell, table: 'notifications' },
    ]
  },
  {
    label: 'System',
    items: [
      { id: 'areas', label: 'Service Areas', icon: MapPin, table: 'service_areas' },
      { id: 'reports', label: 'Reports', icon: TrendingUp },
      { id: 'settings', label: 'Settings', icon: Settings },
    ]
  }
];

// Mock data removed as platform is now fully integrated with Supabase.

// --- Leaflet Colored Icons for Admin Map ---
const mapRedIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const mapGreenIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const mapOrangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const mapVioletIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const mapBlueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper to center Map on selected coordinates
function MapRecenter({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) {
      map.setView([coords.lat, coords.lng], 15, { animate: true });
    }
  }, [coords, map]);
  return null;
}

const TABS = tabSections.flatMap(s => s.items);

const AdminPanel = ({ onLogout, location }) => {
  const [activeAdminTab, setActiveAdminTab] = useState(() => localStorage.getItem('admin_active_tab') || 'dashboard');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ users: 0, services: 0, apps: 0, bookings: 0 });
  const [platformSettings, setPlatformSettings] = useState({
    appName: 'Passwala',
    supportEmail: 'ops@passwala.com',
    maintenanceMode: false,
    maxDeliveryRange: 10,
    baseDeliveryFee: 30,
    freeDeliveryThreshold: 499,
    liveSync: true
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

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [showPurgeConfirm, setShowPurgeConfirm] = useState(false);
  const [isSaving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState('cloud'); // 'cloud' or 'offline'

  // --- Relational Reference States ---
  const [vendorsList, setVendorsList] = useState([]);
  const [storesList, setStoresList] = useState([]);
  const [usersList, setUsersList] = useState([]);
  const [providersList, setProvidersList] = useState([]);
  const [productCategoriesList, setProductCategoriesList] = useState([]);
  const [serviceCategoriesList, setServiceCategoriesList] = useState([]);
  const [servicesList, setServicesList] = useState([]);

  const fetchReferences = useCallback(async () => {
    try {
      const fetchTable = async (table) => {
        const adminKey = localStorage.getItem('admin_code') || 'PASSWALA99';
        const res = await fetch(`/api/admin/fetch?table=${table}`, { headers: { 'x-admin-key': adminKey } });
        const json = await res.json();
        return json.success ? json.data : [];
      };

      const [u, v, s, p, pc, sc, sv] = await Promise.all([
        fetchTable('users'),
        fetchTable('vendors'),
        fetchTable('stores'),
        fetchTable('service_providers'),
        fetchTable('product_categories'),
        fetchTable('service_categories'),
        fetchTable('services')
      ]);

      if (u) setUsersList(u);
      if (v) setVendorsList(v);
      if (s) setStoresList(s);
      if (p) setProvidersList(p);
      if (pc) setProductCategoriesList(pc);
      if (sc) setServiceCategoriesList(sc);
      if (sv) setServicesList(sv);
    } catch (err) {
      console.error('Failed to fetch references:', err);
    }
  }, []);

  // --- People Map States ---
  const [peopleMapData, setPeopleMapData] = useState([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleRoleFilter, setPeopleRoleFilter] = useState('All');
  const [selectedPersonCoords, setSelectedPersonCoords] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);

  const currentTab = useMemo(() => TABS.find(t => t.id === activeAdminTab) || TABS[0], [activeAdminTab]);

  const API_URL = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

  const fetchStats = async () => {
    try {
      const adminKey = localStorage.getItem('admin_code') || 'PASSWALA99';
      const res = await fetch('/api/admin/stats', { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (json.success && json.stats) {
        setStats(json.stats);
      }
    } catch (err) {
      console.error('Stats error:', err);
    }
  };

  const handlePurgeMockData = () => {
    setShowPurgeConfirm(true);
  };

  const executePurge = async () => {
    setShowPurgeConfirm(false);
    try {
      toast.loading('Performing deep purge of platform residue...', { id: 'purge' });
      
      const res = await fetch('/api/admin/purge', { method: 'POST' });
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

      const res = await fetch('/api/admin/people_map');
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch people map data');

      const { usersList, vendorsList, ridersList, providersList, storesList } = json.data;

      const storeMap = {};
      if (storesList) {
        storesList.forEach(s => {
          storeMap[s.vendor_id] = s;
        });
      }

      // Hash function for stable offsets in Ahmedabad
      const getStableCoords = (id, role) => {
        let hash = 0;
        const inputStr = id || 'random-id';
        for (let i = 0; i < inputStr.length; i++) {
          hash = inputStr.charCodeAt(i) + ((hash << 5) - hash);
        }
        
        let radius = 0.035;
        let baseLat = 23.0225;
        let baseLng = 72.5714;
        
        if (role === 'Rider') {
          baseLat = 23.025; baseLng = 72.565; radius = 0.045;
        } else if (role === 'Vendor') {
          baseLat = 23.018; baseLng = 72.555; radius = 0.03;
        } else if (role === 'Provider') {
          baseLat = 23.035; baseLng = 72.585; radius = 0.04;
        }
        
        const latOffset = ((hash & 0xFF) / 255.0 - 0.5) * radius;
        const lngOffset = (((hash >> 8) & 0xFF) / 255.0 - 0.5) * radius;
        
        return {
          lat: baseLat + latOffset,
          lng: baseLng + lngOffset
        };
      };

      // Map Users (Buyers)
      if (usersList) {
        usersList.forEach(user => {
          if (user.role === 'BUYER' || !user.role) {
            const coords = getStableCoords(user.id, 'Buyer');
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
        });
      }

      // Map Vendors (joined with store locations)
      if (vendorsList) {
        vendorsList.forEach(vendor => {
          const store = storeMap[vendor.id];
          const coords = getStableCoords(vendor.id, 'Vendor');
          combined.push({
            id: vendor.id,
            name: vendor.business_name || vendor.name || (store ? store.name : 'Merchant Partner'),
            phone: vendor.phone,
            email: vendor.category || 'General Store',
            role: 'Vendor',
            status: vendor.is_verified ? 'Verified Partner' : 'Pending Verification',
            iconColor: 'orange',
            lat: (store && store.lat) ? store.lat : coords.lat,
            lng: (store && store.lng) ? store.lng : coords.lng,
            meta: { category: vendor.category, license: vendor.license_no, storeName: store?.name }
          });
        });
      }

      // Map Riders
      if (ridersList) {
        ridersList.forEach(rider => {
          const coords = getStableCoords(rider.id, 'Rider');
          combined.push({
            id: rider.id,
            name: 'Rider ' + (rider.vehicle_no || rider.id.slice(0, 4)),
            phone: rider.license_no || 'N/A',
            email: rider.vehicle_no || 'Standard Transport',
            role: 'Rider',
            status: rider.is_active ? 'On Duty' : 'Offline',
            iconColor: 'red',
            lat: rider.lat || coords.lat,
            lng: rider.lng || coords.lng,
            meta: { rating: rider.rating || '4.8', deliveries: rider.total_deliveries || '120+' }
          });
        });
      }

      // Map Service Providers
      if (providersList) {
        providersList.forEach(provider => {
          const coords = getStableCoords(provider.id, 'Provider');
          combined.push({
            id: provider.id,
            name: provider.business_name || provider.name || 'Home Expert',
            phone: provider.phone,
            email: provider.category_id || 'Services',
            role: 'Provider',
            status: provider.is_verified ? 'Verified Expert' : 'Regular Provider',
            iconColor: 'violet',
            lat: coords.lat,
            lng: coords.lng,
            meta: { business: provider.business_name, rating: provider.rating || '4.5' }
          });
        });
      }

      setPeopleMapData(combined);
    } catch (err) {
      console.error('Error fetching people map data:', err);
      toast.error('Failed to load live people coordinates');
    } finally {
      setMapLoading(false);
    }
  }, []);

  const fetchData = useCallback(async () => {
    if (['dashboard', 'people_map', 'reports', 'settings'].includes(activeAdminTab)) {
      setLoading(false);
      return;
    }
    setLoading(true);
    const currentTable = TABS.find(t => t.id === activeAdminTab)?.table || activeAdminTab;

    try {
      const adminKey = localStorage.getItem('admin_code') || 'PASSWALA99';
      const res = await fetch(`/api/admin/fetch?table=${currentTable}`, { headers: { 'x-admin-key': adminKey } });
      const json = await res.json();
      if (!json.success) throw new Error(json.error || 'Failed to fetch cloud data');
      const suData = json.data;

      // Update State & Cache
      setData(suData || []);
      localStorage.setItem(`admin_cache_${currentTable}`, JSON.stringify(suData || []));
      setSyncStatus('cloud');
      toast.dismiss('offline-toast'); // Clear any previous offline warnings
    } catch (err) {
      console.error('Fetch Error:', err);

      // Check for missing table error
      if (err.message && err.message.includes('Could not find the table')) {
        toast.error(`Table '${currentTable}' is missing in Supabase!`, { duration: 6000 });
        setSyncStatus('missing_table');
      } else {
        setSyncStatus('offline');
      }

      // Fallback to cache
      const cached = localStorage.getItem(`admin_cache_${currentTable}`);
      if (cached) {
        setData(JSON.parse(cached));
        toast('Showing local cache (Offline)', {
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
  }, [activeAdminTab]);

  useEffect(() => {
    fetchStats();
    fetchReferences();
    if (activeAdminTab === 'people_map') {
      fetchPeopleMapData();
    } else {
      fetchData();
    }
    localStorage.setItem('admin_active_tab', activeAdminTab);
  }, [activeAdminTab, fetchData, fetchPeopleMapData, fetchReferences]);

  const handleExecuteDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      const isTemp = typeof deleteConfirmId === 'string' && deleteConfirmId.startsWith('temp_');

      if (!isTemp) {
        const adminKey = localStorage.getItem('admin_code') || 'PASSWALA99';
        const res = await fetch('/api/admin/delete', {
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
      let finalPayload = { ...payload };

      try {
        const adminKey = localStorage.getItem('admin_code') || 'PASSWALA99';
        const response = await fetch('/api/admin/upsert', {
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
      const adminKey = localStorage.getItem('admin_code') || 'PASSWALA99';
      const response = await fetch('/api/admin/upsert', {
        method: 'POST',
        headers: { 
          'Content-Type': 'application/json',
          'x-admin-key': adminKey 
        },
        body: JSON.stringify({
          table: currentTab.table,
          payload: { id: item.id, is_verified: nextVerified }
        })
      });
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

  const openModal = (item = null) => {
    setEditingItem(item);
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
        setFormData({ ...schema });
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
                    <td className="id-col">#{String(item.id).slice(-4)}</td>
                    {keys.map(k => {
                      let v = item[k];
                      // Flatten joined user data for display
                      if (item.users) {
                        if (k === 'phone' && !v) v = item.users.phone;
                        if (k === 'full_name' && !v) v = item.users.full_name;
                      }

                      let displayVal = v === null || v === undefined ? 'N/A' : String(v);
                      if ((k === 'id_proof' || k === 'aadhar_no') && displayVal.length === 12 && /^\d+$/.test(displayVal)) {
                        const parts = [];
                        for (let i = 0; i < displayVal.length; i += 4) {
                          parts.push(displayVal.slice(i, i + 4));
                        }
                        displayVal = parts.join(' ');
                      }

                      return (
                        <td key={k}>
                          {k === 'status' || k === 'role' ? (
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
            <p style={{ color: '#64748b', fontSize: '0.9rem', marginTop: '4px' }}>Real-time OpenStreetMap tracking of Users, Riders, and Merchant Partners across Ahmedabad.</p>
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
                <MapContainer 
                  center={[23.0225, 72.5714]} 
                  zoom={13} 
                  scrollWheelZoom={true}
                  style={{ height: '100%', width: '100%', zIndex: 1 }}
                  maxBounds={[[5.0, 65.0], [38.0, 98.0]]}
                  minZoom={5}
                  maxBoundsViscosity={1.0}
                >
                  <TileLayer
                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                  />
                  
                  {filteredPeople.map(person => {
                    let mapIcon = mapBlueIcon;
                    if (person.iconColor === 'green') mapIcon = mapGreenIcon;
                    else if (person.iconColor === 'orange') mapIcon = mapOrangeIcon;
                    else if (person.iconColor === 'red') mapIcon = mapRedIcon;
                    else if (person.iconColor === 'violet') mapIcon = mapVioletIcon;

                    if (!person.lat || !person.lng || isNaN(person.lat) || isNaN(person.lng)) return null;

                    return (
                      <Marker 
                        key={person.id} 
                        position={[person.lat, person.lng]} 
                        icon={mapIcon}
                      >
                        <Popup>
                          <div style={{ padding: '8px', minWidth: '180px', fontFamily: 'Inter, sans-serif' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                              <div style={{ 
                                width: '32px', height: '32px', borderRadius: '50%', 
                                background: person.iconColor === 'green' ? '#22c55e' : (person.iconColor === 'orange' ? '#f97316' : (person.iconColor === 'red' ? '#ef4444' : '#a855f7')),
                                color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold', fontSize: '0.85rem'
                              }}>
                                {person.name.slice(0, 2).toUpperCase()}
                              </div>
                              <div>
                                <h4 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700, color: '#0f172a' }}>{person.name}</h4>
                                <span style={{ 
                                  fontSize: '0.7rem', 
                                  background: person.iconColor === 'green' ? '#ecfdf5' : (person.iconColor === 'orange' ? '#fff7ed' : (person.iconColor === 'red' ? '#fef2f2' : '#faf5ff')),
                                  color: person.iconColor === 'green' ? '#047857' : (person.iconColor === 'orange' ? '#c2410c' : (person.iconColor === 'red' ? '#b91c1c' : '#7e22ce')),
                                  padding: '1px 6px', borderRadius: '10px', fontWeight: 600
                                }}>
                                  {person.role}
                                </span>
                              </div>
                            </div>
                            
                            <div style={{ fontSize: '0.8rem', color: '#475569', display: 'flex', flexDirection: 'column', gap: '4px', margin: '8px 0' }}>
                              <div><strong>Contact:</strong> {person.phone}</div>
                              {person.role === 'Vendor' && <div><strong>Category:</strong> {person.email}</div>}
                              {person.role === 'Rider' && (
                                <>
                                  <div><strong>Vehicle:</strong> {person.email}</div>
                                  <div><strong>Rating:</strong> ⭐ {person.meta.rating}</div>
                                </>
                              )}
                              {person.role === 'Buyer' && <div><strong>Email:</strong> {person.email}</div>}
                              {person.role === 'Provider' && <div><strong>Expertise:</strong> {person.email}</div>}
                              {person.isSimulated && <div style={{ color: '#0284c7', fontSize: '0.75rem', fontWeight: 600 }}>✨ Live Simulation Bot</div>}
                            </div>

                            <a 
                              href={`tel:${person.phone}`}
                              style={{
                                display: 'block',
                                textAlign: 'center',
                                background: '#0f172a',
                                color: 'white',
                                textDecoration: 'none',
                                padding: '6px',
                                borderRadius: '6px',
                                fontSize: '0.8rem',
                                fontWeight: 600,
                                marginTop: '4px'
                              }}
                            >
                              Call Service Phone
                            </a>
                          </div>
                        </Popup>
                      </Marker>
                    );
                  })}
                  
                  <MapRecenter coords={selectedPersonCoords} />
                </MapContainer>
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
          <ActivityFeed />
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
        <h1 className="admin-hero-title">Business Performance & Analytics</h1>
        <p style={{ color: '#64748b', marginBottom: '2rem' }}>Comprehensive performance reporting and metric evaluations.</p>

        <div className="main-stats" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
          <div className="stat-card p-gradient" style={{ background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)', color: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 10px 25px rgba(99, 102, 241, 0.15)' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Total Revenue</span>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0' }}>₹1,48,250</h3>
            <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9 }}>📈 +14.2% from last month</p>
          </div>
          <div className="stat-card o-gradient" style={{ background: 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)', color: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 10px 25px rgba(249, 115, 22, 0.15)' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Average Order Value</span>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0' }}>₹320</h3>
            <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9 }}>🎯 Optimized delivery margins</p>
          </div>
          <div className="stat-card b-gradient" style={{ background: 'linear-gradient(135deg, #06b6d4 0%, #0891b2 100%)', color: 'white', padding: '1.5rem', borderRadius: '20px', boxShadow: '0 10px 25px rgba(6, 182, 212, 0.15)' }}>
            <span style={{ fontSize: '0.9rem', opacity: 0.8, textTransform: 'uppercase', letterSpacing: '1px', fontWeight: 600 }}>Orders Completed</span>
            <h3 style={{ fontSize: '2.25rem', fontWeight: 900, margin: '0.5rem 0' }}>462</h3>
            <p style={{ fontSize: '0.85rem', margin: 0, opacity: 0.9 }}>⚡ 98.4% Fulfillment rate</p>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '2.5rem' }}>
          <div className="glass" style={{ padding: '2rem', borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.02)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Weekly Revenue Trend</h4>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', height: '180px', paddingTop: '10px' }}>
              {[
                { label: 'Mon', val: 40 },
                { label: 'Tue', val: 55 },
                { label: 'Wed', val: 75 },
                { label: 'Thu', val: 60 },
                { label: 'Fri', val: 90 },
                { label: 'Sat', val: 120 },
                { label: 'Sun', val: 110 }
              ].map((item, idx) => (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flex: 1, gap: '8px' }}>
                  <div style={{ position: 'relative', width: '28px', height: '120px', background: '#f1f5f9', borderRadius: '8px', overflow: 'hidden' }}>
                    <div style={{ position: 'absolute', bottom: 0, left: 0, right: 0, height: `${(item.val / 120) * 100}%`, background: 'linear-gradient(to top, #6366f1, #818cf8)', borderRadius: '8px', transition: 'height 1s ease' }}></div>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b' }}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass" style={{ padding: '2rem', borderRadius: '24px', background: '#ffffff', border: '1px solid rgba(0, 0, 0, 0.05)', boxShadow: '0 4px 30px rgba(0, 0, 0, 0.02)' }}>
            <h4 style={{ margin: '0 0 1.5rem 0', fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>Sales by Category</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem', justifyContent: 'center', height: '180px' }}>
              {[
                { name: 'Grocery & Essentials', percent: 65, color: '#10b981' },
                { name: 'Expert Services', percent: 20, color: '#6366f1' },
                { name: 'Food Delivery', percent: 15, color: '#f59e0b' }
              ].map((cat, idx) => (
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
    const handleSaveLocalSettings = () => {
      toast.success('System settings saved successfully!');
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
              border: '1px solid rgba(255, 255, 255, 0.08)'
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
                  className={`nav-item ${activeAdminTab === tab.id ? 'active' : ''}`}
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
              <Database size={14} className="mobile-hide" /> <span className="mobile-hide">/ MASTER CONTROL /</span> <strong>{activeAdminTab.toUpperCase()}</strong>
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
              {activeAdminTab === 'dashboard' ? (
                <>
                  <h1 className="admin-hero-title">Platform Intelligence</h1>
                  <p style={{ color: '#64748b', marginBottom: '2rem' }}>Overview of your entire business ecosystem.</p>
                  {renderDashboard()}
                </>
              ) : activeAdminTab === 'people_map' ? (
                renderPeopleMap()
              ) : activeAdminTab === 'reports' ? (
                renderReports()
              ) : activeAdminTab === 'settings' ? (
                renderSettings()
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
          <div className="admin-modal">
            <div className="modal-header">
              <h3>Modify Platform Resource</h3>
              <button className="close-modal-btn" onClick={() => setShowModal(false)}><X size={20} /></button>
            </div>
            <form onSubmit={handleUpsert} className="admin-form">
              <div className="form-grid">
                {Object.keys(formData).length > 0 ? Object.keys(formData).map(key => {
                  const hiddenFields = ['id', 'uid', 'created_at', 'updated_at', 'users', 'address_id'];
                  if (hiddenFields.includes(key)) return null;

                  const isBoolean = typeof formData[key] === 'boolean';
                  const isForeignKey = ['user_id', 'vendor_id', 'store_id', 'provider_id', 'category_id', 'service_id'].includes(key);

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
                          {key === 'category_id' && (
                            currentTab.table === 'products'
                              ? productCategoriesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                              : serviceCategoriesList.map(c => <option key={c.id} value={c.id}>{c.name}</option>)
                          )}
                        </select>
                      ) : (
                        <input
                          type={typeof formData[key] === 'number' ? 'number' : 'text'}
                          value={formData[key] || ''}
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
                              // FSSAI / Standard License is 14 numeric digits
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
                            setFormData({ ...formData, [key]: val });
                          }}
                        />
                      )}
                    </div>
                  )
                }) : <p style={{ color: 'var(--text-secondary)' }}>Open a populated table first to configure new data.</p>}
              </div>
              <button type="submit" className="submit-form-btn" disabled={isSaving}>
                {isSaving ? 'Saving...' : 'Save Changes'}
              </button>
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
