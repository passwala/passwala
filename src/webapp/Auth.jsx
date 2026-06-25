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
    return 'PHONE';
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [loading, setLoading] = useState(false);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [syncedUser, setSyncedUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [searchResults, setSearchResults] = useState(popularAreas);
  const [activeSlide, setActiveSlide] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);
  const [loginMethod, setLoginMethod] = useState('SMS'); // 'SMS' or 'WHATSAPP'
  const [whatsappOtp, setWhatsappOtp] = useState(''); // Store generated mock OTP
  const canResend = timer === 0;

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

  useEffect(() => {
    if (step !== 'OTP' || timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  const handleOtpChange = (idx, value) => {
    // If input is cleared (backspace pressed or empty string set)
    if (value === '') {
      const newOtp = [...otp];
      newOtp[idx] = '';
      setOtp(newOtp);
      // Shift focus to the previous box
      if (idx > 0) {
        const prevInput = document.getElementById(`otp-${idx - 1}`);
        if (prevInput) prevInput.focus();
      }
      return;
    }

    // Keep only the last character entered
    const lastChar = value.slice(-1);
    if (!/^\d$/.test(lastChar)) return;

    const newOtp = [...otp];
    newOtp[idx] = lastChar;
    setOtp(newOtp);

    // Shift focus to the next box
    if (idx < 5) {
      const nextInput = document.getElementById(`otp-${idx + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (idx, e) => {
    if (e.key === 'Backspace') {
      const newOtp = [...otp];
      if (otp[idx] === '') {
        // If current box is empty, clear the previous box and move focus there
        if (idx > 0) {
          newOtp[idx - 1] = '';
          setOtp(newOtp);
          const prevInput = document.getElementById(`otp-${idx - 1}`);
          if (prevInput) prevInput.focus();
        }
        e.preventDefault();
      } else {
        // If current box has a value, clear it and move focus to previous box
        newOtp[idx] = '';
        setOtp(newOtp);
        if (idx > 0) {
          const prevInput = document.getElementById(`otp-${idx - 1}`);
          if (prevInput) prevInput.focus();
        }
        e.preventDefault();
      }
    }
  };

  const handlePaste = (e) => {
    e.preventDefault();
    const pastedData = e.clipboardData.getData('text').trim();
    if (/^\d{6}$/.test(pastedData)) {
      const newOtp = pastedData.split('');
      setOtp(newOtp);
      document.getElementById('otp-5').focus();
    }
  };

  const handlePhoneLogin = async () => {
    if (loading || phoneNumber.length !== 10) { toast.error('Enter valid 10-digit number'); return; }
    const formatPhone = `+91${phoneNumber}`;

    toast.success('Login Successful!');
    handleQuickLogin({ phoneNumber: formatPhone, uid: `phone-${phoneNumber}` }, 'phone');
  };

  const handleWhatsAppLogin = async () => {
    if (loading || phoneNumber.length !== 10) { toast.error('Enter valid 10-digit number'); return; }
    setLoading(true);
    try {
      const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const res = await fetch(`${BASE_API}/api/users/send-whatsapp-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoginMethod('WHATSAPP');
        setStep('OTP');
        setTimer(60);
        if (data.provider === 'mock' && data.otp) {
          setWhatsappOtp(data.otp);
          // Auto-fill the 6 OTP boxes so the user can verify in one click
          setOtp(data.otp.split(''));
          toast.success(`🧪 Dev Mode: OTP auto-filled → ${data.otp}`, { duration: 10000 });
        } else {
          toast.success('OTP sent successfully via WhatsApp!');
        }
      } else {
        toast.error(data.error || 'Failed to send WhatsApp OTP');
      }
    } catch (err) {
      toast.error('Network error. Failed to send OTP.');
    } finally {
      setLoading(false);
    }
  };


  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { toast.error('Enter 6-digit Code'); return; }
    try {
      setLoading(true);
      if (loginMethod === 'WHATSAPP') {
        const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const res = await fetch(`${BASE_API}/api/users/verify-whatsapp-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneNumber, otp: otpValue, role: 'BUYER' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          toast.success('WhatsApp Identity Verified');
          handleQuickLogin({ 
            phoneNumber: `+91${phoneNumber}`, 
            uid: data.user.uid,
            displayName: data.user.displayName,
            email: data.user.email,
            photoURL: data.user.photoURL
          }, 'phone');
        } else {
          toast.error(data.error || 'Invalid WhatsApp OTP');
        }
      } else {
        toast.success('Identity Verified');
        const formatPhone = `+91${phoneNumber}`;
        handleQuickLogin({ phoneNumber: formatPhone, uid: `phone-${phoneNumber}` }, 'phone');
      }
    } catch (error) {
      toast.error('Verification Failed');
    } finally { setLoading(false); }
  };

  const handleQuickLogin = async (credUser, authProvider) => {
    try {
      setLoading(true);
      
      let dbUser = null;
      let dbAddress = null;
      const cleanPhone = (credUser.phoneNumber || '').replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
      if (cleanPhone && supabase) {
        try {
          const { data: usr } = await supabase
            .from('users')
            .select('*')
            .or(`uid.eq.${credUser.uid},phone.eq.${cleanPhone}`)
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

      if (dbUser && dbAddress) {
        const rawLine = dbAddress.address_line_1 || '';
        const parts = rawLine.split(', ').map(p => p.trim());
        let _hName = '';
        let hNo = 'A-101';
        let fl = '1st Floor';
        let soc = dbAddress.city || 'Satellite';
        if (parts.length === 4) {
          [_hName, hNo, fl, soc] = parts;
          fl = fl.replace('Floor ', '');
        } else if (parts.length === 3) {
          if (parts[1].startsWith('Floor ')) {
            [hNo, fl, soc] = parts;
            fl = fl.replace('Floor ', '');
          } else {
            [_hName, hNo, soc] = parts;
          }
        } else if (parts.length === 2) {
          [hNo, soc] = parts;
        }

        const freshProfile = {
          fullName: dbUser.full_name,
          house_no: hNo,
          floor: fl,
          society: soc,
          address: `${hNo}, ${soc}`
        };
        localStorage.setItem('local_user_profile', JSON.stringify(freshProfile));
        localStorage.setItem('passwala_profile_complete', 'true');
        localStorage.setItem('passwala_user_address', JSON.stringify(dbAddress));
        if (dbAddress.lat && dbAddress.lng) {
          localStorage.setItem('passwala_coords', JSON.stringify({ lat: dbAddress.lat, lng: dbAddress.lng }));
        }
        localStorage.setItem('passwala_location', soc);
      }

      const userData = {
        id: dbUser?.id || null,          // ← always include DB UUID if anon query worked
        uid: credUser.uid,
        displayName: dbUser?.full_name || credUser.displayName || 'Passwalaa User',
        phoneNumber: credUser.phoneNumber || null,
        email: dbUser?.email || credUser.email || null,
        photoURL: dbUser?.photo_url || credUser.photoURL || null,
        authProvider: authProvider,
        role: dbUser?.role?.toLowerCase() || 'buyer'
      };

      const API_URL = `${import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`)}/api/users`;
      let finalUser = userData;
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(userData)
        });
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.user) {
            finalUser = {
              id: data.user.id || userData.id,      // ← server UUID wins, fallback to anon query UUID
              uid: data.user.uid || userData.uid,
              displayName: data.user.full_name || userData.displayName,
              phoneNumber: data.user.phone || userData.phoneNumber,
              email: data.user.email || userData.email,
              photoURL: data.user.photo_url || userData.photoURL,
              authProvider: authProvider,
              role: data.user.role?.toLowerCase() || 'buyer'
            };
          }
        }
      } catch (e) {
        console.warn("Cloud skip, using client-side defaults:", e);
        // finalUser = userData (which now has id from dbUser if anon key worked)
      }

      const userWithAddress = { ...finalUser, address: '' };
      localStorage.setItem('passwala_user', JSON.stringify(userWithAddress));
      setSyncedUser(userWithAddress);

      // Auto-jump to LOCATION request to complete the Zepto-style seamless flow
      setStep('LOCATION');
    } catch (err) {
      toast.error("Initialization Failed");
    } finally { setLoading(false); }
  };

  const handleGetLocation = () => {
    if (loading) return;
    setLoading(true);

    // Insecure HTTP contexts do not support navigator.geolocation, fallback to IP location safely
    if (!navigator || !navigator.geolocation) {
      console.warn("Geolocation is unsupported or restricted (non-HTTPS context). Falling back to IP-based location.");
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
          console.warn("Reverse geocoding failed, falling back to IP:", err);
          fallbackToIP();
        } finally {
          setLoading(false);
        }
      },
      (error) => {
        console.warn("Geolocation permission denied or timed out, falling back to IP:", error);
        fallbackToIP();
      },
      { timeout: 8000 }
    );
  };

  const fallbackToIP = async () => {
    try {
      // Try fetching public geolocation directly from client browser first for real IP
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
    } catch (directErr) {
      console.warn("Direct IP Geolocation failed, trying backend proxy:", directErr);
    }

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
      console.warn("Location detection failed. Falling back to default location:", e);
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
    <div className="auth-page">
      <div className="auth-container">
        {/* Back Button Wrapper */}
        {(step === 'OTP' || step === 'PROFILE') && (
          <div className="auth-back-btn-wrapper">
            <button className="auth-back-btn" onClick={() => setStep(step === 'OTP' ? 'PHONE' : 'OTP')}>
              <ArrowLeft size={18} />
            </button>
          </div>
        )}

        {/* TOP HALF: THE PREMIUM DARK SLIDER */}
        <div className="promo-header-section">
          {/* Brand Logo and Name */}
          <div className="auth-brand-header" style={{ position: 'absolute', top: '1.5rem', left: '50%', transform: 'translateX(-50%)', zIndex: 20, background: '#ffffff', padding: '6px', borderRadius: '18px', boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <img src="/logo.png" alt="Passwala Logo" style={{ width: '68px', height: '68px', objectFit: 'contain', borderRadius: '12px' }} />
          </div>

          {activeSlide === 0 && (
            <div className="slide-content-wrapper">
              <h2 className="promo-title-banner">Find the best deal on every meal</h2>
              <div className="floating-stage">
                <img src={passwalaDeals} alt="Best Deals" className="slide-premium-img" />
              </div>
            </div>
          )}
          {activeSlide === 1 && (
            <div className="slide-content-wrapper">
              <h2 className="promo-title-banner">Expert services in a single tap</h2>
              <div className="floating-stage">
                <img src={passwalaServices} alt="Expert Services" className="slide-premium-img" />
              </div>
            </div>
          )}
          {activeSlide === 2 && (
            <div className="slide-content-wrapper">
              <h2 className="promo-title-banner">Superfast local store logistics</h2>
              <div className="floating-stage">
                <img src={passwalaLogistics} alt="Superfast Logistics" className="slide-premium-img" />
              </div>
            </div>
          )}

          {/* Dots Navigation */}
          <div className="promo-dots-row">
            <div className={`promo-dot ${activeSlide === 0 ? 'active' : ''}`} onClick={() => setActiveSlide(0)}></div>
            <div className={`promo-dot ${activeSlide === 1 ? 'active' : ''}`} onClick={() => setActiveSlide(1)}></div>
            <div className={`promo-dot ${activeSlide === 2 ? 'active' : ''}`} onClick={() => setActiveSlide(2)}></div>
          </div>
        </div>

        {/* BOTTOM HALF: THE WHITE ONBOARDING SHEET */}
        <div className="form-content-sheet">
          {step === 'WARM_UP' ? (
            <div style={{ textAlign: 'center', padding: '3rem 0', margin: 'auto' }}>
              <RefreshCw className="spin" size={44} color="var(--auth-action-color)" />
              <p style={{ color: '#4a5568', marginTop: '1.5rem', fontWeight: '600', fontSize: '0.95rem' }}>Synchronizing your session...</p>
            </div>
          ) : step === 'PHONE' ? (
            <>
              <div className="premium-phone-group">
                {/* Indian flag block */}
                <div className="country-selector-box" onClick={() => toast.success('Passwala operates exclusively in India 🇮🇳')}>
                  <span>🇮🇳</span>
                </div>

                {/* Phone number field */}
                <div className="phone-field-box">
                  <span className="phone-prefix">+91</span>
                  <input
                    type="tel"
                    placeholder="Enter Phone Number"
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, '').slice(0, 10))}
                  />
                </div>
              </div>

              {/* Remember Login Checkbox */}
              <div className="remember-login-wrapper" onClick={() => setRememberMe(!rememberMe)}>
                <div className={`custom-checkbox-box ${rememberMe ? 'checked' : ''}`}>
                  {rememberMe && (
                    <svg viewBox="0 0 24 24" fill="none" width="12" height="12">
                      <path d="M20 6L9 17L4 12" stroke="white" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <span className="remember-login-text">Remember my login for faster sign-in</span>
              </div>

              {/* WhatsApp Login Only */}
              <button 
                className="sheet-action-btn" 
                onClick={handleWhatsAppLogin} 
                disabled={loading}
                style={{ background: '#25D366', boxShadow: '0 4px 15px rgba(37, 211, 102, 0.25)', marginTop: '0.5rem', gap: '8px' }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                Login via WhatsApp
              </button>

              <div className="policy-agreement-text" style={{ marginTop: '1.25rem', fontSize: '0.75rem', color: '#718096', textAlign: 'center', lineHeight: '1.4' }}>
                By continuing, you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--auth-action-color)', fontWeight: '600', textDecoration: 'underline' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--auth-action-color)', fontWeight: '600', textDecoration: 'underline' }}>Privacy Policy</a>.
              </div>
            </>
          ) : step === 'OTP' ? (
            <>
              <h3 className="sheet-title">Verification Code</h3>
              <p style={{ fontSize: '0.88rem', color: '#718096', textAlign: 'center', margin: '-0.75rem 0 1.25rem 0' }}>
                We sent a 6-digit code to +91 {phoneNumber} {loginMethod === 'WHATSAPP' ? 'via WhatsApp' : ''}
              </p>

              {/* Dev-mode mock OTP banner */}
              {whatsappOtp && (
                <div style={{
                  background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 100%)',
                  border: '1px solid #f59e0b',
                  borderRadius: '12px',
                  padding: '10px 14px',
                  marginBottom: '1rem',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '10px',
                  boxShadow: '0 0 18px rgba(245,158,11,0.25)'
                }}>
                  <span style={{ fontSize: '1.1rem' }}>🧪</span>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: '700', color: '#f59e0b', textTransform: 'uppercase', letterSpacing: '0.08em' }}>Dev Mode — Mock OTP</div>
                    <div style={{ fontSize: '1.4rem', fontWeight: '800', color: '#ffffff', letterSpacing: '0.18em', fontFamily: 'monospace' }}>{whatsappOtp}</div>
                  </div>
                  <button
                    onClick={() => setOtp(whatsappOtp.split(''))}
                    style={{ background: '#f59e0b', color: '#1a1a2e', border: 'none', borderRadius: '8px', padding: '5px 10px', fontSize: '0.72rem', fontWeight: '700', cursor: 'pointer' }}
                  >
                    Auto-fill
                  </button>
                </div>
              )}

              <div className="otp-nebula-group" onPaste={handlePaste}>
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="tel"
                    className="otp-cell"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(idx, e)}
                  />
                ))}
              </div>

              <button className="sheet-action-btn" onClick={handleVerifyOtp} disabled={loading}>
                {loading ? <RefreshCw className="spin" size={20} color="#ffffff" /> : 'Verify & Continue'}
              </button>

              <div style={{ textAlign: 'center', marginTop: '1.5rem' }}>
                <button
                  style={{ background: 'none', border: 'none', color: 'var(--auth-action-color)', fontWeight: '700', cursor: 'pointer', fontSize: '0.85rem' }}
                  onClick={handlePhoneLogin}
                  disabled={!canResend}
                >
                  {timer > 0 ? `Resend Code in ${timer}s` : 'Resend Code'}
                </button>
              </div>
            </>

          ) : null}
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


