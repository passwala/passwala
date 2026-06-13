import React, { useState, useEffect } from 'react';
// eslint-disable-next-line no-unused-vars
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
  Settings,
  Layers,
  Calendar,
  Ticket
} from 'lucide-react';
import { supabase } from '../supabase';
import { auth } from '../firebase';
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
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, ResponsiveContainer } from 'recharts';

const formatAadhar = (val) => {
  const cleanVal = val.replace(/\D/g, '').slice(0, 12);
  const parts = [];
  for (let i = 0; i < cleanVal.length; i += 4) {
    parts.push(cleanVal.slice(i, i + 4));
  }
  return parts.join(' ');
};

const VendorPortal = ({ user, onLogout }) => {
  const getAuthToken = async () => {
    try {
      const currentUser = auth?.currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
    } catch (e) {
      console.warn("Failed to get Firebase ID token:", e);
    }
    const uid = user?.uid || user?.id || 'mock_user_123';
    return `mock_session_token_${uid}`;
  };

  const [appStatus, setAppStatus] = useState('loading'); // loading, onboarding, dashboard, pending
  const [vendorData, setVendorData] = useState(null);
  const [activeTab, setActiveTab] = useState(() => localStorage.getItem('vendorActiveTab') || 'dashboard'); 
  const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);
  const mainScrollRef = React.useRef(null);

  useEffect(() => {
    window.scrollTo(0, 0);
    if (mainScrollRef.current) {
      mainScrollRef.current.scrollTo(0, 0);
    }
  }, [activeTab]);
  
  // Onboarding State
  const [onboardingSubStep, setOnboardingSubStep] = useState(() => parseInt(localStorage.getItem('vOnboardingStep') || '1')); 
  const [businessType, setBusinessType] = useState(() => localStorage.getItem('vBusinessType') || 'shop'); 
  const [formData, setFormData] = useState(() => {
    const saved = localStorage.getItem('vFormData');
    return saved ? JSON.parse(saved) : { name: '', aadhar_no: '', business_name: '', license_no: '', address: '', lat: '', lng: '' };
  });
  
  useEffect(() => {
    localStorage.setItem('vOnboardingStep', onboardingSubStep);
    localStorage.setItem('vBusinessType', businessType);
    localStorage.setItem('vFormData', JSON.stringify(formData));
  }, [onboardingSubStep, businessType, formData]);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editFormData, setEditFormData] = useState({});
  const [isUpdating, setIsUpdating] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [showSuccessPop, setShowSuccessPop] = useState(false);
  const [storeId, setStoreId] = useState(null);
  const [stats, setStats] = useState({ 
    orders: 0, 
    earnings: 0, 
    pending: 0, 
    rating: 4.8,
    weeklyData: [
      { name: 'Mon', revenue: 0 },
      { name: 'Tue', revenue: 0 },
      { name: 'Wed', revenue: 0 },
      { name: 'Thu', revenue: 0 },
      { name: 'Fri', revenue: 0 },
      { name: 'Sat', revenue: 0 },
      { name: 'Sun', revenue: 0 }
    ]
  });
  const fileInputRef = React.useRef(null);
  const [profileImage, setProfileImage] = useState(localStorage.getItem('vProfileImage') || null);

  // ⚡ REAL-TIME STATS ENGINE
  const fetchLiveStats = async () => {
    if (!supabase) return;
    try {
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const phone = vendorData?.phone || (user?.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : null);
      if (!phone) {
        return;
      }

      let foundStoreId = vendorData?.id;
      if (!foundStoreId) {
        if (businessType === 'service') {
          const { data: prov } = await supabase.from('service_providers').select('id').eq('phone', phone).maybeSingle();
          if (prov) {
            foundStoreId = prov.id;
          } else {
            const { data: vend } = await supabase.from('vendors').select('id').eq('phone', phone).maybeSingle();
            if (vend) foundStoreId = vend.id;
          }
        } else {
          const { data: vend } = await supabase.from('vendors').select('id').eq('phone', phone).maybeSingle();
          if (vend) {
            foundStoreId = vend.id;
          } else {
            const { data: prov } = await supabase.from('service_providers').select('id').eq('phone', phone).maybeSingle();
            if (prov) foundStoreId = prov.id;
          }
        }
      }

      if (!foundStoreId) {
        return;
      }

      setStoreId(foundStoreId);

      let ordersList = [];
      let pendingCount = 0;
      let totalEarnings = 0;
      let deliveredCount = 0;

      if (businessType === 'event') {
        const userId = vendorData?.user_id || user?.id;
        const { data: bookings, error: bookingsError } = await supabase
          .from('event_bookings')
          .select(`
            *,
            events(created_by)
          `);
        
        if (!bookingsError && bookings) {
          const userBookings = bookings.filter(b => b.events?.created_by === userId);
          ordersList = userBookings.map(b => ({
            ...b,
            created_at: b.created_at,
            total_amount: b.total_amount,
            status: b.status
          }));
          
          // Total active tickets sold (CONFIRMED + COMPLETED)
          const activeBookings = ordersList.filter(o => o.status === 'CONFIRMED' || o.status === 'COMPLETED');
          pendingCount = activeBookings.length;
          
          // Total checked-in attendees (all COMPLETED bookings)
          const checkedInAll = ordersList.filter(o => o.status === 'COMPLETED');
          deliveredCount = checkedInAll.length;

          // Total revenue from all non-CANCELLED bookings
          totalEarnings = activeBookings.reduce((sum, o) => sum + (o.total_amount || 0), 0);
        }
      } else {
        const { data: vendorOrders } = await supabase.from('orders').select('*').eq('store_id', foundStoreId);
        ordersList = vendorOrders || [];
        const pendingList = ordersList.filter(o => o.status === 'PLACED' || o.status === 'PREPARING');
        pendingCount = pendingList.length;
        const deliveredToday = ordersList.filter(o => o.status === 'DELIVERED' && new Date(o.created_at) >= today);
        deliveredCount = deliveredToday.length;
        totalEarnings = deliveredToday.reduce((sum, o) => sum + (o.total_amount || 0), 0);
      }

      // Fetch Real Rating
      let realRating = 4.8;
      if (businessType === 'service') {
        const { data: provData } = await supabase
          .from('service_providers')
          .select('rating')
          .eq('id', foundStoreId)
          .maybeSingle();
        if (provData && typeof provData.rating === 'number' && provData.rating > 0) {
          realRating = provData.rating;
        }
      } else {
        const { data: storeData } = await supabase
          .from('stores')
          .select('rating')
          .or(`vendor_id.eq.${foundStoreId},id.eq.${foundStoreId}`)
          .maybeSingle();
        if (storeData && typeof storeData.rating === 'number' && storeData.rating > 0) {
          realRating = storeData.rating;
        }
      }

      // Compute weekly chart data
      const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
      const weeklyRevenueMap = {};
      const chartDataList = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const dayName = weekdays[d.getDay()];
        const dateStr = d.toDateString();
        weeklyRevenueMap[dateStr] = { name: dayName, revenue: 0 };
        chartDataList.push(dateStr);
      }

      ordersList.forEach(order => {
        const isCompleted = businessType === 'event' ? order.status !== 'CANCELLED' : order.status === 'DELIVERED';
        if (isCompleted && order.created_at) {
          const orderDate = new Date(order.created_at).toDateString();
          if (weeklyRevenueMap[orderDate]) {
            weeklyRevenueMap[orderDate].revenue += parseFloat(order.total_amount || 0);
          }
        }
      });

      const weeklyData = chartDataList.map(dateStr => ({
        name: weeklyRevenueMap[dateStr].name,
        revenue: Math.round(weeklyRevenueMap[dateStr].revenue)
      }));

      setStats({
        pending: pendingCount,
        earnings: totalEarnings,
        orders: deliveredCount,
        rating: realRating,
        weeklyData
      });
    } catch (err) {
      console.error("Stats fetch failed:", err);
    }
  };

  useEffect(() => {
    if (appStatus === 'dashboard') {
      fetchLiveStats();

      const playNotificationBeep = () => {
        try {
          const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
          const playBeep = (freq, duration, delay) => {
            const osc = audioCtx.createOscillator();
            const gainNode = audioCtx.createGain();
            osc.connect(gainNode);
            gainNode.connect(audioCtx.destination);
            osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
            gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
            gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
            osc.start(audioCtx.currentTime + delay);
            osc.stop(audioCtx.currentTime + delay + duration);
          };
          playBeep(880, 0.15, 0);
          playBeep(1100, 0.2, 0.2);
        } catch (err) {
          console.warn("AudioContext beep failed:", err);
        }
      };

      const channel = supabase
        .channel('vendor-dashboard-realtime')
        .on('postgres_changes', { 
          event: '*', 
          schema: 'public', 
          table: 'orders' 
        }, (payload) => {
          fetchLiveStats();
          if (payload.eventType === 'INSERT') {
            toast.success(businessType === 'service' ? "New Booking Received!" : "New Order Received!", { icon: '🔔' });
            playNotificationBeep();
          }
        })
        // ✅ Watch event_bookings — updates "Checked In Today" live when QR is scanned
        .on('postgres_changes', {
          event: 'UPDATE',
          schema: 'public',
          table: 'event_bookings'
        }, (payload) => {
          if (payload.new?.status === 'COMPLETED') {
            fetchLiveStats(); // refresh stats immediately
          }
        })
        .subscribe();

      return () => {
        supabase.removeChannel(channel);
      };
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [appStatus, vendorData?.id, businessType]);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
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
        // Query users table first to get user role
        const { data: userData } = await supabase
          .from('users')
          .select('role')
          .eq('phone', phone)
          .maybeSingle();

        // First check service_providers table (prioritize service providers)
        let { data, error } = await supabase
          .from('service_providers')
          .select('*')
          .eq('phone', phone)
          .maybeSingle();

        const EVENT_CATEGORIES = [
          "Music & Concerts",
          "Comedy & Theatre",
          "Workshops & Classes",
          "Parties & Nightlife",
          "Festivals & Fairs",
          "Sports & Fitness",
          "Corporate & Business",
          "Other Events"
        ];

        let detectedType = (userData?.role === 'EVENT_ORGANIZER' || (data && EVENT_CATEGORIES.includes(data.category))) ? 'event' : 'service';

        // Auto-heal/sync user role if there's a mismatch
        if (data && EVENT_CATEGORIES.includes(data.category) && userData && userData.role !== 'EVENT_ORGANIZER') {
          await supabase.from('users').update({ role: 'EVENT_ORGANIZER' }).eq('phone', phone);
        }

        // If not found in service_providers, check vendors
        if (!data && !error) {
          const { data: vData, error: vError } = await supabase
            .from('vendors')
            .select('*')
            .eq('phone', phone)
            .maybeSingle();
          if (vData) {
            data = vData;
            detectedType = 'shop';
            const { data: storeData } = await supabase
              .from('stores')
              .select('lat, lng')
              .eq('vendor_id', vData.id)
              .maybeSingle();
            if (storeData) {
              data.lat = storeData.lat;
              data.lng = storeData.lng;
            }
          }
          error = vError;
        } else if (data) {
          detectedType = (userData?.role === 'EVENT_ORGANIZER' || EVENT_CATEGORIES.includes(data.category)) ? 'event' : 'service';
        }

        if (error && !isLocallyCompleted) throw error;

        if (data) {
          setVendorData(data);
          setBusinessType(detectedType);
          if (data.user_id) {
            try {
              const { data: userData } = await supabase
                .from('users')
                .select('photo_url')
                .eq('id', data.user_id)
                .maybeSingle();
              if (userData?.photo_url) {
                setProfileImage(userData.photo_url);
                localStorage.setItem('vProfileImage', userData.photo_url);
              }
            } catch (pErr) {
              console.warn("Error fetching user photo:", pErr);
            }
          }
          if (data.profile_completed || isLocallyCompleted) {
            setAppStatus('dashboard');
          } else {
            setAppStatus('onboarding');
          }
        } else if (isLocallyCompleted) {
          const savedForm = JSON.parse(localStorage.getItem('vFormData') || '{}');
          setVendorData({
            id: localStorage.getItem('vPartnerId') || savedForm?.id || '4289',
            business_name: localStorage.getItem('vBusinessName') || savedForm?.business_name || 'My Store',
            name: localStorage.getItem('vOwnerName') || savedForm?.name || 'Partner',
            address: localStorage.getItem('vAddress') || savedForm?.address || 'Local Area',
            license_no: savedForm?.license_no || 'Pending Verification',
            phone: phone,
            profile_completed: true
          });
          setBusinessType(localStorage.getItem('vBusinessType') || 'shop');
          setAppStatus('dashboard');
        } else {
          setAppStatus('onboarding');
        }
      } else if (isLocallyCompleted) {
        const savedForm = JSON.parse(localStorage.getItem('vFormData') || '{}');
        setVendorData({
          id: localStorage.getItem('vPartnerId') || savedForm?.id || '4289',
          business_name: localStorage.getItem('vBusinessName') || savedForm?.business_name || 'My Store',
          name: localStorage.getItem('vOwnerName') || savedForm?.name || 'Partner',
          address: localStorage.getItem('vAddress') || savedForm?.address || 'Local Area',
          license_no: savedForm?.license_no || 'Pending Verification',
          phone: phone,
          profile_completed: true
        });
        setBusinessType(localStorage.getItem('vBusinessType') || 'shop');
        setAppStatus('dashboard');
      } else {
        setAppStatus('onboarding');
      }
    } catch (error) {
      console.error(error);
      const isLocallyCompleted = localStorage.getItem('vProfileCompleted') === 'true';
      if (isLocallyCompleted) {
        const savedForm = JSON.parse(localStorage.getItem('vFormData') || '{}');
        setVendorData({
          id: localStorage.getItem('vPartnerId') || savedForm?.id || '4289',
          business_name: localStorage.getItem('vBusinessName') || savedForm?.business_name || 'My Store',
          name: localStorage.getItem('vOwnerName') || savedForm?.name || 'Partner',
          address: localStorage.getItem('vAddress') || savedForm?.address || 'Local Area',
          license_no: savedForm?.license_no || 'Pending Verification',
          phone: user?.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : '9999999999',
          profile_completed: true
        });
        setBusinessType(localStorage.getItem('vBusinessType') || 'shop');
        setAppStatus('dashboard');
      } else {
        setAppStatus('onboarding');
      }
    }
  };

  const menuItems = [
    { id: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
    { id: 'profile', label: 'My Profile', icon: User },
    { id: 'inventory', label: businessType === 'shop' ? 'Products' : businessType === 'event' ? 'Events' : 'Services', icon: businessType === 'shop' ? Package : businessType === 'event' ? Calendar : Wrench },
    { id: 'orders', label: businessType === 'shop' ? 'Orders' : businessType === 'event' ? 'Ticket Sales' : 'Bookings', icon: FileText },
    { id: 'earnings', label: 'Earnings', icon: IndianRupee },
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
          transition={{ duration: 0.5, ease: "easeOut" }}
        >
          <div className="v-hero-badge" style={{ background: 'rgba(255,255,255,0.15)', border: 'none', color: 'white' }}>
            <div className="v-hero-badge-icon" style={{ background: 'rgba(255,255,255,0.2)' }}>
              <ShieldCheck size={18} />
            </div>
            <span className="v-hero-badge-text" style={{ color: 'white' }}>Verified Partner</span>
          </div>
          <h1>Good {new Date().getHours() < 12 ? 'Morning' : (new Date().getHours() < 18 ? 'Afternoon' : 'Evening')}, {vendorData?.name?.split(' ')[0] || 'Partner'}!</h1>
          <p>{businessType === 'event' ? 'Your event organizer portal is active. Here\'s your ticket sales snapshot.' : `Your ${businessType === 'shop' ? 'store' : 'service'} is currently online and accepting ${businessType === 'shop' ? 'orders' : 'bookings'}. Here's your performance snapshot for today.`}</p>
          
          <div style={{ display: 'flex', gap: '1.25rem', marginTop: '2.5rem' }}>
            <button 
              onClick={() => setActiveTab('orders')}
              className="v-banner-btn-primary"
            >
              View {businessType === 'event' ? 'Ticket Sales' : businessType === 'shop' ? 'Active Orders' : 'Active Bookings'} <ChevronRight size={18} />
            </button>
            <button 
              onClick={() => setActiveTab('inventory')}
              className="v-banner-btn-outline"
            >
              Manage {businessType === 'event' ? 'Events' : businessType === 'shop' ? 'Inventory' : 'Services'}
            </button>
          </div>
        </motion.div>
        
        {/* Decorative elements */}
        <div className="v-banner-decoration" style={{ position: 'absolute', right: '-20px', bottom: '-20px', opacity: 0.1, pointerEvents: 'none' }}>
          <TrendingUp size={280} strokeWidth={1} />
        </div>
      </div>

      <div className="v-stats-grid">
        <motion.div 
          whileHover={{ y: -8, boxShadow: 'var(--v-card-hover)' }} 
          className="v-stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <div className="v-stat-header">
            <div className={`v-stat-icon ${businessType === 'event' ? 'v-icon-blue' : 'v-icon-orange'}`}>
              {businessType === 'event' ? <Ticket size={24} /> : <Clock size={24} />}
            </div>
          </div>
          <div className="v-stat-body" style={{ marginTop: '1rem' }}>
            <span className="v-stat-label">{businessType === 'event' ? 'Total Ticket Sales' : `Live ${businessType === 'shop' ? 'Orders' : 'Jobs'}`}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span className="v-stat-value">{stats.pending}</span>
              <span className="v-stat-trend" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{businessType === 'event' ? 'tickets sold' : 'active now'}</span>
            </div>
          </div>
          <div className="v-stat-footer" style={{ marginTop: '1.5rem' }}>
            <div className="v-progress-bar" style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
              <div className="v-progress-fill" style={{ height: '100%', width: '65%', background: businessType === 'event' ? '#3b82f6' : '#f97316' }}></div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -8, boxShadow: 'var(--v-card-hover)' }} 
          className="v-stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <div className="v-stat-header">
            <div className="v-stat-icon v-icon-green">
              <IndianRupee size={24} />
            </div>
          </div>
          <div className="v-stat-body" style={{ marginTop: '1rem' }}>
            <span className="v-stat-label">{businessType === 'event' ? 'Total Revenue' : "Today's Revenue"}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span className="v-stat-value">₹{stats.earnings}</span>
              <span className="v-stat-trend" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>net earnings</span>
            </div>
          </div>
          <div className="v-stat-footer" style={{ marginTop: '1.5rem' }}>
            <div className="v-progress-bar" style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
              <div className="v-progress-fill" style={{ height: '100%', width: '45%', background: '#16a34a' }}></div>
            </div>
          </div>
        </motion.div>

        <motion.div 
          whileHover={{ y: -8, boxShadow: 'var(--v-card-hover)' }} 
          className="v-stat-card"
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <div className="v-stat-header">
            <div className={`v-stat-icon ${businessType === 'event' ? 'v-icon-green' : 'v-icon-blue'}`}>
              {businessType === 'event' ? <CheckCircle size={24} /> : <Star size={24} />}
            </div>
          </div>
          <div className="v-stat-body" style={{ marginTop: '1rem' }}>
            <span className="v-stat-label">{businessType === 'event' ? 'Total Checked In' : (businessType === 'shop' ? 'Store Reputation' : 'Service Reputation')}</span>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginTop: '4px' }}>
              <span className="v-stat-value">{businessType === 'event' ? stats.orders : stats.rating}</span>
              <span className="v-stat-trend" style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 600 }}>{businessType === 'event' ? 'attendees' : 'customer rating'}</span>
            </div>
          </div>
          <div className="v-stat-footer" style={{ marginTop: '1.5rem' }}>
            <div className="v-progress-bar" style={{ height: '6px', background: '#f1f5f9', borderRadius: '10px', overflow: 'hidden' }}>
              <div className="v-progress-fill" style={{ height: '100%', width: '96%', background: businessType === 'event' ? '#16a34a' : '#2563eb' }}></div>
            </div>
          </div>
        </motion.div>
      </div>

      <div className="v-dashboard-charts">
        <div className="v-chart-card" style={{ margin: 0 }}>
          <div className="v-chart-header">
            <div className="v-chart-info">
              <h3>Revenue Intelligence</h3>
              <p>Performance trends for the current period</p>
            </div>
            <div style={{ display: 'flex', gap: '8px' }}>
              <button className="v-chart-select active" style={{ background: 'var(--v-primary)', color: 'white', borderColor: 'var(--v-primary)' }}>Week</button>
              <button className="v-chart-select">Month</button>
            </div>
          </div>
          <div className="v-chart-container" style={{ height: '300px', width: '100%', marginTop: '1rem' }}>
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={stats.weeklyData}>
                <defs>
                  <linearGradient id="colorRevenue" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#f97316" stopOpacity={0.8}/>
                    <stop offset="95%" stopColor="#f97316" stopOpacity={0}/>
                  </linearGradient>
                </defs>
                <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                <XAxis dataKey="name" axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dy={10} />
                <YAxis axisLine={false} tickLine={false} tick={{fill: '#94a3b8', fontSize: 12}} dx={-10} tickFormatter={(val) => `₹${val}`} />
                <RechartsTooltip contentStyle={{borderRadius: '8px', border: 'none', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)'}} />
                <Area type="monotone" dataKey="revenue" stroke="#f97316" strokeWidth={3} fillOpacity={1} fill="url(#colorRevenue)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="v-data-card" style={{ padding: '2rem', background: '#0f172a', color: 'white', border: 'none' }}>
           <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.5rem' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: 'rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
               <TrendingUp size={20} color="#f97316" />
             </div>
             <h4 style={{ margin: 0, fontWeight: 800 }}>Growth Insights</h4>
           </div>
           
           <div className="v-insight-item" style={{ display: 'flex', gap: '12px', marginBottom: '1.25rem' }}>
             <div className="v-insight-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#f97316', marginTop: '6px', flexShrink: 0 }}></div>
             <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}>Your orders are up <strong>12%</strong> compared to last Tuesday. Keep up the good work!</p>
           </div>
           
           <div className="v-insight-item" style={{ display: 'flex', gap: '12px', marginBottom: '1.25rem' }}>
             <div className="v-insight-dot" style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#10b981', marginTop: '6px', flexShrink: 0 }}></div>
             <p style={{ margin: 0, fontSize: '0.9rem', color: '#cbd5e1', lineHeight: 1.5 }}><strong>98%</strong> fulfillment rate achieved this week. You're in the top tier of partners.</p>
           </div>

           <div style={{ marginTop: 'auto', padding: '1.25rem', background: 'rgba(255,255,255,0.05)', borderRadius: '16px', border: '1px solid rgba(255,255,255,0.1)' }}>
             <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Quick Tip</span>
             <p style={{ margin: '8px 0 0 0', fontSize: '0.85rem', color: '#cbd5e1', lineHeight: 1.5 }}>Add high-quality photos to your listings to increase conversion by up to 30%.</p>
           </div>
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

      let updatedLat = parseFloat(editFormData.lat !== undefined ? editFormData.lat : vendorData?.lat) || null;
      let updatedLng = parseFloat(editFormData.lng !== undefined ? editFormData.lng : vendorData?.lng) || null;

      const addressChanged = editFormData.address && editFormData.address !== vendorData?.address;
      if (addressChanged && (!editFormData.lat || !editFormData.lng)) {
        try {
          const searchString = editFormData.address.toLowerCase().includes('ahmedabad') 
            ? editFormData.address 
            : `${editFormData.address}, Ahmedabad, Gujarat, India`;
          const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchString)}&limit=1`;
          const res = await fetch(url, { headers: { 'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)' } });
          if (res.ok) {
            const data = await res.json();
            if (data && data.length > 0) {
              updatedLat = parseFloat(data[0].lat);
              updatedLng = parseFloat(data[0].lon);
              editFormData.lat = updatedLat;
              editFormData.lng = updatedLng;
            }
          }
        } catch (err) {
          console.warn('Geocoding updated address failed:', err);
        }
      }
      
      // Instantly persist to state & localStorage
      const updatedName = editFormData.name || vendorData?.name;
      const updatedBusinessName = editFormData.business_name || vendorData?.business_name;
      const updatedAddress = editFormData.address || vendorData?.address;
      
      setVendorData(prev => ({ ...prev, ...editFormData, lat: updatedLat, lng: updatedLng, phone: phone }));
      setFormData(prev => ({ ...prev, ...editFormData, lat: updatedLat, lng: updatedLng }));
      if (updatedBusinessName) localStorage.setItem('vBusinessName', updatedBusinessName);
      if (updatedName) localStorage.setItem('vOwnerName', updatedName);
      if (updatedAddress) localStorage.setItem('vAddress', updatedAddress);
      
      const savedForm = JSON.parse(localStorage.getItem('vFormData') || '{}');
      localStorage.setItem('vFormData', JSON.stringify({ ...savedForm, ...editFormData, lat: updatedLat, lng: updatedLng }));

      if (supabase && vendorData?.id && vendorData.id.length > 20) {
         try {
           const targetTable = businessType === 'shop' ? 'vendors' : 'service_providers';
           const updatePayload = {
              business_name: editFormData.business_name,
              address: editFormData.address,
              license_no: editFormData.license_no,
              category: editFormData.category,
              aadhar_no: editFormData.aadhar_no ? editFormData.aadhar_no.replace(/\s/g, '') : null,
              lat: updatedLat,
              lng: updatedLng
           };
           if (targetTable === 'vendors') {
             updatePayload.name = editFormData.name;
           } else {
             updatePayload.full_name = editFormData.name;
             updatePayload.name = editFormData.name;
           }
           
           await supabase
             .from(targetTable)
             .update(updatePayload)
             .eq('id', vendorData.id);

           await supabase.from('stores').upsert({
             id: vendorData.id,
             vendor_id: vendorData.id,
             name: editFormData.business_name || vendorData.business_name,
             address: editFormData.address || vendorData.address,
             lat: updatedLat,
             lng: updatedLng
           }, { onConflict: 'id' });
         } catch (dbErr) {
           console.warn("Supabase profile sync skipped:", dbErr);
         }
      }
      
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

        // 1. Find all order IDs for this vendor to clear dependencies
        const { data: vendorOrders } = await supabase
          .from('orders')
          .select('id')
          .eq('store_id', targetId);

        const orderIds = vendorOrders && vendorOrders.length > 0 
          ? vendorOrders.map(o => o.id) 
          : [];

        if (orderIds.length > 0) {
          // A. Delete rider earnings linked to these orders
          await supabase.from('rider_earnings').delete().in('order_id', orderIds);
          
          // B. Delete order items linked to these orders
          await supabase.from('order_items').delete().in('order_id', orderIds);
          
          // C. Delete the orders
          await supabase.from('orders').delete().in('id', orderIds);
        }

        // 2. Delete any cart items or carts associated with this store
        await supabase.from('carts').delete().eq('store_id', targetId);

        // 3. Delete products and deals
        await supabase.from('products').delete().eq('store_id', targetId);
        await supabase.from('deals').delete().eq('store_id', targetId);

        // 4. Delete the store
        await supabase.from('stores').delete().eq('vendor_id', targetId);

        // 5. Delete service bookings and services if they exist
        const { data: providerServices } = await supabase
          .from('services')
          .select('id')
          .eq('provider_id', targetId);
        
        const serviceIds = providerServices && providerServices.length > 0
          ? providerServices.map(s => s.id)
          : [];

        if (serviceIds.length > 0) {
          await supabase.from('service_bookings').delete().in('service_id', serviceIds);
        }
        await supabase.from('service_bookings').delete().eq('provider_id', targetId);
        await supabase.from('services').delete().eq('provider_id', targetId);

        // 6. Delete vendor profile
        const { error: vendorError } = await supabase.from('vendors').delete().eq('id', targetId);
        if (vendorError) {
          console.warn("Vendors table delete error/skip (could be service provider):", vendorError.message);
        }

        // 7. Delete service provider profile
        const { error: providerError } = await supabase.from('service_providers').delete().eq('id', targetId);
        if (providerError) {
          console.warn("Service providers table delete error/skip (could be shop):", providerError.message);
        }
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
    const savedForm = JSON.parse(localStorage.getItem('vFormData') || '{}');
    const resolvedVendor = vendorData || {};
    const effectiveData = {
      name: (resolvedVendor.name && resolvedVendor.name !== 'Partner') ? resolvedVendor.name : (savedForm.name || localStorage.getItem('vOwnerName') || resolvedVendor.name || 'Partner'),
      business_name: (resolvedVendor.business_name && resolvedVendor.business_name !== 'My Store') ? resolvedVendor.business_name : (savedForm.business_name || localStorage.getItem('vBusinessName') || resolvedVendor.business_name || 'My Store'),
      address: (resolvedVendor.address && resolvedVendor.address !== 'Local Area') ? resolvedVendor.address : (savedForm.address || localStorage.getItem('vAddress') || resolvedVendor.address || 'Local Area'),
      license_no: resolvedVendor.license_no || savedForm.license_no || 'Pending Verification',
      id: resolvedVendor.id || savedForm.id || localStorage.getItem('vPartnerId') || '4289',
      lat: resolvedVendor.lat || savedForm.lat || '',
      lng: resolvedVendor.lng || savedForm.lng || '',
      category: resolvedVendor.category || savedForm.category || ''
    };
    const currentData = isEditingProfile ? editFormData : effectiveData;

    const handleImageUpload = (e) => {
      const file = e.target.files[0];
      if (file) {
        if (file.size > 2 * 1024 * 1024) {
          toast.error("Image too large. Please select an image under 2MB.");
          return;
        }
        const reader = new FileReader();
        const uploadToastId = toast.loading("Uploading photo...");
        reader.onloadend = async () => {
          const base64Data = reader.result;
          setProfileImage(base64Data);
          localStorage.setItem('vProfileImage', base64Data);
          
          try {
            const id = user?.id || user?.phoneNumber || user?.email || user?.uid || resolvedVendor.user_id;
            if (id) {
              const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
              const token = await getAuthToken();
              const res = await fetch(`${apiBase}/api/users/${encodeURIComponent(id)}/photo`, {
                method: 'PUT',
                headers: { 
                  'Content-Type': 'application/json',
                  'Authorization': `Bearer ${token}`
                },
                body: JSON.stringify({ photoURL: base64Data })
              });
              if (res.ok) {
                const resJson = await res.json();
                if (resJson?.photoURL) {
                  setProfileImage(resJson.photoURL);
                  localStorage.setItem('vProfileImage', resJson.photoURL);
                }
              }
            }
            toast.success("Profile photo updated successfully!", { id: uploadToastId });
          } catch (err) {
            console.warn("Failed to sync profile photo to database via API:", err.message);
            toast.success("Profile photo updated locally, but failed to sync to database.", { id: uploadToastId });
          }
        };
        reader.readAsDataURL(file);
      }
    };
    
    return (
      <div className="v-container animate-fade-in">
        <div className="v-hero-section">
           <div className="v-hero-info">
             <div className="v-hero-badge">
               <div className="v-hero-badge-icon" style={{ background: 'var(--v-primary-soft)' }}>
                 <User size={18} color="var(--v-primary)" />
               </div>
               <span className="v-hero-badge-text">Account Control</span>
             </div>
             <h1 className="v-hero-title">Partner Profile</h1>
             <p className="v-hero-subtitle">Manage your personal information, business credentials, and account security preferences.</p>
           </div>
        </div>

        <div className="v-data-card" style={{ padding: '3rem', position: 'relative', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', top: 0, right: 0, width: '300px', height: '300px', background: 'radial-gradient(circle, rgba(249, 115, 22, 0.05) 0%, transparent 70%)', pointerEvents: 'none' }}></div>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '2rem', marginBottom: '3rem', paddingBottom: '2rem', borderBottom: '1px solid var(--v-border)', position: 'relative', zIndex: 1 }}>
            <div style={{ position: 'relative' }}>
              <div style={{ width: '100px', height: '100px', borderRadius: '32px', background: profileImage ? 'transparent' : 'linear-gradient(135deg, #f97316 0%, #ff8f3d 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2.5rem', fontWeight: 900, boxShadow: '0 10px 25px rgba(249, 115, 22, 0.3)', overflow: 'hidden' }}>
                {profileImage ? (
                  <img src={profileImage} alt="Profile" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  (currentData?.name || 'P').charAt(0).toUpperCase()
                )}
              </div>
              <input type="file" ref={fileInputRef} onChange={handleImageUpload} accept="image/*" style={{ display: 'none' }} />
              <button onClick={() => fileInputRef.current?.click()} style={{ position: 'absolute', bottom: '-5px', right: '-5px', width: '32px', height: '32px', borderRadius: '10px', background: 'white', border: '1px solid var(--v-border)', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)', cursor: 'pointer', color: 'var(--v-text-muted)', zIndex: 10 }}>
                <Camera size={16} />
              </button>
            </div>
            <div>
              <h2 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '6px' }}>{currentData?.name || 'Partner Profile'}</h2>
              <div style={{ display: 'flex', gap: '8px' }}>
                <div className="v-status-badge" style={{ display: 'inline-flex' }}>{businessType === 'shop' ? 'Shop Owner' : businessType === 'event' ? 'Event Organizer' : 'Service Provider'}</div>
                <div className="v-status-badge" style={{ background: '#f1f5f9', color: '#64748b', borderColor: '#e2e8f0' }}>ID: {currentData?.id?.toString().slice(0, 8)}</div>
              </div>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2.5rem', position: 'relative', zIndex: 1 }}>
            <div className="v-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                <User size={16} color="var(--v-primary)" /> OWNER FULL NAME
              </label>
              {isEditingProfile ? 
                <input type="text" className="v-input" style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }} value={currentData?.name || ''} onChange={e => setEditFormData({...editFormData, name: e.target.value})} /> :
                <div className="v-input v-readonly" style={{ padding: '14px 18px', background: '#f8fafc', color: '#0f172a', fontWeight: 700, borderRadius: '14px', border: '1.5px solid transparent' }}>{currentData?.name || 'Not provided'}</div>
              }
            </div>

            <div className="v-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                <Store size={16} color="var(--v-primary)" /> REGISTERED BUSINESS NAME
              </label>
              {isEditingProfile ? 
                <input type="text" className="v-input" style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }} value={currentData?.business_name || ''} onChange={e => setEditFormData({...editFormData, business_name: e.target.value})} /> :
                <div className="v-input v-readonly" style={{ padding: '14px 18px', background: '#f8fafc', color: '#0f172a', fontWeight: 700, borderRadius: '14px', border: '1.5px solid transparent' }}>{currentData?.business_name || 'Not provided'}</div>
              }
            </div>

            <div className="v-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                <CheckCircle2 size={16} color="var(--v-primary)" /> LICENSE / REGISTRATION NO.
              </label>
              {isEditingProfile ? 
                <input 
                  type="text" 
                  className="v-input" 
                  style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }}
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
                <div className="v-input v-readonly" style={{ padding: '14px 18px', background: '#f8fafc', color: '#0f172a', fontWeight: 700, borderRadius: '14px', border: '1.5px solid transparent' }}>{currentData?.license_no || 'Pending Verification'}</div>
              }
            </div>

            <div className="v-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                <Layers size={16} color="var(--v-primary)" /> BUSINESS CATEGORY
              </label>
              {isEditingProfile ? 
                <select 
                  className="v-input" 
                  style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)', backgroundColor: 'white', fontWeight: 600, color: '#0f172a' }}
                  value={currentData?.category || ''} 
                  onChange={e => setEditFormData({...editFormData, category: e.target.value})}
                >
                  <option value="">Select Category</option>
                  {businessType === 'shop' ? (
                    <>
                      <option value="General Store">General Store</option>
                      <option value="Grocery & Essentials">Grocery & Essentials</option>
                      <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                      <option value="Dairy, Bread & Eggs">Dairy, Bread & Eggs</option>
                      <option value="Beverages & Munchies">Beverages & Munchies</option>
                      <option value="Personal Care & Hygiene">Personal Care & Hygiene</option>
                      <option value="Household & Pet Care">Household & Pet Care</option>
                    </>
                  ) : businessType === 'event' ? (
                    <>
                      <option value="Music & Concerts">Music & Concerts</option>
                      <option value="Comedy & Theatre">Comedy & Theatre</option>
                      <option value="Workshops & Classes">Workshops & Classes</option>
                      <option value="Parties & Nightlife">Parties & Nightlife</option>
                      <option value="Festivals & Fairs">Festivals & Fairs</option>
                      <option value="Sports & Fitness">Sports & Fitness</option>
                      <option value="Corporate & Business">Corporate & Business</option>
                      <option value="Other Events">Other Events</option>
                    </>
                  ) : (
                    <>
                      <option value="Plumbing Services">Plumbing Services</option>
                      <option value="Electrical Services">Electrical Services</option>
                      <option value="Home Cleaning & Deep Clean">Home Cleaning & Deep Clean</option>
                      <option value="AC & Appliance Repair">AC & Appliance Repair</option>
                      <option value="Pest Control Services">Pest Control Services</option>
                      <option value="Home Painting & Decor">Home Painting & Decor</option>
                    </>
                  )}
                </select> :
                <div className="v-input v-readonly" style={{ padding: '14px 18px', background: '#f8fafc', color: '#0f172a', fontWeight: 700, borderRadius: '14px', border: '1.5px solid transparent' }}>{currentData?.category || (businessType === 'shop' ? 'General Store' : (businessType === 'event' ? 'Music & Concerts' : 'Plumbing Services'))}</div>
              }
            </div>

            <div className="v-form-group">
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                <IndianRupee size={16} color="var(--v-primary)" /> REGISTERED PHONE
              </label>
              <div className="v-input v-readonly" style={{ padding: '14px 18px', background: '#f8fafc', color: '#0f172a', fontWeight: 700, borderRadius: '14px', border: '1.5px solid transparent' }}>+91 {resolvedVendor.phone || (user?.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : '9999999999')}</div>
            </div>

            <div className="v-form-group" style={{ gridColumn: '1 / -1' }}>
              <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                <MapPin size={16} color="var(--v-primary)" /> OFFICIAL BUSINESS ADDRESS
              </label>
              {isEditingProfile ? 
                <textarea 
                  className="v-input" 
                  style={{ minHeight: '100px', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)', resize: 'none' }}
                  value={currentData?.address || ''} 
                  onChange={e => setEditFormData({...editFormData, address: e.target.value})} 
                /> :
                <div className="v-input v-readonly" style={{ minHeight: '80px', padding: '14px 18px', background: '#f8fafc', color: '#0f172a', fontWeight: 700, borderRadius: '14px', border: '1.5px solid transparent', lineHeight: 1.6 }}>{currentData?.address || 'Address not set'}</div>
              }
            </div>

            {isEditingProfile ? (
              <div className="v-form-group" style={{ gridColumn: '1 / -1' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                  <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.85rem', color: '#475569', margin: 0 }}>
                    <MapPin size={16} color="var(--v-primary)" /> STORE COORDINATES (GPS)
                  </label>
                  <button 
                    type="button" 
                    onClick={() => {
                      if (!window.isSecureContext) {
                        toast.error(`GPS needs HTTPS. Use: https://${window.location.hostname}:3002`, { duration: 5000 });
                        return;
                      }
                      if (navigator.geolocation) {
                        navigator.geolocation.getCurrentPosition((pos) => {
                          setEditFormData({
                            ...editFormData,
                            lat: pos.coords.latitude.toFixed(6),
                            lng: pos.coords.longitude.toFixed(6)
                          });
                          toast.success("GPS Coordinates detected!");
                        }, () => {
                          toast.error("Failed to detect location. Please enter manually.");
                        });
                      } else {
                        toast.error("Geolocation not supported by your browser.");
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'var(--v-primary, #f97316)', fontWeight: 700, fontSize: '0.85rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                  >
                    <MapPin size={14} /> Auto-Detect GPS
                  </button>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <input 
                    type="number" 
                    step="any"
                    placeholder="Latitude (e.g. 23.0225)" 
                    className="v-input" 
                    style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }} 
                    value={currentData?.lat || ''} 
                    onChange={e => setEditFormData({...editFormData, lat: e.target.value})} 
                  />
                  <input 
                    type="number" 
                    step="any"
                    placeholder="Longitude (e.g. 72.5714)" 
                    className="v-input" 
                    style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }} 
                    value={currentData?.lng || ''} 
                    onChange={e => setEditFormData({...editFormData, lng: e.target.value})} 
                  />
                </div>
              </div>
            ) : (
              <div className="v-form-group" style={{ gridColumn: '1 / -1' }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: '10px', fontWeight: 800, fontSize: '0.85rem', color: '#475569', marginBottom: '12px' }}>
                  <MapPin size={16} color="var(--v-primary)" /> STORE COORDINATES (GPS)
                </label>
                <div className="v-input v-readonly" style={{ padding: '14px 18px', background: '#f8fafc', color: '#0f172a', fontWeight: 700, borderRadius: '14px', border: '1.5px solid transparent' }}>
                  {currentData?.lat && currentData?.lng ? `Lat: ${currentData.lat}, Lng: ${currentData.lng}` : 'Not set'}
                </div>
              </div>
            )}
          </div>
          
          <div style={{ marginTop: '3.5rem', display: 'flex', justifyContent: 'flex-end', gap: '1.25rem', borderTop: '1px solid var(--v-border)', paddingTop: '2.5rem', position: 'relative', zIndex: 1 }}>
            {isEditingProfile ? (
              <>
                <button className="v-btn-outline" style={{ padding: '14px 32px' }} onClick={() => setIsEditingProfile(false)} disabled={isUpdating}>Cancel</button>
                <button className="v-btn-primary" style={{ padding: '14px 40px' }} onClick={handleUpdateProfile} disabled={isUpdating}>
                  {isUpdating ? 'Saving Changes...' : 'Save Profile'}
                </button>
              </>
            ) : (
              <>
                <button 
                  className="v-btn-outline" 
                  style={{ color: '#ef4444', borderColor: '#fee2e2' }} 
                  onClick={() => setShowDeleteModal(true)} 
                  disabled={isUpdating}
                >
                  <Trash2 size={18} style={{ marginRight: '8px' }} />
                  Close Account
                </button>
                <button className="v-btn-primary" style={{ padding: '14px 40px' }} onClick={() => { setEditFormData(effectiveData); setIsEditingProfile(true); }}>
                  Edit Profile
                </button>
              </>
            )}
          </div>
        </div>
      </div>
    );
  };

  const renderOnboarding = () => (
    <div className="onboarding-screen animate-fade-in">
      {onboardingSubStep === 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="onboarding-content" style={{ position: 'relative' }}>
          <button 
            className="back-btn-premium" 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '12px', 
              width: '44px', 
              height: '44px', 
              borderRadius: '50%', 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              color: '#0f172a', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
              transition: 'all 0.2s ease',
              zIndex: 10
            }} 
            onClick={() => { if (onLogout) onLogout(true); else window.location.href = '/'; }}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="onboarding-header">
            <div className="onboarding-logo-wrapper" style={{ margin: '0 auto 1.5rem auto', background: 'var(--v-primary-soft)', padding: '1rem', borderRadius: '24px' }}>
              <img src="/logo.png" alt="Passwala Logo" className="onboarding-logo" style={{ width: '48px' }} />
            </div>
            <h2 style={{fontWeight: 950, fontSize: '2.25rem', marginBottom: '0.5rem', color: '#0f172a', letterSpacing: '-1px'}}>Partner with Passwala</h2>
            <p style={{color: '#64748b', fontSize: '1rem', fontWeight: 500}}>Choose your business model to get started</p>
          </div>
          
          <div className="registration-type-grid" style={{ marginTop: '2.5rem' }}>
            <motion.div 
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className={`type-card ${businessType === 'shop' ? 'active' : ''}`} 
              onClick={() => setBusinessType('shop')} 
              style={{ padding: '2rem 1.5rem', textAlign: 'center', cursor: 'pointer', borderRadius: '24px', border: businessType === 'shop' ? '2px solid var(--v-primary)' : '1.5px solid #e2e8f0', background: businessType === 'shop' ? 'var(--v-primary-soft)' : 'white', transition: 'all 0.3s ease' }}
            >
               <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: businessType === 'shop' ? 'white' : '#f8fafc', margin: '0 auto 1.25rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: businessType === 'shop' ? '0 10px 20px rgba(249, 115, 22, 0.1)' : 'none' }}>
                 <ShoppingCart size={32} color={businessType === 'shop' ? '#f97316' : '#94a3b8'} />
               </div>
               <h4 style={{ fontWeight: 850, margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Retail Store</h4>
               <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>Sell products and reach local customers instantly.</p>
            </motion.div>

            <motion.div 
              whileHover={{ scale: 1.02, y: -5 }}
              whileTap={{ scale: 0.98 }}
              className={`type-card ${businessType === 'service' ? 'active' : ''}`} 
              onClick={() => setBusinessType('service')} 
              style={{ padding: '2rem 1.5rem', textAlign: 'center', cursor: 'pointer', borderRadius: '24px', border: businessType === 'service' ? '2px solid var(--v-primary)' : '1.5px solid #e2e8f0', background: businessType === 'service' ? 'var(--v-primary-soft)' : 'white', transition: 'all 0.3s ease' }}
            >
               <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: businessType === 'service' ? 'white' : '#f8fafc', margin: '0 auto 1.25rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: businessType === 'service' ? '0 10px 20px rgba(249, 115, 22, 0.1)' : 'none' }}>
                 <Wrench size={32} color={businessType === 'service' ? '#f97316' : '#94a3b8'} />
               </div>
               <h4 style={{ fontWeight: 850, margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Professional</h4>
               <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>Offer your expertise and specialized services.</p>
            </motion.div>

            <motion.div 
               whileHover={{ scale: 1.02, y: -5 }}
               whileTap={{ scale: 0.98 }}
               className={`type-card ${businessType === 'event' ? 'active' : ''}`} 
               onClick={() => setBusinessType('event')} 
               style={{ padding: '2rem 1.5rem', textAlign: 'center', cursor: 'pointer', borderRadius: '24px', border: businessType === 'event' ? '2px solid var(--v-primary)' : '1.5px solid #e2e8f0', background: businessType === 'event' ? 'var(--v-primary-soft)' : 'white', transition: 'all 0.3s ease' }}
            >
                <div style={{ width: '64px', height: '64px', borderRadius: '18px', background: businessType === 'event' ? 'white' : '#f8fafc', margin: '0 auto 1.25rem auto', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: businessType === 'event' ? '0 10px 20px rgba(249, 115, 22, 0.1)' : 'none' }}>
                  <Calendar size={32} color={businessType === 'event' ? '#f97316' : '#94a3b8'} />
                </div>
                <h4 style={{ fontWeight: 850, margin: '0 0 0.5rem 0', fontSize: '1.1rem' }}>Event Organizer</h4>
                <p style={{ fontSize: '0.85rem', color: '#64748b', margin: 0, lineHeight: 1.4 }}>Organize events, concerts and sell passes online.</p>
            </motion.div>
          </div>

          <button 
            className="v-btn-primary" 
            style={{ marginTop: '2.5rem', width: '100%', padding: '18px', justifyContent: 'center', borderRadius: '18px' }} 
            onClick={() => setOnboardingSubStep(2)}
          >
            Create My Account <ChevronRight size={20} />
          </button>
        </motion.div>
      )}

      {onboardingSubStep === 2 && (
        <motion.div initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} className="onboarding-content" style={{ position: 'relative' }}>
          <button 
            className="back-btn-premium" 
            style={{ 
              position: 'absolute', 
              left: '12px', 
              top: '12px', 
              width: '44px', 
              height: '44px', 
              borderRadius: '50%', 
              background: '#f8fafc', 
              border: '1px solid #e2e8f0', 
              display: 'flex', 
              alignItems: 'center', 
              justifyContent: 'center', 
              cursor: 'pointer', 
              color: '#0f172a', 
              boxShadow: '0 4px 12px rgba(0,0,0,0.05)', 
              transition: 'all 0.2s ease',
              zIndex: 10
            }} 
            onClick={() => setOnboardingSubStep(1)}
          >
            <ArrowLeft size={20} />
          </button>
          
          <div className="onboarding-header" style={{ marginBottom: '2.5rem', textAlign: 'center' }}>
            <h2 style={{fontWeight: 950, fontSize: '1.75rem', color: '#0f172a', letterSpacing: '-0.5px'}}>Business Credentials</h2>
            <p style={{color: '#64748b', fontSize: '0.95rem', fontWeight: 500}}>Identity verification for {businessType} onboarding</p>
          </div>

          <div style={{ display: 'grid', gap: '1.25rem' }}>
            <div className="v-form-group">
              <label style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: '8px' }}>OWNER FULL NAME</label>
              <input type="text" placeholder="Legal name as per Aadhar" className="v-input" style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }} value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
            </div>
            
            <div className="v-form-group">
              <label style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: '8px' }}>AADHAR NUMBER</label>
              <input 
                type="text" 
                placeholder="0000 0000 0000" 
                maxLength={14} 
                className="v-input" 
                style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)', letterSpacing: '2px', fontWeight: 700 }}
                value={formData.aadhar_no} 
                onChange={e => setFormData({...formData, aadhar_no: formatAadhar(e.target.value)})} 
              />
            </div>

            <div className="v-form-group">
              <label style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: '8px' }}>{businessType === 'shop' ? 'SHOP NAME' : businessType === 'event' ? 'EVENT AGENCY NAME' : 'SERVICE BRAND NAME'}</label>
              <input type="text" placeholder={`E.g. ${businessType === 'shop' ? 'The Urban Grocery' : businessType === 'event' ? 'Star Events' : 'Master Cleaners'}`} className="v-input" style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }} value={formData.business_name} onChange={e => setFormData({...formData, business_name: e.target.value})} />
            </div>

            <div className="v-form-group">
              <label style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: '8px' }}>BUSINESS CATEGORY</label>
              <select 
                className="v-input" 
                style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)', backgroundColor: 'white', fontWeight: 600, color: '#0f172a' }}
                value={formData.category || ''} 
                onChange={e => setFormData({...formData, category: e.target.value})}
              >
                <option value="">Select Category</option>
                {businessType === 'shop' ? (
                  <>
                    <option value="General Store">General Store</option>
                    <option value="Grocery & Essentials">Grocery & Essentials</option>
                    <option value="Fruits & Vegetables">Fruits & Vegetables</option>
                    <option value="Dairy, Bread & Eggs">Dairy, Bread & Eggs</option>
                    <option value="Beverages & Munchies">Beverages & Munchies</option>
                    <option value="Personal Care & Hygiene">Personal Care & Hygiene</option>
                    <option value="Household & Pet Care">Household & Pet Care</option>
                  </>
                ) : businessType === 'event' ? (
                  <>
                    <option value="Music & Concerts">Music & Concerts</option>
                    <option value="Comedy & Theatre">Comedy & Theatre</option>
                    <option value="Workshops & Classes">Workshops & Classes</option>
                    <option value="Parties & Nightlife">Parties & Nightlife</option>
                    <option value="Festivals & Fairs">Festivals & Fairs</option>
                    <option value="Sports & Fitness">Sports & Fitness</option>
                    <option value="Corporate & Business">Corporate & Business</option>
                    <option value="Other Events">Other Events</option>
                  </>
                ) : (
                  <>
                    <option value="Plumbing Services">Plumbing Services</option>
                    <option value="Electrical Services">Electrical Services</option>
                    <option value="Home Cleaning & Deep Clean">Home Cleaning & Deep Clean</option>
                    <option value="AC & Appliance Repair">AC & Appliance Repair</option>
                    <option value="Pest Control Services">Pest Control Services</option>
                    <option value="Home Painting & Decor">Home Painting & Decor</option>
                  </>
                )}
              </select>
            </div>

            <div className="v-form-group">
              <label style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: '8px' }}>LICENSE / REGISTRATION NO.</label>
              <input 
                type="text" 
                placeholder="e.g. 2026-CITY-12345678" 
                className="v-input" 
                style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }}
                value={formData.license_no || ''} 
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
              <label style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', marginBottom: '8px' }}>STORE ADDRESS</label>
              <textarea 
                placeholder="Full physical location of your business" 
                className="v-input" 
                style={{ minHeight: '90px', resize: 'none', padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)', lineHeight: 1.5 }}
                value={formData.address || ''} 
                onChange={e => setFormData({...formData, address: e.target.value})} 
              />
            </div>

            <div className="v-form-group">
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <label style={{ fontWeight: 800, fontSize: '0.8rem', color: '#475569', margin: 0 }}>STORE COORDINATES (GPS)</label>
                <button 
                  type="button" 
                  onClick={() => {
                    if (!window.isSecureContext) {
                      toast.error(`GPS needs HTTPS. Use: https://${window.location.hostname}:3002`, { duration: 5000 });
                      return;
                    }
                    if (navigator.geolocation) {
                      navigator.geolocation.getCurrentPosition((pos) => {
                        setFormData({
                          ...formData,
                          lat: pos.coords.latitude.toFixed(6),
                          lng: pos.coords.longitude.toFixed(6)
                        });
                        toast.success("GPS Coordinates detected!");
                      }, () => {
                        toast.error("Failed to detect location. Please enter manually.");
                      });
                    } else {
                      toast.error("Geolocation not supported by your browser.");
                    }
                  }}
                  style={{ background: 'none', border: 'none', color: 'var(--v-primary, #f97316)', fontWeight: 700, fontSize: '0.8rem', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                >
                  <MapPin size={12} /> Auto-Detect GPS
                </button>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <input 
                  type="number" 
                  step="any"
                  placeholder="Latitude (e.g. 23.0225)" 
                  className="v-input" 
                  style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }} 
                  value={formData.lat || ''} 
                  onChange={e => setFormData({...formData, lat: e.target.value})} 
                />
                <input 
                  type="number" 
                  step="any"
                  placeholder="Longitude (e.g. 72.5714)" 
                  className="v-input" 
                  style={{ padding: '14px 18px', borderRadius: '14px', border: '1.5px solid var(--v-border)' }} 
                  value={formData.lng || ''} 
                  onChange={e => setFormData({...formData, lng: e.target.value})} 
                />
              </div>
            </div>
          </div>

          <button 
             className="v-btn-primary" 
             style={{marginTop: '2rem', width: '100%', padding: '18px', justifyContent: 'center', borderRadius: '18px'}} 
             onClick={() => setOnboardingSubStep(3)} 
             disabled={
               !formData.name || 
               formData.aadhar_no.replace(/\s/g, '').length !== 12 || 
               !formData.business_name ||
               !formData.category ||
               !formData.license_no ||
               !formData.address
             }
          >
            Continue
          </button>
        </motion.div>
      )}
      
      {onboardingSubStep === 3 && (
        <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} className="onboarding-content" style={{ textAlign: 'center', padding: '3rem 1.5rem' }}>
          <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto 2.5rem auto' }}>
            <motion.div 
              animate={{ rotate: 360 }}
              transition={{ repeat: Infinity, duration: 4, ease: "linear" }}
              style={{ position: 'absolute', inset: 0, border: '4px dashed var(--v-primary)', borderRadius: '50%', opacity: 0.3 }}
            />
            <div style={{ position: 'absolute', inset: '10px', background: 'var(--v-primary-soft)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <Clock size={48} color="var(--v-primary)" />
            </div>
          </div>

          <h3 style={{fontWeight: 950, fontSize: '1.75rem', color: '#0f172a', marginBottom: '0.75rem'}}>Almost There!</h3>
          <p style={{color: '#64748b', fontSize: '1rem', lineHeight: 1.6, marginBottom: '2.5rem'}}>We are creating your secure partner vault and synchronizing your business data with our network.</p>
          
          <button 
            className="v-btn-primary" 
            style={{ width: '100%', padding: '18px', justifyContent: 'center', borderRadius: '18px' }}
            onClick={async () => {
              const toastId = toast.loading('Setting up your profile...');
              const currentPhone = vendorData?.phone || (user?.phoneNumber ? user.phoneNumber.replace(/\D/g, '').slice(-10) : '9999999999');
              const targetTable = businessType === 'shop' ? 'vendors' : 'service_providers';

              let coords = null;
              if (!formData.lat || !formData.lng) {
                try {
                  const searchString = formData.address.toLowerCase().includes('ahmedabad') 
                    ? formData.address 
                    : `${formData.address}, Ahmedabad, Gujarat, India`;
                  const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchString)}&limit=1`;
                  const res = await fetch(url, { headers: { 'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)' } });
                  if (res.ok) {
                    const data = await res.json();
                    if (data && data.length > 0) {
                      coords = { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
                    }
                  }
                } catch (err) {
                  console.warn('Geocoding registration address failed:', err);
                }
              }

              const finalLat = parseFloat(formData.lat) || (coords ? coords.lat : null);
              const finalLng = parseFloat(formData.lng) || (coords ? coords.lng : null);

              const tablePayload = {
                business_name: formData.business_name,
                aadhar_no: formData.aadhar_no.replace(/\s/g, ''),
                address: formData.address,
                license_no: formData.license_no || '',
                phone: currentPhone,
                profile_completed: true,
                name: formData.name,
                lat: finalLat,
                lng: finalLng
              };
              if (businessType === 'shop' || businessType === 'event') {
                tablePayload.category = formData.category || (businessType === 'shop' ? 'Grocery' : 'Music & Concerts');
              }

              if (supabase) {
                try {
                  // A. First check if a user exists in the users table with currentPhone
                  let userId = user?.id || user?.uid;
                  if (!userId || String(userId).startsWith('temp_')) {
                    const { data: existingUser } = await supabase.from('users').select('id').eq('phone', currentPhone).maybeSingle();
                    if (existingUser) {
                      userId = existingUser.id;
                      // Update existing user role and set photo_url
                      const userUpdatePayload = {
                        role: businessType === 'shop' ? 'VENDOR' : businessType === 'event' ? 'EVENT_ORGANIZER' : 'SERVICE_PROVIDER'
                      };
                      const localPhoto = localStorage.getItem('vProfileImage');
                      if (localPhoto) {
                        userUpdatePayload.photo_url = localPhoto;
                      }
                      await supabase.from('users').update(userUpdatePayload).eq('id', existingUser.id);
                    } else {
                      // Create user in the users table
                      const userInsertPayload = {
                        phone: currentPhone,
                        full_name: formData.name,
                        role: businessType === 'shop' ? 'VENDOR' : businessType === 'event' ? 'EVENT_ORGANIZER' : 'SERVICE_PROVIDER'
                      };
                      const localPhoto = localStorage.getItem('vProfileImage');
                      if (localPhoto) {
                        userInsertPayload.photo_url = localPhoto;
                      }
                      const { data: newUser, error: newUserErr } = await supabase.from('users').insert([userInsertPayload]).select().single();
                      if (!newUserErr && newUser) {
                        userId = newUser.id;
                      }
                    }
                  }
                  
                  if (userId) {
                    tablePayload.user_id = userId;
                  }

                  let savedId = vendorData?.id;
                  const cleanPayloadForRetry = (payload, errMessage) => {
                    const clean = { ...payload };
                    if (errMessage.includes('lat')) {
                      delete clean.lat;
                    }
                    if (errMessage.includes('lng')) {
                      delete clean.lng;
                    }
                    if (errMessage.includes('aadhar_no')) {
                      delete clean.aadhar_no;
                    }
                    return clean;
                  };

                  if (savedId) {
                    let { error: updateErr } = await supabase.from(targetTable).update(tablePayload).eq('id', savedId);
                    if (updateErr && (updateErr.message.includes('lat') || updateErr.message.includes('lng') || updateErr.message.includes('aadhar_no') || updateErr.message.includes('column'))) {
                      const retryPayload = cleanPayloadForRetry(tablePayload, updateErr.message);
                      let { error: retryErr } = await supabase.from(targetTable).update(retryPayload).eq('id', savedId);
                      if (retryErr && (retryErr.message.includes('lat') || retryErr.message.includes('lng') || retryErr.message.includes('aadhar_no') || retryErr.message.includes('column'))) {
                        const finalPayload = cleanPayloadForRetry(retryPayload, retryErr.message);
                        const { error: finalErr } = await supabase.from(targetTable).update(finalPayload).eq('id', savedId);
                        if (finalErr) throw finalErr;
                      } else if (retryErr) {
                        throw retryErr;
                      }
                    } else if (updateErr) {
                      throw updateErr;
                    }
                  } else {
                    let insertError = null;
                    let data = null;

                    ({ data, error: insertError } = await supabase.from(targetTable).insert([tablePayload]).select().single());

                    if (insertError && (insertError.message.includes('lat') || insertError.message.includes('lng') || insertError.message.includes('aadhar_no') || insertError.message.includes('column'))) {
                      const retryPayload = cleanPayloadForRetry(tablePayload, insertError.message);
                      ({ data, error: insertError } = await supabase.from(targetTable).insert([retryPayload]).select().single());
                      
                      if (insertError && (insertError.message.includes('lat') || insertError.message.includes('lng') || insertError.message.includes('aadhar_no') || insertError.message.includes('column'))) {
                        const finalPayload = cleanPayloadForRetry(retryPayload, insertError.message);
                        ({ data, error: insertError } = await supabase.from(targetTable).insert([finalPayload]).select().single());
                      }
                    }

                    if (insertError) throw insertError;
                    if (data) savedId = data.id;
                  }

                  if (savedId && businessType === 'shop') {
                    // Only shops get a stores row — service_providers use service_bookings instead
                    const { error: storeErr } = await supabase.from('stores').upsert({
                      id: savedId,
                      vendor_id: savedId,
                      name: tablePayload.business_name,
                      address: tablePayload.address,
                      lat: finalLat,
                      lng: finalLng
                    }, { onConflict: 'id' });
                    if (storeErr) {
                      console.warn('Stores upsert non-critical skip:', storeErr.message);
                    }
                  }

                  toast.success('Onboarding completed!', { id: toastId });
                  setVendorData(prev => ({...prev, ...formData, id: savedId || '4289', business_name: tablePayload.business_name, address: tablePayload.address, lat: finalLat, lng: finalLng, profile_completed: true}));
                  localStorage.setItem('vProfileCompleted', 'true');
                  setShowSuccessPop(true);
                } catch (err) {
                  console.error('Vendor registration error:', err);
                  toast.error(err.message || 'Registration failed. Please try again.', { id: toastId });
                  // Do NOT show success popup on failure
                }
              } else {
                setShowSuccessPop(true);
              }
            }}
          >
            Complete Registration
          </button>
        </motion.div>
      )}

      {showSuccessPop && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(15, 23, 42, 0.75)', backdropFilter: 'blur(8px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '20px' }}>
          <motion.div initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} style={{ background: 'white', padding: '2.5rem', borderRadius: '24px', maxWidth: '440px', width: '100%', textAlign: 'center' }}>
            <div style={{ width: '80px', height: '80px', borderRadius: '50%', background: 'linear-gradient(135deg, #f97316 0%, #ff8f3d 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
              <CheckCircle size={40} color="white" />
            </div>
            <h3 style={{ fontSize: '1.75rem', fontWeight: 900, color: '#0f172a', marginBottom: '0.75rem' }}>Welcome Aboard! 🎉</h3>
            <p style={{ color: '#64748b', fontSize: '0.95rem', lineHeight: '1.6', marginBottom: '2rem' }}>Congratulations, <strong>{formData.name}</strong>! Your business has been registered successfully.</p>
            <button onClick={() => { setShowSuccessPop(false); setAppStatus('dashboard'); }} style={{ width: '100%', padding: '14px', borderRadius: '12px', background: '#0f172a', color: 'white', border: 'none', fontWeight: 800 }}>Launch Dashboard</button>
          </motion.div>
        </div>
      )}
    </div>
  );

  if (appStatus === 'loading') {
    return (
      <div style={{ height: '100vh', width: '100vw', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#f8fafc' }}>
        <div style={{ textAlign: 'center' }}>
           <motion.div 
             animate={{ scale: [1, 1.1, 1], opacity: [0.5, 1, 0.5] }}
             transition={{ repeat: Infinity, duration: 1.5 }}
             style={{ width: '80px', height: '80px', margin: '0 auto 2rem auto', background: 'var(--v-primary-soft)', padding: '1rem', borderRadius: '24px' }}
           >
             <img src="/logo.png" alt="Logo" style={{ width: '100%', height: '100%', objectFit: 'contain' }} />
           </motion.div>
           <h3 style={{ fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>Initializing Portal</h3>
           <p style={{ color: '#64748b', fontSize: '0.9rem' }}>Connecting to secure servers...</p>
        </div>
      </div>
    );
  }

  if (appStatus === 'onboarding') {
    return (
      <div className="vendor-portal onboarding-mode">
        {renderOnboarding()}
      </div>
    );
  }

  return (
    <div className="vendor-portal">
      {/* Premium Sidebar */}
      <motion.aside 
        className={`vendor-sidebar ${!isSidebarOpen ? 'collapsed' : ''}`}
        style={{ boxShadow: isSidebarOpen ? '10px 0 50px rgba(0,0,0,0.05)' : 'none' }}
      >
        <div className="vendor-sidebar-header" style={{ padding: '2rem 1.5rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div className="v-logo-container">
              <img src="/logo.png" alt="Logo" className="v-sidebar-logo" />
            </div>
            <div className="v-brand-info">
              <span className="v-brand-name">Passwala Business Suite</span>
              <span className="v-brand-tag">PARTNER</span>
            </div>
          </div>
          <button className="v-sidebar-toggle" onClick={() => setIsSidebarOpen(false)} style={{ background: 'none', border: 'none', color: '#cbd5e1', cursor: 'pointer', display: window.innerWidth <= 1024 ? 'block' : 'none' }}>
            <XCircle size={20} />
          </button>
        </div>

        <nav className="vendor-sidebar-nav" style={{ padding: '1.5rem' }}>
          {menuItems.map((item) => (
            <motion.button
              key={item.id}
              whileHover={{ x: 4 }}
              whileTap={{ scale: 0.98 }}
              className={`v-nav-item ${activeTab === item.id ? 'active' : ''}`}
              onClick={() => {
                setActiveTab(item.id);
                if (window.innerWidth <= 1024) setIsSidebarOpen(false);
              }}
            >
              <item.icon size={20} />
              <span>{item.label}</span>
              {activeTab === item.id && (
                <motion.div 
                  layoutId="activeTabIndicator"
                  style={{ marginLeft: 'auto', width: '6px', height: '6px', borderRadius: '50%', background: 'white' }} 
                />
              )}
            </motion.button>
          ))}
        </nav>

        <div style={{ padding: '1.5rem', borderTop: '1px solid var(--v-border)' }}>
          <button className="v-logout-btn" onClick={() => onLogout(true)} style={{ width: '100%', justifyContent: 'flex-start', padding: '14px 1.25rem', borderRadius: '16px', background: 'rgba(239, 68, 68, 0.05)' }}>
            <LogOut size={20} />
            <span>Sign Out</span>
          </button>
        </div>
      </motion.aside>

      {/* Main Content */}
      <main className={`portal-main-area ${!isSidebarOpen ? 'sidebar-collapsed' : ''}`}>
        <header className="portal-top-bar">
          <div className="v-top-left">
            <button 
              className="v-menu-trigger" 
              style={{ display: isSidebarOpen ? 'none' : 'flex', background: 'white', border: '1px solid var(--v-border)', width: '40px', height: '40px', borderRadius: '12px', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: 'var(--v-text-main)' }}
              onClick={() => setIsSidebarOpen(true)}
            >
              <Menu size={20} />
            </button>
            <div className="v-status-badge">
              <span>{businessType === 'shop' ? 'STORE ONLINE' : businessType === 'event' ? 'EVENT PORTAL ACTIVE' : 'SERVICE ONLINE'}</span>
            </div>
          </div>

          <div className="v-top-right">
             <div className="v-user-info" style={{ textAlign: 'right' }}>
               <span style={{ fontSize: '0.95rem', fontWeight: 850, color: '#0f172a' }}>{vendorData?.business_name || (businessType === 'shop' ? 'My Store' : businessType === 'event' ? 'My Events Agency' : 'My Service')}</span>
               <span style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--v-text-muted)' }}>{vendorData?.id?.toString().slice(0, 10).toUpperCase()}</span>
             </div>
             <div className="v-avatar" style={{ width: '42px', height: '42px', borderRadius: '14px', background: 'linear-gradient(135deg, #f97316 0%, #ff8f3d 100%)', color: 'white', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.1rem', fontWeight: 900, boxShadow: '0 8px 20px rgba(249, 115, 22, 0.2)' }}>
               {(vendorData?.name || 'P').charAt(0).toUpperCase()}
             </div>
          </div>
        </header>

        <div className="portal-scroll-area" ref={mainScrollRef}>
          <AnimatePresence mode="wait">
            <motion.div
              key={activeTab}
              initial={{ opacity: 0, y: 15 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -15 }}
              transition={{ duration: 0.25, ease: "easeOut" }}
              style={{ minHeight: '100%', width: '100%' }}
              onViewportEnter={() => {
                const scrollArea = document.querySelector('.portal-scroll-area');
                if (scrollArea) scrollArea.scrollTop = 0;
              }}
            >
              {activeTab === 'dashboard' && renderDashboard()}
              {activeTab === 'profile' && renderProfile()}
              {activeTab === 'inventory' && <VendorInventory vendorData={vendorData} businessType={businessType} storeId={storeId || vendorData?.id} />}
              {activeTab === 'orders' && <VendorOrders vendorData={vendorData} businessType={businessType} storeId={storeId || vendorData?.id} />}
              {activeTab === 'earnings' && <VendorEarnings vendorData={vendorData} businessType={businessType} storeId={storeId || vendorData?.id} />}
              {activeTab === 'reviews' && <VendorReviews vendorData={vendorData} businessType={businessType} storeId={storeId || vendorData?.id} />}
              {activeTab === 'notifications' && <VendorNotifications vendorData={vendorData} businessType={businessType} storeId={storeId || vendorData?.id} />}
              {activeTab === 'support' && <VendorSupport vendorData={vendorData} businessType={businessType} />}
            </motion.div>
          </AnimatePresence>
        </div>
      </main>

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

export default VendorPortal;
