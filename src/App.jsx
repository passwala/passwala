import React, { Suspense, useState, useEffect } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import Navbar from './web/Navbar'
import Hero from './web/Hero'
import InfoSection from './web/InfoSection'

import SplashScreen from './webapp/SplashScreen'
import Auth from './webapp/Auth'
import WebappNavbar from './webapp/WebappNavbar'
import BottomNav from './webapp/BottomNav'
import LocationSelector from './webapp/LocationSelector'
import AdminAuth from './webapp/AdminAuth'
import VendorAuth from './vendor/VendorAuth'
import RiderAuth from './rider/RiderAuth'
import Footer from './web/Footer'
import Policies from './web/Policies'
import { Toaster, toast } from 'react-hot-toast'
import { Cpu } from 'lucide-react'
import './App.css'

import { supabase } from './supabase'
import { isFeatureEnabled } from './launchConfig'
import AIAssistant from './webapp/AIAssistant'
import AIChatWidget from './webapp/buyer/AIChatWidget'
import DeveloperModal from './webapp/DeveloperModal'
import CustomerDetails from './webapp/CustomerDetails'
import OnboardingWizard from './webapp/OnboardingWizard'
import { CartProvider, useCart } from './context/CartContext'
import CartDrawer from './webapp/buyer/CartDrawer'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import { SearchProvider } from './context/SearchContext'
import { LanguageProvider, useTranslation } from './webapp/LanguageContext'

// Custom Hooks
import { useAuth } from './hooks/useAuth'
import { useLocation as useAppLocation } from './hooks/useLocation'
import { useTheme } from './hooks/useTheme'

// Code Splitting - Lazy Load heavy screens
const AdminPanel = React.lazy(() => import('./webapp/AdminPanel'));
const VendorPortal = React.lazy(() => import('./vendor/VendorPortal'));
const RiderPortal = React.lazy(() => import('./rider/RiderPortal'));
const NearShops = React.lazy(() => import('./webapp/buyer/NearShops'));
const ExpertServices = React.lazy(() => import('./webapp/buyer/ExpertServices'));
const NeighborsCommunity = React.lazy(() => import('./webapp/buyer/NeighborsCommunity'));
const TrackOrders = React.lazy(() => import('./webapp/buyer/TrackOrders'));
const WebappProfile = React.lazy(() => import('./webapp/WebappProfile'));
const OrderHistory = React.lazy(() => import('./webapp/profile_pages/OrderHistory'));
const Wallet = React.lazy(() => import('./webapp/profile_pages/Wallet'));
const PrivacySecurity = React.lazy(() => import('./webapp/profile_pages/PrivacySecurity'));
const HelpSupport = React.lazy(() => import('./webapp/profile_pages/HelpSupport'));
const AppSettings = React.lazy(() => import('./webapp/profile_pages/AppSettings'));
const AddressManager = React.lazy(() => import('./webapp/profile_pages/AddressManager'));
const NeighborhoodHub = React.lazy(() => import('./webapp/buyer/NeighborhoodHub'));
const CityTicketBooking = React.lazy(() => import('./webapp/buyer/CityTicketBooking'));
const RideCheckout = React.lazy(() => import('./webapp/buyer/RideCheckout'));
const RideTicket = React.lazy(() => import('./webapp/buyer/RideTicket'));
const EventHub = React.lazy(() => import('./webapp/buyer/events/EventHub'));
const EventDetails = React.lazy(() => import('./webapp/buyer/events/EventDetails'));
const EventCheckout = React.lazy(() => import('./webapp/buyer/events/EventCheckout'));
const EventTicket = React.lazy(() => import('./webapp/buyer/events/EventTicket'));
// Sports Venue Booking
const SportsHub = React.lazy(() => import('./webapp/buyer/sports/SportsHub'));
const VenueDetails = React.lazy(() => import('./webapp/buyer/sports/VenueDetails'));
const SportsCheckout = React.lazy(() => import('./webapp/buyer/sports/SportsCheckout'));
const SportsTicket = React.lazy(() => import('./webapp/buyer/sports/SportsTicket'));

// Dedicated Environment-based Modes (no fragile port fallbacks)
const rawMode = import.meta.env.VITE_APP_MODE || import.meta.env.MODE || 'webapp';
const appMode = ['web', 'webapp', 'vendor', 'rider', 'admin'].includes(rawMode) ? rawMode : 'webapp';
const isWebMode = appMode === 'web';
const isWebappMode = appMode === 'webapp';
const isVendorMode = appMode === 'vendor';
const isRiderMode = appMode === 'rider';
const isAdminMode = appMode === 'admin';

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainContent = document.querySelector('.webapp-main');
    if (mainContent) mainContent.scrollTo(0, 0);
  }, [pathname]);
  return null;
};

// 🛡️ Security Guard Component for Role-Based Access
const RoleGuard = ({ children, allowedRoles, user, loading }) => {
  if (loading) return (
    <div className="flex items-center justify-center h-screen bg-white">
      <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#6366f1]"></div>
    </div>
  );

  if (!user) return <Navigate to="/" replace />;

  const userRole = user.role || 'BUYER';
  if (!allowedRoles.includes(userRole)) {
    console.warn(`🛡️ Access Denied: Role [${userRole}] cannot access these resources.`);
    return <Navigate to="/" replace />;
  }

  return children;
};

