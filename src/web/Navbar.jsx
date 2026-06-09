import React, { useState, useEffect } from 'react';
import './Navbar.css';

const Navbar = ({ isAuthenticated, user, _onOpenProfile, onJoin }) => {
  const [scrolled, setScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <>
      <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
        <div className="container nav-content">
          {/* Left: Brand */}
          <div className="nav-left">
            <div className="logo-wrapper">
               <img src="/logo.png" alt="Passwala Logo" className="navbar-main-logo" />
               <span className="logo-text-main">Passwala_</span>
            </div>
          </div>

          {/* Center: Links (Hidden on Mobile) */}
          <div className="nav-center-v2 mobile-hide">
             <div className="nav-links-v2">
               <a href={`http://${window.location.hostname}:3001`} className="nav-pill-link">Buyer App</a>
               <a href={`http://${window.location.hostname}:3002`} className="nav-pill-link">Vendor</a>
               <a href={`http://${window.location.hostname}:3003`} className="nav-pill-link">Rider</a>
               <a href="#about" className="nav-pill-link">About Us</a>
             </div>
          </div>

          {/* Right: Actions (Hidden on Mobile) */}
          <div className="nav-right mobile-hide">
             {isAuthenticated ? (
               <div style={{display: 'flex', gap: '15px', alignItems: 'center'}}>
                 <span style={{fontWeight: '600', color: 'var(--text-secondary)'}}>Hi, {user?.displayName?.split(' ')[0] || 'User'}</span>
               </div>
             ) : (
               <button onClick={onJoin} className="join-free-btn">Get Started</button>
             )}
          </div>

          {/* Mobile Menu Toggle */}
          <button className="mobile-menu-btn" onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
            <div className={`hamburger ${isMobileMenuOpen ? 'active' : ''}`}></div>
          </button>
        </div>
      </nav>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMobileMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
          <a href={`http://${window.location.hostname}:3001`} onClick={() => setIsMobileMenuOpen(false)}>Buyer App</a>
          <a href={`http://${window.location.hostname}:3002`} onClick={() => setIsMobileMenuOpen(false)}>Vendor Portal</a>
          <a href={`http://${window.location.hostname}:3003`} onClick={() => setIsMobileMenuOpen(false)}>Rider Portal</a>
          <hr style={{border: 'none', borderTop: '1px solid #eee'}} />
          {isAuthenticated ? (
            <span style={{fontWeight: '600', color: 'var(--text-secondary)', padding: '10px 0', display: 'block', textAlign: 'center'}}>Hi, {user?.displayName?.split(' ')[0] || 'User'}</span>
          ) : (
            <button onClick={() => { setIsMobileMenuOpen(false); onJoin(); }} className="mobile-join-btn">Get Started</button>
          )}
        </div>
      </div>
    </>
  );
};

export default Navbar;
