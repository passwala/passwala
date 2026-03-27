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
      console.error(error);
      toast.error(`Error: ${error.code || 'Failed to send OTP'}`);
    } finally { setLoading(false); }
  };

  const saveUserToDatabase = async (userData) => {
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(userData),
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
        authProvider: 'google' 
      });

      toast.success('Signed in with Google!');
      onLogin();
    } catch (error) {
      console.error(error);
      toast.error(`Google Sign-In failed: ${error.message}`);
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
      } else if (otpValue === '123123') {
        toast.success('Simulated success!');
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
            authProvider: 'phone' 
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

  return (
    <div className="auth-page">
        <div className="auth-container glass">
           <div className="auth-illustration">
              <img src="/login_illustration.png" alt="Community" />
           </div>
           
           <div className="auth-content">
              {step === 'PHONE' ? (
                <>
                  <h2>Welcome to Passwala</h2>
                  <p>Neighborhood trust by community AI</p>

                  <div className="social-login">
                    <button className="social-btn google-btn" onClick={handleGoogleLogin} disabled={loading}>
                      <img src="/google_icon.png" alt="Google" width="20" height="20" />
                      Continue with Google
                    </button>
                  </div>

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
                   <button className="auth-submit-btn" onClick={handleSaveName} disabled={loading}>
                     {loading ? 'Saving...' : 'Start Exploring'}
                   </button>
                </div>
              )}
           </div>

           <div className="admin-entry">
              {isAdminMode ? (
                <div className="admin-auth-box">
                  <ShieldCheck size={20} color="var(--primary)" />
                  <input 
                    type="password" 
                    placeholder="Admin Code" 
                    value={adminCode}
                    onChange={(e) => setAdminCode(e.target.value)}
                  />
                  <button onClick={handleAdminAuth}>Grant</button>
                  <button onClick={() => setIsAdminMode(false)} className="cancel">Exit</button>
                </div>
              ) : (
                <button className="admin-access-btn" onClick={() => setIsAdminMode(true)}>
                   System Admin Access
                </button>
              )}
           </div>
           
           <div id="recaptcha-container"></div>
        </div>
    </div>
  );
};

export default Auth;
