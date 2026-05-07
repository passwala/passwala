import React, { useState, useEffect, useCallback } from 'react';
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
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './AdminPanel.css';

// Create a highly privileged admin client that bypasses RLS
const adminSupabase = createClient(
  import.meta.env.VITE_SUPABASE_URL,
  import.meta.env.VITE_SUPABASE_SERVICE_ROLE_KEY || import.meta.env.VITE_SUPABASE_ANON_KEY
);
const ActivityFeed = () => {
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchRecent = async () => {
    try {
      const { data: bData } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
      setRecent(bData || []);
    } catch (err) { console.error(err); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchRecent();

    // ⚡ REAL-TIME: Listen for any new orders platform-wide
    const channel = supabase
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
      supabase.removeChannel(channel);
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
  vendors: { phone: '', full_name: '', name: '', user_id: '', business_name: '', aadhar_no: '', license_no: '', address: '', category: '', second_image_list: '', is_verified: false, profile_completed: false },
  riders: { phone: '', full_name: '', user_id: '', vehicle_no: '', license_no: '', id_proof: '', is_active: false, is_verified: false, rating: 0, total_deliveries: 0 },
  service_providers: { phone: '', full_name: '', user_id: '', business_name: '', aadhar_no: '', license_no: '', is_verified: false },
  services: { provider_id: '', category_id: '', title: '', description: '', price: 0, duration_minutes: 0 },
  products: { store_id: '', category_id: '', name: '', description: '', price: 0, discount_price: 0, image_url: '', is_active: true },
  service_bookings: { user_id: '', service_id: '', provider_id: '', address_id: '', status: 'PENDING', total_amount: 0 },
  deals: { store_id: '', title: '', discount_percentage: 0 },
  posts: { user_id: '', content: '', image_url: '', likes_count: 0 },
  notifications: { user_id: '', title: '', message: '', is_read: false },
  service_areas: { city: 'Ahmedabad', area_name: '', is_active: true },
};

const DATABASE_SCHEMAS = {
  users: ['phone', 'full_name', 'email', 'photo_url', 'role'],
  vendors: ['user_id', 'phone', 'is_verified', 'name', 'business_name', 'aadhar_no', 'license_no', 'address', 'category', 'second_image_list', 'profile_completed'],
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
      { id: 'stores', label: 'Stores', icon: ShoppingBag, table: 'vendors' },
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

const MOCK_DATA = {
  users: [
    { id: 'u1', phone: '9876543210', full_name: 'Karan Kumar', email: 'karan@example.com', role: 'BUYER', created_at: new Date().toISOString() },
    { id: 'u2', phone: '9988776655', full_name: 'Anita Sharma', email: 'anita@example.com', role: 'BUYER', created_at: new Date().toISOString() },
    { id: 'u3', phone: '9123456789', full_name: 'Rahul Varma', email: 'rahul@example.com', role: 'BUYER', created_at: new Date().toISOString() }
  ],
  vendors: [
    { id: 'v1', business_name: 'Satellite Bakers', phone: '9822110033', category: 'Bakery', is_verified: true, full_name: 'Vikram Singh' },
    { id: 'v2', business_name: 'Fresh Fruits Hub', phone: '9766554433', category: 'Grocery', is_verified: false, full_name: 'Priya Patel' }
  ],
  riders: [
    { id: 'r1', full_name: 'Suresh Express', vehicle_no: 'GJ-01-BK-1234', is_active: true, is_verified: true, phone: '9000111222' },
    { id: 'r2', full_name: 'Amit Delivery', vehicle_no: 'GJ-01-CK-5678', is_active: false, is_verified: true, phone: '9111222333' }
  ],
  services: [
    { id: 's1', title: 'AC Repairing', price: 499, duration_minutes: 60, description: 'Deep cleaning and gas refill' },
    { id: 's2', title: 'Home Cleaning', price: 1200, duration_minutes: 180, description: 'Full 3BHK deep cleaning' }
  ],
  products: [
    { id: 'p1', name: 'Premium Milk 1L', price: 65, discount_price: 60, is_active: true },
    { id: 'p2', name: 'Brown Bread', price: 45, discount_price: 40, is_active: true }
  ],
  orders: [
    { id: 'o1', total_amount: 1250, status: 'DELIVERED', created_at: new Date().toISOString() },
    { id: 'o2', total_amount: 450, status: 'PLACED', created_at: new Date().toISOString() }
  ],
  service_areas: [
    { id: 'sa1', city: 'Ahmedabad', area_name: 'Satellite', is_active: true },
    { id: 'sa2', city: 'Ahmedabad', area_name: 'Bopal', is_active: true },
    { id: 'sa3', city: 'Ahmedabad', area_name: 'Gota', is_active: false }
  ]
};

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
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('admin_active_tab') || 'dashboard');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ users: 0, services: 0, apps: 0, bookings: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});
  const [deleteConfirmId, setDeleteConfirmId] = useState(null);
  const [isSaving, setSaving] = useState(false);
  const [syncStatus, setSyncStatus] = useState('cloud'); // 'cloud' or 'offline'

  // --- People Map States ---
  const [peopleMapData, setPeopleMapData] = useState([]);
  const [peopleSearch, setPeopleSearch] = useState('');
  const [peopleRoleFilter, setPeopleRoleFilter] = useState('All');
  const [selectedPersonCoords, setSelectedPersonCoords] = useState(null);
  const [mapLoading, setMapLoading] = useState(false);

  const currentTab = TABS.find(t => t.id === activeTab) || TABS[0];

  const API_URL = `http://${window.location.hostname}:3004`;

  const fetchStats = async () => {
    try {
      if (!supabase) {
        console.warn('Supabase not initialized for stats');
        return;
      }
      const { count: uCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: sCount } = await supabase.from('services').select('*', { count: 'exact', head: true });
      const { count: unverifiedVendors } = await supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('is_verified', false);
      const { count: unverifiedRiders } = await supabase.from('riders').select('*', { count: 'exact', head: true }).eq('is_verified', false);
      const { count: bCount } = await supabase.from('service_bookings').select('*', { count: 'exact', head: true });

      const pendingTotal = (unverifiedVendors || 0) + (unverifiedRiders || 0);

      setStats({
        users: uCount || 0,
        services: sCount || 0,
        apps: pendingTotal,
        bookings: bCount || 0
      });
    } catch (err) { console.error(err); }
  };

  const fetchPeopleMapData = useCallback(async () => {
    try {
      setMapLoading(true);
      const combined = [];

      // 1. Fetch Users, Vendors, Riders, Service Providers in parallel
      const [
        { data: usersList, error: uErr },
        { data: vendorsList, error: vErr },
        { data: ridersList, error: rErr },
        { data: providersList, error: pErr }
      ] = await Promise.all([
        supabase.from('users').select('*'),
        supabase.from('vendors').select('*'),
        supabase.from('riders').select('*'),
        supabase.from('service_providers').select('*')
      ]);

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
      if (!uErr && usersList) {
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

      // Map Vendors
      if (!vErr && vendorsList) {
        vendorsList.forEach(vendor => {
          const coords = getStableCoords(vendor.id, 'Vendor');
          combined.push({
            id: vendor.id,
            name: vendor.business_name || vendor.name || 'Merchant Partner',
            phone: vendor.phone,
            email: vendor.category || 'General Store',
            role: 'Vendor',
            status: vendor.is_verified ? 'Verified Partner' : 'Pending Verification',
            iconColor: 'orange',
            lat: vendor.lat || coords.lat,
            lng: vendor.lng || coords.lng,
            meta: { category: vendor.category, license: vendor.license_no }
          });
        });
      }

      // Map Riders
      if (!rErr && ridersList) {
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
      if (!pErr && providersList) {
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
    if (activeTab === 'dashboard') {
      setLoading(false);
      return;
    }
    setLoading(true);
    const currentTable = TABS.find(t => t.id === activeTab)?.table || activeTab;

    try {
      if (!adminSupabase) throw new Error('Supabase client not initialized');

      // Fetch directly from Supabase using admin client to bypass RLS
      let query = adminSupabase.from(currentTable).select(
        currentTable === 'riders' || currentTable === 'vendors' || currentTable === 'service_providers'
          ? '*, users(phone, full_name)'
          : '*'
      );

      const { data: suData, error: suError } = await query.order('created_at', { ascending: false });
      if (suError) throw suError;

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
        setData(MOCK_DATA[currentTable] || []);
      }
    } finally {
      setLoading(false);
    }
  }, [activeTab]);

  useEffect(() => {
    fetchStats();
    if (activeTab === 'people_map') {
      fetchPeopleMapData();
    } else {
      fetchData();
    }
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab, fetchData, fetchPeopleMapData]);

  const handleExecuteDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      const isTemp = typeof deleteConfirmId === 'string' && deleteConfirmId.startsWith('temp_');

      if (!isTemp) {
        if (!adminSupabase) throw new Error('Supabase client not initialized');

        const { error } = await adminSupabase
          .from(currentTab.table)
          .delete()
          .eq('id', deleteConfirmId);

        if (error) throw error;
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

      if (editingItem) {
        setData(data.map(item => item.id === editingItem.id ? { ...item, ...payload } : item));
      } else {
        const newRecord = { ...payload, created_at: new Date().toISOString() };
        setData([newRecord, ...data]);
        localStorage.setItem(localKey, JSON.stringify([newRecord, ...localAdded]));
      }

      // 2. Attempt Background Cloud Sync
      let finalPayload = { ...payload };

      try {
        if (!adminSupabase) throw new Error('Supabase client not initialized');

        // A. Handle User-Linked Tables (riders, vendors, service_providers)
        const userLinkedTables = ['riders', 'vendors', 'service_providers'];
        if (userLinkedTables.includes(currentTab.table)) {
          const userPayload = {
            full_name: finalPayload.full_name || 'Admin Created'
          };
          if (finalPayload.phone) userPayload.phone = finalPayload.phone;
          if (finalPayload.email) userPayload.email = finalPayload.email;
          if (finalPayload.role) userPayload.role = finalPayload.role;

          let userError = null;
          let user = null;

          if (finalPayload.user_id) {
            // Update existing user to avoid INSERT NOT NULL constraint issues
            const res = await adminSupabase.from('users').update(userPayload).eq('id', finalPayload.user_id).select().single();
            userError = res.error;
            user = res.data;
          } else if (userPayload.phone) {
            // New user, phone is required for insert
            const res = await adminSupabase.from('users').upsert(userPayload, { onConflict: 'phone' }).select().single();
            userError = res.error;
            user = res.data;
          }

          if (userError) {
            console.error('❌ Failed to link user:', userError.message);
          } else if (user) {
            finalPayload.user_id = user.id;
          }
        }

        // B. Clear temporary/local id
        if (finalPayload.id && finalPayload.id.startsWith('temp_')) {
          delete finalPayload.id;
        }

        // C. Clean payload according to database schema
        const dbSchema = DATABASE_SCHEMAS[currentTab.table];
        let cleanedPayload = {};
        if (dbSchema) {
          const allowedKeys = [...dbSchema, 'id'];
          Object.keys(finalPayload).forEach(key => {
            if (allowedKeys.includes(key)) {
              if (finalPayload[key] === '' && (key.endsWith('_id') || key === 'uid')) {
                cleanedPayload[key] = null;
              } else {
                cleanedPayload[key] = finalPayload[key];
              }
            }
          });
        } else {
          cleanedPayload = { ...finalPayload };
        }

        // D. Perform Upsert/Update directly on Supabase
        let suError;
        let returnedItem = null;
        if (cleanedPayload.id) {
          const { data: updatedData, error } = await adminSupabase
            .from(currentTab.table)
            .update(cleanedPayload)
            .eq('id', cleanedPayload.id)
            .select();
          suError = error;
          if (updatedData && updatedData.length > 0) {
            returnedItem = updatedData[0];
          }
        } else {
          const { data: insertedData, error } = await adminSupabase
            .from(currentTab.table)
            .insert(cleanedPayload)
            .select();
          suError = error;
          if (insertedData && insertedData.length > 0) {
            returnedItem = insertedData[0];
          }
        }

        if (suError) throw suError;

        if (returnedItem) {
          setData(prev => prev.map(item => item.id === payload.id ? returnedItem : item));
          const localKey = `admin_local_${currentTab.table}`;
          const localAdded = JSON.parse(localStorage.getItem(localKey) || '[]');
          const newLocal = localAdded.map(item => item.id === payload.id ? returnedItem : item);
          localStorage.setItem(localKey, JSON.stringify(newLocal));
        }

        toast.success('Synced with Cloud! ☁️', { id: 'offline-toast' });
        setSyncStatus('cloud');
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
              {filtered.map((item) => {
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
                          ) : typeof v === 'boolean' ? (v ? '✅' : '❌') : (
                            <span className="truncate-cell">{displayVal}</span>
                          )}
                        </td>
                      )
                    })}
                    <td className="actions-cell">
                      <div className="control-cell">
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
  const handleSeedData = async () => {
    try {
      toast.loading('Seeding platform data...', { id: 'seed' });

      // 1. Create a Buyer
      const buyerId = '00000000-0000-0000-0000-000000000001';
      await supabase.from('users').upsert([{
        id: buyerId,
        phone: '9999999999',
        full_name: 'John Doe',
        email: 'john@example.com'
      }]);

      // 2. Create a Vendor User & Vendor Record
      const vendorUserId = '00000000-0000-0000-0000-000000000002';
      const vendorId = '11111111-1111-1111-1111-111111111111';
      await supabase.from('users').upsert([{
        id: vendorUserId,
        phone: '8888888888',
        full_name: 'Anita Owner',
        email: 'anita@example.com'
      }]);
      await supabase.from('vendors').upsert([{
        id: vendorId,
        user_id: vendorUserId,
        phone: '8888888888',
        is_verified: true
      }]);

      // 3. Create a Store Record
      const storeId = '22222222-2222-2222-2222-222222222222';
      await supabase.from('stores').upsert([{
        id: storeId,
        vendor_id: vendorId,
        name: 'Anita Bakers',
        description: 'Delicious hot bread, pastries, and cakes baked daily.',
        address: 'Downtown Street 10, Ahmedabad',
        is_open: true,
        rating: 4.8
      }]);

      // 4. Create a Rider User & Rider Record
      const riderUserId = '00000000-0000-0000-0000-000000000003';
      const riderId = '33333333-3333-3333-3333-333333333333';
      await supabase.from('users').upsert([{
        id: riderUserId,
        phone: '7777777777',
        full_name: 'Flash Rider',
        email: 'flash@example.com'
      }]);
      await supabase.from('riders').upsert([{
        id: riderId,
        user_id: riderUserId,
        vehicle_no: 'GJ-01-BK-9999',
        license_no: 'DL-1234567890123',
        id_proof: '123456789012',
        is_active: true,
        is_verified: true,
        rating: 4.9,
        total_deliveries: 120
      }]);

      // 5. Create a Service Provider User & Provider Record
      const providerUserId = '00000000-0000-0000-0000-000000000004';
      const providerId = '66666666-6666-6666-6666-666666666666';
      await supabase.from('users').upsert([{
        id: providerUserId,
        phone: '6666666666',
        full_name: 'Super Plumber',
        email: 'plumber@example.com'
      }]);
      await supabase.from('service_providers').upsert([{
        id: providerId,
        user_id: providerUserId,
        business_name: 'Plumbing Experts',
        about: 'Pro plumbing services, leaks, pipe fixing and sanitary installations.',
        rating: 4.7,
        is_verified: true
      }]);

      // 6. Create Service Category & Service
      const serviceCategoryId = '77777777-7777-7777-7777-777777777777';
      const serviceId = '88888888-8888-8888-8888-888888888888';
      await supabase.from('service_categories').upsert([{
        id: serviceCategoryId,
        name: 'Plumbing',
        icon_url: 'https://images.unsplash.com/photo-1504328345606-18bbc8c9d7d1?auto=format&fit=crop&q=80&w=800'
      }]);
      await supabase.from('services').upsert([{
        id: serviceId,
        provider_id: providerId,
        category_id: serviceCategoryId,
        title: 'Leak Repair & Pipeline Fixing',
        description: 'Quick repair of household water leaks and pipe replacements.',
        price: 299.0,
        duration_minutes: 45
      }]);

      // 7. Create a Product Category & Product
      const productCategoryId = '44444444-4444-4444-4444-444444444444';
      const productId = '55555555-5555-5555-5555-555555555555';
      await supabase.from('product_categories').upsert([{
        id: productCategoryId,
        store_id: storeId,
        name: 'Fresh Bread'
      }]);
      await supabase.from('products').upsert([{
        id: productId,
        store_id: storeId,
        category_id: productCategoryId,
        name: 'Whole Wheat Bread',
        description: 'Healthy and fiber-rich whole wheat bread.',
        price: 45.0,
        discount_price: 40.0,
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800',
        is_active: true
      }]);

      toast.success('Platform seeded with real data!', { id: 'seed' });
      fetchStats();
    } catch (err) {
      console.error('Seeding error details:', err);
      toast.error('Seeding failed: ' + err.message, { id: 'seed' });
    }
  };

  const handleAddSimulatedPerson = () => {
    const names = [
      'Rahul Sharma', 'Anjali Patel', 'Vikram Singh', 'Priya Mehta', 
      'Amit Trivedi', 'Sneha Shah', 'Rohan Das', 'Deepak Verma'
    ];
    const roles = ['Buyer', 'Vendor', 'Rider', 'Provider'];
    const categories = ['Grocery', 'Food Delivery', 'Electrical', 'Plumbing', 'Dairy'];
    
    const randomName = names[Math.floor(Math.random() * names.length)];
    const randomRole = roles[Math.floor(Math.random() * roles.length)];
    const randomCategory = categories[Math.floor(Math.random() * categories.length)];
    const randomPhone = '9' + Math.floor(100000000 + Math.random() * 900000000);
    
    // Generate lat/lng offset near Ahmedabad center
    const centerLat = 23.0225;
    const centerLng = 72.5714;
    const offsetLat = (Math.random() - 0.5) * 0.06;
    const offsetLng = (Math.random() - 0.5) * 0.06;
    
    let iconColor = 'blue';
    let status = 'Active';
    let meta = {};
    
    if (randomRole === 'Buyer') {
      iconColor = 'green';
      status = 'Active';
      meta = { role: 'BUYER', email: `${randomName.toLowerCase().replace(' ', '')}@example.com` };
    } else if (randomRole === 'Vendor') {
      iconColor = 'orange';
      status = 'Verified Partner';
      meta = { category: randomCategory, license: 'FSSAI-' + Math.floor(10000000000000 + Math.random() * 90000000000000) };
    } else if (randomRole === 'Rider') {
      iconColor = 'red';
      status = 'On Duty';
      meta = { rating: (4.0 + Math.random()).toFixed(1), deliveries: Math.floor(Math.random() * 200) + ' Deliveries' };
    } else if (randomRole === 'Provider') {
      iconColor = 'violet';
      status = 'Verified Expert';
      meta = { business: randomName + ' Services', rating: (4.2 + Math.random()).toFixed(1) };
    }
    
    const newSimulated = {
      id: 'sim_' + Date.now(),
      name: randomName + ' (Simulated)',
      phone: randomPhone,
      email: randomRole === 'Rider' ? 'GJ01-A-' + Math.floor(1000 + Math.random() * 9000) : randomCategory,
      role: randomRole,
      status: status,
      iconColor: iconColor,
      lat: centerLat + offsetLat,
      lng: centerLng + offsetLng,
      meta: meta,
      isSimulated: true
    };
    
    setPeopleMapData(prev => [newSimulated, ...prev]);
    setSelectedPersonCoords({ lat: newSimulated.lat, lng: newSimulated.lng });
    toast.success(`Spawned live simulated ${randomRole} in Ahmedabad!`, { icon: '📍' });
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
          <button 
            type="button"
            onClick={handleAddSimulatedPerson}
            style={{ 
              background: 'linear-gradient(135deg, #FF7622 0%, #FF9F66 100%)', 
              color: 'white', 
              border: 'none', 
              padding: '12px 20px', 
              borderRadius: '12px', 
              fontWeight: 600, 
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: '8px',
              boxShadow: '0 4px 14px rgba(255,118,34,0.35)',
              transition: 'all 0.2s'
            }}
          >
            <Plus size={18} /> Spawn Simulated Person
          </button>
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
          <button className="seed-btn" onClick={handleSeedData} style={{
            background: 'linear-gradient(135deg, #FF7622 0%, #FF9F66 100%)',
            color: 'white',
            padding: '12px 24px',
            borderRadius: '12px',
            border: 'none',
            fontWeight: '600',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            cursor: 'pointer',
            boxShadow: '0 4px 15px rgba(255, 118, 34, 0.3)'
          }}>
            <Database size={20} /> Seed Initial Platform Data
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
            <strong style={{ fontWeight: 600 }}>{location || 'My Location, Ahmedabad'}</strong>
          </div>
        </div>

        <nav className="sidebar-nav">
          {tabSections.map((section) => (
            <React.Fragment key={section.label}>
              <div className="nav-section-label">{section.label}</div>
              {section.items.map((tab) => (
                <button
                  key={tab.id}
                  className={`nav-item ${activeTab === tab.id ? 'active' : ''}`}
                  onClick={() => {
                    setActiveTab(tab.id);
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

      <main className="admin-main-view">
        <header className="admin-top-bar">
          <div className="top-bar-left">
            <button className="mobile-menu-toggle" onClick={() => setIsSidebarOpen(true)}>
              <Menu size={24} />
            </button>
            <div className="breadcrumb">
              <Database size={14} className="mobile-hide" /> <span className="mobile-hide">/ MASTER CONTROL /</span> <strong>{activeTab.toUpperCase()}</strong>
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
              key={activeTab}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.2 }}
            >
              {activeTab === 'dashboard' ? (
                <>
                  <h1 className="admin-hero-title">Platform Intelligence</h1>
                  <p style={{ color: '#64748b', marginBottom: '2rem' }}>Overview of your entire business ecosystem.</p>
                  {renderDashboard()}
                </>
              ) : activeTab === 'people_map' ? (
                renderPeopleMap()
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
                  const hiddenFields = ['id', 'uid', 'created_at', 'updated_at', 'users', 'user_id', 'provider_id', 'store_id', 'category_id', 'address_id', 'service_id'];
                  if (hiddenFields.includes(key)) return null;

                  const isBoolean = typeof formData[key] === 'boolean';
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
                onClick={() => setDeleteConfirmId(null)}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: 600, color: '#475569', background: '#f1f5f9', border: 'none', cursor: 'pointer' }}>
                Cancel
              </button>
              <button
                onClick={handleExecuteDelete}
                style={{ padding: '10px 16px', borderRadius: '8px', fontWeight: 600, color: 'white', background: '#ef4444', border: 'none', cursor: 'pointer', boxShadow: '0 4px 14px 0 rgba(239, 68, 68, 0.39)' }}>
                Delete Permanently
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
