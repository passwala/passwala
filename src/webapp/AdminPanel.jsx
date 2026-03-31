import React, { useState, useEffect } from 'react';
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
  Activity
} from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import './AdminPanel.css';

const ActivityFeed = () => {
  const [recent, setRecent] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecent = async () => {
      try {
        const { data: bData } = await supabase.from('bookings').select('*').order('created_at', { ascending: false }).limit(5);
        setRecent(bData || []);
      } catch (err) { console.error(err); }
      finally { setLoading(false); }
    };
    fetchRecent();
  }, []);

  if (loading) return <div style={{ padding: '1rem', color: '#64748b' }}>Syncing feed...</div>;

  return (
    <div className="activity-list">
      {recent.length === 0 ? <p style={{ padding: '1rem', color: '#64748b' }}>No recent activity.</p> :
        recent.map(b => (
          <div className="trend-item" key={b.id}>
             <strong>New Order:</strong> <span>{b.item_name} (₹{b.price})</span>
          </div>
        ))
      }
    </div>
  );
};

const AdminPanel = ({ onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(true);
  const [data, setData] = useState([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [stats, setStats] = useState({ users: 0, services: 0, apps: 0, bookings: 0 });
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  // Modal State
  const [showModal, setShowModal] = useState(false);
  const [editingItem, setEditingItem] = useState(null);
  const [formData, setFormData] = useState({});

  const tabs = [
    { id: 'dashboard', label: 'Overview', icon: BarChart3 },
    { id: 'services', label: 'Services', icon: Wrench, table: 'services' },
    { id: 'essentials', label: 'Essentials', icon: ShoppingBag, table: 'essentials' },
    { id: 'deals', label: 'Deals', icon: Tag, table: 'deals' },
    { id: 'recommendations', label: 'AI Recs', icon: Sparkles, table: 'recommendations' },
    { id: 'bookings', label: 'Orders', icon: Package, table: 'bookings' },
    { id: 'vendor_applications', label: 'Vendor Apps', icon: FileText, table: 'vendor_applications' },
    { id: 'users', label: 'Users', icon: Users, table: 'users' },
  ];

  const fetchStats = async () => {
    try {
      const { count: uCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: sCount } = await supabase.from('services').select('*', { count: 'exact', head: true });
      const { count: aCount } = await supabase.from('vendor_applications').select('*', { count: 'exact', head: true });
      const { count: bCount } = await supabase.from('bookings').select('*', { count: 'exact', head: true });
      setStats({
        users: uCount || 0,
        services: sCount || 0,
        apps: aCount || 0,
        bookings: bCount || 0
      });
    } catch (err) { console.error(err); }
  };

  const fetchData = async () => {
    const currentTab = tabs.find(t => t.id === activeTab);
    if (!currentTab || !currentTab.table) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      const { data: result, error } = await supabase
        .from(currentTab.table)
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setData(result || []);
    } catch (err) {
      console.error(err);
      toast.error(`Error loading ${currentTab.label}`);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
    fetchData();
  }, [activeTab]);

  const handleDelete = async (id) => {
    const currentTab = tabs.find(t => t.id === activeTab);
    const pkName = currentTab.table === 'users' ? 'uid' : 'id';
    if (!window.confirm(`Permanently delete this ${currentTab.label}?`)) return;

    try {
      const { error } = await supabase
        .from(currentTab.table)
        .delete()
        .eq(pkName, id);

      if (error) throw error;
      setData(data.filter(item => (item.id || item.uid) !== id));
      toast.success('Removed successfully');
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error('Operation failed');
    }
  };

  const handleUpsert = async (e) => {
    e.preventDefault();
    const currentTab = tabs.find(t => t.id === activeTab);
    try {
      const { error } = await supabase
        .from(currentTab.table)
        .upsert([formData]);

      if (error) throw error;
      toast.success(editingItem ? 'Updated!' : 'Added New!');
      setShowModal(false);
      fetchData();
      fetchStats();
    } catch (err) {
      console.error(err);
      toast.error('Save failed');
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData(item);
    } else {
      // Default blank based on first item keys OR a defined schema
      const currentTab = tabs.find(t => t.id === activeTab);
      const defaultSchemas = {
        services: { name: '', provider: '', category: 'home', price: 0, rating: 5.0, reviews: 0, images: '/default.png' },
        essentials: { name: '', store: '', category: 'grocery', price: 0, delivery_time: '15 min' },
        deals: { name: '', offer: '', store: '', price: 0 },
        recommendations: { name: '', reason: '', price: 0, provider: '', image: '/default.png' },
        bookings: { user_id: '', item_name: '', item_type: 'service', price: 0, status: 'pending' },
        vendor_applications: { business_name: '', category: '', phone: '', address: '', plan: 'Basic', status: 'pending' },
        users: { uid: '', email: '', display_name: '', auth_provider: 'google', role: 'customer' }
      };

      const blank = data.length > 0 ? 
        Object.keys(data[0]).reduce((acc, k) => ({ ...acc, [k]: (typeof data[0][k] === 'number' ? 0 : '') }), {}) : 
        (defaultSchemas[currentTab.table] || {});

      delete blank.id;
      delete blank.created_at;
      setFormData(blank);
    }
    setShowModal(true);
  };

  const handleApproveVendor = async (app) => {
    try {
      const { error: sError } = await supabase
        .from('services')
        .insert([{
          name: app.business_name,
          provider: app.business_name,
          category: app.category,
          price: app.plan === 'Pro' ? 1999 : app.plan === 'Growth' ? 999 : 499,
          rating: 5.0,
          image: '/default_service.png'
        }]);
      if (sError) throw sError;
      await supabase.from('vendor_applications').update({ status: 'approved' }).eq('id', app.id);
      toast.success('Vendor Approved & Service Live!');
      fetchData();
    } catch (err) { toast.error('Approval failed'); }
  };

  const renderTable = () => {
    if (loading) return <div className="admin-loading"><History className="animate-spin" /> Syncing Cloud Data...</div>;

    const filtered = data.filter(item => 
      Object.values(item).some(val => 
        String(val).toLowerCase().includes(searchTerm.toLowerCase())
      )
    );

    return (
      <div className="admin-table-container animate-fade-in">
        <div className="table-actions">
           <div className="search-admin">
              <Search size={18} />
              <input type="text" placeholder="Filter inventory..." value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} />
           </div>
           <button className="add-btn" onClick={() => openModal()}><Plus size={18} /> New {tabs.find(t => t.id === activeTab).label}</button>
        </div>

        <div className="table-scroll">
          <table className="admin-table">
            <thead>
              <tr>
                <th>IDENTIFIER</th>
                {data.length > 0 && Object.keys(data[0]).filter(k => k !== 'id' && k !== 'created_at').map(key => (
                  <th key={key}>{key.toUpperCase()}</th>
                ))}
                <th>CONTROL</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((item) => {
                const pk = item.uid || item.id;
                return (
                  <tr key={pk}>
                    <td className="id-col">#{pk}</td>
                    {Object.entries(item).filter(([k]) => k !== 'id' && k !== 'uid' && k !== 'created_at').map(([k, v]) => (
                      <td key={k}>
                        {k === 'status' ? (
                          <span className={`status-badge ${v}`}>{v}</span>
                        ) : typeof v === 'boolean' ? (v ? '✅' : '❌') : (
                          <span className="truncate-cell">{String(v)}</span>
                        )}
                      </td>
                    ))}
                    <td className="actions-cell">
                      {activeTab === 'vendor_applications' && item.status === 'pending' && (
                        <button className="approve-btn" onClick={() => handleApproveVendor(item)}><CheckCircle size={18} /></button>
                      )}
                      <button className="edit-btn" onClick={() => openModal(item)}><Edit2 size={16} /></button>
                      <button className="delete-btn" onClick={() => handleDelete(pk)}><Trash2 size={16} /></button>
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

  const renderDashboard = () => (
    <div className="dashboard-grid animate-fade-in">
      <div className="main-stats">
        <div className="stat-card p-gradient">
          <div className="stat-main">
            <Users size={32} />
            <div>
              <span>Neighbors Joined</span>
              <h3>{stats.users}</h3>
            </div>
          </div>
          <p>Ahmedabad Digital Community</p>
        </div>
        <div className="stat-card o-gradient">
          <div className="stat-main">
            <Activity size={32} />
            <div>
              <span>Vendor Apps</span>
              <h3>{stats.apps}</h3>
            </div>
          </div>
          <p>Local businesses seeking growth</p>
        </div>
        <div className="stat-card b-gradient">
          <div className="stat-main">
            <Package size={32} />
            <div>
              <span>Cloud Bookings</span>
              <h3>{stats.bookings}</h3>
            </div>
          </div>
          <p>Real-time Orders Placed</p>
        </div>
      </div>

      <div className="recent-activity glass">
         <div className="activity-header">
            <h4><History size={18} /> Live Orders (Last 5)</h4>
            <span>Real-time Cloud Sync</span>
         </div>
         <div className="trend-content">
            {data.filter(i => activeTab === 'dashboard' ? true : false).length === 0 && (
              <p style={{ padding: '1rem', color: '#64748b' }}>No recent orders found.</p>
            )}
            {/* We'll actually fetch recent bookings separately or reuse if activeTab was dashboard */}
            <ActivityFeed />
         </div>
      </div>
    </div>
  );

  const toggleSidebar = () => setIsSidebarOpen(!isSidebarOpen);

  return (
    <div className="admin-layout">
      {/* Sidebar Overlay for mobile */}
      {isSidebarOpen && <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>}

      {/* Sidebar */}
      <aside className={`admin-sidebar ${isSidebarOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
           <div className="logo-box">P</div>
           <div>
             <h2>Passwala</h2>
             <span>Admin OS 2.0</span>
           </div>
           <button className="sidebar-close-mobile" onClick={() => setIsSidebarOpen(false)}>
              <X size={24} />
           </button>
        </div>

        <nav className="sidebar-nav">
          {tabs.map((tab) => (
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
        </nav>

        <button className="logout-btn-admin" onClick={onLogout}>
          <LogOut size={18} /> <span>Exit System</span>
        </button>
      </aside>

      {/* Main Container */}
      <main className="admin-main-view">
        <header className="admin-top-bar">
          <div className="top-bar-left">
            <button className="mobile-menu-toggle" onClick={toggleSidebar}>
              <Activity size={24} />
            </button>
            <div className="breadcrumb">
               <Database size={14} /> / <span>PASSWALA CLOUD</span> / <strong>{activeTab.toUpperCase()}</strong>
            </div>
          </div>
          <div className="admin-profile-pill">
            <span className="badge-live">System Online</span>
            <div className="avatar">AD</div>
          </div>
        </header>

        <div className="admin-scroll-content">
           {activeTab === 'dashboard' ? (
             <>
               <h1 className="admin-hero-title">Welcome Back, Admin</h1>
               {renderDashboard()}
             </>
           ) : (
             <>
               <div className="table-header-row">
                 <h2 className="table-title">{tabs.find(t => t.id === activeTab).label} Engine</h2>
                 <span className="count-chip">{data.length} LIVE</span>
               </div>
               {renderTable()}
             </>
           )}
        </div>
      </main>

      {/* Item Modal */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal glass">
            <div className="modal-header">
               <h3>{editingItem ? 'Update' : 'Register New'} Entry</h3>
               <button onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleUpsert} className="admin-form">
               <div className="form-grid">
                  {Object.keys(formData).map(key => (
                    <div className="form-field" key={key}>
                      <label>{key.replace('_', ' ')}</label>
                      <input 
                        required
                        type={typeof formData[key] === 'number' ? 'number' : 'text'}
                        value={formData[key]}
                        onChange={(e) => setFormData({...formData, [key]: e.target.value})}
                      />
                    </div>
                  ))}
               </div>
               <button type="submit" className="submit-form-btn">
                 {editingItem ? 'Save Changes' : 'Create Entry'}
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
