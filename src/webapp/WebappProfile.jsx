/* eslint-disable no-unused-vars */
import React from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { useNavigate } from 'react-router-dom';
import { 
  ChevronRight, 
  History, 
  Wallet, 
  ShieldCheck, 
  HelpCircle, 
  Settings, 
  LogOut,
  Camera,
  Globe,
  Trash2,
  MapPin
} from 'lucide-react';
import { useTranslation } from './LanguageContext';
import { auth } from '../firebase';
import './WebappProfile.css';

const WebappProfile = ({ user, onLogout, isDarkMode, onToggleTheme, onUpdateUser }) => {
  const { t, changeLanguage, currentLanguage, languages } = useTranslation();
  const [localPhoto, setLocalPhoto] = React.useState(user?.photoURL);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [newName, setNewName] = React.useState(user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = React.useState(false);
  const fileInputRef = React.useRef(null);
  
  const navigate = useNavigate();

  const profileItems = [
    { id: 1, titleKey: 'order_history', subtitleKey: 'view_past_bookings', icon: <History size={20} />, class: 'history', path: '/order-history' },
    { id: 2, titleKey: 'passwala_wallet', subtitleKey: 'manage_credits', icon: <Wallet size={20} />, class: 'wallet', path: '/wallet' },
    { id: 3, titleKey: 'delivery_address', subtitleKey: 'manage_locations', icon: <MapPin size={20} />, class: 'address', path: '/complete-profile' },
    { id: 4, titleKey: 'data_safety_deletion', subtitleKey: 'manage_data_rights', icon: <Trash2 size={20} />, class: 'deletion', path: '/data-deletion' },
    { id: 5, titleKey: 'privacy_security', subtitleKey: 'manage_security', icon: <ShieldCheck size={20} />, class: 'privacy', path: '/privacy-security' },
    { id: 6, titleKey: 'help_support', subtitleKey: 'support_24_7', icon: <HelpCircle size={20} />, class: 'help', path: '/help-support' },
    { id: 7, titleKey: 'settings', subtitleKey: 'app_preferences', icon: <Settings size={20} />, class: 'settings', path: '/settings' }
  ];

  React.useEffect(() => {
    setLocalPhoto(user?.photoURL);
    if (user?.displayName) {
      setNewName(user.displayName);
    }
  }, [user]);

  const getAuthToken = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
    } catch (e) {
      console.warn("Failed to get Firebase ID token:", e);
    }
    const uid = user?.uid || user?.id || 'mock_user_123';
    return `mock_session_token_${uid}`;
  };

  const handleImageClick = () => fileInputRef.current.click();

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setIsUpdatingName(true);
    try {
      const searchId = user?.id || user?.phoneNumber || user?.email || user?.uid;
      const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const token = await getAuthToken();
      const res = await fetch(`${apiBase}/api/users/${encodeURIComponent(searchId)}/name`, {
        method: 'PUT',
        headers: { 
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ displayName: newName })
      });
      
      if (res.ok) {
        toast.success('Name updated!');
        setIsEditingName(false);
        if (onUpdateUser) onUpdateUser({ ...user, displayName: newName });
      } else {
        throw new Error('Failed to update name');
      }
    } catch (err) {
      toast.error('Error updating name');
    } finally {
      setIsUpdatingName(false);
    }
  };

  const handleFileChange = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image too large (Max 2MB)');
      return;
    }
    const reader = new FileReader();
    reader.onloadstart = () => toast.loading('Uploading photo...', { id: 'upload' });
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const id = user?.id || user?.phoneNumber || user?.email || user?.uid;
        const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const token = await getAuthToken();
        const res = await fetch(`${apiBase}/api/users/${encodeURIComponent(id)}/photo`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ photoURL: base64String })
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        const uploadedPhotoUrl = data.photoURL || base64String;
        setLocalPhoto(uploadedPhotoUrl);
        if (onUpdateUser) onUpdateUser({ ...user, photoURL: uploadedPhotoUrl });
        toast.success('Profile Picture Updated!', { id: 'upload' });
      } catch (err) {
        toast.error('Upload failed.', { id: 'upload' });
      }
    };
    reader.readAsDataURL(file);
  };

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="webapp-profile-page"
    >
      <div className="profile-header-card">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-circle" onClick={handleImageClick}>
            {localPhoto ? (
              <img src={localPhoto} alt="User" />
            ) : (
              <span className="avatar-initials">{user?.displayName?.charAt(0).toUpperCase() || (user?.phoneNumber ? '#' : 'U')}</span>
            )}
            <button className="edit-avatar-btn"><Camera size={14} /></button>
            <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept="image/*" onChange={handleFileChange} />
          </div>
        </div>

        {isEditingName ? (
          <div className="edit-name-container-webapp">
            <input 
              type="text" value={newName} onChange={(e) => setNewName(e.target.value)}
              className="edit-name-input-webapp" autoFocus
            />
            <div className="edit-name-actions">
              <button onClick={handleUpdateName} disabled={isUpdatingName} className="save-name-btn-webapp">Save</button>
              <button onClick={() => setIsEditingName(false)} className="cancel-name-btn-webapp">Cancel</button>
            </div>
          </div>
        ) : (
          <div className="name-display-stack" onClick={() => setIsEditingName(true)}>
            <h2 className="profile-name-webapp">{newName || user?.displayName || 'Passwala User'}</h2>
            <div className="profile-membership-webapp">Premium Hero Member</div>
          </div>
        )}
      </div>

      <div className="profile-scroll-content">
        <h3 className="section-label">Language / ભાષા / भाषा</h3>
        <div className="language-pills-row">
          {Object.entries(languages).map(([code, lang]) => (
            <button 
              key={code} 
              className={`lang-pill-item ${currentLanguage === code ? 'active' : ''}`}
              onClick={() => changeLanguage(code)}
            >
              <Globe size={16} />
              <span>{lang.name}</span>
            </button>
          ))}
        </div>

        <h3 className="section-label">{t('account_activity')}</h3>
        <div className="profile-menu-container">
          {profileItems.map((item) => (
            <button 
              key={item.id} 
              className="profile-menu-item"
              onClick={() => item.path ? navigate(item.path) : toast(`Opening ${t(item.titleKey)}...`)}
            >
              <div className="menu-item-left">
                <div className={`menu-icon-box ${item.class}`}>
                  {item.icon}
                </div>
                <div className="menu-text">
                   <strong>{t(item.titleKey)}</strong>
                   <span>{t(item.subtitleKey)}</span>
                </div>
              </div>
              <ChevronRight size={18} className="chevron-right" />
            </button>
          ))}
          <button className="profile-menu-item" onClick={onLogout}>
            <div className="menu-item-left">
              <div className="menu-icon-box logout">
                <LogOut size={20} />
              </div>
              <div className="menu-text">
                 <strong>{t('logout')}</strong>
                 <span>{t('logout_session')}</span>
              </div>
            </div>
          </button>
        </div>

      </div>
    </motion.div>
  );
};

export default WebappProfile;
