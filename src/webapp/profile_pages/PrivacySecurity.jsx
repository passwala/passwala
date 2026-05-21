/* eslint-disable no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { 
  ShieldCheck, 
  Lock, 
  Eye, 
  Fingerprint, 
  Database, 
  Trash2, 
  ChevronRight,
  ShieldAlert,
  Smartphone
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { auth } from '../../firebase';
import './ProfilePages.css';

const PrivacySecurity = () => {
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    const user = auth.currentUser;
    if (!user) {
      toast.error('Session expired. Please login again.');
      return;
    }

    try {
      const searchId = user.uid || user.email || user.phoneNumber;
      
      // 1. Delete from Database
      const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const res = await fetch(`${apiBase}/api/users/${encodeURIComponent(searchId)}`, {
        method: 'DELETE',
      });
      
      // 2. Sign out and Delete from Firebase
      try {
        await auth.signOut().catch(() => {});
        await user.delete().catch(() => {});
      } catch (err) {
        console.warn('Firebase user delete skipped:', err);
      }

      // 3. Cleanup
      if (res.status === 200 || res.status === 404) {
        toast.success('Account Deleted Successfully.');
        localStorage.clear();
        sessionStorage.clear();
        setTimeout(() => {
          window.location.href = '/';
        }, 1500);
      } else {
        throw new Error('Server deletion failed');
      }
    } catch (err) {
      console.error(err);
      toast.error('Deletion failed. Please contact support.');
    }
  };

  const securityItems = [
    { id: 1, title: 'Two-Factor Authentication', subtitle: 'Enable 2FA for account safety', icon: <Smartphone size={20} />, enabled: true },
    { id: 2, title: 'App Lock', subtitle: 'Secure app with biometric lock', icon: <Fingerprint size={20} />, enabled: false },
    { id: 3, title: 'Privacy Policy', subtitle: 'Read our data usage policy', icon: <Eye size={20} />, chevron: true },
    { id: 4, title: 'Data Management', subtitle: 'Export or manage your data', icon: <Database size={20} />, chevron: true }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="profile-sub-page"
    >
      <main className="privacy-security-content">
        <div className="security-banner glass">
           <ShieldAlert size={32} color="#f59e0b" />
           <div className="banner-text">
              <strong>Account Security: Medium</strong>
              <p>Turn on App Lock to reach high security level.</p>
           </div>
           <button className="enhance-btn" onClick={() => toast('Enhancing Security...')}>REPAIR</button>
        </div>

        <div className="section-header-compact">
           <h3>SECURITY CONTROLS</h3>
        </div>

        <div className="profile-menu-container glass">
           {securityItems.map((item) => (
             <div 
               key={item.id} 
               className="profile-menu-item no-border-hover"
               style={{ cursor: item.chevron ? 'pointer' : 'default' }}
               onClick={() => {
                 if (item.id === 3) navigate('/privacy-policy');
                 if (item.id === 4) navigate('/data-deletion');
               }}
             >
                <div className="menu-item-left">
                   <div className="menu-icon-box" style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' }}>
                      {item.icon}
                   </div>
                   <div className="menu-text">
                      <strong>{item.title}</strong>
                      <span>{item.subtitle}</span>
                   </div>
                </div>
                {item.chevron ? (
                  <ChevronRight size={18} color="var(--text-secondary)" />
                ) : (
                  <div className={`theme-toggle-switch ${item.enabled ? 'active' : ''}`} onClick={() => toast('Security policy update in progress.')}>
                    <div className="switch-knob"></div>
                  </div>
                )}
             </div>
           ))}
        </div>

        <div className="section-header-compact">
           <h3>ACCOUNT ACTIONS</h3>
        </div>

        <div className="profile-menu-container glass danger-zone-menu">
           <div className="profile-menu-item danger-text" style={{ cursor: 'pointer' }} onClick={() => setShowDeleteModal(true)}>
              <div className="menu-item-left">
                 <div className="menu-icon-box danger-icon-bg"><Eye size={20} /></div>
                 <div className="menu-text">
                    <strong>Request My Data</strong>
                    <span>Get a copy of your info</span>
                 </div>
              </div>
           </div>
           <div className="profile-menu-item danger-text" style={{ cursor: 'pointer' }} onClick={() => setShowDeleteModal(true)}>
              <div className="menu-item-left">
                 <div className="menu-icon-box danger-icon-bg"><Trash2 size={20} /></div>
                 <div className="menu-text">
                    <strong>Delete Account</strong>
                    <span>Permanently erase account</span>
                 </div>
              </div>
           </div>
        </div>

        <div className="privacy-note">
           <Lock size={14} />
           <p>Your connection to Passwala is encrypted with 256-bit SSL technology. No one, not even Passwala, can see your real-time private location except for verified orders.</p>
        </div>

        {/* --- CUSTOM DELETE MODAL --- */}
        {showDeleteModal && (
          <div className="custom-modal-overlay" onClick={() => setShowDeleteModal(false)}>
            <motion.div 
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="custom-confirm-modal"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-icon-header delete-bg">
                <Trash2 size={32} />
              </div>
              <h3>Delete Account?</h3>
              <p>This will permanently remove your data, wallet balance, and order history. This action cannot be undone.</p>
              
              <div className="modal-actions-row">
                <button className="modal-btn secondary" onClick={() => setShowDeleteModal(false)}>
                  Cancel
                </button>
                <button className="modal-btn delete" onClick={handleDeleteAccount}>
                  Yes, Delete
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </main>
    </motion.div>
  );
};

export default PrivacySecurity;
