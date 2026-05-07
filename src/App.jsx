import React, { Suspense, useState, useEffect } from 'react'
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
import Policies from './web/Policies'
import { Toaster, toast } from 'react-hot-toast'
import './App.css'

import { auth } from './firebase'
import { onAuthStateChanged } from 'firebase/auth'
import { supabase } from './supabase'
import AIAssistant from './webapp/AIAssistant'
import CustomerDetails from './webapp/CustomerDetails'
import { CartProvider } from './context/CartContext'
import CartDrawer from './webapp/buyer/CartDrawer'
import { NotificationProvider, useNotifications } from './context/NotificationContext'
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
  effectiveUser, isProfileComplete, setIsProfileComplete,
  isWebappMode, isAdmin, setIsAdmin, location, userCoords, setLocation, userAddress, setUserAddress, setUser
}) => {
  const navigate = useNavigate();
  const locationPath = useLocation().pathname;
  const isWebMode = window.location.port === '3000';
  const isVendorMode = window.location.port === '3002';
  const isRiderMode = window.location.port === '3003';
  const isAdminMode = window.location.port === '3005';

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
  }, [isAdminMode, isVendorMode, isRiderMode, isWebappMode]);

  // Admin Persistence
  useEffect(() => {
    localStorage.setItem('admin_session', isAdmin);
    if (isAdmin) sessionStorage.setItem('admin_active', 'true');
    else sessionStorage.removeItem('admin_active');
  }, [isAdmin]);

  // Global Notification Listener for Buyer
  const { addNotification } = useNotifications();
  useEffect(() => {
    if (!effectiveUser?.id || isVendorMode || isRiderMode || isAdminMode) return;

    const sub = supabase.channel('global_order_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders', filter: `user_id=eq.${effectiveUser.id}` }, (payload) => {
        const shortId = payload.new.id.substring(0, 6).toUpperCase();
        toast.success(`Order #${shortId} is now ${payload.new.status}`, { icon: '🛵', duration: 4000 });
        
        // Push Real-Time Notification to Context globally
        addNotification({
          title: 'Order Status Update',
          text: `Update on Order #${shortId}: Status changed to ${payload.new.status}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          type: 'order_update'
        });
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, [effectiveUser, addNotification, isVendorMode, isRiderMode, isAdminMode]);

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

  // 📍 Compulsory Location Enforcement
  useEffect(() => {
    const isAuthPage = locationPath === '/auth' || locationPath === '/' || locationPath === '/rider-auth';
    const isProfilePage = locationPath === '/complete-profile';
    
    // Force profile completion for Buyers
    const userRole = effectiveUser?.role || 'BUYER';
    if (isWebappMode && effectiveUser && userRole === 'BUYER' && !isProfileComplete && !isAuthPage && !isProfilePage) {
      // Redirecting to profile completion
      navigate('/complete-profile');
    }
  }, [isWebappMode, isRiderMode, effectiveUser, isProfileComplete, location, locationPath, navigate]);

  const handleLogout = async (skipToast = false) => {
    try {
      if (auth.currentUser) {
        await auth.signOut().catch(e => console.warn('Firebase Signout Skip:', e));
      }
      localStorage.clear();
      sessionStorage.clear();
      setUser(null); // CRITICAL: Clear React state to trigger UI update
      
      if (!skipToast) toast.success('Signed Out.');
      
      if (window.location.host.includes('3002')) {
        window.location.href = '/';
      } else {
        navigate('/');
      }
    } catch (error) {
      console.error('Logout error:', error);
      setUser(null);
      window.location.href = '/';
    }
  };

  const currentView =
    locationPath === '/near-shops' ? 'NEAR_SHOPS' :
      locationPath === '/expert-services' ? 'EXPERT_SERVICES' :
        locationPath === '/neighbors' ? 'NEIGHBORS' :
          locationPath === '/track-orders' ? 'TRACKING' :
            locationPath === '/profile' ? 'PROFILE' : 'DASHBOARD';


  const isAuthorizedAdmin = isAdmin || (effectiveUser && effectiveUser.role === 'ADMIN');

  return (
    <div className="app-main-layout" style={(isVendorMode || locationPath === '/vendor' || isRiderMode || locationPath === '/rider' || isAdminMode) ? { width: '100%', margin: 0, padding: 0 } : {}}>
      {/* 0. Admin Mode (Port 3005) - Strict Isolation */}
      {isAdminMode ? (
        !isAuthorizedAdmin ? (
          <AdminAuth onAdminLogin={() => setIsAdmin(true)} />
        ) : (
          <AdminPanel location={location} onLogout={() => { setIsAdmin(false); localStorage.removeItem('admin_session'); sessionStorage.removeItem('admin_active'); }} />
        )
      ) : /* 1. Vendor Mode (Port 3002) - High level takeover */
      (locationPath === '/vendor' || isVendorMode) ? (
        (!effectiveUser) ? (
          <VendorAuth onLogin={(phone, profile) => {
            setUser({ ...profile, displayName: profile?.name || 'Vendor', phoneNumber: phone, role: 'VENDOR' });
          }} />
        ) : (
          <VendorPortal user={effectiveUser} onLogout={handleLogout} />
        )
      ) : locationPath === '/select-location' ? (
        <LocationSelector
          currentLocation={location}
          onLocationChange={(loc, coords) => {
            setLocation(loc, coords);
            navigate(isRiderMode ? '/rider' : '/');
          }}
        />
      ) : (locationPath === '/rider' || isRiderMode) ? (
        /* Rider Mode (Port 3003) */
        (!effectiveUser) ? (
          <RiderAuth onLogin={(phone, profile) => {
            setUser({ ...profile, displayName: profile.name, phoneNumber: phone, role: 'RIDER' });
          }} />
        ) : (
          <RiderPortal
            user={effectiveUser}
            onLogout={handleLogout}
            location={location}
            setLocation={setLocation}
            userCoords={userCoords}
          />
        )
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
                    (!effectiveUser || !effectiveUser.displayName || !isProfileComplete) ? <Auth onLogin={(userData) => { setUser(userData); setIsProfileComplete(true); navigate('/'); }} /> : <NeighborhoodHub user={effectiveUser} isProfileComplete={isProfileComplete} onNavigate={(v) => navigate(v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'NEIGHBORS' ? '/neighbors' : v === '/complete-profile' ? '/complete-profile' : '/')} />
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

              {/* Public Legal & Policy Routes for App Store / Play Store Reviewers & Users */}
              <Route path="/privacy-policy" element={<Policies />} />
              <Route path="/terms" element={<Policies />} />
              <Route path="/refunds-cancellation" element={<Policies />} />
              <Route path="/data-deletion" element={<Policies />} />
              <Route path="/policies" element={<Policies />} />

              {/* Common Application Routes */}
              <Route path="/near-shops" element={effectiveUser ? <NearShops onBack={() => navigate('/')} location={location} userCoords={userCoords} /> : <Navigate to="/" />} />
              <Route path="/expert-services" element={effectiveUser ? <ExpertServices onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />} />
              <Route path="/neighbors" element={effectiveUser ? <NeighborsCommunity onBack={() => navigate('/')} location={location} /> : <Navigate to="/" />} />
              <Route path="/track-orders" element={effectiveUser ? <TrackOrders user={effectiveUser} onBack={() => navigate('/')} /> : <Navigate to="/" />} />
              <Route path="/profile" element={effectiveUser ? <WebappProfile user={effectiveUser} onLogout={handleLogout} isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} /> : <Navigate to="/" />} />
              <Route path="/order-history" element={effectiveUser ? <OrderHistory /> : <Navigate to="/" />} />
              <Route path="/wallet" element={effectiveUser ? <Wallet /> : <Navigate to="/" />} />
              <Route path="/privacy-security" element={effectiveUser ? <PrivacySecurity /> : <Navigate to="/" />} />
              <Route path="/help-support" element={effectiveUser ? <HelpSupport /> : <Navigate to="/" />} />
              <Route path="/settings" element={effectiveUser ? <AppSettings isDarkMode={isDarkMode} onToggleTheme={() => setIsDarkMode(!isDarkMode)} /> : <Navigate to="/" />} />
              <Route path="/select-location" element={effectiveUser ? <LocationSelector currentLocation={location} onLocationChange={setLocation} /> : <Navigate to="/" />} />
              <Route path="/complete-profile" element={effectiveUser ? <CustomerDetails user={effectiveUser} onComplete={(addr) => { setIsProfileComplete(true); setUserAddress(addr); navigate('/'); }} /> : <Navigate to="/" />} />
            </Routes>
          </main>

          {/* 4. Global Footers/Navs */}
          {isWebappMode && effectiveUser && isProfileComplete && (
            <BottomNav activeTab={currentView} onTabChange={(v) => navigate(v === 'DASHBOARD' ? '/' : v === 'NEAR_SHOPS' ? '/near-shops' : v === 'EXPERT_SERVICES' ? '/expert-services' : v === 'TRACKING' ? '/track-orders' : v === 'NEIGHBORS' ? '/neighbors' : v === 'PROFILE' ? '/profile' : '/')} />
          )}

          {isWebMode && <Footer />}

          {/* 5. Drawers / Modals */}
          <CartDrawer location={location} isProfileComplete={isProfileComplete} userAddress={userAddress} />
          <AIAssistant isOpen={false} onClose={() => { }} onOpen={() => { }} />
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
  const [user, setUser] = useState(() => {
    const saved = localStorage.getItem('passwala_user');
    try {
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });
  const [authLoading, setAuthLoading] = useState(() => {
    // If we have a saved user, we can skip the initial loading state to feel faster
    return !localStorage.getItem('passwala_user');
  });
  const [isProfileComplete, setIsProfileComplete] = useState(() => {
    return localStorage.getItem('passwala_profile_complete') === 'true';
  });
  const [userAddress, setUserAddress] = useState(() => {
    const saved = localStorage.getItem('passwala_user_address');
    return saved ? JSON.parse(saved) : null;
  });
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [isAdmin, setIsAdmin] = useState(() => {
    const isAdminApp = window.location.port === '3005';
    const hasAdminSession = localStorage.getItem('admin_session') === 'true';
    if (!isAdminApp) return false;
    return hasAdminSession;
  });
  const [location, setLocation] = useState(() => localStorage.getItem('passwala_location') || null);
  const [userCoords, setUserCoords] = useState(() => {
    const saved = localStorage.getItem('passwala_coords');
    return saved ? JSON.parse(saved) : { lat: 23.0225, lng: 72.5714 };
  });

  const updateLocation = (newLoc, coords) => {
    setLocation(newLoc);
    localStorage.setItem('passwala_location', newLoc);
    if (coords) updateCoords(coords);
  };

  const updateCoords = (newCoords) => {
    setUserCoords(newCoords);
    localStorage.setItem('passwala_coords', JSON.stringify(newCoords));
  };
  const isWebappMode = window.location.port === '3001';

  // Authentication state logic

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
                  updateLocation(`${city}, ${state}`);
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
          const detectedCity = data.city || '';
          if (detectedCity.toLowerCase().includes('ahmedabad')) {
            updateLocation(`${data.city}, ${data.region}`);
          } else {
          updateLocation(`${data.city}, ${data.region}`);
          }
          if (data.latitude && data.longitude) {
            updateCoords({ lat: parseFloat(data.latitude), lng: parseFloat(data.longitude) });
          }
        } else {
          throw new Error('ipapi failed');
        }
      } catch (e) {
        try {
          const res2 = await fetch('http://ip-api.com/json/');
          const data2 = await res2.json();
          if (data2 && data2.status === 'success') {
            updateLocation(`${data2.city}, ${data2.regionName}`);
            updateCoords({ lat: data2.lat, lng: data2.lon });
          }
        } catch (err2) {
          console.warn('All IP Location fallbacks failed');
        }
      }
    };

    autoDetectLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // PERSISTENCE: Sync user state to localStorage
  useEffect(() => {
    if (user) {
      localStorage.setItem('passwala_user', JSON.stringify(user));
      localStorage.setItem('passwala_profile_complete', JSON.stringify(isProfileComplete));
      if (userAddress) localStorage.setItem('passwala_user_address', JSON.stringify(userAddress));
    }
  }, [user, isProfileComplete, userAddress]);

  useEffect(() => {
    const alreadyShown = sessionStorage.getItem('v_initial_splash_done');
    const delay = alreadyShown ? 200 : 800; // Much faster startup
    const splashTimer = setTimeout(() => {
      setMinSplashDone(true);
      sessionStorage.setItem('v_initial_splash_done', 'true');
    }, delay);

    // EMERGENCY TIMEOUT: Don't stay stuck on splash if Firebase is slow
    const authTimeout = setTimeout(() => {
        setAuthLoading(false);
    }, 3000);

    const unsub = onAuthStateChanged(auth, async (u) => {
      clearTimeout(authTimeout); // Firebase responded, clear timeout
      // PROTECT: Don't overwrite a manual session (Rider/Vendor) with a null Firebase session
      const savedUser = localStorage.getItem('passwala_user');
      const manualUser = savedUser ? JSON.parse(savedUser) : null;
      const wasComplete = localStorage.getItem('passwala_profile_complete') === 'true';
      
      if (!u && manualUser && manualUser.role && manualUser.role !== 'BUYER') {
          // Keep the manual session for non-buyers
          setAuthLoading(false);
          setIsProfileComplete(true); 
          return;
      }

      let finalUser = u || manualUser;
      if (u && supabase) {
        try {
          // 1. Fetch Supabase ID (UUID) for this user
          const phoneNo = u.phoneNumber?.replace('+91', '');
          const { data: usr } = await supabase.from('users')
            .select('id')
            .or(`email.eq.${u.email}${phoneNo ? ',phone.eq.' + phoneNo : ''}`)
            .maybeSingle();
          
          if (usr) {
            // Augment Firebase user with Supabase UUID
            finalUser = { ...u, id: usr.id, uid: u.uid, email: u.email, phoneNumber: u.phoneNumber, displayName: u.displayName || manualUser?.displayName };
            
            // 2. Fetch address using the UUID
            const { data: addr } = await supabase.from('addresses').select('*').eq('user_id', usr.id).maybeSingle();
            if (addr) {
              setIsProfileComplete(true);
              setUserAddress(addr);
            } else {
              // Try legacy UID lookup
              const { data: addrLegacy } = await supabase.from('addresses').select('*').eq('user_id', u.uid).maybeSingle();
              setIsProfileComplete(!!addrLegacy || wasComplete);
              if (addrLegacy) setUserAddress(addrLegacy);
            }
          } else {
            // No user in Supabase yet, use UID
            setIsProfileComplete(wasComplete);
          }
        } catch (err) {
          console.error("Auto Sync Failed", err);
          setIsProfileComplete(wasComplete);
        }
      } else {
        setIsProfileComplete(false);
      }
      
      setUser(finalUser);
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
                    <Toaster position="top-right" toastOptions={{ duration: 3000 }} />
                    <AppContent
                      effectiveUser={user}
                      isProfileComplete={isProfileComplete}
                      setIsProfileComplete={setIsProfileComplete}
                      isWebappMode={isWebappMode}
                      isAdmin={isAdmin}
                      setIsAdmin={setIsAdmin}
                      location={location}
                      userCoords={userCoords}
                      setLocation={updateLocation}
                      userAddress={userAddress}
                      setUserAddress={setUserAddress}
                      setUser={setUser}
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
