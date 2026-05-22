import React, { useState } from 'react';
import { ShieldCheck, Lock } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Auth.css'; // Reusing styles

const API_URL = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);

const AdminAuth = ({ onAdminLogin }) => {
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminAuth = async (e) => {
    if (e) e.preventDefault();
    if (!adminCode.trim()) {
      toast.error('Please enter the access code');
      return;
    }
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/admin/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ accessCode: adminCode })
      });
      
      const json = await res.json();
      
      if (res.ok && json.success) {
        toast.success('Admin Authorized!');
        // Persist admin session locally
        sessionStorage.setItem('admin_session', 'true');
        sessionStorage.setItem('admin_token', json.token);
        sessionStorage.removeItem('admin_code');
        onAdminLogin();
      } else {
        toast.error(json.error || 'Invalid Credentials');
      }
    } catch (err) {
      console.error(err);
      toast.error('Server connection failed');
    } finally {
      setLoading(false);
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

          <form onSubmit={handleAdminAuth} className="phone-login" style={{ marginTop: '1.5rem', width: '100%' }}>
            <div className="input-group">
              <input
                type="password"
                placeholder="Enter Admin Access Code"
                value={adminCode}
                onChange={(e) => setAdminCode(e.target.value)}
                autoFocus
              />
              <Lock className="input-icon" size={20} />
            </div>
            <button type="submit" className="auth-submit-btn" disabled={loading}>
              {loading ? 'Authorizing...' : 'Enter System'}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default AdminAuth;
