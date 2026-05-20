/* eslint-disable */
import React, { createContext, useContext, useState, useEffect } from 'react';
import { getMessagingInstance } from '../firebase';
import { getToken, onMessage } from 'firebase/messaging';
import { toast } from 'react-hot-toast';

const NotificationContext = createContext();

export const NotificationProvider = ({ children }) => {
  const [notifications, setNotifications] = useState([]);
  const [fcmToken, setFcmToken] = useState(null);

  // 🛡️ Request Notification Permission (Only once-per-choice logic)
  const requestNotificationPermission = async () => {
    if (!('Notification' in window)) {
      console.warn('This browser does not support notifications.');
      return;
    }

    try {
      const hasAsked = localStorage.getItem('passwala_notif_asked');
      
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

  useEffect(() => {
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
