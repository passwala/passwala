/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react'
import { BrowserRouter as Router, Routes, Route, useNavigate, Navigate, useLocation } from 'react-router-dom'
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
import AdminPanel from './webapp/AdminPanel'
import NearShops from './webapp/buyer/NearShops'
import ExpertServices from './webapp/buyer/ExpertServices'
import NeighborsCommunity from './webapp/buyer/NeighborsCommunity'
import WebappProfile from './webapp/WebappProfile'
import WebappNavbar from './webapp/WebappNavbar'
import BottomNav from './webapp/BottomNav'
import LocationSelector from './webapp/LocationSelector'
import AdminAuth from './webapp/AdminAuth'
import VendorPortal from './vendor/VendorPortal'
import VendorAuth from './vendor/VendorAuth'
import RiderPortal from './rider/RiderPortal'
import RiderAuth from './rider/RiderAuth'
import TrackOrders from './webapp/buyer/TrackOrders'
import OrderHistory from './webapp/profile_pages/OrderHistory'
import Wallet from './webapp/profile_pages/Wallet'
import PrivacySecurity from './webapp/profile_pages/PrivacySecurity'
import HelpSupport from './webapp/profile_pages/HelpSupport'
import AppSettings from './webapp/profile_pages/AppSettings'
import Footer from './web/Footer'
import { Toaster, toast } from 'react-hot-toast'
import { LayoutGroup } from 'framer-motion'
import './App.css'

import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import { supabase } from './supabase'
import AIAssistant from './webapp/AIAssistant'
import CustomerDetails from './webapp/CustomerDetails'
import { CartProvider } from './context/CartContext'
import CartDrawer from './webapp/buyer/CartDrawer'
import { NotificationProvider } from './context/NotificationContext'
import { SearchProvider } from './context/SearchContext'
import { LanguageProvider } from './webapp/LanguageContext'

