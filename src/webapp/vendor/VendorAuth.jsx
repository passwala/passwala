import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Fingerprint, ArrowRight, ArrowLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { auth } from '../../firebase';
import { RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import './VendorPortal.css';

const VendorAuth = ({ onLogin }) => {
  const [step, setStep] = useState(1);
  const [phoneNumber, setPhoneNumber] = useState('');
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [confirmationResult, setConfirmationResult] = useState(null);
  const [timer, setTimer] = useState(0);
  
  useEffect(() => {
    let interval;
    if (timer > 0) {
      interval = setInterval(() => setTimer(t => t - 1), 1000);
    }
    return () => clearInterval(interval);
  }, [timer]);
  const setupRecaptcha = () => {
    try {
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
      }
      window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-wrapper', {
        size: 'invisible',
        'callback': (response) => {
          console.log("reCAPTCHA solved");
        },
        'expired-callback': () => {
          window.recaptchaVerifier.clear();
          window.recaptchaVerifier = null;
        }
      });
    } catch (e) {
      console.error("Recaptcha Setup error:", e);
    }
  };

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length !== 10) {
      toast.error('Enter a valid 10-digit number');
      return;
    }

    // Passwala Mock Testing By-pass
    if (cleanPhone === '9999999999' || cleanPhone === '8888888888') {
      toast.success('Mock OTP sent (123456)');
      setStep(2);
      return;
    }

    setLoading(true);
    try {
      setupRecaptcha();
      const appVerifier = window.recaptchaVerifier;
      const formattedPhone = `+91${cleanPhone}`;
      const confirmation = await signInWithPhoneNumber(auth, formattedPhone, appVerifier);
      setConfirmationResult(confirmation);
      setTimer(30); 
      toast.success('OTP sent successfully');
      setStep(2);
    } catch (error) {
      console.error("Firebase Login Error:", error);
      const errorMessage = error.code === 'auth/captcha-check-failed' 
        ? 'reCAPTCHA failed. Check domain settings.'
        : 'Failed to send OTP. Try mock number 9999999999 for local testing.';
      
      toast.error(errorMessage);
      if (window.recaptchaVerifier) {
        window.recaptchaVerifier.clear();
        window.recaptchaVerifier = null;
      }
    } finally {
      setLoading(false);
    }
  };

  const handleVerifyOTP = async () => {
    const otpValue = otp.join('');
    if (otpValue.length !== 6) { 
      toast.error('Please enter the 6-digit OTP'); 
      return; 
    }

    try {
      setLoading(true);
      toast('Checking your account...', { icon: '🔄', duration: 2000 });
      
      if (confirmationResult) {
        await confirmationResult.confirm(otpValue);
      } else if (otpValue !== '123456') {
        throw new Error('Invalid OTP');
      }
      
      const cleanPhone = phoneNumber.replace(/\D/g, '').slice(-10);

      // Finalize login flow and hand over to VendorPortal
      if (confirmationResult) {
        onLogin(false);
      } else {
        onLogin(true, cleanPhone); // Pass phone back for mock
      }
      
    } catch (error) {
      toast.error('Invalid OTP. Please try again.');
    } finally { 
      setLoading(false); 
    }
  };

  const handleOtpChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value;
    setOtp(newOtp);
    if (value && index < 5) {
      const nextInput = document.getElementById(`otp-${index + 1}`);
      if (nextInput) nextInput.focus();
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      const prevInput = document.getElementById(`otp-${index - 1}`);
      if (prevInput) prevInput.focus();
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdfdfd', padding: '20px' }}>
      <div className="glass slide-up" style={{ width: '100%', maxWidth: '450px', padding: '3rem 2.5rem', margin: '0 auto', textAlign: 'center', backgroundColor: 'white', borderRadius: '32px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)', border: '1px solid #f1f5f9' }}>
        {/* Step 1: Phone */}
        <AnimatePresence mode="wait">
          {step === 1 && (
            <motion.div key="step1" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ width: '100%' }}>
              <div className="auth-header">
                <div className="auth-logo-wrapper">
                  <img src="/logo.png" alt="Passwala Logo" className="auth-logo" />
                </div>
                <h2 className="auth-title">Passwala Partner</h2>
                <p className="auth-subtitle">Professional portal for vendors & experts</p>
              </div>

              <form onSubmit={handleSendOTP} className="auth-form mt-6">
                <div className="input-group">
                  <span className="country-code">+91</span>
                  <input
                    type="tel"
                    placeholder="Enter number"
                    maxLength={10}
                    value={phoneNumber}
                    onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                    className="auth-input phone-input"
                  />
                </div>
                
                <button type="submit" className="auth-submit-btn" disabled={loading || phoneNumber.length !== 10}>
                  {loading ? <span className="loader-ring"></span> : 'Get OTP'}
                </button>
              </form>

              <div className="divider" style={{ margin: '1.5rem 0', display: 'flex', alignItems: 'center', color: '#94a3b8', fontSize: '0.75rem', fontWeight: 700 }}>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
                <span style={{ padding: '0 10px' }}>DEV ONLY</span>
                <div style={{ flex: 1, height: '1px', background: '#e2e8f0' }}></div>
              </div>

              <button 
                className="auth-submit-btn" 
                style={{ background: 'white', color: '#ff7622', border: '2px dashed #ff7622', boxShadow: 'none' }}
                onClick={() => {
                  toast.success('Universal Vendor Mock Access');
                  onLogin({ phoneNumber: '9999999999' });
                }}
              >
                Simulate Vendor Login
              </button>
              <div id="recaptcha-wrapper"></div>
            </motion.div>
          )}

          {/* Step 2: OTP */}
          {step === 2 && (
            <motion.div key="step2" initial={{ x: 50, opacity: 0 }} animate={{ x: 0, opacity: 1 }} style={{ width: '100%', position: 'relative' }}>
              <button className="back-btn-ghost" style={{ position: 'absolute', left: '-10px', top: '-10px' }} onClick={() => setStep(1)}><ArrowLeft size={20} /></button>
              
              <div className="auth-header">
                <div className="auth-logo-wrapper">
                  <img src="/logo.png" alt="Passwala Logo" className="auth-logo" />
                </div>
                <h2 className="auth-title">Passwala Partner</h2>
                <p className="auth-subtitle">Enter OTP sent to +91 {phoneNumber}</p>
              </div>

              <div className="otp-container" style={{ display: 'flex', gap: '8px', justifyContent: 'center', marginTop: '2rem' }}>
                {otp.map((digit, i) => (
                  <input
                    key={i} id={`otp-${i}`} type="text" maxLength={1} value={digit}
                    onChange={(e) => handleOtpChange(i, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(i, e)}
                    className="otp-box"
                    style={{ 
                      width: '45px', 
                      height: '55px', 
                      textAlign: 'center', 
                      fontSize: '1.5rem', 
                      fontWeight: 800, 
                      borderRadius: '12px', 
                      border: '2px solid #e2e8f0',
                      outline: 'none',
                      color: '#0f172a',
                      transition: 'all 0.2s'
                    }}
                    onFocus={(e) => { e.target.style.borderColor = '#f97316'; e.target.style.boxShadow = '0 0 0 3px rgba(249, 115, 22, 0.1)'; }}
                    onBlur={(e) => { e.target.style.borderColor = '#e2e8f0'; e.target.style.boxShadow = 'none'; }}
                  />
                ))}
              </div>

              <button className="auth-submit-btn" style={{ width: '100%', marginTop: '2rem' }} onClick={handleVerifyOTP} disabled={loading || otp.join('').length !== 6}>
                {loading ? <span className="loader-ring"></span> : 'Verify & Continue'}
              </button>

              {timer > 0 ? (
                <p className="auth-subtitle" style={{ textAlign: 'center', marginTop: '1rem' }}>
                  Resend OTP in <span style={{ color: 'var(--primary-color)', fontWeight: 700 }}>{timer}s</span>
                </p>
              ) : (
                <button className="back-btn-ghost" style={{ width: '100%', marginTop: '1rem', background: 'transparent', fontSize: '0.9rem', fontWeight: 700 }} onClick={handleSendOTP}>Resend OTP</button>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default VendorAuth;
