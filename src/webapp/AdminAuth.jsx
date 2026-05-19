import React, { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Auth.css'; // Reusing styles

const AdminAuth = ({ onAdminLogin }) => {
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminAuth = async () => {
    setLoading(true);
    try {
      // 🛡️ Use environment variable or a secure default for local development
      const secureCode = import.meta.env.VITE_ADMIN_ACCESS_CODE || 'PASSWALA99';
      
      if (adminCode === secureCode) {
        toast.success('Admin Authorized!');
        // Persist admin session locally
        localStorage.setItem('admin_session', 'active');
        localStorage.setItem('admin_code', adminCode);
        onAdminLogin();
      } else {
        toast.error('Invalid Credentials');
      }
    } catch (err) {
      console.error(err);
      toast.error('Authentication failed');
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      handleAdminAuth();
    }
  };

  return (
    <div className="auth-page admin-only-page">
      <div className="auth-container glass admin-auth-card">
        <div className="auth-illustration">
          <div className="admin-shield-glow"></div>
          <ShieldCheck size={80} color="#f97316" strokeWidth={1.5} style={{ zIndex: 2 }} />
        </div>

        <div className="auth-content">
          <h2>Admin Portal</h2>
          <p>Restricted strictly for Passwala staff</p>

          <div className="phone-login" style={{ marginTop: '1.5rem', width: '100%' }}>
            <div className="input-group">
              <input
                type="password"
                placeholder="Enter Admin Access Code"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                onKeyDown={handleKeyDown}
                autoFocus
              />
              <Lock className="input-icon" size={20} />
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
