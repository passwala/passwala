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
  Sun,
  Moon,
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
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [newName, setNewName] = React.useState(user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = React.useState(false);
  const fileInputRef = React.useRef(null);
  
  const navigate = useNavigate();

  const profileItems = [
    { id: 1, title: 'Order History', subtitle: 'View your past bookings', icon: <History size={20} />, class: 'history', path: '/order-history' },
    { id: 2, title: 'Passwala Wallet', subtitle: 'Manage your credits', icon: <Wallet size={20} />, class: 'wallet', path: '/wallet' },
    { id: 3, title: 'Delivery Address', subtitle: 'Manage your locations', icon: <MapPin size={20} />, class: 'address', path: '/complete-profile' },
    { id: 4, title: 'Data Safety & Deletion', subtitle: 'Manage your data rights', icon: <Trash2 size={20} />, class: 'deletion', path: '/data-deletion' },
    { id: 5, title: 'Privacy & Security', subtitle: 'Manage your security', icon: <ShieldCheck size={20} />, class: 'privacy', path: '/privacy-security' },
    { id: 6, title: 'Help & Support', subtitle: '24/7 support available', icon: <HelpCircle size={20} />, class: 'help', path: '/help-support' },
    { id: 7, title: 'Settings', subtitle: 'App preferences', icon: <Settings size={20} />, class: 'settings', path: '/settings' }
  ];

  React.useEffect(() => {
    setLocalPhoto(user?.photoURL);
  }, [user]);

  const handleImageClick = () => fileInputRef.current.click();

  const handleUpdateName = async () => {
    if (!newName.trim()) return;
    setIsUpdatingName(true);
    try {
      const searchId = user?.uid || user?.email || user?.phoneNumber;
      const res = await fetch(`http://${window.location.hostname}:3004/api/users/${encodeURIComponent(searchId)}/name`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
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
        const id = user?.phoneNumber || user?.email || user?.uid;
        const res = await fetch(`http://${window.location.hostname}:3004/api/users/${encodeURIComponent(id)}/photo`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ photoURL: base64String })
        });
        if (!res.ok) throw new Error('Upload failed');
        setLocalPhoto(base64String);
        if (onUpdateUser) onUpdateUser({ ...user, photoURL: base64String });
        toast.success('Profile Picture Updated!', { id: 'upload' });
      } catch (err) {
        toast.error('Upload failed.', { id: 'upload' });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);
    try {
      const currentUser = auth.currentUser;
      const searchId = user?.uid || user?.email || user?.phoneNumber;
      const res = await fetch(`http://${window.location.hostname}:3004/api/users/${encodeURIComponent(searchId)}`, {
        method: 'DELETE',
      });
      if (currentUser) await currentUser.delete().catch(() => {});
      if (res.status === 200 || res.status === 404) {
        toast.success('Account Deleted.');
        localStorage.clear();
        setTimeout(() => window.location.href = '/', 1500);
      }
    } catch (err) {
      toast.error('Delete failed.');
    }
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
        <h3 className="section-label">Appearance</h3>
        <div className="profile-menu-container">
          <div className="profile-menu-item" onClick={onToggleTheme}>
            <div className="menu-item-left">
              <div className="menu-icon-box appearance">
                {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
              </div>
              <div className="menu-text">
                <strong>Dark Mode</strong>
                <span>Switch theme style</span>
              </div>
            </div>
            <div className={`theme-toggle-switch ${isDarkMode ? 'active' : ''}`}>
              <div className="switch-knob"></div>
            </div>
          </div>
        </div>

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

        <h3 className="section-label">Account & Activity</h3>
        <div className="profile-menu-container">
          {profileItems.map((item) => (
            <button 
              key={item.id} 
              className="profile-menu-item"
              onClick={() => item.path ? navigate(item.path) : toast(`Opening ${item.title}...`)}
            >
              <div className="menu-item-left">
                <div className={`menu-icon-box ${item.class}`}>
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
          <button className="profile-menu-item" onClick={onLogout}>
            <div className="menu-item-left">
              <div className="menu-icon-box logout">
                <LogOut size={20} />
              </div>
              <div className="menu-text">
                 <strong>Sign Out</strong>
                 <span>Logout of your session</span>
              </div>
            </div>
          </button>
        </div>

        <div className="profile-actions-footer">
          <button className="delete-account-btn" onClick={() => setShowDeleteModal(true)}>
             <Trash2 size={16} />
             <span>Delete Account Permanently</span>
          </button>
        </div>
      </div>

      {showDeleteModal && (
        <div className="custom-modal-overlay" onClick={() => setShowDeleteModal(false)}>
          <div className="custom-confirm-modal" onClick={(e) => e.stopPropagation()}>
            <h3>Delete Account?</h3>
            <p>This action is permanent and cannot be undone.</p>
            <div className="modal-actions-row">
              <button className="modal-btn secondary" onClick={() => setShowDeleteModal(false)}>Cancel</button>
              <button className="modal-btn delete" onClick={handleDeleteAccount}>Delete</button>
            </div>
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default WebappProfile;
