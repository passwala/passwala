/* eslint-disable react-refresh/only-export-components */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMessagingInstance } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from 'react-hot-toast';

const NotificationContext = createContext();

const appMode = import.meta.env.MODE || '';
const isWebappMode = appMode === 'webapp' || (appMode === 'development' && window.location.port === '3001');

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [fcmToken, setFcmToken] = useState(null);

  // 🛡️ Request Notification Permission (Only once-per-choice logic)
  const requestNotificationPermission = async () => {
    if (!isWebappMode) return;
    
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return;
    }

    try {
      if (Notification.permission === 'default') {
        const permission = await Notification.requestPermission();
        localStorage.setItem('passwala_notif_asked', 'true');
        
        if (permission === 'granted') {
          await fetchToken();
        }
      } else if (Notification.permission === 'granted') {
        await fetchToken();
      }
    } catch (error) {
      console.error('Notification permission error:', error);
    }
  };

  const fetchToken = async () => {
    try {
      const msg = await getMessagingInstance();
      if (!msg) return;
      const token = await getToken(msg, {
        vapidKey: import.meta.env.VITE_FIREBASE_VAPID_KEY
      });
      if (token) {
        setFcmToken(token);
        localStorage.setItem('fcm_token', token);
        console.log('FCM Token generated:', token);
      }
    } catch (err) {
      console.error('FCM Token error:', err);
    }
  };

  const addNotification = (notif) => {
    const textVal = notif.text || notif.message || notif.body || '';
    setNotifications(prev => [
      { id: Date.now(), read: false, time: 'Just now', ...notif, text: textVal },
      ...prev,
    ]);
  };

  useEffect(() => {
    if (!isWebappMode) return;

    const initNotifications = async () => {
      // 🛡️ 1. Register Service Worker Safely
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/firebase-messaging-sw.js');
          console.log('SW registered with scope:', registration.scope);
        } catch (err) {
          console.warn('SW registration failed (likely insecure context):', err);
        }
      }

      // 🛡️ 2. Setup Foreground Listener
      const msg = await getMessagingInstance();
      if (msg) {
        const unsubscribe = onMessage(msg, (payload) => {
          console.log('Foreground Message received:', payload);
          const { title, body } = payload.notification;
          addNotification({ title, text: body, type: 'push' });
          toast.success(`${title}: ${body}`, { icon: '🔔' });
        });
        return unsubscribe;
      }
    };
    
    let unsub;
    initNotifications().then(u => unsub = u);
    return () => unsub && unsub();
  }, []);

  const markAllRead = () =>
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));

  const dismiss = (id) =>
    setNotifications(prev => prev.filter(n => n.id !== id));

  const unreadCount = notifications.filter(n => !n.read).length;

  return (
    <NotificationContext.Provider value={{ 
      notifications, 
      addNotification, 
      markAllRead, 
      dismiss, 
      unreadCount, 
      requestNotificationPermission,
      fcmToken 
    }}>
      {children}
    </NotificationContext.Provider>
  );
};

export const useNotifications = () => {
  const context = useContext(NotificationContext);
  if (!context) {
    console.warn("⚠️ useNotifications was called outside of NotificationProvider. Returning mock fallbacks.");
    return {
      notifications: [],
      addNotification: () => {},
      markAllRead: () => {},
      dismiss: () => {},
      unreadCount: 0,
      requestNotificationPermission: async () => {},
      fcmToken: null
    };
  }
  return context;
};
