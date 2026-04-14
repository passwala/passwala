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
  Activity,
  Bike,
  CreditCard,
  MessageSquare,
  Bell,
  Settings,
  ShieldCheck,
  UserPlus
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
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

  const tabSections = [
    {
      label: 'Main',
      items: [
        { id: 'dashboard', label: 'Dashboard', icon: BarChart3 },
      ]
    },
    {
      label: 'Management',
      items: [
        { id: 'users', label: 'Users', icon: Users, table: 'users' },
        { id: 'vendors', label: 'Vendors', icon: FileText, table: 'vendors' },
        { id: 'serviceProviders', label: 'Service Providers', icon: ShieldCheck, table: 'vendors' }, // Filtered
        { id: 'riders', label: 'Riders', icon: Bike, table: 'riders' },
      ]
    },
    {
      label: 'Inventory & Data',
      items: [
        { id: 'services', label: 'Services', icon: Wrench, table: 'services' },
        { id: 'products', label: 'Products', icon: ShoppingBag, table: 'essentials' },
        { id: 'orders', label: 'Orders', icon: Package, table: 'bookings' },
        { id: 'serviceBookings', label: 'Service Bookings', icon: MessageSquare, table: 'bookings' }, // Filtered
      ]
    },
    {
      label: 'Financials',
      items: [
        { id: 'payments', label: 'Payments', icon: CreditCard, table: 'bookings' },
        { id: 'deals', label: 'Deals & Offers', icon: Tag, table: 'deals' },
      ]
    },
    {
      label: 'Content',
      items: [
        { id: 'community', label: 'Community', icon: MessageSquare, table: 'community_posts' },
        { id: 'notifications', label: 'Notifications', icon: Bell, table: 'notifications' },
      ]
    },
    {
      label: 'System',
      items: [
        { id: 'reports', label: 'Reports', icon: TrendingUp },
        { id: 'settings', label: 'Settings', icon: Settings },
      ]
    }
  ];

  const fetchStats = async () => {
    try {
      if (!supabase) return;
      const { count: uCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
      const { count: sCount } = await supabase.from('services').select('*', { count: 'exact', head: true });
      const { count: aCount } = await supabase.from('vendors').select('*', { count: 'exact', head: true }).eq('profile_completed', false);
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
    const currentTab = tabSections.flatMap(s => s.items).find(t => t.id === activeTab);
    if (!currentTab || !currentTab.table) {
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      let query = supabase.from(currentTab.table).select('*').order('created_at', { ascending: false });
      
      // Filters for specific segments
      if (activeTab === 'serviceProviders') query = query.eq('category', 'service');
      if (activeTab === 'vendors') query = query.eq('category', 'shop');
      if (activeTab === 'serviceBookings') query = query.eq('item_type', 'service');

      const { data: result, error } = await query;

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
    const currentTab = tabSections.flatMap(s => s.items).find(t => t.id === activeTab);
    const pkName = activeTab === 'users' ? 'uid' : 'id';
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
    const currentTab = tabSections.flatMap(s => s.items).find(t => t.id === activeTab);
    try {
      const payload = { ...formData };
      delete payload.created_at;
      
      const { error } = await supabase
        .from(currentTab.table)
        .upsert([payload]);

      if (error) throw error;
      toast.success(editingItem ? 'Updated!' : 'Added New!');
      setShowModal(false);
      fetchData();
      fetchStats();
    } catch (err) {
      console.error('Upsert Error:', err);
      toast.error(`Save failed: ${err.message || 'Unknown error'}`);
    }
  };

  const handleBlockUser = async (uid, currentStatus) => {
    try {
      const { error } = await supabase.from('users').update({ is_blocked: !currentStatus }).eq('uid', uid);
      if (error) throw error;
      toast.success(!currentStatus ? 'User Blocked' : 'User Unblocked');
      fetchData();
    } catch (err) {
      toast.error('Failed to change user status');
    }
  };

  const openModal = (item = null) => {
    setEditingItem(item);
    if (item) {
      setFormData(item);
    } else {
      const currentTab = tabSections.flatMap(s => s.items).find(t => t.id === activeTab);
      // Logic for blank schema...
      setFormData({});
    }
    setShowModal(true);
  };

  const renderTable = () => {
    const currentTabLabel = tabSections.flatMap(s => s.items).find(t => t.id === activeTab).label;
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
                {data.length > 0 && Object.keys(data[0]).filter(k => k !== 'id' && k !== 'created_at' && k !== 'uid').slice(0, 5).map(key => (
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
                    <td className="id-col">#{String(pk).slice(-4)}</td>
                    {Object.entries(item).filter(([k]) => k !== 'id' && k !== 'uid' && k !== 'created_at').slice(0, 5).map(([k, v]) => (
                      <td key={k}>
                        {k === 'status' || k === 'role' ? (
                          <span className={`status-badge ${v}`}>{v}</span>
                        ) : typeof v === 'boolean' ? (v ? '✅' : '❌') : (
                          <span className="truncate-cell">{String(v)}</span>
                        )}
                      </td>
                    ))}
                    <td className="actions-cell">
                      {activeTab === 'users' && (
                        <button className={item.is_blocked ? 'approve-btn' : 'delete-btn'} onClick={() => handleBlockUser(pk, item.is_blocked)} title={item.is_blocked ? "Unblock" : "Block"}>
                          <ShieldCheck size={16} />
                        </button>
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
            <p>Vendors waiting for verification</p>
          </div>
          <div className="stat-card b-gradient">
            <div className="stat-main">
              <Package size={32} />
              <div>
                <span>Platform Orders</span>
                <h3>{stats.bookings}</h3>
              </div>
            </div>
            <p>Total successful transactions</p>
          </div>
        </div>

        <div className="recent-activity-table glass" style={{marginTop: '2rem'}}>
          <div className="activity-header">
            <h4><Activity size={18} /> Real-time System Load</h4>
            <span className="badge-live">System Optimal</span>
          </div>
          <div style={{height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8'}}>
            [ Interactive Growth Analytics Visualization Coming Soon ]
          </div>
        </div>
      </div>

      <div className="recent-activity glass">
         <div className="activity-header">
            <h4><History size={18} /> Recent Logs</h4>
            <button className="edit-btn" style={{width: 'auto', padding: '0 8px', fontSize: '10px'}}>VIEW ALL</button>
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
               <Database size={14} /> / <span>MASTER CONTROL</span> / <strong>{activeTab.toUpperCase()}</strong>
            </div>
          </div>
          <div className="admin-profile-pill">
            <span className="badge-live">Live</span>
            <div className="avatar">SA</div>
          </div>
        </header>

        <div className="admin-scroll-content">
           <AnimatePresence mode='wait'>
             <motion.div 
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
               ) : (
                 <>
                   <div className="table-header-row">
                     <div>
                       <h2 className="table-title">{tabSections.flatMap(s => s.items).find(t => t.id === activeTab).label}</h2>
                       <p style={{color: '#64748b', fontSize: '0.9rem'}}>Manage and monitor entries in real-time.</p>
                     </div>
                     <span className="count-chip">{data.length} Total Records</span>
                   </div>
                   {renderTable()}
                 </>
               )}
             </motion.div>
           </AnimatePresence>
        </div>
      </main>

      {/* Modal logic remains similar but with better styling in CSS */}
      {showModal && (
        <div className="admin-modal-overlay">
          <div className="admin-modal">
            <div className="modal-header">
               <h3>Modify Platform Resource</h3>
               <button onClick={() => setShowModal(false)}><X /></button>
            </div>
            <form onSubmit={handleUpsert} className="admin-form">
               <div className="form-grid">
                  {Object.keys(formData).length > 0 ? Object.keys(formData).map(key => (
                    <div className="form-field" key={key}>
                      <label>{key.replace('_', ' ')}</label>
                      <input 
                        required
                        type={typeof formData[key] === 'number' ? 'number' : 'text'}
                        value={formData[key]}
                        onChange={(e) => setFormData({...formData, [key]: e.target.value})}
                      />
                    </div>
                  )) : <p>Loading data structure...</p>}
               </div>
               <button type="submit" className="submit-form-btn">
                 Confirm Synchronization
               </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPanel;
