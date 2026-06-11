/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSy8ppJm0n3ovERMUKZTcrw0NGOvui3HVgwM",
  authDomain: "passwala-318ca.firebaseapp.com",
  projectId: "passwala-318ca",
  storageBucket: "passwala-318ca.firebasestorage.app",
  messagingSenderId: "679679776231",
  appId: "1:679679776231:web:9ceea5656d4f2ad6a01942"
});

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: '/logo.png'
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