const ScrollToTop = () => {
  const { pathname } = useLocation();
  useEffect(() => {
    window.scrollTo(0, 0);
    const mainContent = document.querySelector('.webapp-main-content');
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

const AppContent = ({ 
  effectiveUser, isProfileComplete, setIsProfileComplete, updateDemoUser, 
  isWebappMode, isAdmin, setIsAdmin, location, userCoords, setLocation 
}) => {
  const [loading, setLoading] = useState(true);
  const [isVendor, setIsVendor] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const navigate = useNavigate();
  const locationPath = useLocation().pathname;
  const isWebMode = window.location.port === '3000';
  const isVendorMode = window.location.port === '3002';
  const isRiderMode = window.location.port === '3003';

  // Admin Persistence
  useEffect(() => {
    localStorage.setItem('admin_session', isAdmin);
    if (isAdmin) sessionStorage.setItem('admin_active', 'true');
    else sessionStorage.removeItem('admin_active');
  }, [isAdmin]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.body.classList.add('dark-mode');
      localStorage.setItem('theme', 'dark');
    } else {
      document.body.classList.remove('dark-mode');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  useEffect(() => {
    const splashTimer = setTimeout(() => setLoading(false), isWebappMode ? 1500 : 500);
    return () => clearTimeout(splashTimer);
  }, [isWebappMode]);

  const handleLogout = async (skipToast = false) => {
    try {
      updateDemoUser(null);
      if (auth.currentUser) {
        await auth.signOut().catch(e => console.warn('Firebase Signout Skip:', e));
      }
      localStorage.clear();
      if (!skipToast) toast.success('Signed Out.');
      if (window.location.host.includes('3002')) {
        window.location.href = '/'; 
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
      window.location.href = '/';
    }
  };

  const currentView = 
    locationPath === '/near-shops' ? 'NEAR_SHOPS' :
    locationPath === '/expert-services' ? 'EXPERT_SERVICES' :
    locationPath === '/neighbors' ? 'NEIGHBORS' :
    locationPath === '/track-orders' ? 'TRACKING' :
    locationPath === '/profile' ? 'PROFILE' : 'DASHBOARD';

  console.log('[PASSWALA-IDENTITY] Mode:', isWebappMode ? 'BUYER-PORTAL' : isVendorMode ? 'VENDOR-PORTAL' : isRiderMode ? 'RIDER-PORTAL' : 'WEB-PORTAL', '| User:', effectiveUser?.uid || 'Guest');

  // 🛡️ Final Security Check for Admin
  const isAuthorizedAdmin = isAdmin || (effectiveUser && effectiveUser.role === 'ADMIN');
  if (isAuthorizedAdmin) return <AdminPanel onLogout={() => { setIsAdmin(false); localStorage.removeItem('admin_session'); sessionStorage.removeItem('admin_active'); }} />;
  
  return (
    <div className="app-main-layout" style={(isVendorMode || locationPath === '/vendor' || isRiderMode || locationPath === '/rider') ? { width: '100%', margin: 0, padding: 0 } : {}}>
      {/* 1. Vendor Mode (Port 3002) - High level takeover */}
      {(isVendorMode || locationPath === '/vendor') ? (
        (!effectiveUser) ? (
          <VendorAuth onLogin={(isDemo, num) => {
            if (isDemo) updateDemoUser({ phoneNumber: `+91${num || '9999999999'}`, displayName: 'Demo Partner' });
          }} />
        ) : (
          <VendorPortal user={effectiveUser} onLogout={handleLogout} />
        )
      ) : (isRiderMode || locationPath === '/rider') ? (
        /* Rider Mode (Port 3003) */
        (!effectiveUser) ? (
          <RiderAuth onLogin={(isDemo, num, mockUser) => {
             updateDemoUser({ 
               phoneNumber: `+91${num || '8888888888'}`, 
               displayName: mockUser?.name || 'Demo Rider',
               photoURL: mockUser?.photo || null,
               vehicleNo: mockUser?.vehicleNo || 'Bajaj Pulsar (GJ-01-AB-1234)',
               licenseNo: mockUser?.licenseNo || 'Driving License',
               idProof: mockUser?.idProof || 'Aadhar Card',
               id: mockUser?.user_id || 'demo-user-123',
               rider_id: mockUser?.rider_id || 'demo-rider-123'
             });
          }} />
        ) : (
          <RiderPortal user={effectiveUser} onLogout={handleLogout} />
        )
      ) : (
        <>
          {/* Global Navbar Logic */}
          {isWebMode ? (
            <Navbar 
              isAuthenticated={!!effectiveUser} user={effectiveUser} onLogout={handleLogout}
              onOpenProfile={() => setShowProfile(true)} onOpenAI={() => navigate('/')}
              onSwitchToVendor={() => setIsVendor(true)} onJoin={() => setShowAuthModal(true)}
            />
          ) : (
            effectiveUser && (
              <WebappNavbar 
                user={effectiveUser} location={location} onLocationChange={setLocation}
                isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)}
                onOpenProfile={() => navigate('/profile')} 
                onBack={locationPath !== '/' ? () => navigate(-1) : null}
                title={
                  currentView === 'PROFILE' ? 'Profile' : 
                  currentView === 'NEAR_SHOPS' ? 'Near Shops' :
                  currentView === 'EXPERT_SERVICES' ? 'Local Experts' :
                  currentView === 'TRACKING' ? 'Active Orders' :
                  currentView === 'NEIGHBORS' ? 'Community' : null
                }
              />
            )
          )}

          {/* 3. Main Content Routes */}
          <main className={isWebappMode ? `webapp-main ${currentView === 'PROFILE' ? 'profile-mode' : ''}` : 'web-marketing-main'}>
            <Routes>
              {/* Home Route */}
              <Route path="/" element={
                 <>
                   {/* Webapp Logic (Auth or Hub) */}
                   {isWebappMode ? (
                     (!effectiveUser || !effectiveUser.displayName || !isProfileComplete) ? <Auth onLogin={(mockData) => { if (mockData) updateDemoUser(mockData); setIsProfileComplete(true); navigate('/'); }} /> : <NeighborhoodHub user={effectiveUser} isProfileComplete={isProfileComplete} onNavigate={(v) => navigate(v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'NEIGHBORS' ? '/neighbors' : v === '/complete-profile' ? '/complete-profile' : '/')} />
                   ) : (
                     /* Marketing Logic (Hub on top if logged in, then standard homepage) */
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
                        <VendorCTA onOpenVendor={() => window.open('http://localhost:3002', '_blank')} />
                     </>
                   )}
                 </>
              } />

              {/* Common Application Routes */}
              <Route path="/admin" element={!isAdmin ? <AdminAuth onAdminLogin={() => setIsAdmin(true)} /> : <Navigate to="/" />} />
              <Route path="/near-shops" element={effectiveUser ? <NearShops onBack={() => navigate('/')} location={location} userCoords={userCoords} /> : <Navigate to="/" />} />
              <Route path="/expert-services" element={effectiveUser ? <ExpertServices onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />} />
              <Route path="/neighbors" element={effectiveUser ? <NeighborsCommunity onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />} />
              <Route path="/track-orders" element={effectiveUser ? <TrackOrders onBack={() => navigate('/')} /> : <Navigate to="/" />} />
              <Route path="/profile" element={effectiveUser ? <WebappProfile user={effectiveUser} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} /> : <Navigate to="/" />} />
              <Route path="/order-history" element={effectiveUser ? <OrderHistory /> : <Navigate to="/" />} />
              <Route path="/wallet" element={effectiveUser ? <Wallet /> : <Navigate to="/" />} />
              <Route path="/privacy-security" element={effectiveUser ? <PrivacySecurity /> : <Navigate to="/" />} />
              <Route path="/help-support" element={effectiveUser ? <HelpSupport /> : <Navigate to="/" />} />
              <Route path="/settings" element={effectiveUser ? <AppSettings isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} /> : <Navigate to="/" />} />
              <Route path="/select-location" element={effectiveUser ? <LocationSelector currentLocation={location} onLocationChange={setLocation} /> : <Navigate to="/" />} />
              <Route path="/complete-profile" element={effectiveUser ? <CustomerDetails user={effectiveUser} onComplete={() => { setIsProfileComplete(true); navigate('/'); }} /> : <Navigate to="/" />} />
            </Routes>
          </main>

          {/* 4. Global Footers/Navs */}
          {isWebappMode && effectiveUser && (
            <BottomNav activeTab={currentView} onTabChange={(v) => navigate(v === 'DASHBOARD' ? '/' : v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'TRACKING' ? '/track-orders' : v === 'NEIGHBORS' ? '/neighbors' : v === 'PROFILE' ? '/profile' : '/')} />
          )}

          {isWebMode && <Footer />}

          {/* 5. Drawers / Modals */}
          <CartDrawer />
          <AIAssistant isOpen={false} onClose={() => {}} onOpen={() => {}} />
        </>
      )}
    </div>
  );
};

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { hasError: false, error: null }; }
  static getDerivedStateFromError(error) { return { hasError: true, error }; }
  render() {
    if (this.state.hasError) {
      return (
        <div style={{ padding: '2rem', background: '#fee2e2', color: '#991b1b', minHeight: '100vh' }}>
          <h2>🚨 App Crash Detected</h2>
          <pre style={{ whiteSpace: 'pre-wrap', marginTop: '1rem' }}>{this.state.error?.toString()}</pre>
          <button onClick={() => window.location.reload()} style={{ marginTop: '1rem', padding: '0.5rem 1rem', background: '#b91c1c', color: 'white', borderRadius: '8px' }}>Reload App</button>
        </div>
      );
    }
    return this.props.children;
  }
}

