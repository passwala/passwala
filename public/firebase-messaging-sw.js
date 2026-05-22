/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "AIzaSyCqjI8v3JaP14VBg4ygarxXlfjZfTvHlag",
  authDomain: "passwala-75faa.firebaseapp.com",
  projectId: "passwala-75faa",
  storageBucket: "passwala-75faa.firebasestorage.app",
  messagingSenderId: "301031527282",
  appId: "1:301031527282:web:b97b08afb9eafc41fa43eb"
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
