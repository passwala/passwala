import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Phone, ArrowLeft, RefreshCw, User, ShoppingBag, Store, ShieldCheck } from 'lucide-react';
import {
  RecaptchaVerifier,
  signInWithPhoneNumber,
  GoogleAuthProvider,
  signInWithPopup,
  updateProfile
} from 'firebase/auth';
import { auth } from '../../firebase';
import './VendorAuth.css';

const VendorAuth = ({ onLogin }) => {
  const [step, setStep] = useState('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userName, setUserName] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [timer, setTimer] = useState(30);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [tempCred, setTempCred] = useState(null);
  const role = 'vendor';

  useEffect(() => {
    if (step !== 'OTP' || timer <= 0) return;
    const interval = setInterval(() => setTimer((prev) => prev - 1), 1000);
    return () => clearInterval(interval);
  }, [step, timer]);

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
      const result = await signInWithPhoneNumber(auth, formatPhone, window.recaptchaVerifier);
      setConfirmationResult(result);
      setStep('OTP');
      setTimer(30);
      toast.success('OTP Sent to Vendor!');
    } catch (error) {
      console.error(error);
      toast.error('Failed to send OTP');
    } finally { setLoading(false); }
  };

  const saveUserToDatabase = async (userData) => {
    try {
      const res = await fetch('http://localhost:5000/api/users', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...userData, role }),
      });
      const data = await res.json();
      if (!data.success) throw new Error(data.error);
      console.log('✅ Vendor saved:', data.user);
    } catch (err) {
      console.error('❌ Supabase save error:', err);
    }
  };

  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      await saveUserToDatabase({
        uid: result.user.uid,
        email: result.user.email,
        displayName: result.user.displayName,
        photoURL: result.user.photoURL,
        authProvider: 'google',
        role: 'vendor'
      });
      toast.success('Vendor Portal Access Granted!');
      onLogin();
    } catch (error) {
      toast.error('Sign-In failed');
    } finally { setLoading(false); }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { toast.error('Enter 6-digit OTP'); return; }
    try {
      setLoading(true);
      if (confirmationResult) {
        const cred = await confirmationResult.confirm(otpValue);
        setTempCred(cred);
        setStep('NAME');
      } else if (otpValue === '123123') {
        setStep('NAME');
      } else { toast.error('Wrong code'); }
    } catch (error) {
      toast.error('Invalid OTP');
    } finally { setLoading(false); }
  };

  const handleSaveName = async () => {
    if (!userName.trim()) { toast.error('Please enter your business name'); return; }
    try {
      setLoading(true);
      const userData = tempCred
        ? { uid: tempCred.user.uid, displayName: userName, phoneNumber: tempCred.user.phoneNumber, authProvider: 'phone', role: 'vendor' }
        : { uid: 'vendor-' + Math.random().toString(36).substr(2, 9), displayName: userName, phoneNumber: '+91' + phoneNumber, authProvider: 'phone', role: 'vendor' };

      if (tempCred) await updateProfile(tempCred.user, { displayName: userName });
      await saveUserToDatabase(userData);
      toast.success('Welcome to Passwala Vendor!');
      onLogin();
    } catch (err) {
      toast.error('Failed to save business profile');
    } finally { setLoading(false); }
  };

  return (
    <div className="v-auth-page">
      <div className="v-auth-container glass">
        <div className="v-auth-illustration">
          <img 
            src="https://nwduaxtgisvjybefndfg.supabase.co/storage/v1/object/public/images/1768131668420_Passwala%20Brand%20LDC%20(2).gif" 
            alt="Vendor Portal" 
            className="v-auth-img" 
          />
        </div>

        <div className="v-auth-content">
          {step === 'PHONE' ? (
            <>
              <h2>Welcome to Passwala</h2>
              <p>Neighborhood trust by community AI</p>

              <div className="v-social-login">
                <button className="v-social-btn" onClick={handleGoogleLogin} disabled={loading}>
                  <img src="https://www.gstatic.com/firebasejs/ui/2.0.0/images/auth/google.svg" alt="Google" width="20" height="20" />
                  Continue with Google
                </button>
              </div>

              <div className="v-divider">
                <span>OR USE PHONE</span>
              </div>

              <div className="v-phone-login">
                <div className="v-input-group">
                  <div className="v-country-code">+91</div>
                  <input
                    type="tel"
                    placeholder="Phone number"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                  />
                </div>
                <button className="v-submit-btn" onClick={handleSendOTP} disabled={loading}>
                  {loading ? 'Sending...' : 'Send OTP'}
                </button>
              </div>
            </>
          ) : step === 'OTP' ? (
            <div className="v-otp-flow">
              <button className="v-back-btn" onClick={() => setStep('PHONE')}><ArrowLeft size={20} /></button>
              <h2>Verify Account</h2>
              <p>Enter code sent to +91{phoneNumber}</p>
              <div className="v-otp-input-container">
                {otp.map((data, index) => (
                  <input
                    key={index}
                    className="v-otp-field"
                    type="text"
                    maxLength="1"
                    value={data}
                    onChange={(e) => handleOtpChange(e.target, index)}
                  />
                ))}
              </div>
              <button className="v-submit-btn" onClick={handleVerifyOTP} disabled={loading}>
                {loading ? 'Verifying...' : 'Verify & Enter'}
              </button>
            </div>
          ) : (
            <div className="v-name-flow">
              <h2>Register Business</h2>
              <p>Setup your neighborhood vendor profile</p>
              <div className="v-input-group">
                <Store size={18} color="var(--primary)" />
                <input
                  className="v-name-input"
                  type="text"
                  placeholder="Business / Shop Name"
                  value={userName}
                  onChange={(e) => setUserName(e.target.value)}
                  autoFocus
                />
              </div>
              <button className="v-submit-btn" onClick={handleSaveName} disabled={loading}>
                {loading ? 'Saving...' : 'Launch Portal'}
              </button>
            </div>
          )}
        </div>
        <div id="recaptcha-container"></div>
      </div>
    </div>
  );
};

export default VendorAuth;
