import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  Phone, ArrowLeft, RefreshCw, User, ShieldCheck, Bell, MapPin,
  Navigation, Search, Crosshair, ChevronRight
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../supabase';
import './Auth.css';


// Premium 3D Brand Illustration Assets
import passwalaDeals from '../assets/passwala_deals.png';
import passwalaServices from '../assets/passwala_services.png';
import passwalaLogistics from '../assets/passwala_logistics.png';


const popularAreas = [
  { name: 'Satellite, Ahmedabad', lat: 23.0305, lng: 72.5075 },
  { name: 'Bopal, Ahmedabad', lat: 23.0350, lng: 72.4397 },
  { name: 'Navrangpura, Ahmedabad', lat: 23.0333, lng: 72.5621 },
  { name: 'Ghatlodiya, Ahmedabad', lat: 23.0725, lng: 72.5414 },
  { name: 'Vastrapur, Ahmedabad', lat: 23.0372, lng: 72.5273 },
  { name: 'Prahlad Nagar, Ahmedabad', lat: 23.0135, lng: 72.5072 },
  { name: 'Gota, Ahmedabad', lat: 23.0975, lng: 72.5350 },
  { name: 'Chandkheda, Ahmedabad', lat: 23.1114, lng: 72.5815 },
  { name: 'Maninagar, Ahmedabad', lat: 22.9986, lng: 72.6025 }
];

