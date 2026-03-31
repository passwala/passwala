import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  Settings, 
  Bell, 
  Moon, 
  Sun, 
  Globe, 
  Volume2, 
  MapPin, 
  ChevronRight,
  Database,
  Smartphone,
  Info
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useTranslation } from '../LanguageContext';
import './ProfilePages.css';

const AppSettings = ({ isDarkMode, onToggleTheme }) => {
  const navigate = useNavigate();
  const { currentLanguage } = useTranslation();

  const [notificationSettings, setNotificationSettings] = useState({
    orders: true,
    chat: true,
    deals: false,
    sound: true
  });

  const toggleSetting = (key) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
    toast.success('Settings updated!');
  };

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
        <h1>App Settings</h1>
      </header>

      <main className="app-settings-content">
        <div className="section-header-compact">
           <h3>NOTIFICATIONS</h3>
        </div>

        <div className="profile-menu-container glass">
           <div className="profile-menu-item no-border-hover">
              <div className="menu-item-left">
                 <div className="menu-icon-box" style={{ background: 'rgba(255, 118, 34, 0.08)', color: 'var(--primary)' }}><Bell size={20} /></div>
                 <div className="menu-text">
                    <strong>Order Updates</strong>
                    <span>Get alerts for your active orders</span>
                 </div>
              </div>
              <div className={`theme-toggle-switch ${notificationSettings.orders ? 'active' : ''}`} onClick={() => toggleSetting('orders')}>
                 <div className="switch-knob"></div>
              </div>
           </div>
           <div className="profile-menu-item no-border-hover">
              <div className="menu-item-left">
                 <div className="menu-icon-box" style={{ background: 'rgba(16, 185, 129, 0.08)', color: '#10b981' }}><Smartphone size={20} /></div>
                 <div className="menu-text">
                    <strong>Chat Notifications</strong>
                    <span>Alerts for messages from neighbors</span>
                 </div>
              </div>
              <div className={`theme-toggle-switch ${notificationSettings.chat ? 'active' : ''}`} onClick={() => toggleSetting('chat')}>
                 <div className="switch-knob"></div>
              </div>
           </div>
           <div className="profile-menu-item no-border-hover">
              <div className="menu-item-left">
                 <div className="menu-icon-box" style={{ background: 'rgba(245, 158, 11, 0.08)', color: '#f59e0b' }}><Volume2 size={20} /></div>
                 <div className="menu-text">
                    <strong>Sound & Haptics</strong>
                    <span>Interactive app sounds</span>
                 </div>
              </div>
              <div className={`theme-toggle-switch ${notificationSettings.sound ? 'active' : ''}`} onClick={() => toggleSetting('sound')}>
                 <div className="switch-knob"></div>
              </div>
           </div>
        </div>

        <div className="section-header-compact">
           <h3>PREFERENCES</h3>
        </div>

        <div className="profile-menu-container glass">
           <div className="profile-menu-item no-border-hover" onClick={onToggleTheme}>
              <div className="menu-item-left">
                 <div className="menu-icon-box" style={{ background: 'var(--bg-surface)', border: '1px solid var(--glass-border)' }}>
                    {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
                 </div>
                 <div className="menu-text">
                    <strong>Dark Mode</strong>
                    <span>{isDarkMode ? 'Enable light mode' : 'Enable dark mode'}</span>
                 </div>
              </div>
              <div className={`theme-toggle-switch ${isDarkMode ? 'active' : ''}`}>
                 <div className="switch-knob"></div>
              </div>
           </div>
           <div className="profile-menu-item no-border-hover" onClick={() => navigate('/profile')}>
              <div className="menu-item-left">
                 <div className="menu-icon-box" style={{ background: 'rgba(59, 130, 246, 0.08)', color: '#3b82f6' }}><Globe size={20} /></div>
                 <div className="menu-text">
                    <strong>App Language</strong>
                    <span>Currently: {currentLanguage === 'en' ? 'English' : currentLanguage === 'hi' ? 'हिंदी' : 'Vernacular'}</span>
                 </div>
              </div>
              <ChevronRight size={18} color="var(--text-secondary)" />
           </div>
        </div>

        <div className="section-header-compact">
           <h3>ABOUT PASSWALA</h3>
        </div>

        <div className="profile-menu-container glass">
           <div className="profile-menu-item" onClick={() => toast('Passwala v2.0.4. (Built with React & Supabase)')}>
              <div className="menu-item-left">
                 <div className="menu-icon-box" style={{ background: 'rgba(100, 116, 139, 0.08)', color: '#64748b' }}><Info size={20} /></div>
                 <div className="menu-text">
                    <strong>App Version</strong>
                    <span>v2.0.4 Premium</span>
                 </div>
              </div>
           </div>
           <div className="profile-menu-item" onClick={() => toast('Opening System Diagnostic...')}>
              <div className="menu-item-left">
                 <div className="menu-icon-box" style={{ background: 'rgba(100, 116, 139, 0.08)', color: '#64748b' }}><Database size={20} /></div>
                 <div className="menu-text">
                    <strong>Cache Management</strong>
                    <span>Clear cached data</span>
                 </div>
              </div>
              <ChevronRight size={18} color="var(--text-secondary)" />
           </div>
        </div>

        <div className="settings-footer">
           <MapPin size={14} /> <span>Region set to Ahmedabad, India</span>
        </div>
      </main>
    </motion.div>
  );
};

export default AppSettings;
