
import React, { useState, useEffect } from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Bell, 
  Sun,
  Moon,
  ShoppingBag,
  Search
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';
import NotificationPanel from './NotificationPanel';
import { showShoppingUI, LAUNCH_MODE } from '../launchConfig';
import { useTranslation } from './LanguageContext';
import './WebappNavbar.css';

const WebappNavbar = ({ user, onOpenProfile, onBack, title, location, isDarkMode, onToggleTheme }) => {
  const navigate = useNavigate();
  const { totalItems, setCartOpen } = useCart();
  const { unreadCount } = useNotifications();
  const { currentLanguage, changeLanguage } = useTranslation();
  
  const [showNotifications, setShowNotifications] = useState(false);
  const [navSearch, setNavSearch] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('q') || '';
  });

  useEffect(() => {
    const params = new URLSearchParams(window.location.search);
    setNavSearch(params.get('q') || '');
  }, [window.location.search]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (navSearch.trim()) {
      navigate(`/events?q=${encodeURIComponent(navSearch.trim())}`);
    } else {
      navigate('/events');
    }
  };

  
  return (
    <nav className="webapp-navbar glass">
      <div className="navbar-top-main">
        <div className="navbar-left">
          
          {onBack && (
            <button className="nav-action-btn-v2" onClick={onBack} style={{ marginRight: '12px' }} title="Go Back">
              <ArrowLeft size={20} />
            </button>
          )}
          {!title ? (
            <div className="webapp-brand-group-v3">
              <img 
                src="/logo.png" 
                alt="Passwala" 
                className="navbar-logo-v3" 
                onClick={() => navigate('/')} 
                style={{ cursor: 'pointer' }} 
              />
              <div className="brand-text-stack">
                 <span 
                   className="brand-name-navy mobile-hide-text" 
                   onClick={() => navigate('/')} 
                   style={{ cursor: 'pointer' }}
                 >
                   Passwala
                 </span>
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

        {/* ── Search Bar ── */}
        <form className="navbar-search-form" onSubmit={handleSearchSubmit}>
          <Search size={16} className="navbar-search-icon" />
          <input
            type="text"
            placeholder="Search events, concerts, workshops..."
            value={navSearch}
            onChange={(e) => setNavSearch(e.target.value)}
            className="navbar-search-input"
          />
        </form>

        <div className="navbar-right-actions">
          {/* Cart icon — hidden in launch mode when shopping is not enabled */}
          {showShoppingUI() && (
            <button className="nav-action-btn-v2" onClick={() => setCartOpen(true)}>
               <ShoppingBag size={20} />
               {totalItems > 0 && <span className="nav-cart-badge">{totalItems}</span>}
            </button>
          )}
          
          {/* Bell notification — hidden in launch mode (no order notifications yet) */}
          {!LAUNCH_MODE && (
            <div style={{ position: 'relative' }}>
              <button className="nav-action-btn-v2" onClick={() => setShowNotifications(!showNotifications)}>
                 <Bell size={20} />
                 {unreadCount > 0 && <span className="notif-dot"></span>}
              </button>
              
              {showNotifications && (
                <NotificationPanel onClose={() => setShowNotifications(false)} />
              )}
            </div>
          )}
          
          {/* Theme Toggle Button */}
          <button className="nav-action-btn-v2" onClick={onToggleTheme} title={isDarkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}>
            {isDarkMode ? <Sun size={20} /> : <Moon size={20} />}
          </button>

          {/* Language Selector */}
          <div className="language-selector-wrapper" style={{ position: 'relative' }}>
            <select
              value={currentLanguage}
              onChange={(e) => changeLanguage(e.target.value)}
              className="navbar-lang-select"
              style={{
                appearance: 'none',
                background: 'transparent',
                border: 'none',
                color: 'inherit',
                fontSize: '1rem',
                cursor: 'pointer',
                padding: '4px 8px',
                outline: 'none',
                fontWeight: '600'
              }}
              title="Change Language"
            >
              <option value="en" style={{ color: '#000' }}>🇺🇸 EN</option>
              <option value="hi" style={{ color: '#000' }}>🇮🇳 HI</option>
              <option value="gu" style={{ color: '#000' }}>🇮🇳 GU</option>
              <option value="mr" style={{ color: '#000' }}>🇮🇳 MR</option>
              <option value="ta" style={{ color: '#000' }}>🇮🇳 TA</option>
            </select>
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
