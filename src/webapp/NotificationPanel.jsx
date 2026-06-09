import React from 'react';
import { Bell, Check, X } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationPanel.css';

const NotificationPanel = ({ onClose }) => {
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();

  return (
    <>
      <div style={{ position: 'fixed', inset: 0, zIndex: 90 }} onClick={onClose}></div>
      <div className="notif-panel">
        <div className="notif-header">
          <h4>Notifications</h4>
          {unreadCount > 0 && (
            <button className="notif-mark-all" onClick={markAllRead}>
              <Check size={14} /> Mark all read
            </button>
          )}
        </div>
        
        <div className="notif-list">
          {notifications.length === 0 ? (
            <div className="notif-empty">
              <Bell size={24} color="#cbd5e1" />
              <p>No new notifications</p>
            </div>
          ) : (
            notifications.map(n => (
              <div key={n.id} className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}>
                <div className="notif-icon-wrap" style={{ position: 'relative', background: n.read ? '#f1f5f9' : '#fff0eb', color: n.read ? '#64748b' : '#ff6b35' }}>
                  <Bell size={18} />
                  {!n.read && <div className="notif-dot"></div>}
                </div>
                
                <div className="notif-content">
                  <strong>{n.title || 'Update'}</strong>
                  <p>{n.text}</p>
                  <span className="notif-time">{n.time}</span>
                </div>
                
                <button className="notif-dismiss" onClick={(e) => { e.stopPropagation(); dismiss(n.id); }}>
                  <X size={16} />
                </button>
              </div>
            ))
          )}
        </div>
      </div>
    </>
  );
};

export default NotificationPanel;
