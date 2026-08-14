import React from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter as Router } from 'react-router-dom'
import './index.css'
import App, { ErrorBoundary } from './App.jsx'

// ─── Service Worker Cleanup ───────────────────────────────────────────────────
// Unregister ALL foreign service workers on startup so old projects (e.g. Exotic Café)
// can never intercept Passwala's pages on the same localhost port again.
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.getRegistrations().then((registrations) => {
    for (const registration of registrations) {
      const swUrl = registration.active?.scriptURL || registration.installing?.scriptURL || registration.waiting?.scriptURL || '';
      // Only keep Passwala's own service worker; remove everything else
      if (!swUrl.includes('firebase-messaging-sw') && !swUrl.includes('passwala')) {
        registration.unregister();
      }
    }
  }).catch(() => {});

  // Also clear any caches left behind by old projects
  if ('caches' in window) {
    caches.keys().then((cacheNames) => {
      cacheNames.forEach((cacheName) => {
        if (!cacheName.includes('passwala')) {
          caches.delete(cacheName);
        }
      });
    }).catch(() => {});
  }
}
// ─────────────────────────────────────────────────────────────────────────────

createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <ErrorBoundary>
      <Router>
        <App />
      </Router>
    </ErrorBoundary>
  </React.StrictMode>
);
