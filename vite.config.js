import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'
import fs from 'fs'

const __filename = fileURLToPath(import.meta.url)
const __dirname = path.dirname(__filename)

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const isWeb = mode === 'web';
  const isWebapp = mode === 'webapp';
  const isVendor = mode === 'vendor';
  const isRider = mode === 'rider';
  const isAdmin = mode === 'admin';

  const port = isWeb ? 3000 : 
               isWebapp ? 3001 : 
               isVendor ? 3002 : 
               isRider ? 3003 : 
               isAdmin ? 3005 : 3000;

  const outDir = isWeb ? 'dist/web' : 
                 isWebapp ? 'dist/webapp' : 
                 isVendor ? 'dist/vendor' : 
                 isRider ? 'dist/rider' : 
                 isAdmin ? 'dist/admin' : 'dist';

  const env = loadEnv(mode, process.cwd(), '');

  const firebaseSWContent = `/* eslint-disable no-undef */
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/9.0.0/firebase-messaging-compat.js');

firebase.initializeApp({
  apiKey: "${env.VITE_FIREBASE_API_KEY || ''}",
  authDomain: "${env.VITE_FIREBASE_AUTH_DOMAIN || ''}",
  projectId: "${env.VITE_FIREBASE_PROJECT_ID || ''}",
  storageBucket: "${env.VITE_FIREBASE_STORAGE_BUCKET || ''}",
  messagingSenderId: "${env.VITE_FIREBASE_MESSAGING_SENDER_ID || ''}",
  appId: "${env.VITE_FIREBASE_APP_ID || ''}"
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
`;

  try {
    const swPath = path.resolve(__dirname, 'public/firebase-messaging-sw.js');
    fs.writeFileSync(swPath, firebaseSWContent, 'utf-8');
    console.log('✅ Dynamic firebase-messaging-sw.js successfully generated in public directory.');
  } catch (err) {
    console.error('❌ Failed to write dynamic firebase-messaging-sw.js:', err.message);
  }

  return {
    plugins: [react()],
    cacheDir: `node_modules/.vite/${mode || 'default'}`,
    server: {
      port,
      host: '0.0.0.0',
      cors: true,
      strictPort: true,
      allowedHosts: true,
      open: process.env.HEADLESS !== 'true',
      proxy: {
        '/api': {
          target: 'http://localhost:3004',
          changeOrigin: true
        }
      }
    },
    build: {
      outDir,
      emptyOutDir: true
    },
    resolve: {
      alias: {
        '@': path.resolve(__dirname, './src'),
        'react': path.resolve(__dirname, 'node_modules/react'),
        'react-dom': path.resolve(__dirname, 'node_modules/react-dom'),
      },
    },
  }
})
