
import React from 'react';
import { 
  ArrowLeft, 
  MapPin, 
  Bell, 
  Sun,
  Moon,
  ShoppingBag
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import './WebappNavbar.css';

const WebappNavbar = ({ user, onOpenProfile, onBack, title, location }) => {
  const navigate = useNavigate();
  const { totalItems, setCartOpen } = useCart();
  
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
          <button className="nav-action-btn-v2" onClick={() => setCartOpen(true)}>
             <ShoppingBag size={20} />
             {totalItems > 0 && <span className="nav-cart-badge">{totalItems}</span>}
          </button>
          
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
