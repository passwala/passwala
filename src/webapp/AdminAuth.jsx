/* eslint-disable */
import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldCheck, ChevronLeft } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Auth.css'; // Reusing styles

const AdminAuth = ({ onAdminLogin }) => {
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleAdminAuth = () => {
    setLoading(true);
    if (adminCode === 'PASSWALA99') {
      setTimeout(() => {
        toast.success('Admin Authorized!');
        onAdminLogin();
        setLoading(false);
      }, 800);
    } else {
      toast.error('Invalid Credentials');
      setLoading(false);
    }
  };

  return (
    <div className="auth-page admin-only-page">
      <div className="auth-container glass admin-auth-card">
        <div className="auth-illustration">
           <ShieldCheck size={80} color="var(--primary)" strokeWidth={1.5} />
        </div>

        <div className="auth-content">
          <h2 style={{ color: 'var(--primary)' }}>Admin Portal</h2>
          <p>Restricted strictly for Passwala staff</p>

          <div className="phone-login" style={{ marginTop: '2rem' }}>
            <div className="input-group">
               <input
                 type="password"
                 placeholder="Enter Admin Access Code"
                 value={adminCode}
                 onChange={(e) => setAdminCode(e.target.value)}
                 autoFocus
               />
            </div>
            <button className="auth-submit-btn" onClick={handleAdminAuth} disabled={loading}>
               {loading ? 'Authorizing...' : 'Enter System'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;
