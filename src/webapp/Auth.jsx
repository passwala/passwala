import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Phone, ArrowLeft, RefreshCw, User, ShieldCheck } from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile // Added this
} from 'firebase/auth';
import { auth } from '../firebase';
import './Auth.css';

const Auth = ({ onLogin, onAdminLogin }) => {
  const [step, setStep] = useState('PHONE');
  const [isAdminMode, setIsAdminMode] = useState(false);
  const [adminCode, setAdminCode] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
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

  const saveUserToDatabase = async (userData) => {
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, role }), // Include role
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      console.log('✅ User saved to Supabase:', data.user);
    } catch (err) {
      console.error('❌ Supabase save error:', err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      await saveUserToDatabase({
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        photoURL: user.photoURL,
        authProvider: 'google',
        role: 'buyer' // Default for Google Quick login
      });

      toast.success('Signed in with Google!');
      onLogin();
    } catch (error) {
      console.error(error);
      
      // 🛠️ DEV WORKAROUND: If domain is not whitelisted in Firebase yet
      if (error.code === 'auth/unauthorized-domain') {
        toast((t) => (
          <span>
            <b>Auth Error:</b> IP not whitelisted in Firebase Console. 
            <button onClick={() => {
              toast.dismiss(t.id);
              onLogin(); // Direct bypass for local testing
            }} style={{ marginLeft: '10px', background: 'var(--primary)', color:'white', border:'none', padding:'4px 8px', borderRadius:'4px' }}>
              Simulate Login
            </button>
          </span>
        ), { duration: 6000 });
      } else {
        toast.error(`Google Sign-In failed: ${error.message}`);
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
    try {
      setLoading(true);
      const userData = tempCred
        ? {
          uid: tempCred.user.uid,
          displayName: userName,
          phoneNumber: tempCred.user.phoneNumber,
          authProvider: 'phone'
        }
        : {
          uid: 'demo-user-' + Math.random().toString(36).substr(2, 9),
          displayName: userName,
          phoneNumber: '+91' + phoneNumber,
          authProvider: 'phone',
          role: role // From state
        };

      if (tempCred) {
        await updateProfile(tempCred.user, { displayName: userName });
      }
      await saveUserToDatabase(userData);
      toast.success('Welcome to Passwala!');
      onLogin();
    } catch (err) {
      toast.error('Failed to save profile');
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
              <h2>Welcome to Passwala</h2>
              <p>Neighborhood trust by community AI</p>

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

              <div className="role-selection">
                <p className="role-label">I am a:</p>
                <div className="role-grid">
                  <div 
                    className={`role-card ${role === 'buyer' ? 'active' : ''}`}
                    onClick={() => setRole('buyer')}
                  >
                    <div className="role-icon-box">🛍️</div>
                    <strong>Customer</strong>
                    <span>I want to find help & shops</span>
                  </div>
                  <div 
                    className={`role-card ${role === 'vendor' ? 'active' : ''}`}
                    onClick={() => setRole('vendor')}
                  >
                    <div className="role-icon-box">🏬</div>
                    <strong>Vendor</strong>
                    <span>I want to list my shop/service</span>
                  </div>
                </div>
              </div>

              <button className="auth-submit-btn" onClick={handleSaveName} disabled={loading}>
                {loading ? 'Saving...' : 'Start Exploring'}
              </button>
            </div>
          )}
        </div>

        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default Auth;
