import React, { useState, useEffect } from 'react';
import { MapPin, Search, ShoppingBag, User, Bell, Sun, Moon, LogOut, Gift, Star, Bot } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import NotificationPanel from '../webapp/NotificationPanel';
import './Navbar.css';

const Navbar = ({ isAuthenticated, user, onLogout, onOpenProfile, onOpenAI, onJoin }) => {
  const [searchValue, setSearchValue] = useState('');
  const [scrolled, setScrolled] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { totalItems, setCartOpen } = useCart();
  const { updateSearch } = useSearch();

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 20);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Sync global search with local input dynamically
  useEffect(() => {
    updateSearch(searchValue);
  }, [searchValue]);

  const handleLogoClick = () => {
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleSearchAction = () => {
    if (searchValue.trim() !== '') {
      toast.success(`Searching neighborhood for "${searchValue}"...`, { icon: '🔍' });
      updateSearch(searchValue);
    } else {
      updateSearch(''); // Reset search if empty
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSearchAction();
  };

  return (
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''} glass`}>
      <div className="container-wide nav-content">
        {/* Left: Brand */}
        <div className="nav-left">
          <div className="brand-logo" onClick={handleLogoClick}>
            <div className="logo-wrapper">
              <img src="/logo.png" alt="Passwala Logo" className="navbar-main-logo" />
            </div>
            <div className="logo-text">
              <div className="logo-text-main">Passwala</div>
              <div className="tagline">SMART ECONOMY</div>
            </div>
          </div>
        </div>

        {/* Center: Navigation Links */}
        <div className="nav-center-v2">
          <div className="nav-links-v2">
             <a href="#services" className="nav-pill-link">Services</a>
             <a href="#deals" className="nav-pill-link">Deals</a>
             <a href="#community" className="nav-pill-link">Community</a>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="nav-right">
          <div className="nav-tools">
            <a href="http://localhost:3002" target="_blank" rel="noreferrer" className="vendor-cta-btn">
              Partner with Us
            </a>
            <button className="nav-icon-btn highlight-hover" onClick={onOpenAI} title="AI Assistant">
              <Bot size={20} />
            </button>
            <button className="nav-icon-btn cart-nav-btn" onClick={() => setCartOpen(true)}>
              <ShoppingBag size={20} />
              {totalItems > 0 && <span className="cart-nav-badge">{totalItems}</span>}
            </button>
            
            {isAuthenticated ? (
              <div className="profile-logged-in">
                <button className="profile-avatar-btn" onClick={onOpenProfile}>
                  <div className="profile-avatar-mini">
                    {user?.photoURL
                      ? <img src={user.photoURL} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                      : <span style={{ fontWeight: 800 }}>{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</span>
                    }
                  </div>
                </button>
                <button className="logout-pill-btn" onClick={onLogout}>
                   <LogOut size={16} />
                   <span>Sign Out</span>
                </button>
              </div>
            ) : (
              <button className="join-free-btn" onClick={onJoin}>
                Join free
              </button>
            )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
