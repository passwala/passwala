import React, { useState, useEffect, useRef } from 'react';
import { Bell, X, CheckCheck } from 'lucide-react';
import { useNotifications } from '../context/NotificationContext';
import './NotificationPanel.css';

const NotificationPanel = () => {
  const [open, setOpen] = useState(false);
  const { notifications, unreadCount, markAllRead, dismiss } = useNotifications();
  const panelRef = useRef(null);


  // Close on outside click
  useEffect(() => {
    const handler = (e) => {
      if (panelRef.current && !panelRef.current.contains(e.target)) setOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);


  return (
    <div className="notif-wrapper" ref={panelRef}>
      {/* Bell button */}
      <button className="nav-icon-btn notif-btn" onClick={() => setOpen(o => !o)}>
        <Bell size={20} />
        {unreadCount > 0 && <span className="notif-badge">{unreadCount}</span>}
      </button>

      {/* Panel */}
      {open && (
        <div className="notif-panel glass">
          {/* Header */}
          <div className="notif-header">
            <h4>Notifications</h4>
            {unreadCount > 0 && (
              <button className="notif-mark-all" onClick={markAllRead}>
                <CheckCheck size={14} /> Mark all read
              </button>
            )}
          </div>

          {/* List */}
          <div className="notif-list">
            {notifications.length === 0 ? (
              <div className="notif-empty">
                <Bell size={36} strokeWidth={1} />
                <p>All caught up!</p>
              </div>
            ) : (
              notifications.map(n => (
                <div key={n.id} className={`notif-item ${!n.read ? 'notif-item--unread' : ''}`}>
                  <div className="notif-icon-wrap" style={{ background: n.color + '20', color: n.color }}>
                    <span>{n.icon}</span>
                  </div>
                  <div className="notif-content">
                    <strong>{n.title}</strong>
                    <p>{n.body}</p>
                    <span className="notif-time">{n.time}</span>
                  </div>
                  <button className="notif-dismiss" onClick={() => dismiss(n.id)}>
                    <X size={13} />
                  </button>
                  {!n.read && <div className="notif-dot" />}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationPanel;
