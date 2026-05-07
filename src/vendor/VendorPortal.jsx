/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  LayoutDashboard, 
  FileText, 
  PackagePlus, 
  IndianRupee, 
  User,
  Store, 
  Wrench, 
  MapPin, 
  CheckCircle, 
  XCircle, 
  Camera, 
  CheckCircle2, 
  LogOut, 
  Package, 
  Wallet, 
  Trash2, 
  ShoppingCart, 
  ArrowLeft, 
  Clock, 
  ShieldCheck,
  Star,
  Bell,
  HelpCircle,
  Menu,
  ChevronRight,
  TrendingUp,
  Settings
} from 'lucide-react';
import { supabase } from '../supabase';
import './VendorPortal.css';
import { 
  VendorInventory, 
  VendorOrders, 
  VendorEarnings, 
  VendorWallet, 
  VendorReviews, 
  VendorNotifications, 
  VendorSupport 
} from './VendorSubPages';

const formatAadhar = (val) => {
  const cleanVal = val.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < cleanVal.length; i += 4) {
    parts.push(cleanVal.slice(i, i + 4));
  }
  return parts.join(' ');
};

const VendorPortal = ({ user, onLogout }) => {
  const [appStatus, setAppStatus] = useState('loading'); // loading, onboarding, dashboard, pending
  // Removed chatty log for production
  const [vendorData, setVendorData] = useState(null);
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  
  // Onboarding State
  const [onboardingSubStep, setOnboardingSubStep] = useState(() => parseInt(localStorage.getItem('vOnboardingStep') || '1')); 
  const [businessType, setBusinessType] = useState(() => localStorage.getItem('vBusinessType') || 'shop'); 
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('vFormData');
    return saved ? JSON.parse(saved) : { name: '', aadhar_no: '', business_name: '', license_no: '', address: '' };
  });
  
  useEffect(() => {
    localStorage.setItem('vOnboardingStep', onboardingSubStep);
    localStorage.setItem('vBusinessType', businessType);
    localStorage.setItem('vFormData', JSON.stringify(formData));
  }, [onboardingSubStep, businessType, formData]);
  const [bankData, setBankData] = useState({ account_no: '', ifsc: '', holder_name: '' });
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessPop, setShowSuccessPop] = useState(false);
  
  const [stats, setStats] = useState({ orders: 0, earnings: 0, pending: 0, rating: 4.8 });
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('vendorActiveTab') || 'dashboard'); 

  // ⚡ REAL-TIME STATS ENGINE
  const fetchLiveStats = async () => {
    if (!supabase) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      // 1. Get Pending Orders
      const { count: pendingCount } = await supabase
        .from('orders')
        .select('*', { count: 'exact', head: true })
        .in('status', ['PLACED', 'PREPARING']);

      // 2. Get Today's Earnings
      const { data: earningsData } = await supabase
        .from('orders')
        .select('total_amount')
        .eq('status', 'DELIVERED')
        .gt('created_at', today.toISOString());
      
      const totalEarnings = (earningsData || []).reduce((sum, o) => sum + (o.total_amount || 0), 0);

      setStats({
        pending: pendingCount || 0,
        earnings: totalEarnings,
        orders: (earningsData || []).length,
        rating: 4.8 
      });
    } catch (err) {
      console.error("Stats fetch failed:", err);
    }
  };

  useEffect(() => {
    if (appStatus === 'dashboard') {
      fetchLiveStats();

      // Real-time listener for any order changes
      const channel = supabase
        .channel('vendor-dashboard-realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, (payload) => {
          fetchLiveStats();
          if (payload.eventType === 'INSERT') {
            toast.success("New Order Received!", { icon: '🔔' });
            // Play notification sound could be added here
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
  }, [appStatus]);

  useEffect(() => {
    localStorage.setItem('vendorActiveTab', activeTab);
  }, [activeTab]);


  useEffect(() => {
    checkVendorStatus();
    
    const handleResize = () => {
      setIsSidebarOpen(window.innerWidth > 1024);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [user]);

  const checkVendorStatus = async () => {
    try {
      if (!user) {
        setAppStatus('onboarding');
        return;
      }
      const phone = user.phoneNumber 
          ? user.phoneNumber.replace(/\D/g, '').slice(-10) 
          : null;

      if (!phone) {
        toast.error("Phone number missing from authentication.");
        setAppStatus('onboarding');
        return;
      }

      const isLocallyCompleted = localStorage.getItem('vProfileCompleted') === 'true';

      if (supabase) {
        // First check vendors table
        let { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('phone', phone)
          .maybeSingle();

        // If not found in vendors, check service_providers
        if (!data && !error) {
          const { data: sData, error: sError } = await supabase
            .from('service_providers')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();
          data = sData;
          error = sError;
        }

        if (error && !isLocallyCompleted) throw error;

        if (data) {
          setVendorData(data);
          setBusinessType(data.category || localStorage.getItem('vBusinessType') || 'shop');
          if (data.profile_completed || isLocallyCompleted) {
            setAppStatus('dashboard');
          } else {
            setAppStatus('onboarding');
          }
        } else {
          setAppStatus(isLocallyCompleted ? 'dashboard' : 'onboarding');
        }
      } else {
         setAppStatus(isLocallyCompleted ? 'dashboard' : 'onboarding');
      }
    } catch (error) {
      console.error(error);
      setAppStatus(localStorage.getItem('vProfileCompleted') === 'true' ? 'dashboard' : 'onboarding');
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'inventory', label: businessType === 'shop' ? 'Products' : 'Services', icon: businessType === 'shop' ? Package : Wrench },
    { id: 'orders', label: businessType === 'shop' ? 'Orders' : 'Bookings', icon: FileText },
    { id: 'earnings', label: 'Earnings', icon: IndianRupee },
    { id: 'wallet', label: 'Wallet', icon: Wallet },
    { id: 'reviews', label: 'Reviews & Ratings', icon: Star },
    { id: 'notifications', label: 'Notifications', icon: Bell },
    { id: 'support', label: 'Support', icon: HelpCircle },
  ];

  const renderDashboard = () => (
    <div className="v-container animate-fade-in">
      <div className="v-welcome-banner">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <h1>Good {new Date().getHours() < 12 ? 'Morning' : (new Date().getHours() < 18 ? 'Afternoon' : 'Evening')}, {vendorData?.name?.split(' ')[0] || 'Partner'}!</h1>
          <p>Your {businessType} is currently online and accepting orders. Here's your performance snapshot for today.</p>
          
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <button 
              onClick={() => setActiveTab('orders')}
              className="v-banner-btn-primary"
            >
              View Active Orders <ChevronRight size={18} />
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="v-banner-btn-outline"
            >
              Manage {businessType === 'shop' ? 'Inventory' : 'Services'}
            </button>
          </div>
        </motion.div>
      </div>

      <div className="v-stats-grid">
        <motion.div whileHover={{ y: -5 }} className="v-stat-card">
          <div className="v-stat-header">
            <div className="v-stat-icon v-icon-orange"><Clock size={24} /></div>
            <span className="v-stat-label">Live {businessType === 'shop' ? 'Orders' : 'Jobs'}</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="v-stat-value">{stats.pending}</span>
            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> +12%
            </span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="v-stat-card">
          <div className="v-stat-header">
            <div className="v-stat-icon v-icon-green"><IndianRupee size={24} /></div>
            <span className="v-stat-label">Today's Revenue</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="v-stat-value">₹{stats.earnings}</span>
            <span style={{ fontSize: '0.85rem', color: '#16a34a', fontWeight: 800, display: 'flex', alignItems: 'center', gap: '4px' }}>
              <TrendingUp size={14} /> +5%
            </span>
          </div>
        </motion.div>

        <motion.div whileHover={{ y: -5 }} className="v-stat-card">
          <div className="v-stat-header">
            <div className="v-stat-icon v-icon-blue"><Star size={24} /></div>
            <span className="v-stat-label">Avg. Rating</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px' }}>
            <span className="v-stat-value">{stats.rating}</span>
            <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>Top 5%</span>
          </div>
        </motion.div>
      </div>

      <div className="v-chart-card">
        <div className="v-chart-header">
          <div className="v-chart-info">
            <h3>Growth Analytics</h3>
            <p>Visualize your business expansion over time</p>
          </div>
          <select className="v-chart-select">
            <option>Last 7 Days</option>
            <option>Last 30 Days</option>
            <option>This Month</option>
          </select>
        </div>
         <div style={{height: '300px', background: 'linear-gradient(to bottom, #f8fafc, #fff)', borderRadius: '20px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0'}}>
           <TrendingUp size={48} strokeWidth={1} style={{ marginBottom: '1rem', opacity: 0.5 }} />
           <p style={{ fontWeight: 700 }}>Analytics are warming up!</p>
           <p style={{ fontSize: '0.85rem', marginTop: '4px' }}>Complete more orders to unlock detailed insights.</p>
         </div>
      </div>
    </div>
  );

  const handleUpdateProfile = async () => {
    try {
      setIsUpdating(true);
      const phone = vendorData?.phone || (user?.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : null);
      if (!phone) {
        toast.error("Identity verification failed.");
        return;
      }
      
      if (supabase && vendorData?.id) {
         const { error } = await supabase
           .from('vendors')
           .update({
              name: editFormData.name,
              business_name: editFormData.business_name,
              address: editFormData.address,
              license_no: editFormData.license_no,
              aadhar_no: editFormData.aadhar_no ? editFormData.aadhar_no.replace(/\s/g, '') : null
           })
           .eq('id', vendorData.id);
           
         if (error) throw error;

         // Sync minimal vendor info to stores
         await supabase.from('stores').upsert({
           id: vendorData.id,
           vendor_id: vendorData.id,
           name: editFormData.business_name,
           address: editFormData.address || vendorData.address
         });
      }
      
      setVendorData(prev => ({ ...prev, ...editFormData, phone: phone }));
      setFormData(prev => ({ ...prev, ...editFormData }));
      setIsEditingProfile(false);
      toast.success('Profile updated successfully!');
    } catch (e) {
      console.error(e);
      toast.error('Failed to update profile.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      setIsUpdating(true);
      if (supabase && vendorData?.id) {
        const targetId = vendorData.id;

        // 1. Find all order IDs for this vendor to clear their dependencies
        const { data: vendorOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('store_id', targetId);

        if (vendorOrders && vendorOrders.length > 0) {
          const orderIds = vendorOrders.map(o => o.id);
          
          // 2. Clear rider earnings linked to these orders
          await supabase.from('rider_earnings').delete().in('order_id', orderIds);
          
          // 3. Clear order items (if they exist)
          try {
            await supabase.from('order_items').delete().in('order_id', orderIds);
          } catch (itemErr) {
            console.warn("Order items delete skipped:", itemErr);
          }
          
          // 4. Clear orders themselves
          await supabase.from('orders').delete().in('id', orderIds);
        }

        // 4. Delete products and deals
        await supabase.from('products').delete().eq('store_id', targetId);
        await supabase.from('deals').delete().eq('store_id', targetId);

        // 5. Delete the store
        await supabase.from('stores').delete().eq('vendor_id', targetId);

        // 6. Finally delete the vendor profile
        const { error: vendorError } = await supabase.from('vendors').delete().eq('id', targetId);
        if (vendorError) throw vendorError;
      }
      
      toast.success('Account and associated records deleted.', { icon: '🗑️' });
      
      localStorage.removeItem('vProfileCompleted');
      localStorage.removeItem('vendorActiveTab');
      localStorage.removeItem('vBusinessType');
      
      if (onLogout) {
        onLogout(true);
      } else {
        window.location.href = '/';
      }
    } catch (e) {
      console.error("Deep Delete Error:", e);
      toast.error(`Delete Failed: ${e.message || "Dependency error"}`);
    } finally {
      setIsUpdating(false);
    }
  };

  const renderProfile = () => {
    const currentData = isEditingProfile ? editFormData : (vendorData || formData);
    
    return (
      <div className="v-container animate-fade-in">
        <div className="v-chart-card" style={{ padding: '2.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem', marginBottom: '2rem', paddingBottom: '1.5rem', borderBottom: '1px solid #e2e8f0' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316 0%, #ffedd5 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', fontWeight: 800 }}>
              {(currentData?.name || 'P').charAt(0).toUpperCase()}
            </div>
            <div>
              <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#0f172a', marginBottom: '4px' }}>{currentData?.name || 'Partner Profile'}</h2>
              <div className="v-status-badge" style={{ display: 'inline-flex' }}>{businessType === 'shop' ? 'Shop Owner' : 'Service Provider'}</div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
            <div className="v-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Package size={16} /> Owner Name
              </label>
              {isEditingProfile ? 
                <input type="text" className="v-input" value={currentData?.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} /> :
                <div className="v-input v-readonly">{currentData?.name || 'Not provided'}</div>
              }
            </div>

            <div className="v-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Star size={16} /> Business Name
              </label>
              {isEditingProfile ? 
                <input type="text" className="v-input" value={currentData?.business_name || ''} onChange={e => setEditFormData({...editFormData, business_name: e.target.value})} /> :
                <div className="v-input v-readonly">{currentData?.business_name || 'Not provided'}</div>
              }
            </div>

            <div className="v-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <HelpCircle size={16} /> Business Category
              </label>
              <div className="v-input v-readonly" style={{ textTransform: 'capitalize' }}>{businessType} Service</div>
            </div>

            <div className="v-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <CheckCircle size={16} /> License / Registration
              </label>
              {isEditingProfile ? 
                <input 
                  type="text" 
                  className="v-input" 
                  maxLength={18}
                  placeholder="e.g. 2026-CITY-12345678"
                  value={currentData?.license_no || ''} 
                  onChange={e => {
                    const clean = e.target.value.replace(/[^A-Z0-9]/ig, '').toUpperCase().slice(0, 16);
                    let formatted = clean.slice(0, 4);
                    if (clean.length > 4) formatted += '-' + clean.slice(4, 8);
                    if (clean.length > 8) formatted += '-' + clean.slice(8, 16);
                    setEditFormData({...editFormData, license_no: formatted});
                  }} 
                /> :
                <div className="v-input v-readonly">{currentData?.license_no || 'Pending Verification'}</div>
              }
            </div>

            <div className="v-form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <MapPin size={16} /> Store Address
              </label>
              {isEditingProfile ? 
                <textarea 
                  className="v-input" 
                  style={{ minHeight: '80px' }}
                  value={currentData?.address || ''} 
                  onChange={e => setEditFormData({...editFormData, address: e.target.value})} 
                /> :
                <div className="v-input v-readonly" style={{ minHeight: '60px' }}>{currentData?.address || 'Address not set'}</div>
              }
            </div>
          </div>
          
          <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            {isEditingProfile ? (
              <>
                <button className="v-nav-item" style={{ width: 'auto', background: '#f1f5f9', color: '#64748b', fontWeight: 700 }} onClick={() => setIsEditingProfile(false)} disabled={isUpdating}>Cancel</button>
                <button className="auth-submit-btn" style={{ width: 'auto', padding: '12px 32px' }} onClick={handleUpdateProfile} disabled={isUpdating || !editFormData.name || !editFormData.business_name || (editFormData.aadhar_no && editFormData.aadhar_no.replace(/\s/g, '').length > 0 && editFormData.aadhar_no.replace(/\s/g, '').length !== 12)}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <>
                <button 
                  className="v-nav-item" 
                  style={{ width: 'auto', background: '#fee2e2', color: '#dc2626', fontWeight: 700, border: '1px solid #fca5a5' }} 
                  onClick={() => setShowDeleteModal(true)} 
                  disabled={isUpdating}
                >
                  <Trash2 size={18} style={{ marginRight: '8px' }} />
                  Delete Account
                </button>
                <button className="auth-submit-btn" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => { setEditFormData(vendorData || formData); setIsEditingProfile(true); }}>Edit Information</button>
              </>
            )}
          </div>
        </div>

        {showDeleteModal && (
          <div style={{ position: 'fixed', inset: 0, background: 'rgba(15, 23, 42, 0.6)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '1rem', backdropFilter: 'blur(4px)' }} onClick={() => setShowDeleteModal(false)}>
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              style={{ background: 'white', borderRadius: '16px', padding: '2rem', maxWidth: '400px', width: '100%', boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)', textAlign: 'center' }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: '#fee2e2', color: '#ef4444', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                <Trash2 size={32} />
              </div>
              <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.5rem', fontWeight: 800, color: '#0f172a' }}>Delete Account?</h3>
              <p style={{ margin: '0 0 2rem 0', color: '#64748b', fontSize: '0.95rem', lineHeight: 1.5 }}>This will permanently remove your business profile, products, and order history. This action cannot be undone.</p>
              
              <div style={{ display: 'flex', gap: '1rem' }}>
                <button 
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: '#f1f5f9', color: '#64748b', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  onClick={() => setShowDeleteModal(false)}
                >
                  Cancel
                </button>
                <button 
                  style={{ flex: 1, padding: '0.75rem', borderRadius: '8px', background: '#ef4444', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}
                  onClick={handleDeleteAccount}
                >
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </div>
    );
  };

  const renderOnboarding = () => (
    <div className="onboarding-screen">
      {onboardingSubStep === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="onboarding-content">
          <div className="onboarding-header" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '2.5rem' }}>
            <div className="onboarding-logo-wrapper">
              <img src="/logo.png" alt="Passwala Logo" className="onboarding-logo" />
            </div>
            <h2 style={{fontWeight: 900, fontSize: '1.75rem', marginBottom: '0.25rem', color: '#0f172a'}}>Passwala</h2>
            <p style={{color: '#64748b', fontSize: '0.95rem'}}>Join our network of elite local partners</p>
          </div>
          
          <div className="registration-type-grid">
            <div className={`type-card ${businessType === 'shop' ? 'active' : ''}`} onClick={() => setBusinessType('shop')} style={{padding: '1.5rem', textAlign: 'center'}}>
               <ShoppingCart size={32} color={businessType === 'shop' ? '#f97316' : '#94a3b8'} style={{margin: '0 auto 12px auto'}} />
               <h4 style={{fontWeight: 800}}>Shop Owner</h4>
               <p style={{fontSize: '0.8rem', color: '#64748b'}}>Sell groceries, essentials, or daily items.</p>
            </div>
            <div className={`type-card ${businessType === 'service' ? 'active' : ''}`} onClick={() => setBusinessType('service')} style={{padding: '1.5rem', textAlign: 'center'}}>
               <Wrench size={32} color={businessType === 'service' ? '#f97316' : '#94a3b8'} style={{margin: '0 auto 12px auto'}} />
               <h4 style={{fontWeight: 800}}>Service Provider</h4>
               <p style={{fontSize: '0.8rem', color: '#64748b'}}>Offer plumbing, cleaning, or expert services.</p>
            </div>
          </div>
          <button className="submit-form-btn" style={{marginTop: '2rem'}} onClick={() => setOnboardingSubStep(2)}>Get Started</button>
        </motion.div>
      )}
      {onboardingSubStep === 2 && (
        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="onboarding-content" style={{ position: 'relative' }}>
          <button className="back-btn-ghost" style={{ position: 'absolute', left: '-10px', top: '-10px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} onClick={() => setOnboardingSubStep(1)}>
            <ArrowLeft size={24} />
          </button>
          
          <div className="onboarding-header" style={{ marginBottom: '2rem', textAlign: 'center' }}>
            <h2 style={{fontWeight: 900, fontSize: '1.5rem', color: '#0f172a'}}>Business Details</h2>
            <p style={{color: '#64748b', fontSize: '0.9rem'}}>Please provide your {businessType} information</p>
          </div>

          <div className="v-form-group">
            <label>Owner Full Name</label>
            <input type="text" placeholder="Enter your name" className="v-input" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          </div>
          
          <div className="v-form-group">
            <label>Aadhar Number</label>
            <input 
              type="text" 
              placeholder="12-digit Aadhar No" 
              maxLength={14} 
              className="v-input" 
              value={formData.aadhar_no} 
              onChange={e => setFormData({...formData, aadhar_no: formatAadhar(e.target.value)})} 
            />
          </div>

          <div className="v-form-group">
            <label>{businessType === 'shop' ? 'Shop Name' : 'Service/Business Name'}</label>
            <input type="text" placeholder={`E.g. ${businessType === 'shop' ? 'Sharma Groceries' : 'QuickFix Plumbing'}`} className="v-input" value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} />
          </div>

          <div className="v-form-group">
            <label>{businessType === 'shop' ? 'Shop License No' : 'Registration No (Optional)'}</label>
            <input 
              type="text" 
              maxLength={18} 
              placeholder="e.g. 2026-CITY-12345678" 
              className="v-input" 
              value={formData.license_no} 
              onChange={e => {
                const clean = e.target.value.replace(/[^A-Z0-9]/ig, '').toUpperCase().slice(0, 16);
                let formatted = clean.slice(0, 4);
                if (clean.length > 4) formatted += '-' + clean.slice(4, 8);
                if (clean.length > 8) formatted += '-' + clean.slice(8, 16);
                setFormData({...formData, license_no: formatted});
              }} 
            />
          </div>

          <div className="v-form-group">
            <label>{businessType === 'shop' ? 'Shop Address' : 'Business Address'}</label>
            <textarea 
              placeholder="Enter complete address" 
              className="v-input" 
              style={{ minHeight: '80px', resize: 'vertical' }}
              value={formData.address || ''} 
              onChange={e => setFormData({...formData, address: e.target.value})} 
            />
          </div>

          <button 
             className="auth-submit-btn" 
             style={{marginTop: '1.5rem', width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--v-primary)', color: 'white', fontWeight: 800, fontSize: '1rem'}} 
             onClick={() => setOnboardingSubStep(3)} 
             disabled={
               !formData.name || 
               formData.aadhar_no.replace(/\s/g, '').length !== 12 || 
               !formData.business_name
             }
          >
            Continue
          </button>
        </motion.div>
      )}
      
      {onboardingSubStep > 2 && (
        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="onboarding-content" style={{ position: 'relative', textAlign: 'center', padding: '2rem 1rem' }}>
          <button className="back-btn-ghost" style={{ position: 'absolute', left: '-10px', top: '-10px', background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }} onClick={() => setOnboardingSubStep(2)}>
             <ArrowLeft size={24} />
          </button>

          <Clock size={48} color="#f97316" style={{margin: '0 auto 1.5rem auto'}} />
          <h3 style={{fontWeight: 800}}>Completing Set-up...</h3>
          <p style={{color: '#64748b', fontSize: '0.9rem'}}>We are finalizing your {businessType} profile. You will be redirected shortly.</p>
          <button onClick={async () => {
             if (supabase) {
                const currentPhone = vendorData?.phone || (user?.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : null);
                 if (!currentPhone) {
                    toast.error("Phone number required for registration.");
                    return;
                 }
                let resolvedUserId = null;
                
                try {
                   const { data: ud } = await supabase.from('users').select('id').eq('phone', currentPhone).maybeSingle();
                   if (ud) {
                       resolvedUserId = ud.id;
                   } else {
                       const { data: newUser } = await supabase.from('users').insert([{ phone: currentPhone, full_name: formData.name }]).select().single();
                       if (newUser) resolvedUserId = newUser.id;
                   }
                } catch (e) {
                   console.error("User resolve error:", e);
                }

                const targetTable = businessType === 'shop' ? 'vendors' : 'service_providers';
                const tablePayload = {
                   business_name: formData.business_name,
                   aadhar_no: formData.aadhar_no.replace(/\s/g, ''),
                   license_no: formData.license_no,
                   address: formData.address,
                   phone: currentPhone,
                   profile_completed: true,
                   user_id: resolvedUserId
                };

                if (targetTable === 'vendors') {
                  tablePayload.name = formData.name;
                  tablePayload.category = businessType;
                } else {
                  tablePayload.full_name = formData.name;
                  tablePayload.name = formData.name;
                }

                let toastId = toast.loading('Setting up your profile...');
                try {
                   let savedId = vendorData?.id;
                   if (savedId) {
                      const { error } = await supabase.from(targetTable).update(tablePayload).eq('id', savedId);
                      if (error) throw error;
                   } else {
                      const { data, error } = await supabase.from(targetTable).insert([tablePayload]).select().single();
                      if (error) throw error;
                      if (data) savedId = data.id;
                   }
                   
                   if (savedId && targetTable === 'vendors') {
                      const { error: storeError } = await supabase.from('stores').upsert({
                        id: savedId,
                        vendor_id: savedId,
                        name: tablePayload.business_name,
                        address: tablePayload.address
                      });
                      if (storeError) throw storeError;
                   }
                   
                   toast.success('Onboarding completed successfully!', { id: toastId });
                   setVendorData(prev => ({...prev, ...formData, category: businessType, profile_completed: true}));
                   localStorage.setItem('vProfileCompleted', 'true');
                   setShowSuccessPop(true);
                } catch (e) {
                   console.error(`Supabase ${targetTable} operation failed:`, e);
                   toast.error(`Setup failed: ${e.message || 'Please check your database connection or SQL schemas.'}`, { id: toastId });
                }
             } else {
                setVendorData(prev => ({...prev, ...formData, category: businessType, profile_completed: true}));
                localStorage.setItem('vProfileCompleted', 'true');
                setShowSuccessPop(true);
             }
          }} style={{marginTop: '2rem', padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800}}>Continue to Dashboard</button>
        </motion.div>
      )}

      {showSuccessPop && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          background: 'rgba(15, 23, 42, 0.75)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          padding: '20px'
        }}>
          <motion.div 
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', damping: 20 }}
            style={{
              background: 'white',
              padding: '2.5rem',
              borderRadius: '24px',
              maxWidth: '440px',
              width: '100%',
              textAlign: 'center',
              boxShadow: '0 20px 25px -5px rgba(0, 0, 0, 0.1), 0 10px 10px -5px rgba(0, 0, 0, 0.04)'
            }}
          >
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #f97316 0%, #ff8f3d 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem auto',
              boxShadow: '0 8px 16px rgba(249, 115, 22, 0.3)'
            }}>
              <CheckCircle size={40} color="white" />
            </div>
            
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>
              Welcome Aboard! 🎉
            </h3>
            
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Congratulations, <strong style={{color: '#0f172a'}}>{formData.name}</strong>! Your <strong>{businessType === 'shop' ? 'Shop Owner' : 'Service Provider'}</strong> profile has been registered successfully.
            </p>
            
            <button 
              onClick={() => {
                setShowSuccessPop(false);
                setAppStatus('dashboard');
              }}
              style={{
                width: '100%',
                padding: '14px',
                borderRadius: '12px',
                background: '#0f172a',
                color: 'white',
                border: 'none',
                fontWeight: 800,
                fontSize: '1rem',
                cursor: 'pointer',
                transition: 'all 0.2s',
                boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'
              }}
              onMouseEnter={e => e.currentTarget.style.transform = 'translateY(-2px)'}
              onMouseLeave={e => e.currentTarget.style.transform = 'translateY(0)'}
            >
              Explore Dashboard
            </button>
          </motion.div>
        </div>
      )}
    </div>
  );

  if (appStatus === 'loading') return (
    <div className="loading-screen" style={{display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100vh', gap: '20px'}}>
      <div className="loader-ring" style={{borderTopColor: '#f97316'}}></div>
      <p style={{fontWeight: 800, color: '#0f172a'}}>Encrypting Terminal...</p>
    </div>
  );

  return (
    <div className="vendor-portal">
      {appStatus === 'dashboard' && (
        <aside className={`vendor-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}>
          <div className="vendor-sidebar-header">
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
              <div className="v-logo-container">
                <img src="/logo.png" alt="Passwala" className="v-sidebar-logo" />
              </div>
              <div className="v-brand-info">
                <span className="v-brand-name">PASSWALA</span>
                <span className="v-brand-tag">PARTNER</span>
              </div>
            </div>
            <button className="v-mobile-close-btn" onClick={() => setIsSidebarOpen(false)}>
              <XCircle size={24} />
            </button>
          </div>

          <nav className="vendor-sidebar-nav">
            {menuItems.map(item => (
              <button 
                key={item.id} 
                className={`v-nav-item ${activeTab === item.id ? 'active' : ''}`}
                onClick={() => setActiveTab(item.id)}
              >
                <item.icon />
                <span>{item.label}</span>
              </button>
            ))}
          </nav>

          <button className="v-logout-btn" onClick={onLogout}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </aside>
      )}

      {appStatus === 'dashboard' && isSidebarOpen && (
        <div className="sidebar-overlay" onClick={() => setIsSidebarOpen(false)}></div>
      )}

      <main className={`portal-main-area ${appStatus === 'onboarding' ? 'onboarding-mode' : ''} ${!isSidebarOpen && appStatus === 'dashboard' ? 'sidebar-collapsed' : ''}`}>
        {appStatus === 'dashboard' && (
          <header className="portal-top-bar">
            <div className="v-top-left">
               <button onClick={() => setIsSidebarOpen(!isSidebarOpen)} style={{background: 'none', color: '#1e293b'}}><Menu size={24} /></button>
               <div className="v-status-badge">Accepting Orders</div>
            </div>
            
            <div className="v-top-right">
              <div className="v-user-info">
                <span style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 800 }}>PARTNER ID #{vendorData?.id?.substring(0,4)?.toUpperCase() || '4289'}</span>
                <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#1e293b' }}>{vendorData?.business_name || 'My Store'}</span>
                <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <MapPin size={10} color="#f97316" />
                  <span style={{ fontSize: '0.7rem', color: '#f97316', fontWeight: 700 }}>
                    {vendorData?.address?.split(',')[0] || 'Local Area'}
                  </span>
                </div>
              </div>
              <div className="v-avatar">{vendorData?.name?.charAt(0) || 'P'}</div>
            </div>
          </header>
        )}

        <div className="portal-scroll-area">
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab + appStatus}
              initial={{ opacity: 0, x: 10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -10 }}
              transition={{ duration: 0.2 }}
            >
              {appStatus === 'onboarding' ? renderOnboarding() : (
                activeTab === 'dashboard' ? renderDashboard() :
                activeTab === 'profile' ? renderProfile() : 
                activeTab === 'inventory' ? <VendorInventory businessType={businessType} /> :
                activeTab === 'orders' ? <VendorOrders businessType={businessType} /> :
                activeTab === 'earnings' ? <VendorEarnings /> :
                activeTab === 'wallet' ? <VendorWallet /> :
                activeTab === 'reviews' ? <VendorReviews /> :
                activeTab === 'notifications' ? <VendorNotifications /> :
                <VendorSupport />
              )}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>
    </div>
  );
};

export default VendorPortal;
