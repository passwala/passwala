/* eslint-disable no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
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
import './ProfilePages.css';

const PrivacySecurity = () => {
  const navigate = useNavigate();

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
      <header className="sub-page-header">
        <button className="back-btn-profile" onClick={() => navigate('/profile')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Privacy & Security</h1>
      </header>

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
           <div className="profile-menu-item danger-text" style={{ cursor: 'pointer' }} onClick={() => navigate('/data-deletion')}>
              <div className="menu-item-left">
                 <div className="menu-icon-box danger-icon-bg"><Eye size={20} /></div>
                 <div className="menu-text">
                    <strong>Request My Data</strong>
                    <span>Get a copy of your info</span>
                 </div>
              </div>
           </div>
           <div className="profile-menu-item danger-text" style={{ cursor: 'pointer' }} onClick={() => navigate('/data-deletion')}>
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
      </main>
    </motion.div>
  );
};

export default PrivacySecurity;
