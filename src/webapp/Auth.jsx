/* eslint-disable no-unused-vars, react-hooks/exhaustive-deps */
import React, { useState, useEffect } from 'react';
import { Toaster, toast } from 'react-hot-toast';

// Passwala Identity Signature
console.log('--- PASSWALA IDENTITY VERIFIED ---');
console.log('Build Context: Buyer Portal (Port 3001)');
console.log('Timestamp:', new Date().toISOString());
import { Phone, ArrowLeft, RefreshCw, User, ShieldCheck } from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile // Added this
} from 'firebase/auth';
import { auth } from '../firebase';
import { supabase } from '../supabase';
import './Auth.css';

const Auth = ({ onLogin, onAdminLogin }) => {
  const [step, setStep] = useState('PHONE');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [houseNo, setHouseNo] = useState('');
  const [society, setSociety] = useState('');
  const [landmark, setLandmark] = useState('');
  const [pincode, setPincode] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tempCred, setTempCred] = useState(null);
  const [role, setRole] = useState('buyer'); // Added role state

  const canResend = timer === 0;

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
      if (window.recaptchaVerifier) return;
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
        'size': 'invisible',
        'callback': () => console.log("Recaptcha verified")
      });
    } catch (error) {
      console.error("Recaptcha Error:", error);
      toast.error("Recaptcha initialization failed");
    }
  };

  const handleSendOTP = async () => {
    if (phoneNumber.length !== 10) { toast.error('Enter 10-digit number'); return; }
    try {
      setLoading(true);
      setupRecaptcha();
      const formatPhone = `+91${phoneNumber}`;
      const appVerifier = window.recaptchaVerifier;
      if (!appVerifier) throw new Error("Recaptcha failed");
      const result = await signInWithPhoneNumber(auth, formatPhone, appVerifier);
      setConfirmationResult(result);
      setStep('OTP');
      setTimer(30);
      toast.success('OTP Sent!');
    } catch (error) {
      toast.error('Real OTP Failed. Entering MOCK MODE...');
      
      // MOCK BYPASS: Allow ALL numbers for testing
      setStep('OTP');
      setTimer(30);
      setConfirmationResult(null); // Explicitly null for mock check
      toast.success('Mock OTP Sent: 123456');
    } finally { setLoading(false); }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      
      // Store credentials temporarily to proceed to the Name verification step
      setTempCred({
         user: result.user,
         authProvider: 'google'
      });
      setUserName(result.user.displayName || ''); // Pre-fill name from Google
      setStep('NAME'); // Let user confirm their name

      toast.success('Google authentication successful! Please confirm your name.');
    } catch (error) {
      console.error(error);
      
      // 🛠️ DEV WORKAROUND: If domain is not whitelisted in Firebase yet
      if (error.code === 'auth/unauthorized-domain') {
        toast((t) => (
          <span>
            <b>Auth Error:</b> IP not whitelisted in Firebase Console. 
            <button onClick={() => {
              toast.dismiss(t.id);
              onLogin({
                uid: 'demo-google-' + Math.random().toString(36).substr(2, 9),
                displayName: 'Demo External User',
                role: 'buyer'
              }); // Direct bypass for local testing
            }} style={{ marginLeft: '10px', background: 'var(--primary)', color:'white', border:'none', padding:'4px 8px', borderRadius:'4px' }}>
              Simulate Login
            </button>
          </span>
        ), { duration: 6000 });
      } else {
        toast.error(`Google Sign-In failed: ${error.message || 'Check if server is running on port 3004'}`);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleResendOTP = () => { if (canResend) { handleSendOTP(); setTimer(30); } };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    try {
      setLoading(true);
      if (confirmationResult) {
        const cred = await confirmationResult.confirm(otpValue);
        setTempCred(cred);
        setStep('NAME'); // Ask for name after verification
        toast.success('Phone Verified!');
      } else if (otpValue === '123123' || otpValue === '123456') {
        toast.success('Universal Mock Success!');
        setStep('NAME');
      } else { toast.error('Wrong code'); }
    } catch (error) {
      console.error(error);
      toast.error('Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleSaveName = async () => {
    if (!userName.trim()) { toast.error('Please enter your name'); return; }
    setStep('ADDRESS'); // Move to address step instead of saving immediately
  };

  const handleFinalSave = async () => {
    if (!houseNo.trim() || !society.trim()) {
      toast.error('Please enter House No and Society');
      return;
    }

    try {
      setLoading(true);
      const userData = tempCred
        ? {
          uid: tempCred.user.uid,
          displayName: userName,
          phoneNumber: tempCred.user.phoneNumber || null,
          email: tempCred.user.email || null,
          photoURL: tempCred.user.photoURL || null,
          authProvider: tempCred.authProvider || 'phone',
          role: role // From state
        }
        : {
          uid: 'demo-user-' + Math.random().toString(36).substr(2, 9),
          displayName: userName,
          phoneNumber: '+91' + phoneNumber,
          authProvider: 'phone',
          role: role // From state
        };

      if (tempCred) {
        await updateProfile(tempCred.user, { displayName: userName }).catch(e => console.warn('Profile update skip:', e));
      }
      
      // Attempt DB Save (Through Secure Backend)
      try {
        const response = await fetch('http://localhost:3004/api/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            ...userData,
            address: {
              address_line_1: `${houseNo}, ${society}`,
              address_line_2: landmark,
              pincode: pincode
            }
          })
        });

        if (!response.ok) throw new Error('Backend sync failed');
        
        toast.success('Synced with Cloud! ☁️');
      } catch (dbErr) {
        console.error('Cloud Sync Failed:', dbErr);
        toast('Database Offline. Profile saved locally! 🏠', { icon: '🏠', duration: 4000 });
        localStorage.setItem('local_user_profile', JSON.stringify(userData));
      }

      onLogin(userData);
    } catch (err) {
      console.error('Final Save Error:', err);
      toast.error(`Critical Error: ${err.message}`);
    } finally { setLoading(false); }
  };

  const handleAdminAuth = () => {
    if (adminCode === 'PASSWALA99') {
      toast.success('Admin authorized!');
      onAdminLogin();
    } else {
      toast.error('Invalid Admin Code');
    }
  };

  const brandAnimations = [
    "https://nwduaxtgisvjybefndfg.supabase.co/storage/v1/object/public/images/1768131673403_Passwala%20Brand%20LDC%20(1).gif",
    "https://nwduaxtgisvjybefndfg.supabase.co/storage/v1/object/public/images/1768131668420_Passwala%20Brand%20LDC%20(2).gif",
    "https://nwduaxtgisvjybefndfg.supabase.co/storage/v1/object/public/images/1768131660469_Passwala%20Brand%20LDC%20(3).gif",
    "https://nwduaxtgisvjybefndfg.supabase.co/storage/v1/object/public/images/1768132754331_Passwala%20Brand%20LDC%20(4).gif"
  ];
  const [animIndex, setAnimIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setAnimIndex((prev) => (prev + 1) % brandAnimations.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="auth-page">
      <div className="auth-container glass">
        <div className="auth-illustration">
          <img
            key={animIndex}
            src={brandAnimations[animIndex]}
            alt="Passwala Neighborhood Hub"
            className="animated-cartoon"
          />
        </div>

        <div className="auth-content">
          {step === 'PHONE' ? (
            <>
            <div className="auth-header-v5">
              <h2 className="passwala-blue-stamp">PASSWALA BUYER HUB</h2>
              <p>Authentic Neighborhood Connections</p>
            </div>

              <div className="social-login" style={{ marginBottom: '0.5rem' }}>
                <button className="social-btn google-btn" onClick={handleGoogleLogin} disabled={loading}>
                  <img src="/google_icon.png" alt="Google" width="20" height="20" />
                  Continue with Google
                </button>
              </div>

              <button 
                className="social-btn" 
                style={{ marginBottom: '1.5rem', background: '#f8fafc', color: 'var(--primary)', borderColor: 'var(--primary)', borderStyle: 'dashed' }}
                onClick={() => onLogin()}
              >
                Simulate Guest Login
              </button>

              <div className="divider">
                <span>OR USE PHONE</span>
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
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </>
          ) : step === 'OTP' ? (
            <div className="otp-flow">
              <button className="back-btn" onClick={() => setStep('PHONE')}><ArrowLeft size={20} /></button>
              <h2>Verify</h2>
              <p>Enter the 6-digit code sent to +91{phoneNumber}</p>
              <div className="otp-input-container">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    className="otp-field"
                    type="text"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleOtpChange(e.target, index)}
                  />
                ))}
              </div>
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
          ) : (
            <div className="name-flow">
              <h2>Nearly there!</h2>
              {step === 'NAME' ? (
                <>
                  <p>What should we call you?</p>
                  <div className="input-group">
                    <User size={18} color="var(--text-secondary)" />
                    <input
                      className="name-input-field"
                      type="text"
                      placeholder="Your full name"
                      value={userName}
                      onChange={(e) => setUserName(e.target.value)}
                      autoFocus
                    />
                  </div>
                  <button className="auth-submit-btn" onClick={handleSaveName} disabled={loading}>
                     Continue
                  </button>
                </>
              ) : (
                <>
                  <p>Where should we deliver?</p>
                  <div className="address-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '1rem', marginTop: '1rem' }}>
                    <div className="input-group">
                      <input
                        className="name-input-field"
                        type="text"
                        placeholder="House / Flat No."
                        value={houseNo}
                        onChange={(e) => setHouseNo(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <input
                        className="name-input-field"
                        type="text"
                        placeholder="Society / Apartment Name"
                        value={society}
                        onChange={(e) => setSociety(e.target.value)}
                      />
                    </div>
                    <div className="input-group">
                      <input
                        className="name-input-field"
                        type="text"
                        placeholder="Landmark (Optional)"
                        value={landmark}
                        onChange={(e) => setLandmark(e.target.value)}
                      />
                    </div>
                  </div>
                  <button className="auth-submit-btn" onClick={handleFinalSave} disabled={loading} style={{ marginTop: '1.5rem' }}>
                    {loading ? 'Saving...' : 'Start Exploring'}
                  </button>
                </>
              )}
            </div>
          )}
        </div>

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default Auth;
