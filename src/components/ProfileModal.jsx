import React, { useState } from 'react';
import { X, Mail, Phone, Shield, Calendar, LogOut, Star, User, Copy, Check } from 'lucide-react';
import { updateProfile } from 'firebase/auth'; // Added this
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
import './ProfileModal.css';

const ProfileModal = ({ user, onClose, onLogout }) => {
  if (!user) return null;

  const joinDate = user.metadata?.creationTime
    ? new Date(user.metadata.creationTime).toLocaleDateString('en-IN', {
        day: 'numeric', month: 'long', year: 'numeric'
      })
    : 'N/A';

  const provider = user.providerData?.[0]?.providerId === 'google.com'
    ? 'Google'
    : user.providerData?.[0]?.providerId === 'phone'
    ? 'Phone (OTP)'
    : 'Unknown';

  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [newName, setNewName] = useState(user.displayName || '');

  const handleLogout = () => {
    onClose();
    onLogout();
  };

  const handleSaveName = async () => {
    if (!newName.trim()) return;
    try {
      // 1. Update Firebase Auth (Updates UI immediately)
      await updateProfile(user, { displayName: newName });
      
      // 2. Sync to Supabase (Optional/Warn-only due to RLS)
      try {
        const { error } = await supabase
          .from('users')
          .upsert({ 
            uid: user.uid, 
            display_name: newName,
            email: user.email,
            phone_number: user.phoneNumber,
            photo_url: user.photoURL,
            last_login: new Date().toISOString()
          }, { onConflict: 'uid' });
        
        if (error) {
          console.warn('Supabase sync blocked (RLS):', error.message);
        } else {
          toast.success('Profile synced to cloud!');
        }
      } catch (syncErr) {
        console.warn('Supabase sync failed:', syncErr);
      }
      
      setIsEditing(false);
      toast.success('Local profile updated! 👤');
    } catch (err) { 
      console.error(err);
      toast.error('Failed to update local profile.');
    }
  };

  const copyUid = () => {
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal glass" onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="pm-header">
          <h3>My Profile</h3>
          <button className="pm-close" onClick={onClose}><X size={20} /></button>
        </div>

        {/* Avatar & Name */}
        <div className="pm-hero">
          <div className="pm-avatar">
            {user.photoURL ? (
              <img src={user.photoURL} alt="avatar" referrerPolicy="no-referrer" />
            ) : (
              <span>{(newName || user.email || 'U')[0].toUpperCase()}</span>
            )}
            <div className="pm-badge"><Star size={10} fill="#FFD700" color="#FFD700" /></div>
          </div>
          <div className="pm-name-section">
            {isEditing ? (
              <div className="pm-edit-box">
                <input 
                  type="text" 
                  value={newName} 
                  onChange={(e) => setNewName(e.target.value)}
                  autoFocus
                />
                <button className="pm-save-btn" onClick={handleSaveName}><Check size={16} /></button>
              </div>
            ) : (
              <div className="pm-display-box">
                <h2 className="pm-name">{newName || 'Passwala User'}</h2>
                <button className="pm-edit-btn" onClick={() => setIsEditing(true)}><User size={14} /></button>
              </div>
            )}
            <span className="pm-role-chip">Customer</span>
          </div>
        </div>

        {/* Info rows */}
        <div className="pm-info">
          {user.email && (
            <div className="pm-row">
              <div className="pm-row-icon"><Mail size={16} /></div>
              <div>
                <span className="pm-label">Email</span>
                <span className="pm-value">{user.email}</span>
              </div>
            </div>
          )}
          {user.phoneNumber && (
            <div className="pm-row">
              <div className="pm-row-icon"><Phone size={16} /></div>
              <div>
                <span className="pm-label">Phone</span>
                <span className="pm-value">{user.phoneNumber}</span>
              </div>
            </div>
          )}
          <div className="pm-row">
            <div className="pm-row-icon"><Shield size={16} /></div>
            <div>
              <span className="pm-label">Signed in via</span>
              <span className="pm-value">{provider}</span>
            </div>
          </div>
          <div className="pm-row">
            <div className="pm-row-icon"><Calendar size={16} /></div>
            <div>
              <span className="pm-label">Member since</span>
              <span className="pm-value">{joinDate}</span>
            </div>
          </div>
          <div className="pm-row">
            <div className="pm-row-icon"><User size={16} /></div>
            <div className="pm-uid-row">
              <span className="pm-label">User ID</span>
              <div className="pm-uid-box">
                <span className="pm-uid-text" title={user.uid}>
                  {user.uid.slice(0, 8)}···{user.uid.slice(-4)}
                </span>
                <button className="pm-copy-btn" onClick={copyUid} title="Copy full UID">
                  {copied ? <Check size={13} color="#22c55e" /> : <Copy size={13} />}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Sign Out */}
        <button className="pm-logout-btn" onClick={handleLogout}>
          <LogOut size={16} /> Sign Out
        </button>

      </div>
    </div>
  );
};

export default ProfileModal;
