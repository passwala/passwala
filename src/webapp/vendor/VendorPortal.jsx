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
import { supabase } from '../../supabase';
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

const VendorPortal = ({ user, onLogout }) => {
  const [appStatus, setAppStatus] = useState('loading'); // loading, onboarding, dashboard, pending
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
  
  const [stats, setStats] = useState({ orders: 0, earnings: 0, pending: 0, rating: 4.8 });
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('vendorActiveTab') || 'dashboard'); 

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
      if (!user) return;
      const phone = user && typeof user === 'object' && user.phoneNumber 
          ? user.phoneNumber.replace(/\D/g, '').slice(-10) 
          : (typeof user === 'string' ? user : '9999999999');

      const isLocallyCompleted = localStorage.getItem('vProfileCompleted') === 'true';

      if (supabase) {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('phone_number', phone)
          .maybeSingle();

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
      <div className="v-hero-section">
        <h1>Welcome Back, {vendorData?.name || 'Partner'}!</h1>
        <p>Here's what's happening with your business today.</p>
      </div>

      <div className="v-stats-grid">
        <div className="v-stat-card">
          <div className="v-stat-header">
            <div className="v-stat-icon" style={{background: '#fff7ed'}}><Clock size={20} color="#f97316" /></div>
            <span className="v-stat-label">Pending {businessType === 'shop' ? 'Orders' : 'Jobs'}</span>
          </div>
          <div className="v-stat-value">0</div>
        </div>
        <div className="v-stat-card">
          <div className="v-stat-header">
            <div className="v-stat-icon" style={{background: '#f0fdf4'}}><IndianRupee size={20} color="#16a34a" /></div>
            <span className="v-stat-label">Earnings Today</span>
          </div>
          <div className="v-stat-value">₹0</div>
        </div>
        <div className="v-stat-card">
          <div className="v-stat-header">
            <div className="v-stat-icon" style={{background: '#f0f9ff'}}><Star size={20} color="#0ea5e9" /></div>
            <span className="v-stat-label">Avg. Rating</span>
          </div>
          <div className="v-stat-value">{stats.rating}</div>
        </div>
      </div>

      <div className="v-chart-card">
         <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem'}}>
            <h3 style={{fontWeight: 800, fontSize: '1.1rem'}}>Performance Analytics</h3>
            <span style={{fontSize: '0.8rem', color: '#64748b', fontWeight: 600}}>Last 7 Days</span>
         </div>
         <div style={{height: '240px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', border: '1px dashed #e2e8f0'}}>
           Detailed analytics will appear once you have orders.
         </div>
      </div>
    </div>
  );

  const handleUpdateProfile = async () => {
    try {
      setIsUpdating(true);
      const phone = vendorData?.phone_number || (user?.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : '9999999999');
      
      if (supabase && vendorData?.id) {
         const { error } = await supabase
           .from('vendors')
           .update({
              name: editFormData.name,
              business_name: editFormData.business_name,
              license_no: editFormData.license_no,
              aadhar_no: editFormData.aadhar_no
           })
           .eq('id', vendorData.id);
           
         if (error) throw error;
      }
      
      setVendorData(prev => ({ ...prev, ...editFormData, phone_number: phone }));
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

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '2rem' }}>
            <div className="v-form-group">
              <label>Full Name</label>
              {isEditingProfile ? 
                <input type="text" className="v-input" value={currentData?.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} /> :
                <div className="v-input" style={{ background: '#f8fafc', color: '#64748b' }}>{currentData?.name || 'Not provided'}</div>
              }
            </div>
            <div className="v-form-group">
              <label>Phone Number (Not Editable)</label>
              <div className="v-input" style={{ background: '#f8fafc', color: '#94a3b8', cursor: 'not-allowed' }}>+91 {vendorData?.phone_number || (user?.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : '9999999999')}</div>
            </div>
            <div className="v-form-group">
              <label>Business / Shop Name</label>
              {isEditingProfile ? 
                <input type="text" className="v-input" value={currentData?.business_name || ''} onChange={e => setEditFormData({...editFormData, business_name: e.target.value})} /> :
                <div className="v-input" style={{ background: '#f8fafc', color: '#64748b' }}>{currentData?.business_name || 'Not provided'}</div>
              }
            </div>
            <div className="v-form-group">
              <label>License / Registration No</label>
              {isEditingProfile ? 
                <input 
                  type="text" 
                  maxLength={16}
                  className="v-input" 
                  value={currentData?.license_no || ''} 
                  onChange={e => {
                    const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                    setEditFormData({...editFormData, license_no: val});
                  }} 
                /> :
                <div className="v-input" style={{ background: '#f8fafc', color: '#64748b' }}>{currentData?.license_no || 'Not applicable'}</div>
              }
            </div>
            <div className="v-form-group" style={{ gridColumn: '1 / -1' }}>
              <label>Aadhar Number</label>
              {isEditingProfile ? 
                <input type="text" className="v-input" maxLength={12} value={currentData?.aadhar_no || ''} onChange={e => setEditFormData({...editFormData, aadhar_no: e.target.value.replace(/\D/g, '')})} /> :
                <div className="v-input" style={{ background: '#f8fafc', color: '#64748b' }}>
                  {currentData?.aadhar_no ? `XXXX-XXXX-${currentData?.aadhar_no.toString().slice(-4)}` : 'Not provided'}
                </div>
              }
            </div>
          </div>
          
          <div style={{ marginTop: '2.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1rem', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
            {isEditingProfile ? (
              <>
                <button className="v-nav-item" style={{ width: 'auto', background: '#f1f5f9', color: '#64748b', fontWeight: 700 }} onClick={() => setIsEditingProfile(false)} disabled={isUpdating}>Cancel</button>
                <button className="auth-submit-btn" style={{ width: 'auto', padding: '12px 32px' }} onClick={handleUpdateProfile} disabled={isUpdating || !editFormData.name || !editFormData.business_name || (editFormData.aadhar_no?.length > 0 && editFormData.aadhar_no?.length !== 12)}>
                  {isUpdating ? 'Saving...' : 'Save Changes'}
                </button>
              </>
            ) : (
              <button className="auth-submit-btn" style={{ width: 'auto', padding: '12px 32px' }} onClick={() => { setEditFormData(vendorData || formData); setIsEditingProfile(true); }}>Edit Information</button>
            )}
          </div>
        </div>
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
      {/* Additional onboarding steps would follow similar beautiful pattern */}
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
            <input type="text" placeholder="12-digit Aadhar No" maxLength={12} className="v-input" value={formData.aadhar_no} onChange={e => setFormData({...formData, aadhar_no: e.target.value.replace(/\D/g, '')})} />
          </div>

          <div className="v-form-group">
            <label>{businessType === 'shop' ? 'Shop Name' : 'Service/Business Name'}</label>
            <input type="text" placeholder={`E.g. ${businessType === 'shop' ? 'Sharma Groceries' : 'QuickFix Plumbing'}`} className="v-input" value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} />
          </div>

          <div className="v-form-group">
            <label>{businessType === 'shop' ? 'Shop License No' : 'Registration No (Optional)'}</label>
            <input 
              type="text" 
              maxLength={16} 
              placeholder="Enter 14-16 digit license number" 
              className="v-input" 
              value={formData.license_no} 
              onChange={e => {
                const val = e.target.value.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
                setFormData({...formData, license_no: val});
              }} 
            />
            {formData.license_no && (formData.license_no.length < 14) && (
              <p style={{color: '#ef4444', fontSize: '0.75rem', marginTop: '4px'}}>Must be 14 to 16 alphanumeric characters</p>
            )}
          </div>

          <button 
             className="auth-submit-btn" 
             style={{marginTop: '1.5rem', width: '100%', padding: '14px', borderRadius: '12px', background: 'var(--v-primary)', color: 'white', fontWeight: 800, fontSize: '1rem'}} 
             onClick={() => setOnboardingSubStep(3)} 
             disabled={
               !formData.name || 
               formData.aadhar_no.length !== 12 || 
               !formData.business_name || 
               (businessType === 'shop' 
                 ? !(formData.license_no.length >= 14 && formData.license_no.length <= 16) 
                 : (formData.license_no.length > 0 && !(formData.license_no.length >= 14 && formData.license_no.length <= 16)))
             }
          >
            Continue
          </button>
        </motion.div>
      )}
      
      {onboardingSubStep > 2 && (
        <div style={{textAlign: 'center', padding: '2rem 1rem'}}>
           <Clock size={48} color="#f97316" style={{margin: '0 auto 1.5rem auto'}} />
           <h3 style={{fontWeight: 800}}>Completing Set-up...</h3>
           <p style={{color: '#64748b', fontSize: '0.9rem'}}>We are finalizing your {businessType} profile. You will be redirected shortly.</p>
           <button onClick={async () => {
              if (supabase && vendorData?.id) {
                 await supabase.from('vendors').update({
                    name: formData.name,
                    business_name: formData.business_name,
                    aadhar_no: formData.aadhar_no,
                    license_no: formData.license_no,
                    category: businessType,
                    profile_completed: true
                 }).eq('id', vendorData.id);
              }
              setVendorData(prev => ({...prev, ...formData, category: businessType, profile_completed: true}));
              
              // Clear cached onboarding data since we are done
              localStorage.removeItem('vOnboardingStep');
              localStorage.removeItem('vBusinessType');
              localStorage.removeItem('vFormData');
              
              localStorage.setItem('vProfileCompleted', 'true');
              
              setAppStatus('dashboard');
           }} style={{marginTop: '2rem', padding: '12px 24px', background: '#0f172a', color: 'white', border: 'none', borderRadius: '12px', fontWeight: 800}}>Continue to Dashboard</button>
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
            
            <div className="v-profile-pill">
               <div className="v-user-info" style={{textAlign: 'right'}}>
                  <span style={{display: 'block', fontSize: '0.75rem', color: '#64748b', fontWeight: 800}}>PARTNER ID #4289</span>
                  <span style={{fontSize: '0.85rem'}}>{vendorData?.business_name || 'My Store'}</span>
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
