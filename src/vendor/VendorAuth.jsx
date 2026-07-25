import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import './VendorAuth.css';

const VendorAuth = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);
  const [rememberMe, setRememberMe] = useState(true);
  const [step, setStep] = useState('PHONE'); // 'PHONE' or 'OTP'
  const [loginMethod, setLoginMethod] = useState('SMS'); // 'SMS' or 'WHATSAPP'
  const [otpVal, setOtpVal] = useState('');

  const handleSubmit = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    setLoginMethod('SMS');
    setTimeout(() => {
      setLoading(false);
      toast.success('Welcome back to Passwala Partner!');
      onLogin(clean, { name: 'Vendor Partner' });
    }, 800);
  };

  const handleWhatsAppLogin = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) {
      toast.error('Enter a valid 10-digit mobile number');
      return;
    }
    setLoading(true);
    try {
      const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const res = await fetch(`${BASE_API}/api/users/send-whatsapp-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setLoginMethod('WHATSAPP');
        setStep('OTP');
        if (data.provider === 'mock' && data.otp) {
          toast.success(`[MOCK WHATSAPP] OTP sent: ${data.otp}`, { duration: 8000 });
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

  const handleVerifyOtp = async (e) => {
    if (e) e.preventDefault();
    if (loading) return;
    if (otpVal.length !== 6) {
      toast.error('Enter 6-digit OTP');
      return;
    }
    setLoading(true);
    try {
      const clean = phone.replace(/\D/g, '');
      const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const res = await fetch(`${BASE_API}/api/users/verify-whatsapp-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: clean, otp: otpVal, role: 'VENDOR' })
      });
      const data = await res.json();
      if (res.ok && data.success) {
        toast.success('Welcome back to Passwala Partner!');
        onLogin(clean, { name: data.user.displayName || 'Vendor Partner' });
      } else {
        toast.error(data.error || 'Invalid OTP. Please try again.');
      }
    } catch (error) {
      toast.error('Verification Failed');
    } finally {
      setLoading(false);
    }
  };

  const isValid = phone.length === 10;

  return (
    <div className="va-new-container">
      {/* Left Form Panel */}
      <div className="va-new-left">
        <div className="va-new-form-wrapper">
          {/* Brand Logo */}
          <div className="va-new-brand">
            <img src="/logo.png" alt="Passwala Logo" className="va-new-logo" />
            <div className="va-new-brand-info" style={{ display: 'flex', flexDirection: 'column' }}>
              <span className="va-new-brand-text">Passwala Business Suite</span>
              <span className="va-new-brand-tag" style={{ fontSize: '0.68rem', fontWeight: '800', color: '#ea580c', letterSpacing: '0.12em', marginTop: '2px', textTransform: 'uppercase', lineHeight: '1' }}>PARTNER</span>
            </div>
          </div>

          {/* Heading and Taglines */}
          <div className="va-new-header">
            <h1 className="va-new-title">
              Grow Your Store, <br />
              <span className="va-accent-text">Partner Portal</span>
            </h1>
            <p className="va-new-subtitle">
              Welcome back, manage your business and orders efficiently today.
            </p>
          </div>

          {step === 'PHONE' ? (
            /* Login Form */
            <form onSubmit={handleSubmit} className="va-new-form">
              <div className="va-new-input-group">
                <label className="va-new-label">Mobile Number</label>
                <div className={`va-new-input-wrapper ${focused ? 'va-new-focused' : ''} ${isValid ? 'va-new-valid' : ''}`}>
                  <span className="va-new-flag">🇮🇳</span>
                  <span className="va-new-code">+91</span>
                  <input
                    type="tel"
                    placeholder="Enter 10-digit number"
                    maxLength={10}
                    value={phone}
                    onChange={(e) => setPhone(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="va-new-input"
                    autoFocus
                  />
                  {isValid && <span className="va-new-tick">✓</span>}
                </div>
              </div>

              {/* Remember Me and Need Help */}
              <div className="va-new-options">
                <label className="va-new-checkbox-label">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(e) => setRememberMe(e.target.checked)}
                    className="va-new-checkbox"
                  />
                  <span>Remember me</span>
                </label>
                <span className="va-new-forgot" onClick={() => toast('Please contact Admin support to reset/recover partner details.')}>
                  Need Help?
                </span>
              </div>

              {/* Submit Buttons */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', width: '100%' }}>
                <button
                  type="button"
                  onClick={handleWhatsAppLogin}
                  disabled={loading}
                  className="va-new-btn va-new-btn-active"
                  style={{
                    background: '#25D366',
                    color: 'white',
                    borderColor: '#25D366',
                    boxShadow: '0 4px 12px rgba(37, 211, 102, 0.15)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '8px'
                  }}
                >
                  {loading && loginMethod === 'WHATSAPP' ? (
                    <span className="va-new-spinner" style={{ borderColor: 'white', borderTopColor: 'transparent' }}></span>
                  ) : (
                    <>
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg>
                      Login via WhatsApp
                    </>
                  )}
                </button>
              </div>

              <div className="policy-agreement-text" style={{ marginTop: '1.25rem', fontSize: '0.72rem', color: '#64748b', textAlign: 'center', lineHeight: '1.4' }}>
                By continuing, you agree to our{' '}
                <a href="/terms" target="_blank" rel="noopener noreferrer" style={{ color: '#ff7622', fontWeight: '600', textDecoration: 'underline' }}>Terms of Service</a>
                {' '}and{' '}
                <a href="/privacy-policy" target="_blank" rel="noopener noreferrer" style={{ color: '#ff7622', fontWeight: '600', textDecoration: 'underline' }}>Privacy Policy</a>.
              </div>
            </form>
          ) : (
            /* OTP Verification Form */
            <form onSubmit={handleVerifyOtp} className="va-new-form" style={{ animation: 'fadeIn 0.3s ease' }}>
              <div className="va-new-input-group">
                <label className="va-new-label">Enter 6-digit OTP sent to WhatsApp</label>
                <div className={`va-new-input-wrapper ${focused ? 'va-new-focused' : ''}`}>
                  <input
                    type="tel"
                    placeholder="Enter 6-digit OTP"
                    maxLength={6}
                    value={otpVal}
                    onChange={(e) => setOtpVal(e.target.value.replace(/\D/g, ''))}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    className="va-new-input"
                    style={{ paddingLeft: '1rem', letterSpacing: '2px', textAlign: 'center', fontWeight: 'bold' }}
                    autoFocus
                  />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '12px', width: '100%', marginTop: '1.5rem' }}>
                <button
                  type="submit"
                  disabled={loading}
                  className="va-new-btn va-new-btn-active"
                  style={{ flex: 1 }}
                >
                  {loading ? <span className="va-new-spinner"></span> : 'Verify & Login'}
                </button>
                <button
                  type="button"
                  onClick={() => setStep('PHONE')}
                  className="va-new-btn"
                  style={{ flex: 1 }}
                >
                  Back
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

      {/* Right Illustration Panel */}
      <div className="va-new-right">
        <div className="va-illustration-card">
          <img
            src="/vendor_login_illustration.png"
            alt="Vendor Portal Illustration"
            className="va-illustration-image"
          />
        </div>
      </div>
    </div>
  );
};

export default VendorAuth;
