/* eslint-disable no-unused-vars */
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
  ShoppingBag,
  Trash2,
  MapPin
} from 'lucide-react';
import { useTranslation } from './LanguageContext';
import { auth } from '../firebase';
import { updateProfile } from 'firebase/auth';
import './WebappProfile.css';

const WebappProfile = ({ user, onLogout, isDarkMode, onToggleTheme, onVendorMode }) => {
  const { t, changeLanguage, currentLanguage, languages } = useTranslation();
  const [localPhoto, setLocalPhoto] = React.useState(user?.photoURL);
  const [showDeleteModal, setShowDeleteModal] = React.useState(false);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const [newName, setNewName] = React.useState(user?.displayName || '');
  const [isUpdatingName, setIsUpdatingName] = React.useState(false);
  const fileInputRef = React.useRef(null);
  
  const navigate = useNavigate();

  const profileItems = [
    { id: 1, title: 'Order History', subtitle: 'View your past bookings', icon: <History size={20} />, color: '#f1f5f9', path: '/order-history' },
    { id: 2, title: 'Passwala Wallet', subtitle: 'Manage your credits', icon: <Wallet size={20} />, color: '#f5f3ff', path: '/wallet' },
    { id: 3, title: 'Delivery Address', subtitle: 'Manage your locations', icon: <MapPin size={20} />, color: '#fff7ed', path: '/complete-profile' },
    { id: 4, title: 'Privacy & Security', subtitle: 'Manage your data', icon: <ShieldCheck size={20} />, color: '#f0fdf4', path: '/privacy-security' },
    { id: 5, title: 'Help & Support', subtitle: '24/7 support available', icon: <HelpCircle size={20} />, color: '#fdf2f8', path: '/help-support' },
    { id: 6, title: 'Settings', subtitle: 'App preferences', icon: <Settings size={20} />, color: '#f8fafc', path: '/settings' }
  ];

  React.useEffect(() => {
    setLocalPhoto(user?.photoURL);
  }, [user]);

  const handleImageClick = () => {
    fileInputRef.current.click();
  };

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
        // Note: In a real app we'd refresh the user state globally
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

    // 1. Validation
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

        if (!res.ok) {
           const data = await res.json().catch(() => ({}));
           throw new Error(data.error || 'Failed to update photo on server');
        }

        // Skip Firebase updateProfile since Firebase auth rejects large base64 strings for photoURL.
        // Database update is sufficient.

        setLocalPhoto(base64String);
        toast.success('Profile Picture Updated!', { id: 'upload' });
      } catch (err) {
        console.error('Upload Error:', err);
        toast.error(err.message || 'Upload failed.', { id: 'upload' });
      }
    };

    reader.readAsDataURL(file);
  };

  const handleDeleteAccount = async () => {
    setShowDeleteModal(false);

    try {
      const currentUser = auth.currentUser;
      const searchId = user?.uid || user?.email || user?.phoneNumber;
      
      // 1. Delete from Supabase Database
      const res = await fetch(`http://${window.location.hostname}:3004/api/users/${encodeURIComponent(searchId)}`, {
        method: 'DELETE',
      });
      
      // 2. Delete from Firebase Auth (The "Golden Key")
      if (currentUser) {
        try {
          await currentUser.delete();
        } catch (firebaseErr) {
          console.warn('Firebase user delete skipped (requires recent login):', firebaseErr);
          // We continue anyway since the DB is cleared and onLogout will wipe the session
        }
      }

      // 3. Complete Logout and UI Reset
      if (res.status === 200 || res.status === 404) {
        toast.success('Account & Data Deleted Permanently.');
        onLogout(true); // Pass true to skip the redundant "Signed Out" toast
      } else {
        const data = await res.json();
        throw new Error(data.error || 'Server error');
      }
    } catch (err) {
      console.error(err);
      toast.error('Failed to fully delete account. Please contact support.');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="webapp-profile-page"
    >
      <div className="profile-header-card">
        <div className="profile-avatar-wrapper">
          <div className="profile-avatar-circle" onClick={handleImageClick}>
            {localPhoto ? (
              <img src={localPhoto} alt="User" />
            ) : (
              <span className="avatar-initials">{user?.displayName?.charAt(0) || 'K'}</span>
            )}
            <button className="edit-avatar-btn"><Camera size={14} /></button>
            <input 
              type="file" 
              ref={fileInputRef} 
              style={{ display: 'none' }} 
              accept="image/*" 
              onChange={handleFileChange} 
            />
          </div>
          <div className="profile-info-section-webapp">
            {isEditingName ? (
              <div className="edit-name-container-webapp">
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  className="edit-name-input-webapp"
                  autoFocus
                />
                <button onClick={handleUpdateName} disabled={isUpdatingName} className="save-name-btn-webapp">Save</button>
                <button onClick={() => setIsEditingName(false)} className="cancel-name-btn-webapp">Cancel</button>
              </div>
            ) : (
              <div className="name-display-container-webapp" onClick={() => setIsEditingName(true)}>
                <h2 className="profile-name-webapp">{newName || user?.displayName || 'Passwala User'}</h2>
                <button className="edit-name-icon-btn-webapp"><svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path></svg></button>
              </div>
            )}
            <p className="profile-membership-webapp">Premium Hero Member</p>
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

        <button className="delete-account-btn" onClick={() => setShowDeleteModal(true)}>
           <Trash2 size={16} />
           <span>Delete Account</span>
        </button>
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
    </motion.div>
  );
};

export default WebappProfile;
