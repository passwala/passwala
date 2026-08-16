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
  Trash2,
  MapPin,
  User,
  Phone,
  Mail,
  Edit3,
  Ticket
} from 'lucide-react';
import { useTranslation } from './LanguageContext';
import { auth } from '../firebase';
import { supabase } from '../supabase';
import { showShoppingUI, hasEventBookings, isFeatureEnabled } from '../launchConfig';
import './WebappProfile.css';

const WebappProfile = ({ user, onLogout, isDarkMode, onToggleTheme, onUpdateUser }) => {
  const { t } = useTranslation();
  const [localPhoto, setLocalPhoto] = React.useState(user?.photoURL);
  const [isEditingName, setIsEditingName] = React.useState(false);
  const isPlaceholderName = (n) => !n || n === 'Coming Soon Subscriber' || n === 'Passwala User';
  const getCleanName = (u) => {
    if (!u) return '';
    if (!isPlaceholderName(u.displayName)) return u.displayName || '';
    // Fall back to email prefix, nicely capitalized
    if (u.email) return u.email.split('@')[0].replace(/[._0-9]/g, ' ').trim().replace(/\b\w/g, c => c.toUpperCase()).trim();
    return '';
  };
  const [newName, setNewName] = React.useState(getCleanName(user));
  const [isUpdatingName, setIsUpdatingName] = React.useState(false);
  const [isEditingEmail, setIsEditingEmail] = React.useState(false);
  const [newEmail, setNewEmail] = React.useState(user?.email || '');
  const [isUpdatingEmail, setIsUpdatingEmail] = React.useState(false);
  const fileInputRef = React.useRef(null);
  
  const navigate = useNavigate();

  const allProfileItems = [
    // In events-only launch mode: shows as 'My Tickets'; in full launch: 'Order History'
    {
      id: 1,
      titleKey:    showShoppingUI() ? 'order_history'    : null,
      subtitleKey: showShoppingUI() ? 'view_past_bookings' : null,
      customTitle:    showShoppingUI() ? null : 'My Tickets',
      customSubtitle: showShoppingUI() ? null : 'View your booked tickets',
      icon:  showShoppingUI() ? <History size={20} /> : <Ticket size={20} />,
      class: showShoppingUI() ? 'history' : 'history',
      path:  '/order-history',
      launchHidden: !isFeatureEnabled('events') && !hasEventBookings()
    },
    { id: 2, titleKey: 'passwala_wallet',    subtitleKey: 'manage_credits',     icon: <Wallet size={20} />,    class: 'wallet',   path: '/wallet',            launchHidden: true },
    { id: 3, titleKey: 'delivery_address',   subtitleKey: 'manage_locations',   icon: <MapPin size={20} />,    class: 'address',  path: '/manage-addresses',  launchHidden: true },
    { id: 4, titleKey: 'data_safety_deletion', subtitleKey: 'manage_data_rights', icon: <Trash2 size={20} />,  class: 'deletion', path: '/data-deletion' },
    { id: 5, titleKey: 'privacy_security',   subtitleKey: 'manage_security',    icon: <ShieldCheck size={20} />, class: 'privacy', path: '/privacy-security' },
    { id: 6, titleKey: 'help_support',       subtitleKey: 'support_24_7',       icon: <HelpCircle size={20} />, class: 'help',    path: '/help-support' },
    { id: 7, titleKey: 'settings',           subtitleKey: 'app_preferences',    icon: <Settings size={20} />,  class: 'settings', path: '/settings' }
  ];

  // Hide shopping-related items in launch mode (code preserved, never removed)
  const profileItems = showShoppingUI()
    ? allProfileItems
    : allProfileItems.filter(item => !item.launchHidden);

  React.useEffect(() => {
    setLocalPhoto(user?.photoURL);
    const cleanName = getCleanName(user);
    if (cleanName) setNewName(cleanName);
    if (user?.email) setNewEmail(user.email);
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

  const handleUpdateEmail = async () => {
    const trimmed = newEmail.trim();
    if (!trimmed) { toast.error('Email cannot be empty'); return; }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(trimmed)) { toast.error('Please enter a valid email address'); return; }
    setIsUpdatingEmail(true);
    try {
      // Resolve the DB user id
      const uid  = user?.uid  || user?.id;
      const phone = (user?.phoneNumber || user?.phone || '').replace(/[\s\-().]/g, '').replace(/^\+91/, '').replace(/^91(?=\d{10}$)/, '');
      let filters = [];
      if (uid)   filters.push(`uid.eq.${uid}`);
      if (phone) filters.push(`phone.eq.${phone}`);
      const { data: usr } = await supabase.from('users').select('id').or(filters.join(',')).maybeSingle();
      if (!usr?.id) throw new Error('Could not find your account');

      const { error } = await supabase.from('users').update({ email: trimmed }).eq('id', usr.id);
      if (error) throw error;

      toast.success('Email updated! ✉️');
      setIsEditingEmail(false);
      if (onUpdateUser) onUpdateUser({ ...user, email: trimmed });
    } catch (err) {
      toast.error(err.message || 'Failed to update email');
    } finally {
      setIsUpdatingEmail(false);
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

        {/* ── Personal Info Card ───────────────────────────── */}
        <h3 className="section-label">Personal Info</h3>
        <div className="profile-info-card">
          {/* Name row */}
          <div className="profile-info-row" onClick={() => setIsEditingName(true)}>
            <div className="profile-info-icon name-icon"><User size={18} /></div>
            <div className="profile-info-content">
              <span className="profile-info-label">Full Name</span>
              {isEditingName ? (
                <div className="profile-info-edit-row">
                  <input
                    className="profile-info-input"
                    type="text"
                    value={newName}
                    onChange={e => setNewName(e.target.value)}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                  <button className="profile-info-save-btn" onClick={e => { e.stopPropagation(); handleUpdateName(); }} disabled={isUpdatingName}>
                    {isUpdatingName ? '…' : 'Save'}
                  </button>
                  <button className="profile-info-cancel-btn" onClick={e => { e.stopPropagation(); setIsEditingName(false); }}>✕</button>
                </div>
              ) : (
                <span className="profile-info-value">{newName || user?.displayName || 'Tap to add name'}</span>
              )}
            </div>
            {!isEditingName && <Edit3 size={15} className="profile-info-edit-icon" />}
          </div>

          <div className="profile-info-divider" />

          {/* Phone row */}
          <div className="profile-info-row">
            <div className="profile-info-icon phone-icon"><Phone size={18} /></div>
            <div className="profile-info-content">
              <span className="profile-info-label">Phone Number</span>
              <span className="profile-info-value">
                {(() => {
                  const phone = user?.phoneNumber || user?.phone;
                  // Hide placeholder phones set by coming-soon signup
                  if (!phone || phone.startsWith('CS_') || phone.startsWith('np_')) return 'Not added';
                  return phone.startsWith('+91') ? phone : `+91 ${phone}`;
                })()}
              </span>
            </div>
          </div>

          <div className="profile-info-divider" />

          {/* Email row */}
          <div className="profile-info-row" onClick={() => !isEditingEmail && setIsEditingEmail(true)}>
            <div className="profile-info-icon email-icon"><Mail size={18} /></div>
            <div className="profile-info-content">
              <span className="profile-info-label">Email Address</span>
              {isEditingEmail ? (
                <div className="profile-info-edit-row">
                  <input
                    className="profile-info-input"
                    type="email"
                    value={newEmail}
                    placeholder="your@email.com"
                    onChange={e => setNewEmail(e.target.value)}
                    autoFocus
                    onClick={e => e.stopPropagation()}
                  />
                  <button className="profile-info-save-btn" onClick={e => { e.stopPropagation(); handleUpdateEmail(); }} disabled={isUpdatingEmail}>
                    {isUpdatingEmail ? '…' : 'Save'}
                  </button>
                  <button className="profile-info-cancel-btn" onClick={e => { e.stopPropagation(); setIsEditingEmail(false); setNewEmail(user?.email || ''); }}>✕</button>
                </div>
              ) : (
                <span className="profile-info-value" style={{ color: (user?.email || newEmail) ? undefined : '#94a3b8' }}>
                  {newEmail || user?.email || 'Tap to add email'}
                </span>
              )}
            </div>
            {!isEditingEmail && <Edit3 size={15} className="profile-info-edit-icon" />}
          </div>
        </div>

        <h3 className="section-label">{t('account_activity')}</h3>
        <div className="profile-menu-container">
          {profileItems.map((item) => (
            <button 
              key={item.id} 
              className="profile-menu-item"
              onClick={() => item.path ? navigate(item.path) : toast(`Opening ${item.customTitle || t(item.titleKey)}...`)}
            >
              <div className="menu-item-left">
                <div className={`menu-icon-box ${item.class}`}>
                  {item.icon}
                </div>
                <div className="menu-text">
                   <strong>{item.customTitle || t(item.titleKey)}</strong>
                   <span>{item.customSubtitle || t(item.subtitleKey)}</span>
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
