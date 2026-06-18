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
import { useTranslation } from '../LanguageContext';

const PrivacySecurity = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [securityStates, setSecurityStates] = React.useState(() => {
    const saved = localStorage.getItem('passwala_security_settings');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        // ignore
      }
    }
    return {
      '2fa': true,
      appLock: false
    };
  });

  const handleToggle = (key, title) => {
    const nextVal = !securityStates[key];
    const next = { ...securityStates, [key]: nextVal };
    setSecurityStates(next);
    localStorage.setItem('passwala_security_settings', JSON.stringify(next));
    toast.success(`${title} ${nextVal ? 'Enabled' : 'Disabled'}`);
  };

  const getSecurityLevel = () => {
    const { '2fa': twoFA, appLock } = securityStates;
    if (twoFA && appLock) return { level: t('high'), color: '#10b981', tip: t('security_fully_secured') };
    if (twoFA || appLock) return { level: t('medium'), color: '#f59e0b', tip: t('security_medium_tip') };
    return { level: t('low'), color: '#ef4444', tip: t('security_low_tip') };
  };

  const securityInfo = getSecurityLevel();


  const securityItems = [
    { id: 1, key: '2fa', title: t('two_factor'), subtitle: t('two_factor_sub'), icon: <Smartphone size={20} />, enabled: securityStates['2fa'] },
    { id: 2, key: 'appLock', title: t('app_lock'), subtitle: t('app_lock_sub'), icon: <Fingerprint size={20} />, enabled: securityStates.appLock },
    { id: 3, title: t('privacy_policy_title'), subtitle: t('privacy_policy_sub'), icon: <Eye size={20} />, chevron: true },
    { id: 4, title: t('data_management'), subtitle: t('data_management_sub'), icon: <Database size={20} />, chevron: true }
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
           <ShieldAlert size={32} color={securityInfo.color} />
           <div className="banner-text">
              <strong style={{ color: securityInfo.color }}>{t('account_security')}: {securityInfo.level}</strong>
              <p>{securityInfo.tip}</p>
           </div>
           {securityInfo.level !== t('high') && (
             <button className="enhance-btn" onClick={() => {
               const next = { '2fa': true, appLock: true };
               setSecurityStates(next);
               localStorage.setItem('passwala_security_settings', JSON.stringify(next));
               toast.success('Security enhanced to High level!');
             }}>REPAIR</button>
           )}
        </div>

        <div className="section-header-compact">
           <h3>{t('security_controls')}</h3>
        </div>

        <div className="profile-menu-container glass">
           {securityItems.map((item) => (
             <div 
               key={item.id} 
               className="profile-menu-item no-border-hover"
               style={{ cursor: 'pointer' }}
               onClick={() => {
                 if (item.chevron) {
                   if (item.id === 3) navigate('/privacy-policy');
                   if (item.id === 4) navigate('/data-deletion');
                 } else {
                   handleToggle(item.key, item.title);
                 }
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
                  <div className={`theme-toggle-switch ${item.enabled ? 'active' : ''}`}>
                    <div className="switch-knob"></div>
                  </div>
                )}
             </div>
           ))}
        </div>

        <div className="privacy-note">
           <Lock size={14} />
           <p>{t('encryption_note')}</p>
        </div>
      </main>
    </motion.div>
  );
};

export default PrivacySecurity;
