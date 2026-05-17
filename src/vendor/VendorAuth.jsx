/* eslint-disable */
import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import './VendorPortal.css';

const VendorAuth = ({ onLogin }) => {
  const [phoneNumber, setPhoneNumber] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSendOTP = async (e) => {
    e.preventDefault();
    const cleanPhone = phoneNumber.replace(/\D/g, '');
    
    if (cleanPhone.length !== 10) {
      toast.error('Enter a valid 10-digit number');
      return;
    }

    setLoading(true);
    toast.success('Login Successful!');
    onLogin(cleanPhone, { name: 'Vendor Partner' });
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', backgroundColor: '#fdfdfd', padding: '16px' }}>
      <div className="glass slide-up" style={{ width: '100%', maxWidth: '420px', padding: '2.5rem 1.5rem', margin: '0 auto', textAlign: 'center', backgroundColor: 'white', borderRadius: '28px', boxShadow: '0 20px 40px -12px rgba(0, 0, 0, 0.1)', border: '1px solid #f1f5f9' }}>
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ width: '100%' }}>
          <div className="auth-header" style={{ marginBottom: '1.75rem' }}>
            <div className="auth-logo-wrapper" style={{ width: '64px', height: '64px', marginBottom: '1rem' }}>
              <img src="/logo.png" alt="Passwala Logo" className="auth-logo" style={{ width: '42px', height: '42px' }} />
            </div>
            <h2 className="auth-title" style={{ fontSize: '1.5rem', marginBottom: '4px' }}>Passwala Partner</h2>
            <p className="auth-subtitle" style={{ fontSize: '0.9rem' }}>Professional portal for vendors & experts</p>
          </div>

          <form onSubmit={handleSendOTP} className="auth-form mt-4">
            <div 
              style={{ 
                display: 'flex', 
                alignItems: 'center', 
                background: '#f8fafc', 
                border: '2px solid #e2e8f0', 
                borderRadius: '16px', 
                padding: '6px 14px', 
                marginBottom: '1.5rem',
                boxShadow: 'inset 0 2px 4px rgba(0,0,0,0.02)',
                transition: 'all 0.2s' 
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', paddingRight: '10px', borderRight: '2px solid #cbd5e1' }}>
                <span style={{ fontSize: '1.05rem', fontWeight: 800, color: '#334155' }}>+91</span>
              </div>
              <input
                type="tel"
                placeholder="Mobile number"
                maxLength={10}
                value={phoneNumber}
                onChange={(e) => setPhoneNumber(e.target.value.replace(/\D/g, ''))}
                style={{ 
                  outline: 'none', 
                  border: 'none', 
                  boxShadow: 'none', 
                  background: 'transparent', 
                  width: '100%', 
                  padding: '10px 0 10px 10px', 
                  fontSize: '1.05rem', 
                  fontWeight: 700, 
                  color: '#0f172a',
                  letterSpacing: '0.5px'
                }}
                autoFocus
              />
            </div>
            
            <button 
              type="submit" 
              className="auth-submit-btn" 
              disabled={loading || phoneNumber.length !== 10}
              style={{
                width: '100%',
                padding: '16px',
                borderRadius: '16px',
                fontSize: '1.05rem',
                fontWeight: 800,
                boxShadow: '0 10px 20px -5px rgba(249, 115, 22, 0.4)'
              }}
            >
              {loading ? <span className="loader-ring"></span> : 'Continue'}
            </button>
          </form>
        </motion.div>
      </div>
    </div>
  );
};

export default VendorAuth;
