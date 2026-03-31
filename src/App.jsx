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
import TrackOrders from './webapp/buyer/TrackOrders'
import VendorAuth from './webapp/vendor/VendorAuth'
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
import VendorRegistrationModal from './webapp/vendor/VendorRegistrationModal'

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
  const [isAdmin, setIsAdmin] = useState(false);
  const [isVendor, setIsVendor] = useState(false);
  const [showVendorModal, setShowVendorModal] = useState(false);
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [showProfile, setShowProfile] = useState(false);
  
  const navigate = useNavigate();
  const locationPath = useLocation().pathname;
  const isWebMode = import.meta.env.MODE === 'web';
  const isWebappMode = import.meta.env.MODE === 'webapp';
  const isVendorMode = import.meta.env.MODE === 'vendor';

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
      await signOut(auth);
      toast.success('Signed Out.');
      navigate('/');
    } catch (_e) { toast.error('Logout failed.'); }
  };

  const currentView = 
    locationPath === '/near-shops' ? 'NEAR_SHOPS' :
    locationPath === '/expert-services' ? 'EXPERT_SERVICES' :
    locationPath === '/neighbors' ? 'NEIGHBORS' :
    locationPath === '/track-orders' ? 'TRACKING' :
    locationPath === '/profile' ? 'PROFILE' : 'DASHBOARD';

  if (loading && (isWebappMode || isVendorMode)) return <SplashScreen />;
  if (isAdmin) return <AdminPanel onLogout={() => setIsAdmin(false)} />;
  
  // Directly render Vendor Portal on port 3002 OR the /vendor path
  if (isVendorMode || locationPath === '/vendor') {
    return user ? <VendorPortal user={user} onLogout={handleLogout} /> : <VendorAuth onLogin={() => navigate('/vendor')} />;
  }

  // Handle unauthenticated webapp users (Buyer Login)
  if (!user && isWebappMode) return <Auth onLogin={() => navigate('/')} />;

  return (
    <LayoutGroup>
      <div className="app-web-view">
        {isWebMode ? (
          <Navbar 
            isAuthenticated={!!user} user={user} onLogout={handleLogout}
            onOpenProfile={() => setShowProfile(true)} onOpenAI={() => navigate('/')}
            onSwitchToVendor={() => setIsVendor(true)} onJoin={() => setShowAuthModal(true)}
          />
        ) : (
          user && !isVendorMode && locationPath !== '/vendor' && (
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

        <main className={isWebappMode ? `webapp-main ${currentView === 'PROFILE' ? 'profile-mode' : ''}` : ''}>
          <Routes>
            <Route path="/" element={
              user ? (
                <>
                  <NeighborhoodHub onNavigate={(v) => {
                    const p = v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'NEIGHBORS' ? '/neighbors' : '/';
                    navigate(p);
                  }} />
                  {isWebMode && (
                    <>
                      <Hero /><AIRecommendations /><QuickServices /><Essentials /><NearbyDeals /><Community />
                      <VendorCTA onOpenVendor={() => setShowVendorModal(true)} />
                    </>
                  )}
                </>
              ) : (
                <Navigate to="/" />
              )
            } />
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
            <Route path="/admin-portal" element={<AdminAuth onAdminLogin={() => setIsAdmin(true)} />} />
            <Route path="/vendor" element={user ? <VendorPortal user={user} onLogout={handleLogout} /> : <VendorAuth onLogin={() => {}} />} />
            <Route path="/buyer" element={<Navigate to="/" />} />
          </Routes>

          {isWebappMode && user && (
            <BottomNav activeTab={currentView} onTabChange={(v) => {
              const p = v === 'DASHBOARD' ? '/' : v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'TRACKING' ? '/track-orders' : v === 'NEIGHBORS' ? '/neighbors' : v === 'PROFILE' ? '/profile' : '/';
              navigate(p);
            }} />
          )}
        </main>

        <AIAssistant 
          isOpen={false} onClose={() => {}} onOpen={() => {}} onRegisterVendor={() => setShowVendorModal(true)}
        />
        {isWebMode && <Footer />}
        <CartDrawer />
        {showVendorModal && <VendorRegistrationModal plan="Growth" onClose={() => setShowVendorModal(false)} />}
      </div>
    </LayoutGroup>
  );
};

function App() {
  const [user, setUser] = useState(null);
  const [authLoading, setAuthLoading] = useState(true);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
       setUser(u);
       setAuthLoading(false);
    });
    return () => unsub();
  }, []);

  if (authLoading) return <SplashScreen />;

  return (
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
  )
}

export default App
