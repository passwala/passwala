import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  History, 
  Wallet, 
  Bell, 
  ShieldCheck, 
  HelpCircle, 
  Settings, 
  LogOut,
  Camera,
  Sun,
  Moon,
  Globe,
  ShoppingBag
} from 'lucide-react';
import { useTranslation } from './LanguageContext';
import './WebappProfile.css';

const WebappProfile = ({ user, onLogout, isDarkMode, onToggleTheme, onVendorMode }) => {
  const { t, changeLanguage, currentLanguage, languages } = useTranslation();
  const profileItems = [
    { id: 1, title: 'Order History', subtitle: 'View your past bookings', icon: <History size={20} />, color: '#f1f5f9', path: '/order-history' },
    { id: 2, title: 'Passwala Wallet', subtitle: 'Manage your credits', icon: <Wallet size={20} />, color: '#f5f3ff', path: '/wallet' },
    { id: 4, title: 'Privacy & Security', subtitle: 'Manage your data', icon: <ShieldCheck size={20} />, color: '#f0fdf4', path: '/privacy-security' },
    { id: 5, title: 'Help & Support', subtitle: '24/7 support available', icon: <HelpCircle size={20} />, color: '#fdf2f8', path: '/help-support' },
    { id: 6, title: 'Settings', subtitle: 'App preferences', icon: <Settings size={20} />, color: '#f8fafc', path: '/settings' }
  ];

  const navigate = useNavigate();

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="webapp-profile-page"
    >
      <div className="profile-header-card">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-circle">
            {user?.photoURL ? (
              <img src={user.photoURL} alt="User" />
            ) : (
              <span className="avatar-initials">K</span>
            )}
            <button className="edit-avatar-btn" onClick={() => toast('Update Profile Picture coming soon!')}><Camera size={14} /></button>
          </div>
          <div className="profile-user-info">
             <h2>{user?.displayName || 'KaranKumar Dave'}</h2>
             <span className="user-membership-badge">Premium Hero Member</span>
          </div>
        </div>
      </div>

      <div className="profile-sections">
        {/* APPEARANCE SECTION - HIGH VISIBILITY */}
        <h3 className="section-label">APPEARANCE</h3>
        <div className="profile-menu-container glass theme-switcher-item">
            <div className="profile-menu-item no-chevron" onClick={onToggleTheme}>
              <div className="menu-item-left">
                <div className="menu-icon-box theme-icon-bg">
                  {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                </div>
                <div className="menu-text">
                   <strong>Dark Mode</strong>
                   <span>Switch between light and dark themes</span>
                </div>
              </div>
              <div className={`theme-toggle-switch ${isDarkMode ? 'active' : ''}`}>
                 <div className="switch-knob"></div>
              </div>
            </div>
        </div>

        {/* VERNACULAR SUPPORT - COMPACT SELECTION */}
        <h3 className="section-label">LANGUAGE / ભાષા / भाषा</h3>
        <div className="language-compact-wrapper">
          <div className="language-pills-row">
            {Object.entries(languages).map(([code, lang]) => (
              <button 
                key={code} 
                className={`lang-pill-item ${currentLanguage === code ? 'active' : ''}`}
                onClick={() => {
                  changeLanguage(code);
                  toast.success(`${lang.name} Selected`);
                }}
              >
                <Globe size={14} className={currentLanguage === code ? 'rotating' : ''} />
                <span>{lang.name}</span>
              </button>
            ))}
          </div>
        </div>

        <h3 className="section-label">ACCOUNT & ACTIVITY</h3>
        <div className="profile-menu-container glass">
          {profileItems.map((item) => (
            <button 
              key={item.id} 
              className="profile-menu-item"
              onClick={() => item.path ? navigate(item.path) : toast(`Opening ${item.title}...`)}
            >
              <div className="menu-item-left">
                <div className="menu-icon-box" style={{ background: item.color }}>
                  {item.icon}
                </div>
                <div className="menu-text">
                   <strong>{item.title}</strong>
                   <span>{item.subtitle}</span>
                </div>
              </div>
              <ChevronRight size={18} className="chevron-right" />
            </button>
          ))}
        </div>

        <button className="logout-button-webapp" onClick={onLogout}>
           <LogOut size={20} />
           <span>Sign Out</span>
        </button>
      </div>
    </motion.div>
  );
};

export default WebappProfile;
