/* eslint-disable */
import React from 'react';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import './Navbar.css';

const Navbar = ({ isAuthenticated, user, onLogout, onOpenProfile, onOpenAI, onJoin }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);
  const { totalItems, setCartOpen } = useCart();

  React.useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''}`}>
      <div className="container nav-content">
        {/* Left: Brand */}
        <div className="nav-left">
          <div className="logo-wrapper">
             <img src="/logo.png" alt="Passwala Logo" className="navbar-main-logo" />
             <span className="logo-text-main">Passwala</span>
          </div>
        </div>

        {/* Center: Navigation Links (Desktop) */}
        <div className="nav-center-v2">
          <div className="nav-links-v2">
             <a href="#services" className="nav-pill-link">Services</a>
             <a href="#essentials" className="nav-pill-link">Essentials</a>
             <a href="#deals" className="nav-pill-link">Deals</a>
             <a href="#community" className="nav-pill-link">Community</a>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="nav-right">
          {isAuthenticated && (
            <div className="user-profile-pill" onClick={onOpenProfile}>
               <div className="user-avatar">{user?.full_name?.charAt(0) || 'U'}</div>
            </div>
          )}

          {/* Mobile Menu Toggle */}
          <button className="mobile-menu-btn" onClick={() => setIsMenuOpen(!isMenuOpen)}>
             <div className={`hamburger ${isMenuOpen ? 'active' : ''}`}></div>
          </button>
        </div>
      </div>

      {/* Mobile Menu Overlay */}
      <div className={`mobile-menu-overlay ${isMenuOpen ? 'active' : ''}`}>
        <div className="mobile-menu-content">
           <a href="#services" onClick={() => setIsMenuOpen(false)}>Services</a>
           <a href="#essentials" onClick={() => setIsMenuOpen(false)}>Essentials</a>
           <a href="#deals" onClick={() => setIsMenuOpen(false)}>Deals</a>
           <a href="#community" onClick={() => setIsMenuOpen(false)}>Community</a>
           <hr />
           {isAuthenticated && (
             <button className="mobile-join-btn" onClick={() => { onOpenProfile(); setIsMenuOpen(false); }}>My Profile</button>
           )}
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