const Auth = ({ onLogin }) => {
  const { requestNotificationPermission } = useNotifications();
  const [step, setStep] = useState(() => {
    if (localStorage.getItem('passwala_user')) return 'WARM_UP';
    return 'EMAIL_LOGIN';
  });
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  
  const [loading, setLoading] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [syncedUser, setSyncedUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [searchResults, setSearchResults] = useState(popularAreas);
  const [activeSlide, setActiveSlide] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(slideInterval);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('local_user_profile');
    const savedUser = localStorage.getItem('passwala_user');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSyncedUser(parsed);
        if (step === 'WARM_UP') onLogin(parsed);
      } catch (e) { /* Ignore */ }
    } else if (savedUser && step === 'WARM_UP') {
      try {
        const parsedUser = JSON.parse(savedUser);
        onLogin(parsedUser);
      } catch (e) { /* Ignore */ }
    }
  }, [step, onLogin]);

  useEffect(() => {
    const notifTimer = setTimeout(() => {
      const hasAsked = localStorage.getItem('passwala_notif_asked');
      if (!hasAsked && Notification.permission === 'default') {
        setShowNotifPrompt(true);
      }
    }, 3000);
    return () => clearTimeout(notifTimer);
  }, []);

  const handleEmailAuth = async (e) => {
    e.preventDefault();
    if (loading || !email || !password) { toast.error('Please enter email and password'); return; }
    
    setLoading(true);
    try {
      let authData, authError;
      if (isSignUp) {
        const res = await supabase.auth.signUp({ email, password });
        authData = res.data;
        authError = res.error;
        if (authError) throw authError;
        toast.success('Account created successfully!');
      } else {
        const res = await supabase.auth.signInWithPassword({ email, password });
        authData = res.data;
        authError = res.error;
        if (authError) throw authError;
        toast.success('Login Successful!');
      }
      
      const user = authData.user;
      if (user) {
        handleQuickLogin({
          email: user.email,
          uid: user.id,
          displayName: user.user_metadata?.full_name || user.email.split('@')[0],
          photoURL: user.user_metadata?.avatar_url
        }, 'email');
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Use current origin so it works on https://localhost:3001 and in production
      const origin = window.location.origin;
      const redirectTo = `${origin}/auth`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo }
      });
      if (error) throw error;
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Google Login failed');
      setLoading(false);
    }
  };

  const handleQuickLogin = async (credUser, authProvider) => {
    try {
      setLoading(true);
      
      let dbUser = null;
      let dbAddress = null;
      
      if (credUser.email && supabase) {
        try {
          const { data: usr } = await supabase
            .from('users')
            .select('*')
            .or(`uid.eq.${credUser.uid},email.eq.${credUser.email}`)
            .maybeSingle();
          if (usr) {
            dbUser = usr;
            const { data: addr } = await supabase
              .from('addresses')
              .select('*')
              .eq('user_id', usr.id)
              .eq('is_default', true)
              .maybeSingle();
            if (addr) {
              dbAddress = addr;
            }
          }
        } catch (dbErr) {
          console.warn("Direct Supabase user fetch failed:", dbErr);
        }
      }

      const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      
      // Setup payload for backend
      const loginPayload = {
        uid: credUser.uid,
        email: credUser.email,
        displayName: credUser.displayName || dbUser?.name || 'Passwala User',
        photoURL: credUser.photoURL || dbUser?.photo_url,
        provider: authProvider,
        role: dbUser?.role || 'BUYER',
        preferences: dbUser?.preferences || {}
      };

      const res = await fetch(`${BASE_API}/api/users/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginPayload)
      });
      const data = await res.json();
      
      if (res.ok && data.success) {
        const finalUser = data.user || dbUser || loginPayload;
        localStorage.setItem('passwala_user', JSON.stringify(finalUser));
        localStorage.setItem('local_user_profile', JSON.stringify(finalUser));
        
        if (dbAddress) {
          localStorage.setItem('passwala_user_address', JSON.stringify(dbAddress));
        }

        const needsAddress = !dbAddress && (!finalUser.addresses || finalUser.addresses.length === 0);
        if (needsAddress) {
          setStep('LOCATION');
        } else {
          onLogin(finalUser);
        }
      } else {
        toast.error('Could not sync user profile.');
      }
    } catch (err) {
      console.warn("Fast login failed:", err);
      // Fallback
      localStorage.setItem('passwala_user', JSON.stringify(credUser));
      setStep('LOCATION');
    } finally {
      setLoading(false);
    }
  };

  const handleGetLocation = () => {
    if (loading) return;
    setLoading(true);

    if (!navigator || !navigator.geolocation) {
      fallbackToIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const area = data.address?.suburb || data.address?.neighbourhood || data.address?.city || data.address?.town || 'My Location';
          const city = data.address?.city || data.address?.town || data.address?.state_district || 'Ahmedabad';
          const fullAddress = `${area}, ${city}`;

          toast.success(`Located: ${fullAddress}`);
          finalizeLocation(fullAddress, { lat: latitude, lng: longitude });
        } catch (err) {
          fallbackToIP();
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        fallbackToIP();
      },
      { timeout: 8000 }
    );
  };

  const fallbackToIP = async () => {
    try {
      const directRes = await fetch('https://freeipapi.com/api/json/');
      if (directRes.ok) {
        const data = await directRes.json();
        if (data && data.cityName && data.regionName) {
          const fullAddress = `${data.cityName}, ${data.regionName}`;
          toast.success(`Location detected: ${fullAddress}`);
          finalizeLocation(fullAddress, { lat: parseFloat(data.latitude) || 23.0225, lng: parseFloat(data.longitude) || 72.5714 });
          return;
        }
      }
    } catch (directErr) {}

    try {
      const baseUrl = window.location.protocol === 'https:' ? '' : (import.meta.env.VITE_API_URL || `http://${window.location.hostname}:3004`);
      const res = await fetch(`${baseUrl}/api/ip-location`);
      if (!res.ok) throw new Error('Proxied IP Location failed');
      const data = await res.json();

      if (data && !data.isLocal && data.cityName && data.regionName) {
        const fullAddress = `${data.cityName}, ${data.regionName}`;
        toast.success(`Approximate location detected: ${fullAddress}`);
        finalizeLocation(fullAddress, { lat: parseFloat(data.latitude) || 23.0225, lng: parseFloat(data.longitude) || 72.5714 });
      } else {
        throw new Error('IP failed or is local');
      }
    } catch (e) {
      const fallbackAddress = "Ahmedabad, Gujarat";
      toast.success(`Located: ${fallbackAddress}`);
      finalizeLocation(fallbackAddress, { lat: 23.0225, lng: 72.5714 });
    } finally {
      setLoading(false);
    }
  };

  const handleSearchLocation = async () => {
    if (!manualAddress.trim()) return;
    setLoading(true);
    try {
      const res = await fetch(`https://nominatim.openstreetmap.org/search?format=jsonv2&q=${encodeURIComponent(manualAddress)}&countrycodes=in`);
      const data = await res.json();
      if (data && data.length > 0) {
        setSearchResults(data.map(place => ({
          name: place.display_name,
          lat: parseFloat(place.lat),
          lng: parseFloat(place.lon)
        })));
      } else {
        toast.error('No locations found. Try a different search.');
        setSearchResults([]);
      }
    } catch (err) {
      toast.error('Search failed. Try again.');
    } finally {
      setLoading(false);
    }
  };

  const finalizeLocation = (addressName, coords) => {
    localStorage.setItem('passwala_location', addressName);
    if (coords) localStorage.setItem('passwala_coords', JSON.stringify(coords));

    const defaultAddr = {
      address_line_1: addressName,
      city: 'Ahmedabad',
      state: 'Gujarat',
      pincode: '380015',
      society: addressName.split(',')[0],
      house_no: 'Home',
      floor: 'Ground',
      is_default: true
    };
    localStorage.setItem('passwala_user_address', JSON.stringify(defaultAddr));
    const storedUser = localStorage.getItem('passwala_user');
    let storedParsed = null;
    try { storedParsed = storedUser ? JSON.parse(storedUser) : null; } catch (_) { /* ignore */ }

    // Pick the best user: prefer whichever has more identifiers (id/uid/phoneNumber)
    const hasCredentials = (u) => u && (u.id || u.uid || u.phoneNumber || u.phone);
    let currentUserToLog = hasCredentials(syncedUser) ? syncedUser
      : hasCredentials(storedParsed) ? storedParsed
      : syncedUser || storedParsed || null;

    if (currentUserToLog) {
      if (!currentUserToLog.displayName) currentUserToLog.displayName = 'Passwala User';
      localStorage.setItem('passwala_user', JSON.stringify(currentUserToLog));
      onLogin(currentUserToLog);
    } else {
      const fallbackUser = { displayName: 'Passwala User', address: addressName };
      localStorage.setItem('passwala_user', JSON.stringify(fallbackUser));
      onLogin(fallbackUser);
    }
  };

  return (
    <div className="auth-modern-overlay" style={{
      minHeight: '100vh', display: 'grid', placeItems: 'center', 
      background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
      padding: '2rem 1rem'
    }}>
      <div style={{ width: '100%', maxWidth: '400px', display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Back Button Wrapper */}
        {(step === 'LOCATION' || step === 'PROFILE') && (
          <div className="auth-back-btn-wrapper" style={{ width: '100%', marginBottom: '1rem', display: 'flex', justifyContent: 'flex-start' }}>
            <button className="auth-back-btn" onClick={() => setStep('EMAIL_LOGIN')}>
              <ArrowLeft size={18} />
            </button>
          </div>
        )}

        {/* MODIFIED THEME: Clean Minimalist Auth Card */}
        <div className="auth-modern-card" style={{ background: 'transparent', padding: 0 }}>
          <div className="form-content-sheet-modern" style={{ padding: '1.5rem', borderRadius: '20px' }}>
            <div className="auth-brand-header-modern" style={{ marginBottom: '1rem' }}>
              <div style={{
                width: '48px', height: '48px', background: 'var(--auth-action-color)',
                borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                margin: '0 auto 0.75rem', color: 'white', fontSize: '1.5rem', fontWeight: 'bold'
              }}>
                P
              </div>
              <h2 style={{ fontSize: '1.3rem' }}>Welcome to Passwala</h2>
              <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>Your local neighborhood hub</p>
            </div>

            {step === 'WARM_UP' ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', margin: 'auto' }}>
                <RefreshCw className="spin" size={44} color="var(--auth-action-color)" />
                <p style={{ color: '#4a5568', marginTop: '1.5rem', fontWeight: '600', fontSize: '0.95rem' }}>Synchronizing your session...</p>
              </div>
            ) : step === 'EMAIL_LOGIN' ? (
              <>
                <form onSubmit={handleEmailAuth} className="email-auth-form" style={{ gap: '0.85rem' }}>
                  <div className="input-group-modern" style={{ gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem' }}>Email Address</label>
                    <input 
                      type="email" 
                      placeholder="Enter your email" 
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      required
                      style={{ padding: '0.75rem 1rem' }}
                    />
                  </div>
                  <div className="input-group-modern" style={{ gap: '0.35rem' }}>
                    <label style={{ fontSize: '0.8rem' }}>Password</label>
                    <input 
                      type="password" 
                      placeholder="Enter your password" 
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      required
                      style={{ padding: '0.75rem 1rem' }}
                    />
                  </div>

                  <div className="auth-toggle-row" style={{ marginTop: '0' }}>
                    <span onClick={() => setIsSignUp(!isSignUp)} className="toggle-auth-mode">
                      {isSignUp ? 'Already have an account? Log in' : "Don't have an account? Sign up"}
                    </span>
                  </div>

                  <button 
                    type="submit"
                    className="sheet-action-btn-modern" 
                    disabled={loading}
                    style={{ background: 'var(--auth-action-color)', marginTop: '0.5rem' }}
                  >
                    {loading ? <RefreshCw className="spin" size={20} color="#fff" /> : (isSignUp ? 'Sign Up with Email' : 'Log In with Email')}
                  </button>
                </form>

                  <div className="divider-modern" style={{ margin: '1rem 0' }}>
                    <span>OR</span>
                  </div>

                  <button 
                    type="button"
                    className="sheet-action-btn-modern google-btn" 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                    style={{ padding: '0.85rem' }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    Continue with Google
                  </button>

                <button 
                  type="button"
                  className="sheet-action-btn-modern ai-btn" 
                  onClick={() => {
                    toast.success("AI Assistant is waking up...");
                    setTimeout(() => {
                      toast("I am Passwala AI. How can I help you log in?", { icon: '🤖' });
                    }, 1500);
                  }}
                  style={{ marginTop: '0.5rem', padding: '0.85rem' }}
                >
                  🤖 Ask AI Assistant
                </button>

                <div className="policy-agreement-text">
                  By continuing, you agree to our <a href="/terms">Terms</a> & <a href="/privacy-policy">Privacy</a>.
                </div>
              </>
            ) : null}
          </div>
        </div>
      </div>

      {step === 'LOCATION' && (
        <div className="zepto-location-overlay">
          <div className="zepto-location-sheet">
            <div className="sheet-drag-handle" />

            {!showSearch ? (
              <>
                <div className="zepto-location-header">
                  <div className="notif-icon-wrapper zepto-icon-hero">
                    <MapPin size={40} color="var(--auth-action-color)" />
                  </div>
                  <h3>Location permission is off</h3>
                  <p>Enabling location helps us reach you quickly with accurate delivery</p>
                </div>

                <div style={{ width: '100%' }}>
                  <button className="zepto-btn-current-loc" onClick={handleGetLocation}>
                    <div className="left">
                      <Crosshair size={20} color="var(--auth-action-color)" />
                      <span>Use my Current Location</span>
                    </div>
                    <div className="right-btn">Enable</div>
                  </button>

                  <button className="zepto-btn-whatsapp" onClick={() => window.open('https://wa.me/?text=Send%20me%20your%20location', '_blank')}>
                    <div className="left">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#25D366' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      <span>Request address from friend</span>
                    </div>
                    <ChevronRight size={18} color="#cbd5e1" />
                  </button>
                </div>

                <div className="zepto-address-section" style={{ width: '100%' }}>
                  <div className="zepto-address-header">
                    <span className="title">Select your address</span>
                    <span className="see-all">See All &gt;</span>
                  </div>


                  <button className="zepto-search-btn" onClick={() => setShowSearch(true)}>
                    <Search size={18} />
                    <span>Search your Location</span>
                  </button>
                </div>
              </>
            ) : (
              // Search Mode UI
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="zepto-location-header" style={{ marginBottom: '1rem' }}>
                  <h3>Search Location</h3>
                  <p>Enter your delivery neighborhood to start exploring:</p>
                </div>

                <div className="profile-input-box" style={{ margin: '0', display: 'flex', padding: '4px' }}>
                  <input
                    type="text"
                    placeholder="Search any city or area..."
                    value={manualAddress}
                    onChange={(e) => {
                      setManualAddress(e.target.value);
                      if (e.target.value.trim() === '') setSearchResults(popularAreas);
                    }}
                    onKeyDown={(e) => { if (e.key === 'Enter') handleSearchLocation(); }}
                    style={{ flex: 1, border: 'none', background: 'transparent', padding: '8px' }}
                  />
                  <button 
                    onClick={handleSearchLocation}
                    disabled={loading}
                    style={{ background: 'var(--auth-action-color)', color: 'white', border: 'none', borderRadius: '8px', padding: '0 16px', fontWeight: 'bold', cursor: 'pointer' }}
                  >
                    {loading ? '...' : 'Search'}
                  </button>
                </div>

                {/* Scrollable list of Areas */}
                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: '#f8fafc',
                  padding: '8px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  textAlign: 'left'
                }} className="area-scroll-list">
                  {(() => {
                    const isShowingPopular = searchResults === popularAreas;
                    const filtered = isShowingPopular && manualAddress.trim()
                      ? searchResults.filter(area => area.name.toLowerCase().includes(manualAddress.toLowerCase()))
                      : searchResults;

                    return filtered.length > 0 ? (
                      filtered.map((area, idx) => (
                        <button
                          key={`${area.name}-${idx}`}
                          onClick={() => {
                            finalizeLocation(area.name, { lat: area.lat, lng: area.lng });
                            toast.success(`Location set to ${area.name.split(',')[0]}`);
                          }}
                          style={{
                            background: 'white',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: '#334155',
                            transition: 'all 0.2s',
                            textAlign: 'left',
                            width: '100%'
                          }}
                        >
                          <MapPin size={14} color="var(--auth-action-color)" />
                          <span>{area.name}</span>
                        </button>
                      ))
                    ) : (
                      <div style={{ padding: '12px', textAlign: 'center', color: '#94a3b8', fontSize: '0.8rem' }}>
                        No matching areas found
                      </div>
                    );
                  })()}
                </div>

                <div className="notif-actions" style={{ marginTop: '0.5rem' }}>
                  <button
                    className="notif-btn-allow"
                    onClick={() => {
                      if (!manualAddress.trim()) {
                        toast.error('Please select or enter an area');
                        return;
                      }
                      finalizeLocation(manualAddress, { lat: 23.0225, lng: 72.5714 });
                    }}
                  >
                    CONFIRM
                  </button>
                  <button className="notif-btn-deny" onClick={() => setShowSearch(false)}>BACK</button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {showNotifPrompt && (
        <div className="notif-prompt-overlay">
          <div className="notif-prompt-card">
            <div className="notif-icon-wrapper">
              <Bell size={32} color="var(--auth-action-color)" />
            </div>
            <h3>Notifications</h3>
            <p>Get updates on your order status and exclusive offers.</p>
            <div className="notif-actions">
              <button className="notif-btn-allow" onClick={() => { setShowNotifPrompt(false); requestNotificationPermission(); }}>ALLOW</button>
              <button className="notif-btn-deny" onClick={() => setShowNotifPrompt(false)}>LATER</button>
            </div>
          </div>
        </div>
      )}

      {/* Recaptcha container removed */}
    </div>
  );
};

export default Auth;


