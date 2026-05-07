
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
import './WebappNavbar.css';

const WebappNavbar = ({ user, onOpenProfile, onBack, title, location }) => {
  const navigate = useNavigate();
  const { totalItems, setCartOpen } = useCart();
  const { notifications, markAllRead, unreadCount, dismiss } = useNotifications();
  
  const [showNotifications, setShowNotifications] = useState(false);
  
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
          
          <div style={{ position: 'relative' }}>
            <button className="nav-action-btn-v2" onClick={() => setShowNotifications(!showNotifications)}>
               <Bell size={20} />
               {unreadCount > 0 && <span className="notif-dot"></span>}
            </button>
            
            {showNotifications && (
              <>
                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', zIndex: 90 }} onClick={() => setShowNotifications(false)}></div>
                <div style={{
                  position: 'absolute', top: '100%', right: '0', marginTop: '12px',
                  width: '320px', background: '#fff', borderRadius: '16px',
                  boxShadow: '0 10px 40px rgba(0,0,0,0.15)', zIndex: 100, border: '1px solid #e2e8f0', overflow: 'hidden'
                }}>
                  <div style={{ padding: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #f1f5f9' }}>
                    <h3 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#0f172a' }}>Notifications</h3>
                    {unreadCount > 0 && (
                      <button onClick={markAllRead} style={{ background: 'none', border: 'none', color: '#3b82f6', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>Mark all read</button>
                    )}
                  </div>
                  <div style={{ maxHeight: '350px', overflowY: 'auto' }}>
                    {notifications.length === 0 ? (
                      <div style={{ padding: '32px 16px', textAlign: 'center', color: '#64748b' }}>No new notifications</div>
                    ) : (
                      notifications.map(n => (
                        <div key={n.id} style={{ padding: '16px', borderBottom: '1px solid #f8fafc', background: n.read ? '#fff' : '#f0f9ff', display: 'flex', gap: '12px', cursor: 'pointer' }} onClick={() => {
                          dismiss(n.id);
                        }}>
                          <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: n.read ? '#f1f5f9' : '#dbeafe', color: n.read ? '#64748b' : '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Bell size={18} />
                          </div>
                          <div>
                            <p style={{ margin: 0, fontSize: '0.9rem', color: '#1e293b', fontWeight: n.read ? 400 : 500 }}>{n.text}</p>
                            <span style={{ fontSize: '0.75rem', color: '#94a3b8', marginTop: '4px', display: 'block' }}>{n.time}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </>
            )}
          </div>
          
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
