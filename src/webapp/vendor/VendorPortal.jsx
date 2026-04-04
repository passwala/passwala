import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  LayoutDashboard, FileText, PackagePlus, IndianRupee, User,
  Store, Wrench, MapPin, CheckCircle, XCircle, 
  Camera, CheckCircle2, LogOut, Package, Wallet, Trash2, ShoppingCart, 
  ArrowLeft, Clock, ShieldCheck
} from 'lucide-react';
import { supabase } from '../../supabase';
import './VendorPortal.css';

const VendorPortal = ({ user, onLogout }) => {
  const [appStatus, setAppStatus] = useState('loading'); // loading, onboarding, dashboard, pending
  const [vendorData, setVendorData] = useState(null);
  
  // Image states
  const [shopImage, setShopImage] = useState(null);
  const [idImage, setIdImage] = useState(null);
  const shopInputRef = React.useRef(null);
  const idInputRef = React.useRef(null);
  // Onboarding State
  const [onboardingSubStep, setOnboardingSubStep] = useState(1); // 1: Type, 2: Details, 3: Upload, 4: Bank
  const [businessType, setBusinessType] = useState('shop'); // shop or service
  const [formData, setFormData] = useState({ name: '', business_name: '', address: '' });
  const [bankData, setBankData] = useState({ account_no: '', ifsc: '', holder_name: '' });
  const [stats, setStats] = useState({ orders: 0, earnings: 0, pending: 0, rating: 0 });
  const [activeTab, setActiveTab] = useState('dashboard'); // dashboard, orders, products, earnings, profile

  useEffect(() => {
    checkVendorStatus();
  }, [user]);

  const checkVendorStatus = async () => {
    try {
      if (!user) return;
      
      const phone = user && typeof user === 'object' && user.phoneNumber 
          ? user.phoneNumber.replace(/\D/g, '').slice(-10) 
          : (typeof user === 'string' ? user : '9999999999');

      console.log('🔍 Syncing Vendor:', phone);

      if (supabase) {
        const { data, error } = await supabase
          .from('vendors')
          .select('*')
          .eq('phone_number', phone)
          .maybeSingle();

        if (error) throw error;

        if (data) {
          setVendorData(data);
          if (data.profile_completed) {
            setAppStatus('dashboard');
          } else {
            setAppStatus('onboarding');
          }
        } else {
          // New vendor - Create entry
          const { error: insError } = await supabase.from('vendors').insert([{ 
            phone_number: phone,
            profile_completed: false
          }]);
          if (insError) throw insError;
          setAppStatus('onboarding');
        }
      }
    } catch (error) {
      console.error(error);
      const msg = error?.message || 'Failed to connect to Supabase';
      toast.error(`Sync Error: ${msg}`, { duration: 5000 });
      setAppStatus('onboarding');
    }
  };

  const phoneToQuery = user && typeof user === 'object' && user.phoneNumber 
      ? user.phoneNumber.replace(/\D/g, '').slice(-10) 
      : (typeof user === 'string' ? user : '9999999999');

  const handleOnboardingSubmit = async () => {
    try {
      if (supabase) {
        const { error } = await supabase
          .from('vendors')
          .update({
            name: formData.name,
            business_name: formData.business_name,
            address: formData.address,
            category: businessType,
            account_no: bankData.account_no,
            ifsc: bankData.ifsc,
            holder_name: bankData.holder_name,
            profile_completed: true
          })
          .eq('phone_number', phoneToQuery);
        
        if (error) throw error;
      }
      
      toast.success('Application submitted for approval! ✅');
      setAppStatus('pending'); 
    } catch (error) {
      console.error(error);
      toast.error('Failed to submit application');
    }
  };

  const getGreeting = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "Good night";
    if (hour < 12) return "Good morning";
    if (hour < 17) return "Good afternoon";
    if (hour < 21) return "Good evening";
    return "Good night";
  };

  const getGreetingEmoji = () => {
    const hour = new Date().getHours();
    if (hour < 5) return "🌙";
    if (hour < 12) return "☀️";
    if (hour < 17) return "🌤️";
    if (hour < 21) return "🌅";
    return "🌙";
  };

  const handleDeleteAccount = () => {
    toast((t) => (
      <div style={{ padding: '8px' }}>
        <p style={{ fontWeight: 700, marginBottom: '1rem', color: '#111827' }}>Are you absolutely sure?</p>
        <p style={{ fontSize: '0.85rem', color: '#6b7280', marginBottom: '1.5rem' }}>This action will permanently remove your business and all your services from Passwala.</p>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button 
            onClick={async () => {
              toast.dismiss(t.id);
              try {
                if (vendorData?.id) {
                   const { error } = await supabase.from('vendors').delete().eq('id', vendorData.id);
                   if (error) throw error;
                   toast.success('Your account has been deleted.');
                   setTimeout(() => onLogout(), 2000);
                }
              } catch (err) {
                console.error(err);
                toast.error('Failed to delete account. Please contact support.');
              }
            }}
            style={{ flex: 1, padding: '8px', background: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem' }}
          >
            Yes, Delete
          </button>
          <button 
            onClick={() => toast.dismiss(t.id)}
            style={{ flex: 1, padding: '8px', background: '#f3f4f6', color: '#374151', border: 'none', borderRadius: '8px', fontWeight: 700, fontSize: '0.8rem' }}
          >
            Cancel
          </button>
        </div>
      </div>
    ), { duration: 6000, position: 'bottom-center' });
  };

  const renderOnboarding = () => (
    <motion.div className="onboarding-screen" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }}>
      {onboardingSubStep === 1 && (
        <>
          <div className="onboarding-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>I am a...</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem', margin: '0.5rem 0 0 0' }}>Select your business profile</p>
          </div>

          <div className="type-selection" style={{ display: 'grid', gap: '1rem' }}>
            <div className={`type-card ${businessType === 'shop' ? 'active' : ''}`} onClick={() => setBusinessType('shop')} 
                 style={{ flexDirection: 'column', textAlign: 'center', padding: '1.5rem' }}>
              <div className="type-icon" style={{ background: '#fff7ed', width: '60px', height: '60px', margin: '0 auto' }}>
                <ShoppingCart size={32} color="var(--primary-color)" />
              </div>
              <h4 style={{ margin: '1rem 0 0.25rem 0', fontWeight: 800 }}>Shop Owner</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Groceries, essentials, FMCG products</span>
            </div>

            <div className={`type-card ${businessType === 'service' ? 'active' : ''}`} onClick={() => setBusinessType('service')}
                 style={{ flexDirection: 'column', textAlign: 'center', padding: '1.5rem' }}>
              <div className="type-icon" style={{ background: '#f0f9ff', width: '60px', height: '60px', margin: '0 auto' }}>
                <Wrench size={32} color="#0284c7" />
              </div>
              <h4 style={{ margin: '1rem 0 0.25rem 0', fontWeight: 800 }}>Service Provider</h4>
              <span style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Plumber, electrician, cleaner, etc.</span>
            </div>
          </div>

          <button className="auth-submit-btn" style={{ marginTop: '2.5rem' }} onClick={() => setOnboardingSubStep(2)}>Continue</button>
        </>
      )}

      {onboardingSubStep === 2 && (
        <>
          <div className="onboarding-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <button className="back-btn-ghost" onClick={() => setOnboardingSubStep(1)} style={{ marginBottom: '1.5rem', padding: 0 }}>
              <ArrowLeft size={24} color="var(--text-primary)" />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Business details</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Tell us about your store</p>
          </div>

          <div className="onboarding-form">
            <div className="detail-group">
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Your full name</label>
              <input type="text" placeholder="Enter full name" className="auth-input" style={{ width: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} 
                value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>

            <div className="detail-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Business name</label>
              <input type="text" placeholder="Enter business name" className="auth-input" style={{ width: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} 
                value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} />
            </div>

            <div className="detail-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Address (auto GPS)</label>
              <input type="text" placeholder="Enter shop address" className="auth-input" style={{ width: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} 
                value={formData.address} onChange={e => setFormData({...formData, address: e.target.value})} />
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', color: '#10b981', fontSize: '0.85rem', fontWeight: 700 }}>
                📍 GPS location <span style={{ background: '#dcfce7', padding: '2px 6px', borderRadius: '4px' }}>detected</span>
              </div>
            </div>

            <button className="auth-submit-btn" style={{ marginTop: '2.5rem' }} onClick={() => {
              if (!formData.name || !formData.business_name || !formData.address) {
                toast.error('Please fill all details');
                return;
              }
              setOnboardingSubStep(3);
            }}>Continue</button>
          </div>
        </>
      )}

      {onboardingSubStep === 3 && (
        <>
          <div className="onboarding-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <button className="back-btn-ghost" onClick={() => setOnboardingSubStep(2)} style={{ marginBottom: '1.5rem', padding: 0 }}>
              <ArrowLeft size={24} color="var(--text-primary)" />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Upload documents</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>GST or ID proof required</p>
          </div>

          <div className="onboarding-form">
            <input type="file" ref={shopInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => {
              const file = e.target.files[0];
              if (file) setShopImage(URL.createObjectURL(file));
            }} />
            <input type="file" ref={idInputRef} style={{ display: 'none' }} accept="image/*" onChange={(e) => {
              const file = e.target.files[0];
              if (file) setIdImage(URL.createObjectURL(file));
            }} />

            <div className="upload-group">
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Shop photo</label>
              <div className="dashed-upload-box" style={{ borderColor: 'var(--primary-color)', cursor: 'pointer', background: 'white', position: 'relative', overflow: 'hidden' }} onClick={() => shopInputRef.current?.click()}>
                {shopImage ? (
                  <img src={shopImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="Shop Preview" />
                ) : (
                  <>
                    <Camera size={32} color="var(--primary-color)" />
                    <span style={{ color: 'var(--primary-color)', fontWeight: 700, marginTop: '1rem' }}>Tap to upload shop photo</span>
                  </>
                )}
              </div>
            </div>

            <div className="upload-group" style={{ marginTop: '2rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>ID proof (Aadhaar / PAN)</label>
              <div className="dashed-upload-box" style={{ borderColor: '#cbd5e1', cursor: 'pointer', background: 'white', position: 'relative', overflow: 'hidden' }} onClick={() => idInputRef.current?.click()}>
                {idImage ? (
                  <img src={idImage} style={{ width: '100%', height: '100%', objectFit: 'cover' }} alt="ID Preview" />
                ) : (
                  <>
                    <FileText size={32} color="#94a3b8" />
                    <span style={{ color: '#94a3b8', fontWeight: 700, marginTop: '1rem' }}>Tap to upload ID proof</span>
                  </>
                )}
              </div>
            </div>

            <button className="auth-submit-btn" style={{ marginTop: '3rem' }} onClick={() => {
              if (!shopImage || !idImage) {
                toast.error('Please upload both documents');
                return;
              }
              setOnboardingSubStep(4);
            }}>Next: Bank Details</button>
          </div>
        </>
      )}

      {onboardingSubStep === 4 && (
        <>
          <div className="onboarding-header" style={{ textAlign: 'left', marginBottom: '2rem' }}>
            <button className="back-btn-ghost" onClick={() => setOnboardingSubStep(3)} style={{ marginBottom: '1.5rem', padding: 0 }}>
              <ArrowLeft size={24} color="var(--text-primary)" />
            </button>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800 }}>Bank details</h2>
            <p style={{ color: 'var(--text-secondary)', fontSize: '1rem' }}>Required for your payouts</p>
          </div>

          <div className="onboarding-form">
            <div className="detail-group">
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Account Holder Name</label>
              <input type="text" placeholder="Enter name as per bank" className="auth-input" style={{ width: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} 
                value={bankData.holder_name} onChange={e => setBankData({...bankData, holder_name: e.target.value})} />
            </div>

            <div className="detail-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>Account Number</label>
              <input type="password" placeholder="Enter bank account number" className="auth-input" style={{ width: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} 
                value={bankData.account_no} onChange={e => setBankData({...bankData, account_no: e.target.value})} />
            </div>

            <div className="detail-group" style={{ marginTop: '1.5rem' }}>
              <label style={{ fontSize: '0.9rem', fontWeight: 700, color: 'var(--text-secondary)', marginBottom: '0.5rem', display: 'block' }}>IFSC Code</label>
              <input type="text" placeholder="e.g. SBIN0001234" className="auth-input" style={{ width: '100%', background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px' }} 
                value={bankData.ifsc} onChange={e => setBankData({...bankData, ifsc: e.target.value.toUpperCase()})} />
            </div>

            <div style={{ marginTop: '2rem', padding: '1rem', background: '#f8fafc', borderRadius: '12px', display: 'flex', gap: '0.75rem', alignItems: 'flex-start' }}>
              <ShieldCheck size={20} color="#64748b" style={{ marginTop: '2px' }} />
              <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>Your banking data is encrypted and used only for processing your earnings.</p>
            </div>

            <button className="auth-submit-btn" style={{ marginTop: '2.5rem' }} onClick={() => {
              if (!bankData.account_no || !bankData.ifsc || !bankData.holder_name) {
                toast.error('Please fill all bank details');
                return;
              }
              handleOnboardingSubmit();
            }}>Finish Registration</button>
          </div>
        </>
      )}
    </motion.div>
  );

  const renderPendingScreen = () => (
    <motion.div className="onboarding-screen" initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ padding: '4rem 2rem', textAlign: 'center' }}>
      <div style={{ width: '80px', height: '80px', background: '#fff7ed', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem auto' }}>
        <Clock size={40} color="#f97316" />
      </div>
      <h2 style={{ fontSize: '1.75rem', fontWeight: 900, marginBottom: '1rem', letterSpacing: '-0.5px' }}>Application Pending</h2>
      <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', lineHeight: 1.6, marginBottom: '3rem' }}>
        Thank you for joining Passwala! Our team is verifying your documents. This usually takes 2-4 hours.
      </p>
      
      <div style={{ textAlign: 'left', background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--border-color)', marginBottom: '2.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#dcfce7', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <CheckCircle size={14} color="#10b981" />
          </div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-primary)', fontWeight: 600 }}>Bank details submitted</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1rem' }}>
          <div className="loader-ring" style={{ width: '18px', height: '18px', border: '2px solid #e2e8f0', borderTopColor: 'var(--primary-color)' }}></div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Verifying documents...</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', opacity: 0.5 }}>
          <div style={{ width: '20px', height: '20px', borderRadius: '50%', background: '#f1f5f9' }}></div>
          <span style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', fontWeight: 600 }}>Background check</span>
        </div>
      </div>

      <button className="auth-submit-btn" onClick={() => {
        toast.promise(checkVendorStatus(), {
          loading: 'Checking status...',
          success: 'Profile updated!',
          error: 'Still pending approval'
        });
      }} style={{ marginBottom: '1rem' }}>
        Refresh Status
      </button>

      <button className="auth-submit-btn" onClick={onLogout} style={{ background: 'white', color: 'var(--text-primary)', border: '1.5px solid var(--border-color)', boxShadow: 'none' }}>
        Sign out for now
      </button>
    </motion.div>
  );

  const renderDashboard = () => (
    <motion.div className="dashboard-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <div>
          <h2 style={{ fontSize: '1.25rem', fontWeight: 800, margin: 0 }}>
            {getGreeting()}, {vendorData?.name || 'Partner'} {getGreetingEmoji()}
          </h2>
          <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', margin: 0 }}>
            {vendorData?.business_name || 'Your Store'} · {vendorData?.address?.split(',')[0]}
          </p>
        </div>
        <div className="p-box" style={{ width: '45px', height: '45px', fontSize: '1.1rem' }}>
          {vendorData?.name?.charAt(0) || 'P'}
        </div>
      </header>

      <div style={{ background: '#f0fdf4', border: '1px solid #dcfce7', borderRadius: '14px', padding: '1rem', display: 'flex', gap: '0.75rem', alignItems: 'center', marginBottom: '1.5rem' }}>
        <CheckCircle2 size={18} color="#15803d" style={{ flexShrink: 0 }} />
        <div style={{ flex: 1, fontSize: '0.85rem', fontWeight: 600, color: '#166534' }}>
          Your store is <span style={{ fontWeight: 800 }}>Live</span> — accepting orders
        </div>
        <span style={{ background: '#f3e8ff', color: '#7e22ce', padding: '2px 8px', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 800 }}>Featured</span>
      </div>

      <div className="stats-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem' }}>
        <div className="stat-card" style={{ padding: '1.25rem' }}>
          <div className="stat-header" style={{ fontSize: '0.75rem' }}>Today's Orders</div>
          <div className="stat-value" style={{ color: '#f97316', fontSize: '1.5rem' }}>{stats.orders}</div>
        </div>
        <div className="stat-card" style={{ padding: '1.25rem' }}>
          <div className="stat-header" style={{ fontSize: '0.75rem' }}>Earnings</div>
          <div className="stat-value" style={{ color: '#10b981', fontSize: '1.5rem' }}>₹{stats.earnings}</div>
        </div>
      </div>

      <h3 className="section-title">ACTIVE TASKS</h3>
      <div style={{ padding: '2.5rem 1.5rem', textAlign: 'center', background: 'white', borderRadius: '24px', border: '1px dashed #e2e8f0' }}>
          <Package size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#94a3b8', fontWeight: 700, margin: 0 }}>No orders to process</p>
      </div>
    </motion.div>
  );

  const renderOrders = () => (
    <motion.div className="dashboard-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="back-btn-ghost" onClick={() => setActiveTab('dashboard')} style={{ padding: 0 }}>
          <ArrowLeft size={24} color="var(--text-primary)" />
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Orders</h2>
      </div>
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: 'white', borderRadius: '24px', border: '1px dashed #e2e8f0' }}>
          <FileText size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#94a3b8', fontWeight: 700, margin: 0 }}>Your order history will appear here</p>
      </div>
    </motion.div>
  );

  const renderProducts = () => (
    <motion.div className="dashboard-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="back-btn-ghost" onClick={() => setActiveTab('dashboard')} style={{ padding: 0 }}>
            <ArrowLeft size={24} color="var(--text-primary)" />
          </button>
          <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Products</h2>
        </div>
        <button className="back-btn-ghost" style={{ padding: '8px 12px', background: 'white', border: '1px solid #e2e8f0', borderRadius: '8px', fontWeight: 700, fontSize: '0.85rem', height: 'auto', width: 'auto' }}>+ Add</button>
      </div>
      <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: 'white', borderRadius: '24px', border: '1px dashed #e2e8f0' }}>
          <PackagePlus size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
          <p style={{ color: '#94a3b8', fontWeight: 700, margin: 0 }}>Add your first item to start selling</p>
      </div>
    </motion.div>
  );

  const renderEarnings = () => (
    <motion.div className="dashboard-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="back-btn-ghost" onClick={() => setActiveTab('dashboard')} style={{ padding: 0 }}>
          <ArrowLeft size={24} color="var(--text-primary)" />
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Earnings</h2>
      </div>
      <div className="stat-card" style={{ background: 'var(--primary-gradient)', color: 'white', padding: '2rem', marginBottom: '1.5rem' }}>
          <span style={{ fontSize: '0.9rem', opacity: 0.9, fontWeight: 700 }}>Total Balance</span>
          <h2 style={{ fontSize: '2.5rem', margin: '0.5rem 0', fontWeight: 900 }}>₹0.00</h2>
          <button style={{ width: '100%', padding: '12px', borderRadius: '12px', border: 'none', background: 'white', color: 'var(--primary-color)', fontWeight: 800, fontSize: '0.9rem' }}>Withdraw Funds</button>
      </div>
      <div className="order-card" style={{ padding: '1rem' }}>
          <p style={{ color: '#94a3b8', fontWeight: 700, textAlign: 'center', margin: '1rem 0' }}>No transactions recorded yet</p>
      </div>
    </motion.div>
  );

  const renderProfile = () => (
    <motion.div className="dashboard-content" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1.5rem' }}>
        <button className="back-btn-ghost" onClick={() => setActiveTab('dashboard')} style={{ padding: 0 }}>
          <ArrowLeft size={24} color="var(--text-primary)" />
        </button>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 800, margin: 0 }}>Profile</h2>
      </div>
      <div className="order-card" style={{ padding: '1.5rem', textAlign: 'center' }}>
          <div className="p-box" style={{ width: '70px', height: '70px', fontSize: '1.5rem', margin: '0 auto 1rem auto' }}>{vendorData?.name?.charAt(0) || 'P'}</div>
          <h3 style={{ margin: 0, fontWeight: 800 }}>{vendorData?.name}</h3>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 1rem 0' }}>{vendorData?.phoneNumber || phoneToQuery}</p>
          <div style={{ background: '#f8fafc', padding: '1rem', borderRadius: '12px', textAlign: 'left' }}>
              <div style={{ marginBottom: '0.75rem' }}><span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>BUSINESS</span><br/><span style={{ fontWeight: 700 }}>{vendorData?.business_name}</span></div>
              <div><span style={{ color: '#94a3b8', fontSize: '0.8rem', fontWeight: 700 }}>ADDRESS</span><br/><span style={{ fontWeight: 700 }}>{vendorData?.address}</span></div>
          </div>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.75rem', marginTop: '1.5rem' }}>
        <button className="auth-submit-btn" style={{ background: '#fef2f2', color: '#ef4444', border: '1px solid #fee2e2', boxShadow: 'none' }} onClick={onLogout}>
          <LogOut size={18} style={{ marginRight: '8px' }} /> Log out
        </button>
        <button className="auth-submit-btn" style={{ background: '#7f1d1d', color: 'white' }} onClick={handleDeleteAccount}>
          <Trash2 size={18} style={{ marginRight: '8px' }} /> Delete
        </button>
      </div>
    </motion.div>
  );

  if (appStatus === 'loading') {
    return (
      <div className="loading-screen">
        <div className="loader-ring" style={{ width: 40, height: 40, borderTopColor: 'var(--primary-color)' }}></div>
        <p style={{ fontWeight: 600 }}>Syncing your business...</p>
      </div>
    );
  }

  return (
    <div className="vendor-portal">
      {appStatus === 'dashboard' && (
        <nav className="vendor-nav">
          <div className="brand-badge-v2">
            <div className="brand-logo-square">P</div>
            <span>Passwala</span>
          </div>
          <button className="logout-icon-btn" onClick={onLogout} title="Sign Out">
            <LogOut size={20} />
          </button>
        </nav>
      )}

      <main className="portal-main-area">
        {appStatus === 'onboarding' ? renderOnboarding() : (
          appStatus === 'pending' ? renderPendingScreen() : (
            activeTab === 'dashboard' ? renderDashboard() :
            activeTab === 'orders' ? renderOrders() :
            activeTab === 'products' ? renderProducts() :
            activeTab === 'earnings' ? renderEarnings() :
            activeTab === 'profile' ? renderProfile() : renderDashboard()
          )
        )}
      </main>

      {appStatus === 'dashboard' && (
        <div className="bottom-nav">
          <div className={`nav-item ${activeTab === 'dashboard' ? 'active' : ''}`} onClick={() => setActiveTab('dashboard')}>
            <LayoutDashboard size={21} /><span>Dashboard</span>
          </div>
          <div className={`nav-item ${activeTab === 'orders' ? 'active' : ''}`} onClick={() => setActiveTab('orders')}>
            <FileText size={21} /><span>Orders</span>
          </div>
          <div className={`nav-item ${activeTab === 'products' ? 'active' : ''}`} onClick={() => setActiveTab('products')}>
            <PackagePlus size={21} /><span>Items</span>
          </div>
          <div className={`nav-item ${activeTab === 'earnings' ? 'active' : ''}`} onClick={() => setActiveTab('earnings')}>
            <IndianRupee size={21} /><span>Earnings</span>
          </div>
          <div className={`nav-item ${activeTab === 'profile' ? 'active' : ''}`} onClick={() => setActiveTab('profile')}>
            <User size={21} /><span>Profile</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default VendorPortal;
