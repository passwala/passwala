import React from 'react';
import './SplashScreen.css';

const SplashScreen = () => {
  return (
    <div className="splash-screen">
      <div className="splash-content animate-fade-in-up">
        <div className="splash-logo-row">
           <img src="/logo.png" alt="Passwala Logo" className="logo-icon-large" style={{ objectFit: 'contain', padding: '12px', background: 'var(--primary)' }} />
           <div className="logo-text-vertical">
              <h1 className="splash-brand">PASSWALA</h1>
              <p className="splash-tagline">“Your Neighborhood, Powered by AI”</p>
           </div>
        </div>
      </div>
    </div>
  );
};

export default SplashScreen;
