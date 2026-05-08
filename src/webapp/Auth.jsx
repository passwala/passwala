import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';

// Passwala Identity Signature

import { 
  Phone, ArrowLeft, RefreshCw, User, ShieldCheck, Bell, MapPin, 
  Navigation, Search
} from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithRedirect,
  getRedirectResult,
  onAuthStateChanged, // Added for robust tracking
  updateProfile
} from 'firebase/auth';
import { auth } from '../firebase';
import './Auth.css';

// Premium Brand Animations (Cycled with smooth cross-fade)
const brandAnimations = [
  "https://nwduaxtgisvjybefndfg.supabase.co/storage/v1/object/public/images/1768131673403_Passwala%20Brand%20LDC%20(1).gif",
  "https://nwduaxtgisvjybefndfg.supabase.co/storage/v1/object/public/images/1768131668420_Passwala%20Brand%20LDC%20(2).gif",
  "https://nwduaxtgisvjybefndfg.supabase.co/storage/v1/object/public/images/1768131660469_Passwala%20Brand%20LDC%20(3).gif",
  "https://nwduaxtgisvjybefndfg.supabase.co/storage/v1/object/public/images/1768132754331_Passwala%20Brand%20LDC%20(4).gif"
];

const Auth = ({ onLogin }) => {
  const [step, setStep] = useState(() => {
    // 🚀 High-Speed Initialization: Check if we already have a session
    if (auth.currentUser) return 'PROFILE';
    if (localStorage.getItem('google_login_pending') === 'true') return 'WARM_UP';
    if (localStorage.getItem('passwala_user')) return 'WARM_UP';
    return 'PHONE';
  }); 
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState(''); // New Email field
  const [houseNo, setHouseNo] = useState('');
  const [society, setSociety] = useState('');
  const [landmark, setLandmark] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(0);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const mode = 'LOGIN';
  const [loading, setLoading] = useState(false);
  const [tempCred, setTempCred] = useState(null);
  const [showNotifPrompt, setShowNotifPrompt] = useState(false);
  const [loadProgress, setLoadProgress] = useState(0); 
  const [syncedUser, setSyncedUser] = useState(null); 
  const [showSearch, setShowSearch] = useState(false);
  const [manualAddress, setManualAddress] = useState('');
  const canResend = timer === 0;

  useEffect(() => {
    // 🛡️ 1. Handle Google Redirect Result (Mobile Standard)
    const handleRedirect = async () => {
      try {
        console.log("Auth: Checking for Redirect Result...");
        const isPending = localStorage.getItem('google_login_pending');
        
        // 🛡️ Domain Check for Local IPs
        const hostname = window.location.hostname;
        if (hostname !== 'localhost' && !hostname.includes('firebaseapp.com') && !hostname.includes('web.app')) {
           console.warn("Auth: Local IP detected. Ensure this IP is added to Firebase > Auth > Settings > Authorized Domains");
        }

        const result = await getRedirectResult(auth);
        
        if (result) {
          localStorage.removeItem('google_login_pending');
          console.log("Auth: Redirect Success!", result.user.email);
          setTempCred({ user: result.user, authProvider: 'google' });
          setUserName(result.user.displayName || '');
          setStep('PROFILE');
          toast.success('Signed in with Google!', { id: 'google-success' });
        } else if (isPending) {
           // Still pending, don't clear flag yet, let onAuthStateChanged handle it or manual sync
           console.log("Auth: Redirect result null, waiting for Auth State...");
        }
      } catch (error) {
        localStorage.removeItem('google_login_pending');
        console.error("Auth: Redirect Error:", error.code, error.message);
        if (error.code === 'auth/unauthorized-domain') {
          toast.error(`Domain Error: Add ${window.location.hostname} to Authorized Domains in Firebase Console.`, { duration: 10000, id: 'domain-error' });
        } else {
          toast.error(`Login Failed: ${error.message}`);
        }
      }
    };
    handleRedirect();

    // 🛡️ 2. Real-time Auth State Listener (Proper Webapp Standard)
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        console.log("Auth: State Changed - Logged In", user.phoneNumber || user.email);
        
        // 🛡️ Ensure TempCred is populated for the Final Save step
        setTempCred(prev => prev || { 
          user: user, 
          authProvider: user.providerData?.[0]?.providerId === 'google.com' ? 'google' : 'phone' 
        });

        // Pre-fill name if available and not set
        if (user.displayName) setUserName(prev => prev || user.displayName);
        if (user.email) setUserEmail(prev => prev || user.email);

        setPhoneNumber(user.phoneNumber?.replace('+91', '') || '');
        
        const saved = localStorage.getItem('local_user_profile');
        if (saved) {
          try {
            const parsed = JSON.parse(saved);
            setSyncedUser(parsed);
            setStep('LOCATION');
          } catch (e) { setStep('PROFILE'); }
        } else {
          setStep('PROFILE');
        }
      } else {
        console.log("Auth: State Changed - Logged Out");
        setStep('PHONE');
      }
    });

    return () => unsubscribe();
  }, []);

  useEffect(() => {
    // Initialization progress bar logic
    const progressInterval = setInterval(() => {
      setLoadProgress(prev => {
        if (prev >= 100) {
          clearInterval(progressInterval);
          return 100;
        }
        return prev + 5; // Fast fill for premium feel
      });
    }, 40);

    // Show notification prompt after initialization
    const notifTimer = setTimeout(() => {
      setShowNotifPrompt(true);
    }, 2500);

    // 🛡️ EMERGENCY: If we are stuck in WARM_UP/Redirect for too long, show a manual "Finish Login" button
    const recoveryTimer = setTimeout(() => {
       if (localStorage.getItem('google_login_pending') === 'true') {
          toast('Still waiting for Google? Try tapping "Sync Session"', { id: 'recovery-tip', duration: 6000 });
       }
    }, 5000);

    return () => {
      clearInterval(progressInterval);
      clearTimeout(notifTimer);
      clearTimeout(recoveryTimer);
    };
  }, []);

  useEffect(() => {
    if (step !== 'OTP' || timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

  useEffect(() => {
    return () => {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    };
  }, []);

  const handleOtpChange = (element, index) => {
    if (element.value !== '' && !/^\d$/.test(element.value)) return;
    const newOtp = [...otp];
    newOtp[index] = element.value;
    setOtp(newOtp);
    if (element.nextSibling && element.value !== '') element.nextSibling.focus();
  };

  const setupRecaptcha = () => {
    try {
      // Return if already initialized and valid
      if (window.recaptchaVerifier) return;

      const container = document.getElementById('recaptcha-container');
      if (!container) return;
      container.innerHTML = ''; // Fresh start

      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => {},
        'expired-callback': () => {
          if (window.recaptchaVerifier) {
            window.recaptchaVerifier.clear();
            window.recaptchaVerifier = null;
          }
        }
      });
    } catch (error) {
      console.error("Recaptcha Error:", error);
      toast.error("Recaptcha initialization failed", { id: 'auth-error' });
    }
  };

  const handleSendOTP = async () => {
    if (loading) return; // Prevent double clicks
    if (phoneNumber.length !== 10) { toast.error('Enter 10-digit number'); return; }
    const formatPhone = `+91${phoneNumber}`;
    try {
      setLoading(true);
      setupRecaptcha();
      
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error("Recaptcha failed");
      const result = await signInWithPhoneNumber(auth, formatPhone, appVerifier);
      setConfirmationResult(result);
      setStep('OTP');
      setTimer(30);
      toast.success('OTP Sent!');
    } catch (error) {
      console.error("OTP Error:", error);
      
      // CRITICAL: Clear verifier on ANY error to prevent "reCAPTCHA already rendered" issues
      if (window.recaptchaVerifier) {
        try {
          window.recaptchaVerifier.clear();
        } catch (clearError) {
          console.warn("Error clearing reCAPTCHA:", clearError);
        }
        window.recaptchaVerifier = null;
      }

      if (error.code === 'auth/billing-not-enabled' || error.code === 'auth/quota-exceeded') {
        const errorReason = error.code === 'auth/quota-exceeded' ? "SMS Quota Exceeded" : "Firebase Billing not enabled";
        toast.error(`${errorReason}. Switching to Dev-Test Mode...`, { duration: 5000 });
        
        // Auto-bypass for development if real SMS is blocked
        setConfirmationResult({
          confirm: async (code) => {
            if (code === '123456') return { user: { phoneNumber: formatPhone } };
            throw new Error("Invalid Dev-OTP. Use 123456");
          }
        });
        setStep('OTP');
        setTimer(0);
      } else {
        const detailedMessage = error.code ? `Firebase [${error.code}]: ${error.message}` : error.message || error;
        toast.error(`Failed to send verification code: ${detailedMessage}`, { id: 'auth-error' });
      }
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      
      // Proper Webapp Standard: Use Redirect for all mobile environments
      const isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
      
      if (isMobile) {
        // 🛡️ Track redirect intent to prevent "Starting from scratch" feel on reload
        localStorage.setItem('google_login_pending', 'true');
        toast.loading("Redirecting to Google...", { id: 'google-loading' });
        
        try {
          await signInWithRedirect(auth, provider);
        } catch (redirErr) {
          console.warn("Redirect failed, trying Popup fallback:", redirErr);
          // If redirect is blocked (common on some mobile browsers without HTTPS), try popup
          const result = await signInWithPopup(auth, provider);
          setTempCred({ user: result.user, authProvider: 'google' });
          setUserName(result.user.displayName || '');
          setStep('PROFILE');
          toast.success('Google authentication successful (Popup Fallback)!');
        }
      } else {
        const result = await signInWithPopup(auth, provider);
        setTempCred({ user: result.user, authProvider: 'google' });
        setUserName(result.user.displayName || '');
        setStep('PROFILE');
        toast.success('Google authentication successful!');
      }
    } catch (error) {
      console.error("Google Auth Error:", error);
      toast.error(`Google Sign-In failed: ${error.message}`);
    } finally {
      if (step === 'PHONE') setLoading(false); 
    }
  };

  const handleResendOTP = () => { if (canResend) { handleSendOTP(); setTimer(30); } };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    try {
      setLoading(true);

      // 🛡️ Explicit Dev-Mode Bypass
      if (timer === 0 && otpValue === '123456') {
        const mockUser = { 
          uid: `dev-${phoneNumber}-${Date.now()}`, 
          phoneNumber: `+91${phoneNumber}` 
        };
        setTempCred({ user: mockUser, authProvider: 'phone' });
        setStep('PROFILE');
        toast.success('Developer Access Granted! 🛠️');
        return;
      }

      if (confirmationResult) {
        const cred = await confirmationResult.confirm(otpValue);
        setTempCred(cred);
        setStep('PROFILE'); // Unified Profile step
        toast.success('Phone Verified!', { id: 'auth-success' });
      } else { 
        toast.error('Verification session expired or invalid', { id: 'auth-error' }); 
      }
    } catch (error) {
      console.error(error);
      toast.error('Invalid OTP', { id: 'auth-error' });
    } finally { setLoading(false); }
  };

  const handleFinalSave = async () => {
    if (!houseNo.trim() || !society.trim()) {
      toast.error('Please enter House No and Society');
      return;
    }

    try {
      setLoading(true);
      const userData = {
        uid: tempCred.user.uid,
        displayName: userName,
        phoneNumber: tempCred.user.phoneNumber || null,
        email: userEmail || tempCred.user.email || null, // Priority to input email
        photoURL: tempCred.user.photoURL || null,
        authProvider: tempCred.authProvider || 'phone',
        role: 'buyer'
      };

      if (tempCred) {
        await updateProfile(tempCred.user, { displayName: userName }).catch(e => console.warn('Profile update skip:', e));
      }
      
      // Attempt DB Save (Through Secure Backend)
      try {
        // Use dynamic hostname for network access (Same-Network Testing)
        const API_URL = `http://${window.location.hostname}:3004/api/users`;
        const response = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...userData,
            address: {
              address_line_1: `${houseNo}, ${society}`,
              address_line_2: landmark
            }
          })
        });

        if (!response.ok) throw new Error('Backend sync failed');
        // Sync successful - moving to dashboard
      } catch (dbErr) {
        console.error('Cloud Sync Failed:', dbErr);
        toast('Database Offline. Profile saved locally! 🏠', { icon: '🏠', duration: 4000 });
        localStorage.setItem('local_user_profile', JSON.stringify(userData));
      }

        const finalAddress = `${houseNo}, ${society}`;
        const userWithAddress = { ...userData, address: finalAddress };
        setSyncedUser(userWithAddress);
        
        // After sync, switch to the location step
        setStep('LOCATION');
    } catch (err) {
      console.error('Final Save Error:', err);
      toast.error(`Critical Error: ${err.message}`);
    } finally { setLoading(false); }
  };

  const handleGetLocation = () => {
    if (loading) return;
    setLoading(true);
    console.log("Auth: Requesting Geolocation...");
    
    if (!navigator.geolocation) {
      fallbackToIP();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          // Reverse geocode to get area name
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const area = data.address?.suburb || data.address?.neighbourhood || data.address?.city || data.address?.town || 'My Location';
          const city = data.address?.city || data.address?.town || '';
          const fullAddress = city ? `${area}, ${city}` : area;

          toast.success(`Located: ${area}`, { id: 'geo-success' });
          finalizeLocation(fullAddress, { latitude, longitude });
        } catch (err) {
          fallbackToIP();
        }
      },
      (error) => {
        console.warn('GPS Denied or Failed:', error);
        // 🛡️ Silently fall back to IP without annoying error toast
        fallbackToIP();
      },
      { timeout: 8000 }
    );
  };

  const fallbackToIP = async () => {
    try {
      const res = await fetch('https://ipapi.co/json/');
      const data = await res.json();
      if (data.city) {
        const fullAddress = `${data.city}, ${data.region}`;
        toast.success(`Located: ${data.city}`, { id: 'geo-success' });
        finalizeLocation(fullAddress, { latitude: parseFloat(data.latitude), longitude: parseFloat(data.longitude) });
      } else {
        throw new Error('IP lookup failed');
      }
    } catch (err) {
      toast.error('Could not detect location. Please search manually.', { id: 'geo-error' });
      setLoading(false);
    }
  };

  const finalizeLocation = (addressName, coords) => {
    localStorage.setItem('passwala_location', addressName);
    if (coords) {
      localStorage.setItem('passwala_coords', JSON.stringify(coords));
    }
    
    const updatedUser = { 
      ...(syncedUser || { displayName: userName, phoneNumber: phoneNumber }), 
      address: addressName,
      coords: coords
    };
    
    setTimeout(() => {
      onLogin(updatedUser);
    }, 500);
  };



  const [animIndex, setAnimIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimIndex((prev) => (prev + 1) % brandAnimations.length);
    }, 3000); // Faster 3s loop for a more "continuous" feel
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="auth-page">
      <div className={`auth-container glass ${step === 'PROFILE' ? 'profile-layout' : ''}`}>
        {/* Premium Initialization Bar */}
        <div className="init-loading-bar">
          <div className="init-loading-fill" style={{ width: `${loadProgress}%` }}></div>
        </div>
        
        <div className={`auth-illustration ${step === 'PROFILE' ? 'profile-mode' : ''}`}>
          <div className="animation-stack-v6">
            {brandAnimations.map((url, idx) => (
              <img
                key={url}
                src={url}
                alt="Passwala Animation"
                className={`animated-layer-v6 ${animIndex === idx ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>

        <div className="auth-content">
          {step === 'WARM_UP' ? (
            <div className="warm-init-container">
              <div className="warm-loader">
                <div className="warm-pulse"></div>
                <div className="warm-icon-box">
                   {localStorage.getItem('google_login_pending') === 'true' ? <RefreshCw className="spin" size={32} color="#ff7622" /> : <User size={32} color="#ff7622" />}
                </div>
              </div>
              <h2 className="warm-text">{localStorage.getItem('google_login_pending') === 'true' ? 'Authenticating' : 'Welcome Back'}</h2>
              <p className="warm-subtext">{localStorage.getItem('google_login_pending') === 'true' ? 'Completing Google Sign-In...' : 'Resuming your session...'}</p>
              
              {localStorage.getItem('google_login_pending') === 'true' && (
                <button 
                  className="manual-sync-btn" 
                  onClick={() => handleRedirect()}
                  style={{
                    marginTop: '20px',
                    padding: '10px 20px',
                    borderRadius: '12px',
                    border: '1px solid #e2e8f0',
                    background: '#fff',
                    fontSize: '0.85rem',
                    fontWeight: '600',
                    color: '#64748b',
                    cursor: 'pointer'
                  }}
                >
                  Sync Session Manually
                </button>
              )}
            </div>
          ) : step === 'PHONE' ? (
            <>
              <div className="auth-header-v5">
                <h1 className="welcome-text">Welcome</h1>
                <h2 className="passwala-blue-stamp">PASSWALA BUYER HUB</h2>
              </div>

              <div className="social-login">
                <button className="social-btn google-btn" onClick={handleGoogleLogin} disabled={loading}>
                  {loading && step === 'PHONE' ? <RefreshCw className="spin" size={18} /> : <img src="/google_icon.png" alt="Google" width="20" height="20" />}
                  {loading && step === 'PHONE' ? 'Verifying...' : (mode === 'LOGIN' ? 'Login with Google' : 'Sign up with Google')}
                </button>
              </div>

              <div className="phone-login">
                <div className="input-group">
                  <div className="country-code">+91</div>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button className="auth-submit-btn" onClick={handleSendOTP} disabled={loading}>
                  {loading ? <RefreshCw className="spin" size={20} /> : 'Continue'}
                </button>
              </div>
            </>
          ) : step === 'OTP' ? (
            <div className="otp-flow">
              <button className="back-btn" onClick={() => setStep('PHONE')}><ArrowLeft size={20} /></button>
              <h2>Verify</h2>
              <p>Enter the 6-digit code sent to +91{phoneNumber}</p>
              <div className="otp-input-container">
                {(otp || ['', '', '', '', '', '']).map((data, index) => (
                  <input
                    key={`otp-${index}`}
                    className="otp-field"
                    type="text"
                    inputMode="numeric"
                    autoComplete="one-time-code"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleOtpChange(e.target, index)}
                    onKeyDown={(e) => {
                      if (e.key === 'Backspace' && !otp[index] && e.target.previousSibling) {
                        e.target.previousSibling.focus();
                      }
                    }}
                  />
                ))}
              </div>

              {/* Helpful Dev Hint */}
              {timer === 0 && (
                <div className="dev-mode-hint" style={{ 
                  background: '#fff7ed', 
                  border: '1px solid #ffedd5',
                  padding: '12px',
                  borderRadius: '16px',
                  color: '#ea580c', 
                  fontSize: '0.85rem', 
                  fontWeight: '700', 
                  marginBottom: '1.5rem', 
                  textAlign: 'center',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  gap: '8px'
                }}>
                  <ShieldCheck size={16} /> Use Test Code: 123456
                </div>
              )}

              <button className="auth-submit-btn" onClick={handleVerifyOTP} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Continue'}
              </button>
              <div className="resend-container">
                {canResend ? (
                  <button className="resend-btn" onClick={handleResendOTP}>
                    <RefreshCw size={14} /> Resend Code
                  </button>
                ) : (
                  <p className="timer-text">Resend in {timer}s</p>
                )}
              </div>
            </div>
          ) : step === 'PROFILE' ? (
            <div className="profile-flow">
              <div className="profile-header">
                <h2>Complete Profile</h2>
                <p>Welcome to the Hub! Let's set up your identity.</p>
              </div>

              <div className="profile-sections">
                <div className="profile-section">
                  <label className="section-label">Basic Info</label>
                  <div className="profile-form">
                    <div className="input-group">
                      <div className="input-icon-box"><User size={20} /></div>
                      <input
                        type="text"
                        placeholder="Full Name"
                        value={userName}
                        onChange={(e) => setUserName(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <div className="input-icon-box"><Phone size={20} /></div>
                      <input
                        type="text"
                        placeholder="Phone Number"
                        value={phoneNumber}
                        onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                        maxLength={10}
                        readOnly={tempCred?.authProvider === 'phone'} // Only lock if verified via SMS
                        className={tempCred?.authProvider === 'phone' ? "readonly-input" : ""}
                      />
                    </div>
                    <div className="input-group">
                      <div className="input-icon-box"><ShieldCheck size={20} /></div>
                      <input
                        type="email"
                        placeholder="Email Address"
                        value={userEmail}
                        onChange={(e) => setUserEmail(e.target.value)}
                      />
                    </div>
                  </div>
                </div>

                <div className="profile-section">
                  <label className="section-label">Delivery Address</label>
                  <div className="address-grid-v2">
                    <div className="input-group">
                      <div className="input-icon-box"><MapPin size={18} /></div>
                      <input
                        type="text"
                        placeholder="House / Flat No."
                        value={houseNo}
                        onChange={(e) => setHouseNo(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <div className="input-icon-box"><MapPin size={18} /></div>
                      <input
                        type="text"
                        placeholder="Society / Apartment Name"
                        value={society}
                        onChange={(e) => setSociety(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <div className="input-icon-box"><MapPin size={18} /></div>
                      <input
                        type="text"
                        placeholder="Landmark (Optional)"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                      />
                    </div>
                  </div>
                </div>
              </div>

              <button className="auth-submit-btn" onClick={handleFinalSave} disabled={loading}>
                {loading ? <RefreshCw className="spin" size={20} /> : 'Start Exploring'}
              </button>
            </div>
          ) : null}
        </div>
      </div>

      {step === 'LOCATION' && (
        <div className="modal-overlay">
          <div className="bottom-sheet">
            <div className="sheet-handle"></div>
            <div className="sheet-content">
              {!showSearch && (
                <>
                  <div className="location-icon-wrapper">
                    <div className="main-pin-circle">
                      <MapPin size={48} color="#ffffff" fill="#ffffff" />
                    </div>
                    <div className="pin-pulse"></div>
                  </div>
                  
                  <h2 className="modal-title">Location permission is off</h2>
                  <p className="modal-desc">
                    Enabling location helps us reach you quickly with <br/> accurate delivery and personalized service.
                  </p>
                </>
              )}

              {!showSearch ? (
                <>
                  <div className="modal-actions">
                    <button 
                      className="primary-action-btn" 
                      onClick={handleGetLocation}
                      disabled={loading}
                    >
                      <div className="action-icon">
                        {loading ? <RefreshCw className="spin" size={20} /> : <Navigation size={22} color="#ff7622" />}
                      </div>
                      <div className="action-text">
                        <strong>{loading ? 'Detecting Location...' : 'Use my Current Location'}</strong>
                        <span className="enable-badge">Enable</span>
                      </div>
                    </button>
                    
                    <button className="modal-search-btn" onClick={() => setShowSearch(true)}>
                      <Search size={18} />
                      <span>Search your Location</span>
                    </button>
                  </div>
                </>
              ) : (
                <div className="search-sub-page">
                  <div className="search-header">
                    <button className="back-mini-btn" onClick={() => setShowSearch(false)}>
                      <ArrowLeft size={18} />
                    </button>
                    <h4>Manual Search</h4>
                  </div>
                  
                  <div className="search-input-wrapper">
                    <Search size={20} color="#94a3b8" />
                    <input 
                      type="text" 
                      placeholder="Type your area or city..."
                      value={manualAddress}
                      onChange={(e) => setManualAddress(e.target.value)}
                      autoFocus
                    />
                  </div>

                  <div className="location-suggestions">
                    <p className="suggestion-label">Popular Locations</p>
                    <div className="suggestion-chips">
                      <button className="suggestion-chip" onClick={() => setManualAddress('Ahmedabad, Gujarat')}>
                        <MapPin size={14} />
                        <span>Ahmedabad</span>
                      </button>
                    </div>
                  </div>

                  <button 
                    className="confirm-address-btn"
                    disabled={manualAddress.length < 3}
                    onClick={() => {
                      finalizeLocation(manualAddress, null);
                    }}
                  >
                    Confirm Location
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
      <div id="recaptcha-container"></div> {/* Moved to root to prevent re-render issues */}

      {showNotifPrompt && (
        <div className="notif-prompt-overlay">
          <div className="notif-prompt-card">
            <div className="notif-icon-wrapper">
              <Bell size={40} strokeWidth={2.5} />
            </div>
            <h3>Enable Notifications</h3>
            <p>Get real-time updates on your orders, exclusive discounts, and delivery status alerts.</p>
            <div className="notif-actions">
              <button className="notif-btn-allow" onClick={() => setShowNotifPrompt(false)}>
                Allow Notifications
              </button>
              <button className="notif-btn-deny" onClick={() => setShowNotifPrompt(false)}>
                Don't Allow
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Auth;
