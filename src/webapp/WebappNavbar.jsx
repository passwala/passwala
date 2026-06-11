
import React, { useState } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Bell, 
  Sun,
  Moon,
  ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import './WebappNavbar.css';

const WebappNavbar = ({ user, onOpenProfile, onBack, title, location }) => {
  const navigate = useNavigate();
  const { totalItems, setCartOpen } = useCart();
  const { unreadCount } = useNotifications();
  
  const [showNotifications, setShowNotifications] = useState(false);
  
  return (
    <nav className="webapp-navbar glass">
      <div className="navbar-top-main">
        <div className="navbar-left">
          {onBack && (
            <button className="nav-back-btn" onClick={onBack} aria-label="Go back">
               <ArrowLeft size={20} />
            </button>
          )}
          
          {!title ? (
            <div className="webapp-brand-group-v3">
              <img src="/logo.png" alt="Passwala" className="navbar-logo-v3" />
              <div className="brand-text-stack">
                 <span className="brand-name-navy mobile-hide-text">Passwala</span>
                 <div 
                   className="brand-tagline-location live-address clickable-location" 
                   onClick={() => navigate('/select-location')}
                 >
                    <div className="location-dot-live"></div>
                    <MapPin size={12} className="tag-pin-icon" />
                    <strong>{location || 'Detecting Area...'}</strong>
                 </div>
              </div>
            </div>
          ) : (
            <h2 className="navbar-title-text">{title}</h2>
          )}
        </div>

        <div className="navbar-right-actions">
          <button className="nav-action-btn-v2" onClick={() => setCartOpen(true)}>
             <ShoppingBag size={20} />
             {totalItems > 0 && <span className="nav-cart-badge">{totalItems}</span>}
          </button>
          
          <div style={{ position: 'relative' }}>
            <button className="nav-action-btn-v2" onClick={() => setShowNotifications(!showNotifications)}>
               <Bell size={20} />
               {unreadCount > 0 && <span className="notif-dot"></span>}
            </button>
            
            {showNotifications && (
              <NotificationPanel onClose={() => setShowNotifications(false)} />
            )}
          </div>
          
          {(title !== 'Profile' && !window.location.pathname.includes('/profile')) && (
            <button 
              className="nav-profile-trigger" 
              onClick={onOpenProfile}
              title="My Profile"
              aria-label="My Profile"
            >
               {user?.photoURL ? (
                 <img 
                   src={user.photoURL} 
                   alt="Profile" 
                   style={{ 
                     width: '36px', 
                     height: '36px', 
                     borderRadius: '50%', 
                     objectFit: 'cover',
                     display: 'block'
                   }} 
                 />
               ) : (
                 <div className="nav-avatar-circle-v2">
                   {user?.displayName
                     ? user.displayName.trim().charAt(0).toUpperCase()
                     : user?.phoneNumber
                       ? user.phoneNumber.slice(-2)
                       : '👤'}
                 </div>
               )}
            </button>
          )}
        </div>
      </div>
    </nav>
  );
};

export default WebappNavbar;
