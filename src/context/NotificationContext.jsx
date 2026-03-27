import React, { createContext, useContext, useState } from 'react';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]); // starts empty — only real actions add notifications

  const addNotification = (notif) => {
    setNotifications(prev => [
      { id: Date.now(), read: false, time: 'Just now', ...notif },
      ...prev,
    ]);
  };

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const dismiss = (id) =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ notifications, addNotification, markAllRead, dismiss, unreadCount }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => useContext(NotificationContext);
