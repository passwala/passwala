import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  Phone, ArrowLeft, RefreshCw, User, ShieldCheck, Bell, MapPin,
  Navigation, Search, Crosshair, ChevronRight
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import { supabase } from '../supabase';
import { useTranslation } from './LanguageContext';
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
  const { t } = useTranslation();
  const { requestNotificationPermission } = useNotifications();
  const [step, setStep] = useState(() => {
    if (localStorage.getItem('passwala_user')) return 'WARM_UP';
    return 'EMAIL_LOGIN';
  });
  const [email, setEmail] = useState('');
  const [otpSent, setOtpSent] = useState(false);
  const [otp, setOtp] = useState('');
  
  // Phone / WhatsApp OTP login
  const [loginMode, setLoginMode] = useState('email'); // 'email' | 'phone'
  const [phone, setPhone] = useState('');
  const [phoneOtpSent, setPhoneOtpSent] = useState(false);
  const [phoneOtp, setPhoneOtp] = useState('');
  const [mockOtp, setMockOtp] = useState(''); // dev only

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

  // ── CRITICAL: Supabase Auth State Listener (handles Google OAuth redirect on mobile) ──
  useEffect(() => {
    // This is the CORRECT way to handle OAuth callbacks.
    // On mobile, after Google redirect, Supabase exchanges the URL hash token
    // and fires this event — no polling needed.
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if ((event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') && session?.user) {
        const user = session.user;
        // Avoid processing if already logged in
        if (localStorage.getItem('passwala_user')) return;

        const emailPrefix = (user.email || '').split('@')[0];
        const cleanName = user.user_metadata?.full_name
          || user.user_metadata?.name
          || emailPrefix.replace(/[._0-9]/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase()).trim()
          || 'Passwala User';

        await handleQuickLogin({
          email: user.email,
          uid: user.id,
          displayName: cleanName,
          photoURL: user.user_metadata?.avatar_url
        }, user.app_metadata?.provider || 'google');
      }
    });

    // Also check localStorage for already-saved sessions (warm start)
    const checkLocalAuth = () => {
      const saved = localStorage.getItem('local_user_profile');
      const savedUser = localStorage.getItem('passwala_user');
      if (saved && step === 'WARM_UP') {
        try { const parsed = JSON.parse(saved); setSyncedUser(parsed); onLogin(parsed); } catch (e) {}
      } else if (savedUser && step !== 'LOCATION' && step !== 'PROFILE') {
        try { const parsedUser = JSON.parse(savedUser); onLogin(parsedUser); } catch (e) {}
      }
    };
    checkLocalAuth();

    return () => subscription.unsubscribe();
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
    if (loading || !email) { toast.error('Please enter email'); return; }
    
    setLoading(true);
    try {
      if (!otpSent) {
        const { error } = await supabase.auth.signInWithOtp({ email });
        if (error) throw error;
        toast.success('OTP sent to your email!');
        setOtpSent(true);
      } else {
        if (!otp) { toast.error('Please enter OTP'); return; }
        const { data, error } = await supabase.auth.verifyOtp({ email, token: otp, type: 'email' });
        if (error) throw error;
        toast.success('Login Successful!');
        
        const user = data.user;
        if (user) {
          // Derive a clean display name: prefer metadata, else capitalize email prefix
          const emailPrefix = user.email.split('@')[0];
          // Convert "karanhdave2k20" → "Karanhdave2k20", handle dots/underscores
          const cleanName = user.user_metadata?.full_name 
            || user.user_metadata?.name
            || emailPrefix.replace(/[._0-9]/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase()).trim()
            || emailPrefix;
          handleQuickLogin({
            email: user.email,
            uid: user.id,
            displayName: cleanName,
            photoURL: user.user_metadata?.avatar_url
          }, 'email');
        }
      }
    } catch (err) {
      console.error(err);
      toast.error(err.message || 'Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  // ── Phone + WhatsApp OTP (works on mobile via Supabase Phone Auth) ──────────
  const handlePhoneSendOtp = async (e) => {
    e.preventDefault();
    if (loading || !phone) { toast.error('Please enter your phone number'); return; }
    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) { toast.error('Enter a valid 10-digit number'); return; }
    const fullPhone = `+91${clean}`; // Indian number with country code

    setLoading(true);
    try {
      // PRIMARY: Use Supabase Phone OTP (works on all devices, no server needed)
      const { error } = await supabase.auth.signInWithOtp({ phone: fullPhone });
      if (!error) {
        toast.success('OTP sent to your WhatsApp / SMS! 📲');
        setPhoneOtpSent(true);
        return;
      }
      // Supabase phone auth not enabled — fallback to backend API
      console.warn('Supabase phone OTP failed, trying backend:', error.message);
      throw error;
    } catch (supabaseErr) {
      // FALLBACK: Backend API (Evolution/WhatsApp — requires server to be running)
      try {
        const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const res = await fetch(`${BASE_API}/api/auth/send-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: clean })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Failed to send OTP');
        toast.success('OTP sent to your WhatsApp! 📲');
        setPhoneOtpSent(true);
        if (data.otp) setMockOtp(data.otp);
      } catch (apiErr) {
        toast.error('Could not send OTP. Please try Email OTP instead.');
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePhoneVerifyOtp = async (e) => {
    e.preventDefault();
    if (loading || !phoneOtp) { toast.error('Please enter the OTP'); return; }
    const clean = phone.replace(/\D/g, '');
    const fullPhone = `+91${clean}`;

    setLoading(true);
    try {
      // PRIMARY: Verify via Supabase (matches the OTP it sent)
      const { data, error } = await supabase.auth.verifyOtp({
        phone: fullPhone,
        token: phoneOtp,
        type: 'sms'
      });

      if (!error && data?.user) {
        toast.success('Phone verified! ✅');
        const user = data.user;
        await handleQuickLogin({
          phone: fullPhone,
          uid: user.id,
          displayName: `User ${clean.slice(-4)}`,
          email: user.email || null
        }, 'phone');
        return;
      }
      // If Supabase fails, try backend API verification
      throw error || new Error('Supabase verify failed');
    } catch (supabaseErr) {
      // FALLBACK: Backend API verification
      try {
        const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const res = await fetch(`${BASE_API}/api/auth/verify-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: clean, otp: phoneOtp })
        });
        const data = await res.json();
        if (!data.success) throw new Error(data.error || 'Incorrect OTP');
        toast.success('Phone verified! ✅');
        await handleQuickLogin({
          phone: data.phone,
          uid: `phone_${data.phone}`,
          displayName: `User ${data.phone.slice(-4)}`,
          email: null
        }, 'phone');
      } catch (apiErr) {
        toast.error(apiErr.message || 'Verification failed. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };


  const handleGoogleLogin = async () => {
    if (loading) return;
    setLoading(true);
    try {
      // Always redirect back to /auth so the onAuthStateChange listener catches the token
      const redirectTo = `${window.location.origin}/auth`;
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo,
          // These ensure proper mobile browser handling
          queryParams: {
            access_type: 'offline',
            prompt: 'consent',
          }
        }
      });
      if (error) throw error;
      // Note: browser will redirect away — setLoading stays true
      // onAuthStateChange will fire on return and complete the login
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
        authProvider: authProvider,
        role: dbUser?.role || 'BUYER',
        preferences: dbUser?.preferences || {}
      };

      const res = await fetch(`${BASE_API}/api/users`, {
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
            <button className="auth-back-btn" onClick={() => setStep('EMAIL_LOGIN')} style={{ background: 'transparent', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
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
              <h2 style={{ fontSize: '1.3rem' }}>{t('auth_welcome')}</h2>
              <p style={{ marginTop: '0.25rem', fontSize: '0.85rem' }}>{t('auth_tagline')}</p>
            </div>

            {step === 'WARM_UP' ? (
              <div style={{ textAlign: 'center', padding: '3rem 0', margin: 'auto' }}>
                <RefreshCw className="spin" size={44} color="var(--auth-action-color)" />
                <p style={{ color: '#4a5568', marginTop: '1.5rem', fontWeight: '600', fontSize: '0.95rem' }}>{t('auth_syncing')}</p>
              </div>
            ) : step === 'EMAIL_LOGIN' ? (
              <>
                {/* ── Login Mode Tabs ── */}
                <div style={{
                  display: 'flex', borderRadius: '10px', background: 'var(--bg-surface)',
                  padding: '4px', gap: '4px', marginBottom: '1rem'
                }}>
                  <button
                    type="button"
                    onClick={() => { setLoginMode('email'); setOtpSent(false); setOtp(''); }}
                    style={{
                      flex: 1, padding: '0.55rem', border: 'none', borderRadius: '7px',
                      fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: loginMode === 'email' ? 'white' : 'transparent',
                      color: loginMode === 'email' ? 'var(--auth-action-color)' : '#64748b',
                      boxShadow: loginMode === 'email' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    ✉️ {t('auth_email_otp')}
                  </button>
                  <button
                    type="button"
                    onClick={() => { setLoginMode('phone'); setPhoneOtpSent(false); setPhoneOtp(''); }}
                    style={{
                      flex: 1, padding: '0.55rem', border: 'none', borderRadius: '7px',
                      fontWeight: '600', fontSize: '0.82rem', cursor: 'pointer',
                      transition: 'all 0.2s',
                      background: loginMode === 'phone' ? 'white' : 'transparent',
                      color: loginMode === 'phone' ? '#25D366' : '#64748b',
                      boxShadow: loginMode === 'phone' ? '0 1px 4px rgba(0,0,0,0.1)' : 'none'
                    }}
                  >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="#25D366" style={{ marginRight: '4px', verticalAlign: 'middle' }}><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.989.574 3.842 1.563 5.408L2 22l4.75-1.534A9.96 9.96 0 0011.999 22C17.522 22 22 17.522 22 12S17.522 2 11.999 2zm0 18c-1.795 0-3.467-.5-4.893-1.365l-.351-.208-3.626 1.171.96-3.535-.231-.37A7.966 7.966 0 014 12c0-4.411 3.589-8 7.999-8C16.41 4 20 7.589 20 12s-3.589 8-8.001 8z"/></svg>
                    {t('auth_whatsapp_otp')}
                  </button>
                </div>

                {/* ── Email OTP Form ── */}
                {loginMode === 'email' && (
                  <form onSubmit={handleEmailAuth} className="email-auth-form" style={{ gap: '0.85rem' }}>
                    <div className="input-group-modern" style={{ gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>{t('auth_email_label')}</label>
                      <input 
                        type="email" 
                        placeholder={t('auth_email_placeholder')}
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        required
                        disabled={otpSent}
                        style={{ padding: '0.75rem 1rem', opacity: otpSent ? 0.6 : 1 }}
                      />
                    </div>
                    {otpSent && (
                      <div className="input-group-modern" style={{ gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem' }}>{t('auth_otp_label')}</label>
                        <input 
                          type="text" 
                          placeholder={t('auth_otp_placeholder')}
                          value={otp}
                          onChange={(e) => setOtp(e.target.value.replace(/\D/g, ''))}
                          maxLength={8}
                          required
                          autoFocus
                          style={{ padding: '0.75rem 1rem', letterSpacing: '0.2rem', textAlign: 'center', fontSize: '1.2rem', fontWeight: 'bold' }}
                        />
                      </div>
                    )}
                    <div className="auth-toggle-row" style={{ marginTop: '0' }}>
                      {otpSent ? (
                        <span onClick={() => { setOtpSent(false); setOtp(''); }} className="toggle-auth-mode">
                          {t('auth_change_email')}
                        </span>
                      ) : (
                        <span className="toggle-auth-mode" style={{ visibility: 'hidden' }}>Placeholder</span>
                      )}
                    </div>

                    <button 
                      type="submit"
                      className="sheet-action-btn-modern" 
                      disabled={loading}
                      style={{ background: 'var(--auth-action-color)', marginTop: '0.5rem' }}
                    >
                      {loading ? <RefreshCw className="spin" size={20} color="#fff" /> : (otpSent ? t('auth_verify_otp') : t('auth_send_otp'))}
                    </button>
                  </form>
                )}

                {/* ── WhatsApp OTP Form ── */}
                {loginMode === 'phone' && (
                  <form onSubmit={phoneOtpSent ? handlePhoneVerifyOtp : handlePhoneSendOtp} className="email-auth-form" style={{ gap: '0.85rem' }}>
                    <div className="input-group-modern" style={{ gap: '0.35rem' }}>
                      <label style={{ fontSize: '0.8rem' }}>{t('auth_mobile_label')}</label>
                      <div style={{ display: 'flex', gap: '8px' }}>
                        <div style={{
                          padding: '0.75rem 0.75rem', background: 'var(--bg-surface)', border: '1.5px solid #e2e8f0',
                          borderRadius: '10px', fontWeight: '600', fontSize: '0.9rem', color: 'var(--text-primary)',
                          display: 'flex', alignItems: 'center', gap: '4px', whiteSpace: 'nowrap'
                        }}>
                          🇮🇳 +91
                        </div>
                        <input 
                          type="tel"
                          placeholder={t('auth_mobile_placeholder')}
                          value={phone}
                          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
                          required
                          disabled={phoneOtpSent}
                          maxLength={10}
                          style={{ padding: '0.75rem 1rem', opacity: phoneOtpSent ? 0.6 : 1, flex: 1 }}
                        />
                      </div>
                    </div>

                    {phoneOtpSent && (
                      <div className="input-group-modern" style={{ gap: '0.35rem' }}>
                        <label style={{ fontSize: '0.8rem' }}>
                          {t('auth_whatsapp_otp_label')}
                          {mockOtp && <span style={{ color: '#25D366', marginLeft: '8px', fontSize: '0.75rem' }}>[Dev: {mockOtp}]</span>}
                        </label>
                        <input 
                          type="text"
                          placeholder={t('auth_whatsapp_otp_placeholder')}
                          value={phoneOtp}
                          onChange={(e) => setPhoneOtp(e.target.value.replace(/\D/g, '').slice(0, 6))}
                          maxLength={6}
                          required
                          autoFocus
                          style={{ padding: '0.75rem 1rem', letterSpacing: '0.3rem', textAlign: 'center', fontSize: '1.3rem', fontWeight: 'bold' }}
                        />
                      </div>
                    )}
                    {phoneOtpSent && (
                      <div className="auth-toggle-row" style={{ marginTop: '0' }}>
                        <span onClick={() => { setPhoneOtpSent(false); setPhoneOtp(''); setMockOtp(''); }} className="toggle-auth-mode">
                          {t('auth_change_number')}
                        </span>
                      </div>
                    )}

                    <button
                      type="submit"
                      className="sheet-action-btn-modern"
                      disabled={loading}
                      style={{ background: '#25D366', marginTop: '0.5rem', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}
                    >
                      {loading
                        ? <RefreshCw className="spin" size={20} color="#fff" />
                        : phoneOtpSent
                          ? t('auth_verify_whatsapp_otp')
                          : <><svg width="18" height="18" viewBox="0 0 24 24" fill="white"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/><path d="M11.999 2C6.477 2 2 6.477 2 12c0 1.989.574 3.842 1.563 5.408L2 22l4.75-1.534A9.96 9.96 0 0011.999 22C17.522 22 22 17.522 22 12S17.522 2 11.999 2zm0 18c-1.795 0-3.467-.5-4.893-1.365l-.351-.208-3.626 1.171.96-3.535-.231-.37A7.966 7.966 0 014 12c0-4.411 3.589-8 7.999-8C16.41 4 20 7.589 20 12s-3.589 8-8.001 8z"/></svg> {t('auth_send_whatsapp_otp')}</>
                      }
                    </button>

                  </form>
                )}

                  <div className="divider-modern" style={{ margin: '1rem 0' }}>
                    <span>{t('auth_or')}</span>
                  </div>

                  <button 
                    type="button"
                    className="sheet-action-btn-modern google-btn" 
                    onClick={handleGoogleLogin} 
                    disabled={loading}
                    style={{ padding: '0.85rem' }}
                  >
                    <svg viewBox="0 0 24 24" width="20" height="20" xmlns="http://www.w3.org/2000/svg"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/></svg>
                    {t('auth_continue_google')}
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
                  🤖 {t('auth_ask_ai')}
                </button>

                <div className="policy-agreement-text">
                  {t('auth_terms_text')} <a href="/terms">{t('auth_terms')}</a> & <a href="/privacy-policy">{t('auth_privacy')}</a>.
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
                  <h3>{t('loc_title')}</h3>
                  <p>{t('loc_subtitle')}</p>
                </div>

                <div style={{ width: '100%' }}>
                  <button className="zepto-btn-current-loc" onClick={handleGetLocation}>
                    <div className="left">
                      <Crosshair size={20} color="var(--auth-action-color)" />
                      <span>{t('loc_use_current')}</span>
                    </div>
                    <div className="right-btn">{t('loc_enable')}</div>
                  </button>

                  <button className="zepto-btn-whatsapp" onClick={() => window.open('https://wa.me/?text=Send%20me%20your%20location', '_blank')}>
                    <div className="left">
                      <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ color: '#25D366' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      <span>{t('loc_request_friend')}</span>
                    </div>
                    <ChevronRight size={18} color="#cbd5e1" />
                  </button>
                </div>

                <div className="zepto-address-section" style={{ width: '100%' }}>
                  <div className="zepto-address-header">
                    <span className="title">{t('loc_select_address')}</span>
                    <span className="see-all">{t('loc_see_all')}</span>
                  </div>

                  <button className="zepto-search-btn" onClick={() => setShowSearch(true)}>
                    <Search size={18} />
                    <span>{t('loc_search_btn')}</span>
                  </button>
                </div>
              </>
            ) : (
              // Search Mode UI
              <div style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <div className="zepto-location-header" style={{ marginBottom: '1rem' }}>
                  <h3>{t('loc_search_title')}</h3>
                  <p>{t('loc_search_subtitle')}</p>
                </div>

                <div className="profile-input-box" style={{ margin: '0', display: 'flex', padding: '4px' }}>
                  <input
                    type="text"
                    placeholder={t('loc_search_placeholder')}
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
                    {loading ? '...' : t('loc_search')}
                  </button>
                </div>

                {/* Scrollable list of Areas */}
                <div style={{
                  maxHeight: '180px',
                  overflowY: 'auto',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '6px',
                  background: 'var(--bg-surface)',
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
                            background: 'var(--bg-card)',
                            border: '1px solid #e2e8f0',
                            borderRadius: '8px',
                            padding: '8px 12px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            cursor: 'pointer',
                            fontSize: '0.85rem',
                            fontWeight: '600',
                            color: 'var(--text-primary)',
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
                        {t('loc_no_areas')}
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
                    {t('loc_confirm')}
                  </button>
                  <button className="notif-btn-deny" onClick={() => setShowSearch(false)}>{t('loc_back')}</button>
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



