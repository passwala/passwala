/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';
import {
  Phone, ArrowLeft, RefreshCw, User, ShieldCheck, Bell, MapPin,
  Navigation, Search, Crosshair, ChevronRight
} from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import './Auth.css';

// Premium 3D Brand Illustration Assets
import passwalaDeals from '../assets/passwala_deals.png';
import passwalaServices from '../assets/passwala_services.png';
import passwalaLogistics from '../assets/passwala_logistics.png';


const ahmedabadAreas = [
  { name: 'Satellite, Ahmedabad', lat: 23.0305, lng: 72.5075 },
  { name: 'Prahlad Nagar, Ahmedabad', lat: 23.0120, lng: 72.5108 },
  { name: 'Bopal, Ahmedabad', lat: 23.0350, lng: 72.4397 },
  { name: 'South Bopal, Ahmedabad', lat: 23.0158, lng: 72.4566 },
  { name: 'Vastrapur, Ahmedabad', lat: 23.0393, lng: 72.5244 },
  { name: 'Bodakdev, Ahmedabad', lat: 23.0416, lng: 72.5133 },
  { name: 'S.G. Highway, Ahmedabad', lat: 23.0257, lng: 72.5033 },
  { name: 'Thaltej, Ahmedabad', lat: 23.0497, lng: 72.5107 },
  { name: 'Gota, Ahmedabad', lat: 23.0753, lng: 72.5258 },
  { name: 'Ghatlodia, Ahmedabad', lat: 23.0645, lng: 72.5413 },
  { name: 'Chandkheda, Ahmedabad', lat: 23.1119, lng: 72.5854 },
  { name: 'Maninagar, Ahmedabad', lat: 22.9972, lng: 72.6014 },
  { name: 'Navrangpura, Ahmedabad', lat: 23.0333, lng: 72.5621 },
  { name: 'C.G. Road, Ahmedabad', lat: 23.0269, lng: 72.5599 }
];

const Auth = ({ onLogin }) => {
  const { requestNotificationPermission } = useNotifications();
  const [step, setStep] = useState(() => {
    if (localStorage.getItem('passwala_user')) return 'WARM_UP';
    return 'PHONE';
  });
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [society, setSociety] = useState('');
  const [landmark, setLandmark] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tempCred, setTempCred] = useState(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [syncedUser, setSyncedUser] = useState(null);
  const [showSearch, setShowSearch] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const [activeSlide, setActiveSlide] = useState(0);
  const [rememberMe, setRememberMe] = useState(true);
  const canResend = timer === 0;

  useEffect(() => {
    const slideInterval = setInterval(() => {
      setActiveSlide((prev) => (prev + 1) % 3);
    }, 4500);
    return () => clearInterval(slideInterval);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('local_user_profile');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setSyncedUser(parsed);
        if (step === 'WARM_UP') onLogin(parsed);
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
    if (value !== '' && !/^\d$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[idx] = value;
    setOtp(newOtp);
    if (value !== '' && idx < 5) {
      document.getElementById(`otp-${idx + 1}`).focus();
    }
  };

  const handlePhoneLogin = async () => {
    if (loading || phoneNumber.length !== 10) { toast.error('Enter valid 10-digit number'); return; }
    const formatPhone = `+91${phoneNumber}`;

    toast.success('Login Successful!');
    handleQuickLogin({ phoneNumber: formatPhone, uid: `phone-${phoneNumber}` }, 'phone');
  };

  const handleVerifyOtp = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { toast.error('Enter 6-digit Code'); return; }
    try {
      setLoading(true);
      if (confirmationResult) {
        const cred = await confirmationResult.confirm(otpValue);
        toast.success('Identity Verified');
        handleQuickLogin(cred.user, 'phone');
      }
    } catch (error) {
      toast.error('Code Mismatch');
    } finally { setLoading(false); }
  };

  const handleQuickLogin = async (credUser, authProvider) => {
    try {
      setLoading(true);
      const userData = {
        uid: credUser.uid,
        displayName: credUser.displayName || 'Passwalaa User',
        phoneNumber: credUser.phoneNumber || null,
        email: credUser.email || null,
        photoURL: credUser.photoURL || null,
        authProvider: authProvider,
        role: 'buyer'
      };

      const API_URL = `${import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`)}/api/users`;
      await fetch(API_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...userData,
          address: { address_line_1: '', address_line_2: '' }
        })
      }).catch(e => console.warn("Cloud skip"));

      const userWithAddress = { ...userData, address: '' };
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
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      const detectedCity = data.city || 'Ahmedabad';
      const fullAddress = `${detectedCity}, ${data.region || 'Gujarat'}`;

      toast.success(`Approximate location detected: ${fullAddress}`);
      finalizeLocation(fullAddress, { lat: parseFloat(data.latitude) || 23.0225, lng: parseFloat(data.longitude) || 72.5714 });
    } catch (e) {
      setShowSearch(true);
      toast.info("Please select your area manually.");
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
    let currentUserToLog = syncedUser || (storedUser ? JSON.parse(storedUser) : null);

    if (currentUserToLog) {
      if (!currentUserToLog.displayName && userName) {
        currentUserToLog.displayName = userName;
      }
      localStorage.setItem('passwala_user', JSON.stringify(currentUserToLog));
      onLogin(currentUserToLog);
    } else {
      const fallbackUser = { displayName: userName || 'Passwala User', address: addressName };
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

              {/* Continue Action Button */}
              <button className="sheet-action-btn" onClick={handlePhoneLogin} disabled={loading}>
                {loading ? <RefreshCw className="spin" size={20} color="#ffffff" /> : 'Continue'}
              </button>
            </>
          ) : step === 'OTP' ? (
            <>
              <h3 className="sheet-title">Verification Code</h3>
              <p style={{ fontSize: '0.88rem', color: '#718096', textAlign: 'center', margin: '-0.75rem 0 1.25rem 0' }}>
                We sent a 6-digit code to +91 {phoneNumber}
              </p>

              <div className="otp-nebula-group">
                {otp.map((digit, idx) => (
                  <input
                    key={idx}
                    id={`otp-${idx}`}
                    type="tel"
                    maxLength="1"
                    className="otp-cell"
                    value={digit}
                    onChange={(e) => handleOtpChange(idx, e.target.value)}
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

                <div className="profile-input-box" style={{ margin: '0' }}>
                  <input
                    type="text"
                    placeholder="Search Ahmedabad area..."
                    value={manualAddress}
                    onChange={(e) => setManualAddress(e.target.value)}
                  />
                </div>

                {/* Scrollable list of Ahmedabad Areas */}
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
                    const filtered = ahmedabadAreas.filter(area =>
                      area.name.toLowerCase().includes(manualAddress.toLowerCase())
                    );
                    return filtered.length > 0 ? (
                      filtered.map(area => (
                        <button
                          key={area.name}
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