function App() {
  const [user, setUser] = useState(null);
  const [demoUser, setDemoUser] = useState(() => {
    const saved = localStorage.getItem('v_demo_session');
    return saved ? JSON.parse(saved) : null;
  });
  const [authLoading, setAuthLoading] = useState(true);
  const [isProfileComplete, setIsProfileComplete] = useState(true);
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => {
    const isWebapp = window.location.port === '3001';
    const hasAdminSession = localStorage.getItem('admin_session') === 'true';
    if (isWebapp && !sessionStorage.getItem('admin_active')) return false;
    return hasAdminSession;
  });
  const [location, setLocation] = useState('Ahmedabad, Gujarat');
  const [userCoords, setUserCoords] = useState({ lat: 23.0225, lng: 72.5714 });
  const isWebappMode = window.location.port === '3001';

  // Sync demo session to local storage
  useEffect(() => {
    if (demoUser) {
      localStorage.setItem('v_demo_session', JSON.stringify(demoUser));
    } else {
      localStorage.removeItem('v_demo_session');
    }
  }, [demoUser]);

  useEffect(() => {
    const autoDetectLocation = async () => {
      if (navigator.geolocation) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            try {
              const { latitude, longitude } = position.coords;
              setUserCoords({ lat: latitude, lng: longitude });
              const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=10`);
              const data = await res.json();
              if (data.address) {
                const city = data.address.city || data.address.town || data.address.village || data.address.state_district;
                const state = data.address.state;
                if (city && state) {
                  setLocation(`${city}, ${state}`);
                  return;
                }
              }
            } catch (err) {
              console.warn('GPS Reverse Geocode failed, falling back to IP');
              fetchIPLocation();
            }
          },
          () => {
            console.warn('GPS Access denied, falling back to IP');
            fetchIPLocation();
          }
        );
      } else {
        fetchIPLocation();
      }
    };

    const fetchIPLocation = async () => {
      try {
        const res = await fetch('https://ipapi.co/json/');
        const data = await res.json();
        if (data && data.city && data.region) {
          setLocation(`${data.city}, ${data.region}`);
          if (data.latitude && data.longitude) {
            setUserCoords({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
          }
        } else {
          throw new Error('ipapi failed');
        }
      } catch (e) {
        try {
          const res2 = await fetch('http://ip-api.com/json/');
          const data2 = await res2.json();
          if (data2 && data2.status === 'success') {
            setLocation(`${data2.city}, ${data2.regionName}`);
            setUserCoords({ lat: data2.lat, lng: data2.lon });
          }
        } catch (err2) {
          console.warn('All IP Location fallbacks failed');
        }
      }
    };

    autoDetectLocation();
  }, []);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('v_initial_splash_done');
    const delay = alreadyShown ? 500 : 2000;
    const splashTimer = setTimeout(() => {
      setMinSplashDone(true);
      sessionStorage.setItem('v_initial_splash_done', 'true');
    }, delay);

    const unsub = onAuthStateChanged(auth, async (u) => {
       if (u) {
         try {
           const { data: addr } = await supabase
             .from('addresses')
             .select('id')
             .eq('user_id', u.uid)
             .maybeSingle();
           
           if (!addr) {
              const { data: usr } = await supabase.from('users').select('id').eq('email', u.email).maybeSingle();
              if (usr) {
                const { data: addr2 } = await supabase.from('addresses').select('id').eq('user_id', usr.id).maybeSingle();
                setIsProfileComplete(!!addr2);
              } else {
                setIsProfileComplete(false);
              }
           } else {
             setIsProfileComplete(true);
           }
         } catch (err) {
           console.error("Auto Sync Failed", err);
           setIsProfileComplete(true);
         }
       } else {
         setIsProfileComplete(true);
       }
       setUser(u);
       setAuthLoading(false);
    });

    return () => {
       unsub();
       clearTimeout(splashTimer);
    };
  }, []);

  return (
    <ErrorBoundary>
      {(authLoading || !minSplashDone) ? (
        <SplashScreen />
      ) : (
        <Router>
          <ScrollToTop />
          <SearchProvider>
            <NotificationProvider>
              <LanguageProvider>
                <CartProvider user={user}>
                  <div className="app-container">
                    <Toaster position="bottom-center" toastOptions={{ duration: 3000 }} />
                    <AppContent 
                      effectiveUser={user || demoUser} 
                      isProfileComplete={isProfileComplete}
                      setIsProfileComplete={setIsProfileComplete}
                      updateDemoUser={setDemoUser}
                      isWebappMode={isWebappMode}
                      isAdmin={isAdmin}
                      setIsAdmin={setIsAdmin}
                      location={location}
                      userCoords={userCoords}
                      setLocation={setLocation}
                    />
                  </div>
                </CartProvider>
              </LanguageProvider>
            </NotificationProvider>
          </SearchProvider>
        </Router>
      )}
    </ErrorBoundary>
  );
}

export default App