export class ErrorBoundary extends React.Component {
  constructor(props) {
    super(props);
    this.state = { hasError: false, error: null };
  }
  static getDerivedStateFromError(error) {
    return { hasError: true, error };
  }
  componentDidCatch(error, errorInfo) {
    console.error("Global ErrorBoundary caught an error", error, errorInfo);
    // Fix #22: In production, send to a monitoring endpoint for tracking
    if (!import.meta.env.DEV) {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        fetch(`${baseUrl}/api/log-error`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: error?.message,
            stack: error?.stack,
            component: errorInfo?.componentStack?.split('\n')?.[1]?.trim()
          })
        }).catch(() => { }); // non-blocking, best-effort
      } catch (_) { /* ignore */ }
    }
  }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{
          minHeight: '100vh',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          background: 'linear-gradient(135deg, #0f172a 0%, #1e1b4b 100%)',
          color: '#f8fafc',
          fontFamily: "'Inter', system-ui, -apple-system, sans-serif",
          padding: '2rem',
          textAlign: 'center'
        }}>
          <div style={{
            background: 'rgba(30, 41, 59, 0.7)',
            backdropFilter: 'blur(16px)',
            borderRadius: '24px',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            padding: '3rem',
            boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
            maxWidth: '560px',
            width: '100%',
            animation: 'fadeIn 0.6s ease-out'
          }}>
            <div style={{
              width: '80px',
              height: '80px',
              background: 'linear-gradient(135deg, #ec4899 0%, #f43f5e 100%)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 1.5rem',
              boxShadow: '0 10px 20px rgba(244, 63, 94, 0.3)'
            }}>
              <span style={{ fontSize: '2.5rem' }}>⚠️</span>
            </div>
            <h1 style={{
              fontSize: '2rem',
              fontWeight: '800',
              marginBottom: '1rem',
              background: 'linear-gradient(to right, #38bdf8, #818cf8)',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>
              Something went wrong
            </h1>
            <p style={{ color: '#94a3b8', fontSize: '1rem', lineHeight: '1.6', marginBottom: '2rem' }}>
              Passwala encountered an unexpected error. We have logged the issue and are looking into it. Your data is secure and safe.
            </p>
            {/* Fix #6: Only show stack trace in development, not production */}
            {this.state.error && import.meta.env.DEV && (
              <div style={{
                background: 'rgba(15, 23, 42, 0.6)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '12px',
                padding: '1rem',
                textAlign: 'left',
                overflowX: 'auto',
                marginBottom: '2rem',
                maxHeight: '150px'
              }}>
                <pre style={{
                  margin: 0,
                  fontFamily: 'monospace',
                  fontSize: '0.85rem',
                  color: '#f43f5e',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-all'
                }}>
                  {this.state.error.stack || this.state.error.toString()}
                </pre>
              </div>
            )}
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button
                onClick={() => window.location.reload()}
                style={{
                  padding: '0.85rem 2rem',
                  background: 'linear-gradient(135deg, #6366f1 0%, #4f46e5 100%)',
                  color: '#ffffff',
                  fontWeight: '600',
                  fontSize: '0.95rem',
                  borderRadius: '12px',
                  border: 'none',
                  cursor: 'pointer',
                  boxShadow: '0 4px 14px rgba(99, 102, 241, 0.4)',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
              >
                Reload Passwala
              </button>
            </div>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

// 🛡️ Sub-tree Error Boundaries
class AdminErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fff1f2', color: '#9f1239', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🔒</span>
            <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Admin Console Error</h2>
            <p style={{ color: '#4b5563', margin: '0.75rem 0' }}>An unexpected error crashed the Admin sub-tree. Please contact the security team if this persists.</p>
            <pre style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', textAlign: 'left', overflowX: 'auto', fontSize: '0.8rem', color: '#374151', margin: '1rem 0' }}>{this.state.error?.toString()}</pre>
            <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '0.75rem', background: '#e11d48', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Reload Admin Portal</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

class VendorErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fff7ed', color: '#c2410c', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🏪</span>
            <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Vendor Workspace Error</h2>
            <p style={{ color: '#4b5563', margin: '0.75rem 0' }}>Your store management page encountered an error. Don't worry, your orders are safe.</p>
            <pre style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', textAlign: 'left', overflowX: 'auto', fontSize: '0.8rem', color: '#374151', margin: '1rem 0' }}>{this.state.error?.toString()}</pre>
            <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '0.75rem', background: '#ea580c', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Reload Workspace</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

class RiderErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#f0fdf4', color: '#15803d', minHeight: '100vh', display: 'flex', flexDirection: 'column', justifyContent: 'center', alignItems: 'center', fontFamily: 'sans-serif' }}>
          <div style={{ background: 'white', padding: '2.5rem', borderRadius: '16px', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)', maxWidth: '500px', width: '100%', textAlign: 'center' }}>
            <span style={{ fontSize: '3rem' }}>🛵</span>
            <h2 style={{ marginTop: '1rem', fontSize: '1.5rem', fontWeight: 'bold' }}>Rider Dashboard Error</h2>
            <p style={{ color: '#4b5563', margin: '0.75rem 0' }}>The delivery dashboard crashed. Your active navigation and order progress are recorded.</p>
            <pre style={{ background: '#f3f4f6', padding: '0.75rem', borderRadius: '8px', textAlign: 'left', overflowX: 'auto', fontSize: '0.8rem', color: '#374151', margin: '1rem 0' }}>{this.state.error?.toString()}</pre>
            <button onClick={() => window.location.reload()} style={{ width: '100%', padding: '0.75rem', background: '#16a34a', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer' }}>Reload Dashboard</button>
          </div>
        </div>
      );
    }
    return this.props.children;
  }
}

const AppContent = ({
  effectiveUser, isProfileComplete, setIsProfileComplete,
  isAdmin, setIsAdmin, location, userCoords, setLocation, userAddress, setUserAddress, setUser,
  isDarkMode, setIsDarkMode, handleLogout
}) => {
  const navigate = useNavigate();
  const locationPath = useLocation().pathname;
  const { t, changeLanguage } = useTranslation();

  // ── Onboarding Wizard: show by default on first load ──────────────────────
  const [showOnboarding, setShowOnboarding] = useState(() => {
    if (!isWebappMode) return false;
    const urlParams = new URLSearchParams(window.location.search);
    if (urlParams.get('onboarding') === 'true' || urlParams.get('force_onboarding') === 'true') {
      localStorage.removeItem('passwala_onboarding_done');
      return true;
    }
    return !localStorage.getItem('passwala_onboarding_done');
  });
  const [onboardingPrefs, setOnboardingPrefs] = useState(() => {
    try {
      const saved = localStorage.getItem('passwala_onboarding_prefs');
      return saved ? JSON.parse(saved) : null;
    } catch (_) {
      return null;
    }
  });

  // Re-evaluate onboarding whenever the user changes (e.g. fresh login)
  useEffect(() => {
    if (!isWebappMode || !effectiveUser) return;
    const urlParams = new URLSearchParams(window.location.search);
    const forceOnboarding = urlParams.get('onboarding') === 'true' || urlParams.get('force_onboarding') === 'true';
    if (forceOnboarding) {
      localStorage.removeItem('passwala_onboarding_done');
      setShowOnboarding(true);
    } else if (!localStorage.getItem('passwala_onboarding_done')) {
      setShowOnboarding(true);
    }
  }, [effectiveUser]);

  const handleOnboardingComplete = (prefs) => {
    setShowOnboarding(false);
    if (!prefs) return;
    setOnboardingPrefs(prefs);

    // 1. Apply selected language vibe
    if (prefs.language) {
      changeLanguage(prefs.language);
    }

    // 2. Apply chosen theme aesthetic
    if (prefs.theme) {
      if (prefs.theme === 'dark' || prefs.theme === 'cyber') {
        setIsDarkMode(true);
      } else {
        setIsDarkMode(false);
      }
    }
  };

  // ── IMP 7: Maintenance mode enforcement ─────────────────────────────────────
  const [maintenanceMode, setMaintenanceMode] = useState(false);
  useEffect(() => {
    if (isAdminMode) return; // admin is always exempt
    const base = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
    fetch(`${base}/api/platform-settings`)
      .then(r => r.ok ? r.json() : null)
      .then(data => { if (data?.settings?.maintenanceMode) setMaintenanceMode(true); })
      .catch(() => { });
  }, []);

  // BUG B6 FIX: Move title useEffect BEFORE the maintenance return
  // All hooks must run unconditionally — early return after hooks is fine
  useEffect(() => {
    if (isAdminMode) {
      document.title = 'Passwala | Admin Portal';
    } else if (isVendorMode) {
      document.title = 'Passwala | Vendor Portal';
    } else if (isRiderMode) {
      document.title = 'Passwala | Rider Portal';
    } else if (isWebappMode) {
      document.title = 'Passwala | Web App';
    } else {
      document.title = 'Passwala | Local Services & Community Hub';
    }
  }, []);

  // Global Notification Listener for Buyer (Using UNIQUE Channel IDs to clean up correctly)
  const { addNotification, fcmToken } = useNotifications();
  useEffect(() => {
    if (!effectiveUser?.id || isVendorMode || isRiderMode || isAdminMode) return;

    const channelName = `orders_${effectiveUser.id}`;
    const sub = supabase.channel(channelName)
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${effectiveUser.id}` }, (payload) => {
        const shortId = payload.new.id.substring(0, 6).toUpperCase();

        // Skip toast for PLACED / PENDING status as CartDrawer already shows a successful placement toast
        if (payload.new.status !== 'PLACED' && payload.new.status !== 'PENDING') {
          toast.success(`Order #${shortId} is now ${payload.new.status}`, {
            icon: '🛵',
            duration: 4000,
            id: `order-update-${payload.new.id}`
          });
        }

        addNotification({
          title: 'Order Status Update',
          text: `Update on Order #${shortId}: Status changed to ${payload.new.status}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'order_update'
        });
      })
      .subscribe();

    return () => {
      supabase.removeChannel(sub);
    };
  }, [effectiveUser, addNotification]);

  // Sync FCM Token exclusively to the Express Backend route (no redundant direct Supabase call)
  useEffect(() => {
    const syncToken = async () => {
      if (!effectiveUser?.id || !fcmToken) return;

      const lastSyncedKey = `fcm_synced_${effectiveUser.id}`;
      if (sessionStorage.getItem(lastSyncedKey) === fcmToken) {
        return; // Already synced in this session, skip redundant call
      }

      console.log('🔄 Syncing FCM token via Backend only:', fcmToken);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        let authHeaders = { 'Content-Type': 'application/json' };

        try {
          const { auth: fbAuth } = await import('./firebase');
          if (fbAuth?.currentUser) {
            const token = await fbAuth.currentUser.getIdToken();
            authHeaders['Authorization'] = `Bearer ${token}`;
          } else {
            // Fallback for mock session/WhatsApp in dev
            const userJson = localStorage.getItem('passwala_user');
            const userObj = userJson ? JSON.parse(userJson) : null;
            const uid = userObj?.uid || userObj?.id;
            if (uid && !import.meta.env.PROD) {
              authHeaders['Authorization'] = `Bearer mock_session_token_${uid}`;
            }
          }
        } catch (_) { /* fallback */ }

        const response = await fetch(`${baseUrl}/api/users/${effectiveUser.id}/fcm-token`, {
          method: 'PUT',
          headers: authHeaders,
          body: JSON.stringify({ fcmToken })
        });
        if (!response.ok) {
          console.warn('⚠️ Server endpoint FCM Token sync failed:', response.statusText);
        } else {
          console.log('✅ FCM Token synced exclusively to Express Backend');
          sessionStorage.setItem(lastSyncedKey, fcmToken); // Cache sync status
        }
      } catch (err) {
        console.warn('⚠️ Error during FCM token backend synchronization:', err);
      }
    };

    syncToken();
  }, [effectiveUser, fcmToken]);

  const [_isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const { addToCart } = useCart();

  useEffect(() => {
    const handleOpenChat = () => setIsAiChatOpen(true);
    const handleCloseChat = () => setIsAiChatOpen(false);
    const handleAddExternal = (e) => {
      if (e.detail) {
        addToCart(e.detail);
      }
    };

    window.addEventListener('open-ai-chat', handleOpenChat);
    window.addEventListener('close-ai-chat', handleCloseChat);
    window.addEventListener('add-to-cart-external', handleAddExternal);

    return () => {
      window.removeEventListener('open-ai-chat', handleOpenChat);
      window.removeEventListener('close-ai-chat', handleCloseChat);
      window.removeEventListener('add-to-cart-external', handleAddExternal);
    };
  }, [addToCart]);

  // Compulsory Location Enforcement for Buyer profile completion
  useEffect(() => {
    const isAuthPage = locationPath === '/auth' || locationPath === '/' || locationPath === '/rider-auth';
    const isProfilePage = locationPath === '/complete-profile';
    const userRole = effectiveUser?.role || 'BUYER';
    if (isWebappMode && effectiveUser && userRole === 'BUYER' && !isProfileComplete && !isAuthPage && !isProfilePage) {
      navigate('/complete-profile');
    }
  }, [effectiveUser, isProfileComplete, locationPath, navigate]);

  // BUG B6 FIX: Return maintenance UI AFTER all hooks have been declared
  if (maintenanceMode) {
    return (
      <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', background: 'linear-gradient(135deg,#0f172a,#1e293b)', color: '#f8fafc', fontFamily: 'Inter,sans-serif', textAlign: 'center', padding: '2rem' }}>
        <div style={{ fontSize: '4rem', marginBottom: '1.5rem' }}>🛠️</div>
        <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '1rem', background: 'linear-gradient(to right, #38bdf8, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>We&apos;ll be back soon!</h1>
        <p style={{ color: '#94a3b8', fontSize: '1.1rem', maxWidth: '400px', lineHeight: '1.7', marginBottom: '2rem' }}>
          Passwala is currently undergoing scheduled maintenance. We should be back online shortly. Thank you for your patience!
        </p>
        <a href="mailto:passwalaoffcial@gmail.com" style={{ color: '#38bdf8', fontSize: '0.9rem' }}>passwalaoffcial@gmail.com</a>
      </div>
    );
  }


  const currentView =
    locationPath === '/near-shops' ? 'NEAR_SHOPS' :
      locationPath === '/expert-services' ? 'EXPERT_SERVICES' :
        locationPath === '/neighbors' ? 'NEIGHBORS' :
          locationPath === '/track-orders' ? 'TRACKING' :
            locationPath === '/profile' ? 'PROFILE' : 'DASHBOARD';

  const isAuthorizedAdmin = isAdmin || (effectiveUser && effectiveUser.role === 'ADMIN');

  return (
    <div className="app-main-layout" style={(isVendorMode || locationPath === '/vendor' || isRiderMode || locationPath === '/rider' || isAdminMode) ? { width: '100%', height: '100vh', overflow: 'hidden', margin: 0, padding: 0 } : {}}>
      {/* 0. Admin Mode (Strict Isolation & Code Splitting via AdminErrorBoundary) */}
      {isAdminMode ? (
        <AdminErrorBoundary>
          {!isAuthorizedAdmin ? (
            <AdminAuth onAdminLogin={() => setIsAdmin(true)} />
          ) : (
            <Suspense fallback={
              <div className="flex flex-col items-center justify-center h-screen bg-slate-900 text-white">
                <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-white mb-4"></div>
                <p className="font-semibold text-slate-400">Loading Secure Admin Console...</p>
              </div>
            }>
              <AdminPanel location={location} setLocation={setLocation} onLogout={() => { setIsAdmin(false); sessionStorage.removeItem('admin_session'); sessionStorage.removeItem('admin_active'); sessionStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_code'); }} />
            </Suspense>
          )}
        </AdminErrorBoundary>
      ) : /* 1. Vendor Mode - Workspace takeover */
        (locationPath === '/vendor' || isVendorMode) ? (
          <VendorErrorBoundary>
            {(!effectiveUser || (effectiveUser.role !== 'VENDOR' && effectiveUser.role !== 'ADMIN')) ? (
              <VendorAuth onLogin={(phone, profile) => {
                const vendorObj = { ...profile, displayName: profile?.name || 'Vendor', phoneNumber: phone, role: 'VENDOR' };
                setUser(vendorObj);
                localStorage.setItem('passwala_user', JSON.stringify(vendorObj));
              }} />
            ) : (
              <RoleGuard allowedRoles={['VENDOR', 'ADMIN']} user={effectiveUser}>
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#ff7622] mb-4"></div>
                    <p className="font-semibold text-slate-400">Loading Vendor Workspace...</p>
                  </div>
                }>
                  <VendorPortal user={effectiveUser} onLogout={handleLogout} />
                </Suspense>
              </RoleGuard>
            )}
          </VendorErrorBoundary>
        ) : locationPath === '/select-location' ? (
          <LocationSelector
            currentLocation={location}
            onLocationChange={(loc, coords) => {
              setLocation(loc, coords);
              navigate(isRiderMode ? '/rider' : '/');
            }}
          />
        ) : (locationPath === '/rider' || isRiderMode) ? (
          /* Rider Mode - Dashboard takeover */
          <RiderErrorBoundary>
            {(!effectiveUser || (effectiveUser.role !== 'RIDER' && effectiveUser.role !== 'ADMIN')) ? (
              <RiderAuth onLogin={(phone, profile) => {
                const riderObj = { ...profile, displayName: profile.name, phoneNumber: phone, role: 'RIDER' };
                setUser(riderObj);
                localStorage.setItem('passwala_user', JSON.stringify(riderObj));
              }} />
            ) : (
              <RoleGuard allowedRoles={['RIDER', 'ADMIN']} user={effectiveUser}>
                <Suspense fallback={
                  <div className="flex flex-col items-center justify-center h-screen bg-slate-950 text-white">
                    <div className="animate-spin rounded-full h-12 w-12 border-t-2 border-b-2 border-[#10b981] mb-4"></div>
                    <p className="font-semibold text-slate-400">Loading Rider Dashboard...</p>
                  </div>
                }>
                  <RiderPortal
                    user={effectiveUser}
                    onLogout={handleLogout}
                    location={location}
                    setLocation={setLocation}
                    userCoords={userCoords}
                  />
                </Suspense>
              </RoleGuard>
            )}
          </RiderErrorBoundary>
        ) : (
          <>
            {/* Global Navbar Logic */}
            {(!isWebappMode && (['/privacy-policy', '/terms', '/refunds-cancellation', '/data-deletion', '/policies'].includes(locationPath) || (locationPath === '/' && !effectiveUser))) ? (
              <Navbar
                isAuthenticated={!!effectiveUser} user={effectiveUser} onLogout={handleLogout}
                onOpenProfile={() => navigate('/profile')} onOpenAI={() => navigate('/')}
                onJoin={() => navigate('/auth')}
              />
            ) : (
              (isWebappMode && effectiveUser && isProfileComplete && !showOnboarding) && (
                <WebappNavbar
                  user={effectiveUser} location={location} onLocationChange={setLocation}
                  isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                  onOpenProfile={() => navigate('/profile')}
                  onBack={
                    locationPath === '/'
                      ? null
                      : ['/sports', '/events', '/near-shops', '/expert-services', '/neighbors', '/city-ride', '/profile', '/select-location'].includes(locationPath)
                        ? () => navigate('/')
                        : () => {
                            if (!window.history.state || window.history.state.idx === 0) {
                              if (locationPath.startsWith('/sports/')) {
                                navigate('/sports');
                              } else if (locationPath.startsWith('/events/')) {
                                navigate('/events');
                              } else {
                                navigate('/');
                              }
                            } else {
                              navigate(-1);
                            }
                          }
                  }
                  title={
                    locationPath === '/profile' ? t('profile') :
                      locationPath === '/near-shops' ? t('near_shops') :
                        locationPath === '/expert-services' ? t('expert_services') :
                          locationPath === '/track-orders' ? t('order_history') :
                            locationPath === '/neighbors' ? t('community') :
                              locationPath === '/order-history' ? t('order_history') :
                                locationPath === '/wallet' ? t('passwala_wallet') :
                                  locationPath === '/manage-addresses' ? 'My Addresses' :
                                    locationPath === '/privacy-security' ? t('privacy_security') :
                                      locationPath === '/help-support' ? t('help_support') :
                                        locationPath === '/settings' ? t('settings') : null
                  }
                />
              )
            )}

            {/* 3. Main Content Routes (Leveraging Lazy loading dynamically) */}
            <main className={isWebappMode ? `webapp-main ${currentView === 'PROFILE' ? 'profile-mode' : ''}` : 'web-marketing-main'}>
              <Suspense fallback={
                <div className="flex items-center justify-center min-h-[350px] w-full bg-transparent">
                  <div className="animate-spin rounded-full h-10 w-10 border-t-2 border-b-2 border-[#6366f1]"></div>
                </div>
              }>
                <Routes>
                  <Route path="/admin" element={
                    <Suspense fallback={<div className="flex h-screen items-center justify-center bg-gray-50"><div className="animate-spin rounded-full h-12 w-12 border-4 border-[#ff6b00] border-t-transparent"></div></div>}>
                      {sessionStorage.getItem('admin_token') ? (
                        <AdminPanel location={location} setLocation={setLocation} onLogout={() => { sessionStorage.removeItem('admin_token'); window.location.reload(); }} />
                      ) : (
                        <AdminAuth onAdminLogin={() => { window.location.reload(); }} />
                      )}
                    </Suspense>
                  } />

                  <Route path="/" element={
                    <>
                      {isWebappMode ? (
                        (isProfileComplete) ? (
                          <NeighborhoodHub
                            user={effectiveUser}
                            setLocation={setLocation}
                            location={location}
                            onLogout={handleLogout}
                            onboardingPrefs={onboardingPrefs}
                            onNavigate={(v) => navigate(v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'NEIGHBORS' ? '/neighbors' : v === 'CITY_RIDES' ? '/city-ride' : v === 'EVENTS' ? '/events' : v === 'SPORTS' ? '/sports' : '/')}
                          />
                        ) : <Auth onLogin={(userData) => {
                          localStorage.setItem('passwala_user', JSON.stringify(userData));
                          localStorage.setItem('passwala_profile_complete', 'true');

                          const newLoc = localStorage.getItem('passwala_location') || 'India';
                          const savedCoords = localStorage.getItem('passwala_coords');
                          const newCoords = savedCoords ? JSON.parse(savedCoords) : { lat: 20.5937, lng: 78.9629 };
                          const savedAddr = localStorage.getItem('passwala_user_address');
                          const newAddr = savedAddr ? JSON.parse(savedAddr) : {
                            address_line_1: newLoc,
                            city: 'Ahmedabad',
                            state: 'Gujarat',
                            pincode: '380015',
                            society: newLoc.split(',')[0],
                            house_no: 'Home',
                            floor: 'Ground',
                            is_default: true
                          };

                          setLocation(newLoc, newCoords);
                          setUserAddress(newAddr);
                          setUser(userData);
                          setIsProfileComplete(true);
                          navigate('/');
                        }} />
                      ) : (
                        <>
                          <Hero />
                          <InfoSection />
                        </>
                      )}
                    </>
                  } />

                  {/* Public Legal & Policy Routes */}
                  <Route path="/privacy-policy" element={<Policies />} />
                  <Route path="/terms" element={<Policies />} />
                  <Route path="/refunds-cancellation" element={<Policies />} />
                  <Route path="/data-deletion" element={<Policies />} />
                  <Route path="/policies" element={<Policies />} />

                  {/* Common Application Routes (Suspended correctly) */}
                  {/* Routes for features — redirected to home if not launched yet */}
                  <Route path="/near-shops" element={!isFeatureEnabled('shopping') ? <Navigate to="/" /> : (effectiveUser ? <NearShops onBack={() => navigate('/')} location={location} userCoords={userCoords} /> : <Navigate to="/" />)} />
                  <Route path="/expert-services" element={!isFeatureEnabled('services') ? <Navigate to="/" /> : (effectiveUser ? <ExpertServices onBack={() => navigate('/')} location={location} userCoords={userCoords} /> : <Navigate to="/" />)} />
                  <Route path="/neighbors" element={!isFeatureEnabled('community') ? <Navigate to="/" /> : (effectiveUser ? <NeighborsCommunity onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />)} />
                  <Route path="/track-orders" element={!isFeatureEnabled('shopping') ? <Navigate to="/" /> : (effectiveUser ? <TrackOrders user={effectiveUser} userCoords={userCoords} onBack={() => navigate('/')} /> : <Navigate to="/" />)} />
                  <Route path="/city-ride" element={effectiveUser ? <CityTicketBooking user={effectiveUser} userCoords={userCoords} onBack={() => navigate('/')} /> : <Navigate to="/" />} />
                  <Route path="/ride-checkout" element={effectiveUser ? <RideCheckout /> : <Navigate to="/" />} />
                  <Route path="/ride-ticket" element={effectiveUser ? <RideTicket /> : <Navigate to="/" />} />
                  {/* IMPORTANT: /events/checkout MUST be defined before /events/:id
                      to prevent React Router from treating 'checkout' as an event ID param.
                      Do NOT reorder these routes. */}
                  <Route path="/events" element={effectiveUser ? <EventHub onBack={() => navigate('/')} /> : <Navigate to="/" />} />
                  <Route path="/events/checkout" element={effectiveUser ? <EventCheckout user={effectiveUser} /> : <Navigate to="/" />} />
                  <Route path="/events/ticket" element={effectiveUser ? <EventTicket /> : <Navigate to="/" />} />
                  <Route path="/events/:id" element={effectiveUser ? <EventDetails user={effectiveUser} /> : <Navigate to="/" />} />
                  {/* Sports Venue Booking — checkout/ticket BEFORE :id param to avoid collision */}
                  <Route path="/sports" element={effectiveUser ? <SportsHub user={effectiveUser} userCoords={userCoords} /> : <Navigate to="/" />} />
                  <Route path="/sports/checkout" element={effectiveUser ? <SportsCheckout user={effectiveUser} /> : <Navigate to="/" />} />
                  <Route path="/sports/ticket" element={effectiveUser ? <SportsTicket /> : <Navigate to="/" />} />
                  <Route path="/sports/:id" element={effectiveUser ? <VenueDetails user={effectiveUser} /> : <Navigate to="/" />} />
                  <Route path="/profile" element={effectiveUser ? <WebappProfile user={effectiveUser} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} onUpdateUser={(updated) => setUser(updated)} /> : <Navigate to="/" />} />
                  <Route path="/order-history" element={effectiveUser ? <OrderHistory /> : <Navigate to="/" />} />
                  <Route path="/wallet" element={effectiveUser ? <Wallet user={effectiveUser} /> : <Navigate to="/" />} />
                  <Route path="/privacy-security" element={effectiveUser ? <PrivacySecurity /> : <Navigate to="/" />} />
                  <Route path="/help-support" element={effectiveUser ? <HelpSupport /> : <Navigate to="/" />} />
                  <Route path="/settings" element={effectiveUser ? <AppSettings isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} /> : <Navigate to="/" />} />
                  <Route path="/select-location" element={effectiveUser ? <LocationSelector currentLocation={location} onLocationChange={setLocation} /> : <Navigate to="/" />} />
                  <Route path="/manage-addresses" element={effectiveUser ? <AddressManager user={effectiveUser} /> : <Navigate to="/" />} />
                  <Route path="/complete-profile" element={effectiveUser ? <CustomerDetails user={effectiveUser} onComplete={(addr, name) => { setIsProfileComplete(true); setUserAddress(addr); if (name) { setUser(prev => ({ ...prev, displayName: name })); } navigate('/'); }} /> : <Navigate to="/" />} />
                </Routes>
              </Suspense>
            </main>

            {/* 4. Global Footers/Navs — hidden during onboarding */}
            {isWebappMode && effectiveUser && isProfileComplete && !showOnboarding && (
              <BottomNav activeTab={currentView} user={effectiveUser} onTabChange={(v) => {
                if (v === 'NEIGHBORS') { setShowComingSoon(true); return; }
                const routeMap = {
                  'DASHBOARD': '/',
                  'NEAR_SHOPS': '/near-shops',
                  'EXPERT_SERVICES': '/expert-services',
                  'TRACKING': '/track-orders',
                  'PROFILE': '/profile',
                };
                if (routeMap[v]) navigate(routeMap[v]);
              }} />
            )}

            {/* ── Duolingo-style Onboarding Wizard (first-time users only, shown after login & profile complete) ── */}
            {isWebappMode && effectiveUser && isProfileComplete && showOnboarding && (
              <OnboardingWizard user={effectiveUser} onComplete={handleOnboardingComplete} />
            )}

            {/* ── Coming Soon Modal ── */}
            {showComingSoon && (
              <div
                onClick={() => setShowComingSoon(false)}
                style={{
                  position: 'fixed', inset: 0, zIndex: 9999,
                  background: 'rgba(0,0,0,0.45)',
                  backdropFilter: 'blur(6px)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  padding: '1.5rem'
                }}
              >
                <div
                  onClick={(e) => e.stopPropagation()}
                  style={{
                    background: 'linear-gradient(135deg,#fff 0%,#fff7f2 100%)',
                    borderRadius: '24px',
                    padding: '2.5rem 2rem 2rem',
                    maxWidth: '340px', width: '100%',
                    textAlign: 'center',
                    boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
                    border: '1.5px solid rgba(255,118,34,0.18)',
                    animation: 'cs-pop 0.35s cubic-bezier(0.175,0.885,0.32,1.275)'
                  }}
                >
                  <style>{`
                    @keyframes cs-pop {
                      from { opacity:0; transform:scale(0.75) translateY(30px); }
                      to   { opacity:1; transform:scale(1) translateY(0); }
                    }
                    @keyframes cs-rocket {
                      0%,100% { transform:translateY(0) rotate(-10deg); }
                      50%     { transform:translateY(-10px) rotate(-10deg); }
                    }
                  `}</style>

                  {/* Icon */}
                  <div style={{ fontSize: '3.5rem', lineHeight: 1, marginBottom: '0.75rem', display: 'inline-block', animation: 'cs-rocket 1.6s ease-in-out infinite' }}>🚀</div>

                  {/* Badge */}
                  <div style={{
                    display: 'inline-block', background: 'linear-gradient(135deg,#ff7622,#ff9f4a)',
                    color: 'white', fontSize: '0.65rem', fontWeight: 900, letterSpacing: '0.12em',
                    padding: '4px 12px', borderRadius: '100px', marginBottom: '1rem',
                    textTransform: 'uppercase'
                  }}>Coming Soon</div>

                  <h2 style={{ fontSize: '1.35rem', fontWeight: 800, color: '#0f172a', margin: '0 0 0.5rem' }}>Community Hub 🏘️</h2>
                  <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.6, margin: '0 0 1.75rem' }}>
                    Connect with your neighbors, join local groups, share updates &amp; discover what&apos;s happening around you — <strong style={{ color: '#ff7622' }}>launching very soon!</strong>
                  </p>

                  <button
                    onClick={() => setShowComingSoon(false)}
                    style={{
                      width: '100%', padding: '0.85rem',
                      background: 'linear-gradient(135deg,#ff7622,#ff9f4a)',
                      color: 'white', border: 'none', borderRadius: '14px',
                      fontWeight: 800, fontSize: '0.95rem', cursor: 'pointer',
                      boxShadow: '0 6px 20px rgba(255,118,34,0.35)',
                      transition: 'transform 0.15s'
                    }}
                    onMouseDown={e => e.currentTarget.style.transform = 'scale(0.97)'}
                    onMouseUp={e => e.currentTarget.style.transform = 'scale(1)'}
                  >
                    Got it! ✨
                  </button>
                </div>
              </div>
            )}

            {isWebMode && <Footer />}

            {/* 5. Drawers / Modals */}
            {effectiveUser && !showOnboarding && isProfileComplete && (
              <CartDrawer location={location} isProfileComplete={isProfileComplete} userAddress={userAddress} user={effectiveUser} />
            )}
            {(!effectiveUser || !showOnboarding) && (
              <AIChatWidget user={effectiveUser} onLogin={(userData) => {
                localStorage.setItem('passwala_user', JSON.stringify(userData));
                localStorage.setItem('passwala_profile_complete', 'true');

                const newLoc = localStorage.getItem('passwala_location') || 'Satellite, Ahmedabad';
                const savedCoords = localStorage.getItem('passwala_coords');
                const newCoords = savedCoords ? JSON.parse(savedCoords) : { lat: 23.0305, lng: 72.5075 };
                const savedAddr = localStorage.getItem('passwala_user_address');
                const newAddr = savedAddr ? JSON.parse(savedAddr) : {
                  address_line_1: newLoc,
                  city: 'Ahmedabad',
                  state: 'Gujarat',
                  pincode: '380015',
                  society: newLoc.split(',')[0],
                  house_no: 'Home',
                  floor: 'Ground',
                  is_default: true
                };

                setLocation(newLoc, newCoords);
                setUserAddress(newAddr);
                setUser(userData);
                setIsProfileComplete(true);
              }} />
            )}
          </>
        )}
    </div>
  );
};



// Fix #3: FCMTokenSync removed — FCM token is synced exclusively via the Express backend
// in AppContent's syncToken effect. A second direct Supabase write here caused a duplicate
// write race condition. Keeping this comment so the intent is clear.


function App() {
  const {
    user,
    setUser,
    authLoading,
    isProfileComplete,
    setIsProfileComplete,
    userAddress,
    setUserAddress,
    minSplashDone,
    isAdmin,
    setIsAdmin,
    handleLogout
  } = useAuth();

  const {
    location,
    userCoords,
    updateLocation
  } = useAppLocation();

  const [isDarkMode, setIsDarkMode] = useTheme();

  useEffect(() => {
    const handleToggle = () => setIsDarkMode(prev => !prev);
    window.addEventListener('toggle-theme-external', handleToggle);
    return () => window.removeEventListener('toggle-theme-external', handleToggle);
  }, [setIsDarkMode]);

  useEffect(() => {
    const handleUpdateUser = (e) => {
      if (e.detail) {
        setUser(e.detail);
      }
    };
    window.addEventListener('update-user-external', handleUpdateUser);
    return () => window.removeEventListener('update-user-external', handleUpdateUser);
  }, [setUser]);

  useEffect(() => {
    const handleLogoutTrigger = () => handleLogout();
    window.addEventListener('logout-external', handleLogoutTrigger);
    return () => window.removeEventListener('logout-external', handleLogoutTrigger);
  }, [handleLogout]);

  useEffect(() => {
    const handleLocationUpdate = (e) => {
      if (e.detail) {
        updateLocation(e.detail.locationName, e.detail.coords || { lat: 23.0305, lng: 72.5075 });
        setUserAddress(e.detail.address);
      }
    };
    window.addEventListener('update-location-external', handleLocationUpdate);
    return () => window.removeEventListener('update-location-external', handleLocationUpdate);
  }, [updateLocation, setUserAddress]);

  return (
    <ErrorBoundary>
      {(authLoading || !minSplashDone) ? (
        <SplashScreen />
      ) : (
        <SearchProvider>
          <NotificationProvider>
            {/* Fix #3: FCMTokenSync removed — see comment above App() */}
            <LanguageProvider>
              <CartProvider user={user}>
                <div className="app-container">
                  <Toaster
                    position="bottom-center"
                    toastOptions={{
                      className: 'passwala-toast',
                      duration: 3000,
                      style: {
                        background: '#1e293b',
                        color: '#fff',
                        borderRadius: '12px',
                        padding: '10px 18px',
                        fontSize: '0.85rem',
                        fontWeight: '600',
                        boxShadow: '0 8px 30px rgba(0,0,0,0.2)',
                        maxWidth: '90vw'
                      },
                    }}
                  />
                  <ScrollToTop />
                  <AppContent
                    effectiveUser={user}
                    isProfileComplete={isProfileComplete}
                    setIsProfileComplete={setIsProfileComplete}
                    isAdmin={isAdmin}
                    setIsAdmin={setIsAdmin}
                    location={location}
                    userCoords={userCoords}
                    setLocation={updateLocation}
                    userAddress={userAddress}
                    setUserAddress={setUserAddress}
                    setUser={setUser}
                    isDarkMode={isDarkMode}
                    setIsDarkMode={setIsDarkMode}
                    handleLogout={handleLogout}
                  />
                </div>
              </CartProvider>
            </LanguageProvider>
          </NotificationProvider>
        </SearchProvider>
      )}
    </ErrorBoundary>
  );
}

export default App
