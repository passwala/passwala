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
  Activity,
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
  MapPin
} from 'lucide-react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import './AdminPanel.css';
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
             <strong>New Order:</strong> <span>#{b.id.substring(0,6)} (₹{b.total_amount || 0})</span>
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

const tabSections = [
  {
    label: 'Main',
    items: [
      { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
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

const TABS = tabSections.flatMap(s => s.items);

const AdminPanel = ({ onLogout }) => {
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

  const fetchData = useCallback(async () => {
    if (activeTab === 'dashboard') {
      setLoading(false);
      return;
    }
    setLoading(true);
    const currentTable = TABS.find(t => t.id === activeTab)?.table || activeTab;
    
    try {
      if (!supabase) throw new Error('Supabase client not initialized');

      // Fetch directly from Supabase
      let query = supabase.from(currentTable).select(
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
    fetchData();
    localStorage.setItem('admin_active_tab', activeTab);
  }, [activeTab, fetchData]);

  const handleExecuteDelete = async () => {
    if (!deleteConfirmId) return;

    try {
      if (!supabase) throw new Error('Supabase client not initialized');

      const { error } = await supabase
          .from(currentTab.table)
          .delete()
          .eq('id', deleteConfirmId);

      if (error) throw error;
      
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
        if (!supabase) throw new Error('Supabase client not initialized');

        // A. Handle User-Linked Tables (riders, vendors, service_providers)
        const userLinkedTables = ['riders', 'vendors', 'service_providers'];
        if (userLinkedTables.includes(currentTab.table) && finalPayload.phone) {
            const { data: user, error: userError } = await supabase
                .from('users')
                .upsert({ 
                    phone: finalPayload.phone, 
                    full_name: finalPayload.full_name || 'Admin Created'
                }, { onConflict: 'phone' })
                .select()
                .single();
            
            if (userError) {
                console.error('❌ Failed to link user:', userError.message);
            } else {
                finalPayload.user_id = user.id;
            }
        }

        // B. Clear temporary/local id
        if (finalPayload.id && finalPayload.id.startsWith('temp_')) {
            delete finalPayload.id;
        }

        // C. Clean payload according to table schema
        const schema = TABLE_SCHEMAS[currentTab.table];
        let cleanedPayload = {};
        if (schema) {
            const allowedKeys = [...Object.keys(schema), 'id'];
            Object.keys(finalPayload).forEach(key => {
                if (allowedKeys.includes(key)) {
                    cleanedPayload[key] = finalPayload[key];
                }
            });
        } else {
            cleanedPayload = { ...finalPayload };
        }

        // D. Perform Upsert directly on Supabase
        const conflictTarget = currentTab.table === 'service_areas' ? 'area_name' : 'id';
        const { error: suError } = await supabase
            .from(currentTab.table)
            .upsert(cleanedPayload, { onConflict: conflictTarget });
        
        if (suError) throw suError;

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
                    )})}
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
        id: buyerId, phone: '9999999999', full_name: 'John Doe', role: 'BUYER' 
      }]);

      // 2. Create a Vendor
      const vendorUserId = '00000000-0000-0000-0000-000000000002';
      await supabase.from('users').upsert([{ 
        id: vendorUserId, phone: '8888888888', full_name: 'Anita Owner', role: 'VENDOR' 
      }]);
      await supabase.from('vendors').upsert([{ 
        id: 'v-001', user_id: vendorUserId, business_name: 'Anita Bakers', category: 'Bakery', 
        address: 'Downtown 10', phone: '8888888888', is_verified: true, profile_completed: true 
      }]);

      // 3. Create a Rider
      const riderUserId = '00000000-0000-0000-0000-000000000003';
      await supabase.from('users').upsert([{ 
        id: riderUserId, phone: '7777777777', full_name: 'Flash Rider', role: 'RIDER' 
      }]);
      await supabase.from('riders').upsert([{ 
        id: 'r-001', user_id: riderUserId, phone: '7777777777', full_name: 'Flash Rider', vehicle_no: 'GJ-01-BK-9999', is_verified: true, is_active: true 
      }]);

      // 4. Create a Product
      await supabase.from('products').upsert([{
        id: 'p-001', store_id: 'v-001', name: 'Whole Wheat Bread', price: 45, is_active: true,
        image_url: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=800'
      }]);

      toast.success('Platform seeded with real data!', { id: 'seed' });
      fetchStats();
    } catch (err) {
      toast.error('Seeding failed: ' + err.message, { id: 'seed' });
    }
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
            <button className="edit-btn" style={{width: 'auto', padding: '4px 8px', fontSize: '10px', height: 'auto'}}>VIEW ALL</button>
         </div>
         <div className="trend-content">
            <ActivityFeed />
         </div>
         
         <div className="notification-preview" style={{marginTop: '1.5rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px'}}>
            <h5 style={{fontSize: '0.75rem', fontWeight: 800, color: '#64748b', marginBottom: '8px'}}>SYSTEM ALERTS</h5>
            <div style={{fontSize: '0.8rem', color: '#0f172a', fontWeight: 600}}>
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
        <div className="sidebar-header">

           <div className="admin-brand-info">
             <h2>Passwala</h2>
             <span>SYSTEM OPS</span>
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
              <Activity size={24} />
            </button>
            <div className="breadcrumb">
               <Database size={14} className="mobile-hide" /> <span className="mobile-hide">/ MASTER CONTROL /</span> <strong>{activeTab.toUpperCase()}</strong>
            </div>
          </div>
          <div className="admin-profile-pill">
            <span className={`sync-indicator ${syncStatus}`}>
              {syncStatus === 'cloud' ? '☁️ Cloud Sync Active' : '🏠 Offline Mode'}
            </span>
            <div className="avatar">SA</div>
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
                   <p style={{color: '#64748b', marginBottom: '2rem'}}>Overview of your entire business ecosystem.</p>
                   {renderDashboard()}
                 </>
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
                         <p style={{color: '#64748b', fontSize: '0.9rem'}}>Manage and monitor entries in real-time.</p>
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
                    <div className="form-field" key={key} style={isBoolean ? {flexDirection: 'row', alignItems: 'center', gap: '0.5rem'} : {}}>
                      <label>{key.replace(/_/g, ' ').toUpperCase()}</label>
                      {isBoolean ? (
                        <input 
                          type="checkbox"
                          checked={formData[key]}
                          onChange={(e) => setFormData({...formData, [key]: e.target.checked})}
                          style={{width: 'auto', marginBottom: 0}}
                        />
                      ) : (
                        <input 
                          type={typeof formData[key] === 'number' ? 'number' : 'text'}
                          value={formData[key] || ''}
                          maxLength={key === 'phone' ? 10 : (key === 'aadhar_no' ? 14 : (key === 'id_proof' ? (formData[key] && /^\d+$/.test(formData[key].replace(/[^A-Z0-9]/g, '')) ? 14 : 10) : undefined))}
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
                            setFormData({...formData, [key]: val});
                          }}
                        />
                      )}
                    </div>
                  )}) : <p style={{color: 'var(--text-secondary)'}}>Open a populated table first to configure new data.</p>}
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
              Are you sure you want to permanently delete this {currentTab.label.replace(/s$/, '')}? <br/><br/>
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
