import React from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  MapPin, 
  Bell, 
  Sun,
  Moon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './WebappNavbar.css';

const WebappNavbar = ({ user, onOpenProfile, onBack, title, location, isDarkMode, onToggleTheme }) => {
  const navigate = useNavigate();
  return (
    <nav className="webapp-navbar glass">
      <div className="navbar-top-main">
        <div className="navbar-left">
          {onBack && (
            <button className="nav-back-btn" onClick={onBack}>
               <ArrowLeft size={22} />
            </button>
          )}
          
          {!title ? (
            <div className="webapp-brand-group-v3">
              <img src="/logo.png" alt="Passwala" className="navbar-logo-v3" style={{ width: '40px', height: '40px' }} />
              <div className="brand-text-stack">
                 <span className="brand-name-navy mobile-hide-text">Passwala</span>
                 <div 
                   className="brand-tagline-location live-address clickable-location" 
                   onClick={() => navigate('/select-location')}
                 >
                    <MapPin size={14} className="tag-pin-icon" />
                    <strong>{location || 'Detecting Location...'}</strong>
                 </div>
              </div>
            </div>
          ) : (
            <h2 className="navbar-title-text">{title}</h2>
          )}
        </div>

        <div className="navbar-right-actions">
          <button className="nav-action-btn-v2" onClick={() => toast('No new notifications.')}>
             <Bell size={20} />
             <span className="notif-dot"></span>
          </button>
          
          <button className="nav-profile-trigger" onClick={onOpenProfile}>
             {user?.photoURL ? (
               <img src={user.photoURL} alt="P" />
             ) : (
               <div className="nav-avatar-circle-v2">
                  {user?.displayName?.charAt(0) || 'U'}
               </div>
             )}
          </button>
        </div>
      </div>
    </nav>
  );
};

export default WebappNavbar;

