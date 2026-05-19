import React, { useState } from 'react';
import { X, User, Phone, LogOut, Copy, Check, Edit2 } from 'lucide-react';
import { supabase } from '../supabase';
import './ProfileModal.css';

const ProfileModal = ({ user, onClose, onSignOut }) => {
  const [copied, setCopied] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.displayName || user?.user_metadata?.full_name || '');
  const [loading, setLoading] = useState(false);

  const uid = user?.uid || user?.id;
  const initial = (editName || user?.phoneNumber || 'U').charAt(0).toUpperCase();

  const handleCopy = () => {
    navigator.clipboard.writeText(uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleSaveName = async () => {
    if (!editName.trim()) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: editName }
      });
      if (!error) {
        setIsEditing(false);
      }
    } catch (e) {
      console.error(e);
    }
    setLoading(false);
  };

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal" onClick={e => e.stopPropagation()}>
        <div className="pm-header">
          <h3>Your Profile</h3>
          <button className="pm-close" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="pm-hero">
          <div className="pm-avatar">
            {user?.photoURL ? <img src={user.photoURL} alt="Avatar" /> : initial}
            <div className="pm-badge"><Check size={12} color="#ff6b35" /></div>
          </div>
          
          <div className="pm-name-section">
            {isEditing ? (
              <div className="pm-edit-box">
                <input 
                  type="text" 
                  value={editName} 
                  onChange={e => setEditName(e.target.value)} 
                  disabled={loading}
                  autoFocus
                />
                <button className="pm-save-btn" onClick={handleSaveName} disabled={loading}>
                  <Check size={16} />
                </button>
              </div>
            ) : (
              <div className="pm-display-box">
                <h4 className="pm-name">{editName || 'Verified User'}</h4>
                <button className="pm-edit-btn" onClick={() => setIsEditing(true)}>
                  <Edit2 size={14} />
                </button>
              </div>
            )}
            <span className="pm-role-chip">Customer</span>
          </div>
        </div>

        <div className="pm-info">
          <div className="pm-row">
            <div className="pm-row-icon"><Phone size={16} /></div>
            <div>
              <span className="pm-label">Phone Number</span>
              <span className="pm-value">{user?.phoneNumber || 'Not Linked'}</span>
            </div>
          </div>

          <div className="pm-row">
            <div className="pm-row-icon"><User size={16} /></div>
            <div className="pm-uid-row">
              <span className="pm-label">Account ID</span>
              <div className="pm-uid-box">
                <span className="pm-uid-text">{uid ? `${uid.substring(0, 16)}...` : 'N/A'}</span>
                {uid && (
                  <button className="pm-copy-btn" onClick={handleCopy} title="Copy ID">
                    {copied ? <Check size={14} color="#22c55e" /> : <Copy size={14} />}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {onSignOut && (
          <button className="pm-logout-btn" onClick={onSignOut}>
            <LogOut size={18} />
            Sign Out Securely
          </button>
        )}
      </div>
    </div>
  );
};

export default ProfileModal;
