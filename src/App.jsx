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
import VendorPortal from './webapp/vendor/VendorPortal'
import VendorAuth from './webapp/vendor/VendorAuth'
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
import AIAssistant from './webapp/AIAssistant'
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

const AppContent = ({ user }) => {
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(() => localStorage.getItem('admin_session') === 'true');
  const [isVendor, setIsVendor] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const navigate = useNavigate();
  const locationPath = useLocation().pathname;
  const isWebMode = import.meta.env.MODE === 'web' || window.location.port === '3000';
  const isWebappMode = import.meta.env.MODE === 'webapp' || window.location.port === '3001';
  const isVendorMode = import.meta.env.MODE === 'vendor' || window.location.port === '3002';

  const [demoUser, setDemoUser] = useState(() => {
    const saved = localStorage.getItem('v_demo_session');
    return saved ? JSON.parse(saved) : null;
  });

  const updateDemoUser = (val) => {
    setDemoUser(val);
    if (val) localStorage.setItem('v_demo_session', JSON.stringify(val));
    else localStorage.removeItem('v_demo_session');
  };

  const effectiveUser = user || demoUser;

  // Admin Persistence
  useEffect(() => {
    localStorage.setItem('admin_session', isAdmin);
  }, [isAdmin]);

  const [isDarkMode, setIsDarkMode] = useState(() => {
    const saved = localStorage.getItem('theme');
    return saved === 'dark' || (saved === null && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });
  const [location, setLocation] = useState('Ahmedabad, Gujarat'); 

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

  const handleLogout = async () => {
    try {
      setDemoUser(null);
      // 1. Attempt Firebase Signout but don't let it block local reset
      if (auth.currentUser) {
        await auth.signOut().catch(e => console.warn('Firebase Signout Skip:', e));
      }
      
      // 2. CLEAR ALL LOCAL STATE (CRITICAL)
      // setUser(null); // Managed in App.jsx but effective here
      updateDemoUser(null); 
      localStorage.clear(); // Comprehensive reset for safety
      
      toast.success('Signed Out.');
      
      // 3. HARD REDIRECT
      if (window.location.host.includes('3002')) {
        window.location.href = '/'; 
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
      // Even if everything fails, we must give control back to vendor entry
      window.location.href = '/';
    }
  };

  const currentView = 
    locationPath === '/near-shops' ? 'NEAR_SHOPS' :
    locationPath === '/expert-services' ? 'EXPERT_SERVICES' :
    locationPath === '/neighbors' ? 'NEIGHBORS' :
    locationPath === '/track-orders' ? 'TRACKING' :
    locationPath === '/profile' ? 'PROFILE' : 'DASHBOARD';

  console.log('[Passwala Debug] Mode:', import.meta.env.MODE, '| isWebapp:', isWebappMode, '| user:', effectiveUser?.uid || 'Guest');

  if (isAdmin) return <AdminPanel onLogout={() => { setIsAdmin(false); localStorage.removeItem('admin_session'); }} />;
  
  return (
    <div className="app-main-layout" style={(isVendorMode || locationPath === '/vendor') ? { width: '100%', margin: 0, padding: 0 } : {}}>
      {/* 1. Vendor Mode (Port 3002) - High level takeover */}
      {(isVendorMode || locationPath === '/vendor') ? (
        (!effectiveUser) ? (
          <VendorAuth onLogin={(isDemo, num) => {
            if (isDemo) updateDemoUser({ phoneNumber: `+91${num || '9999999999'}`, displayName: 'Demo Partner' });
          }} />
        ) : (
          <VendorPortal user={effectiveUser} onLogout={handleLogout} />
        )
      ) : (
        <>
          {/* Global Navbar Logic */}
          {isWebMode ? (
            <Navbar 
              isAuthenticated={!!user} user={user} onLogout={handleLogout}
              onOpenProfile={() => setShowProfile(true)} onOpenAI={() => navigate('/')}
              onSwitchToVendor={() => setIsVendor(true)} onJoin={() => setShowAuthModal(true)}
            />
          ) : (
            user && (
              <WebappNavbar 
                user={user} location={location} onLocationChange={setLocation}
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
                     !user ? <Auth onLogin={() => navigate('/')} /> : <NeighborhoodHub onNavigate={(v) => navigate(v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'NEIGHBORS' ? '/neighbors' : '/')} />
                   ) : (
                     /* Marketing Logic (Hub on top if logged in, then standard homepage) */
                     <>
                        {user && (
                          <NeighborhoodHub onNavigate={(v) => navigate(v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'NEIGHBORS' ? '/neighbors' : '/')} />
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
              <Route path="/near-shops" element={user ? <NearShops onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />} />
              <Route path="/expert-services" element={user ? <ExpertServices onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />} />
              <Route path="/neighbors" element={user ? <NeighborsCommunity onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />} />
              <Route path="/track-orders" element={user ? <TrackOrders onBack={() => navigate('/')} /> : <Navigate to="/" />} />
              <Route path="/profile" element={user ? <WebappProfile user={user} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} /> : <Navigate to="/" />} />
              <Route path="/order-history" element={user ? <OrderHistory /> : <Navigate to="/" />} />
              <Route path="/wallet" element={user ? <Wallet /> : <Navigate to="/" />} />
              <Route path="/privacy-security" element={user ? <PrivacySecurity /> : <Navigate to="/" />} />
              <Route path="/help-support" element={user ? <HelpSupport /> : <Navigate to="/" />} />
              <Route path="/settings" element={user ? <AppSettings isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} /> : <Navigate to="/" />} />
              <Route path="/select-location" element={user ? <LocationSelector currentLocation={location} onLocationChange={setLocation} /> : <Navigate to="/" />} />
            </Routes>
          </main>

          {/* 4. Global Footers/Navs */}
          {isWebappMode && user && (
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
  const [minSplashDone, setMinSplashDone] = useState(false);

  // Sync demo session to local storage
  useEffect(() => {
    if (demoUser) {
      localStorage.setItem('v_demo_session', JSON.stringify(demoUser));
    } else {
      localStorage.removeItem('v_demo_session');
    }
  }, [demoUser]);

  useEffect(() => {
    // 1. Smart Splash Logic (Skip long delay on refresh)
    const alreadyShown = sessionStorage.getItem('v_initial_splash_done');
    const delay = alreadyShown ? 500 : 2000; // 0.5s on refresh, 2s on first visit

    const splashTimer = setTimeout(() => {
      setMinSplashDone(true);
      sessionStorage.setItem('v_initial_splash_done', 'true');
    }, delay);

    // 2. Firebase Auth listener
    const unsub = onAuthStateChanged(auth, (u) => {
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
                    <AppContent user={user} />
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
