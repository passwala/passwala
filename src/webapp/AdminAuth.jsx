import React, { useState } from 'react';
import { ShieldCheck } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Auth.css'; // Reusing styles

const AdminAuth = ({ onAdminLogin }) => {
  const [adminCode, setAdminCode] = useState('');
  const [loading, setLoading] = useState(false);

  const handleAdminAuth = async () => {
    setLoading(true);
    try {
      const secureCode = import.meta.env.VITE_ADMIN_ACCESS_CODE || 'PASSWALA_SECURE_99';
      if (adminCode === secureCode) {
        toast.success('Admin Authorized!');
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
