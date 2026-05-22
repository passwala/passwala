import React, { Suspense, useState, useEffect } from 'react'
import { Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
import Navbar from './web/Navbar'
import Hero from './web/Hero'
import AIRecommendations from './web/AIRecommendations'
import QuickServices from './web/QuickServices'
import Services from './web/Services'
import Essentials from './web/Essentials'
import NearbyDeals from './web/NearbyDeals'
import Community from './web/Community'
import VendorCTA from './web/VendorCTA'
import SplashScreen from './webapp/SplashScreen'
import NeighborhoodHub from './webapp/buyer/NeighborhoodHub'
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
import './App.css'

import { supabase } from './supabase'
import AIAssistant from './webapp/AIAssistant'
import CustomerDetails from './webapp/CustomerDetails'
import { CartProvider, useCart } from './context/CartContext'
import CartDrawer from './webapp/buyer/CartDrawer'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
import { SearchProvider } from './context/SearchContext'
import { LanguageProvider } from './webapp/LanguageContext'

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
const PlanetSoftweb = React.lazy(() => import('./planet_softweb/PlanetSoftweb'));

// Dedicated Environment-based Modes (no fragile port fallbacks)
const appMode = import.meta.env.VITE_APP_MODE || import.meta.env.MODE || 'web';
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
            {this.state.error && (
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
        toast.success(`Order #${shortId} is now ${payload.new.status}`, {
          icon: '🛵',
          duration: 4000,
          id: `order-update-${payload.new.id}`
        });

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
      console.log('🔄 Syncing FCM token via Backend only:', fcmToken);
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        
        const response = await fetch(`${baseUrl}/api/users/${effectiveUser.id}/fcm-token`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ fcmToken })
        });
        if (!response.ok) {
          console.warn('⚠️ Server endpoint FCM Token sync failed:', response.statusText);
        } else {
          console.log('✅ FCM Token synced exclusively to Express Backend');
        }
      } catch (err) {
        console.warn('⚠️ Error during FCM token backend synchronization:', err);
      }
    };
    
    syncToken();
  }, [effectiveUser, fcmToken]);

  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
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
              <AdminPanel location={location} onLogout={() => { setIsAdmin(false); sessionStorage.removeItem('admin_session'); sessionStorage.removeItem('admin_active'); sessionStorage.removeItem('admin_token'); sessionStorage.removeItem('admin_code'); }} />
            </Suspense>
          )}
        </AdminErrorBoundary>
      ) : /* 1. Vendor Mode - Workspace takeover */
        (locationPath === '/vendor' || isVendorMode) ? (
          <VendorErrorBoundary>
            {(!effectiveUser) ? (
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
            {(!effectiveUser) ? (
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
            {isWebMode ? (
              <Navbar
                isAuthenticated={!!effectiveUser} user={effectiveUser} onLogout={handleLogout}
                onOpenProfile={() => navigate('/profile')} onOpenAI={() => navigate('/')}
                onJoin={() => navigate('/auth')}
              />
            ) : (
              (effectiveUser && isProfileComplete) && (
                <WebappNavbar
                  user={effectiveUser} location={location} onLocationChange={setLocation}
                  isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                  onOpenProfile={() => navigate('/profile')}
                  onBack={locationPath !== '/' ? () => navigate(-1) : null}
                  title={
                    locationPath === '/profile' ? 'Profile' :
                      locationPath === '/near-shops' ? 'Near Shops' :
                        locationPath === '/expert-services' ? 'Local Experts' :
                          locationPath === '/track-orders' ? 'Active Orders' :
                            locationPath === '/neighbors' ? 'Community' :
                              locationPath === '/order-history' ? 'Order History' :
                                locationPath === '/wallet' ? 'Passwala Wallet' :
                                  locationPath === '/privacy-security' ? 'Privacy & Security' :
                                    locationPath === '/help-support' ? 'Help & Support' :
                                      locationPath === '/settings' ? 'Settings' : null
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
                  <Route path="/" element={
                    <>
                      {isWebappMode ? (
                        (isProfileComplete) ? <NeighborhoodHub
                          user={effectiveUser}
                          setLocation={setLocation}
                          location={location}
                          onLogout={handleLogout}
                          onNavigate={(v) => navigate(v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'NEIGHBORS' ? '/neighbors' : '/')}
                        /> : <Auth onLogin={(userData) => {
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
                          {effectiveUser && (
                            <NeighborhoodHub user={effectiveUser} isProfileComplete={isProfileComplete} onNavigate={(v) => navigate(v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'NEIGHBORS' ? '/neighbors' : '/')} />
                          )}
                          <Hero />
                          <AIRecommendations />
                          <QuickServices />
                          <Services />
                          <Essentials />
                          <NearbyDeals />
                          <Community />
                          <VendorCTA onOpenVendor={() => window.open(import.meta.env.VITE_VENDOR_PORTAL_URL || `http://${window.location.hostname}:3002`, '_blank')} />
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
                  <Route path="/near-shops" element={effectiveUser ? <NearShops onBack={() => navigate('/')} location={location} userCoords={userCoords} /> : <Navigate to="/" />} />
                  <Route path="/expert-services" element={effectiveUser ? <ExpertServices onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />} />
                  <Route path="/neighbors" element={effectiveUser ? <NeighborsCommunity onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />} />
                  <Route path="/track-orders" element={effectiveUser ? <TrackOrders user={effectiveUser} userCoords={userCoords} onBack={() => navigate('/')} /> : <Navigate to="/" />} />
                  <Route path="/profile" element={effectiveUser ? <WebappProfile user={effectiveUser} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} onUpdateUser={(updated) => setUser(updated)} /> : <Navigate to="/" />} />
                  <Route path="/order-history" element={effectiveUser ? <OrderHistory /> : <Navigate to="/" />} />
                  <Route path="/wallet" element={effectiveUser ? <Wallet user={effectiveUser} /> : <Navigate to="/" />} />
                  <Route path="/privacy-security" element={effectiveUser ? <PrivacySecurity /> : <Navigate to="/" />} />
                  <Route path="/help-support" element={effectiveUser ? <HelpSupport /> : <Navigate to="/" />} />
                  <Route path="/settings" element={effectiveUser ? <AppSettings isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} /> : <Navigate to="/" />} />
                  <Route path="/select-location" element={effectiveUser ? <LocationSelector currentLocation={location} onLocationChange={setLocation} /> : <Navigate to="/" />} />
                  <Route path="/complete-profile" element={effectiveUser ? <CustomerDetails user={effectiveUser} onComplete={(addr, name) => { setIsProfileComplete(true); setUserAddress(addr); if (name) { setUser(prev => ({ ...prev, displayName: name })); } navigate('/'); }} /> : <Navigate to="/" />} />
                  <Route path="/planet-softweb" element={<PlanetSoftweb />} />
                </Routes>
              </Suspense>
            </main>

            {/* 4. Global Footers/Navs */}
            {isWebappMode && effectiveUser && isProfileComplete && (
              <BottomNav activeTab={currentView} onTabChange={(v) => navigate(v === 'DASHBOARD' ? '/' : v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'TRACKING' ? '/track-orders' : v === 'NEIGHBORS' ? '/neighbors' : v === 'PROFILE' ? '/profile' : '/')} />
            )}

            {isWebMode && <Footer />}

            {/* 5. Drawers / Modals */}
            <CartDrawer location={location} isProfileComplete={isProfileComplete} userAddress={userAddress} />
            <AIAssistant isOpen={isAiChatOpen} onClose={() => setIsAiChatOpen(false)} user={effectiveUser} />
          </>
        )}
    </div>
  );
};



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

  return (
    <ErrorBoundary>
      {(authLoading || !minSplashDone) ? (
        <SplashScreen />
      ) : (
        <SearchProvider>
          <NotificationProvider>
            <LanguageProvider>
              <CartProvider user={user}>
                <div className="app-container">
                  <Toaster
                    position="top-center"
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
