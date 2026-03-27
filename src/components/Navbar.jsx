import React, { useState, useEffect } from 'react';
import { MapPin, Search, ShoppingBag, User, Bell, Sun, Moon, LogOut, Gift, Star, Bot } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import NotificationPanel from './NotificationPanel';
import './Navbar.css';

const Navbar = ({ isAuthenticated, user, onLogout, onOpenProfile, onOpenAI }) => {
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
    <nav className={`navbar ${scrolled ? 'navbar-scrolled' : ''} ${mobileMenuOpen ? 'mobile-nav-open' : ''} glass`}>
      <div className="container-wide nav-content">
        {/* Left: Brand */}
        <div className="nav-left">
          <div className="brand-logo" onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}>
            <div className="logo-icon">P</div>
            <div className="logo-text desk-only">
              <div className="logo-text-main">Passwala<span style={{ color: '#FF7622', fontSize: '0.8rem', verticalAlign: 'top' }}>SMART</span></div>
              <div className="tagline">Local Economy</div>
            </div>
          </div>
        </div>

        {/* Center/Mobile Overlay */}
        <div className={`nav-center ${mobileMenuOpen ? 'nav-center-mobile' : ''}`}>
          <div className="nav-links">
             <a href="#services" onClick={(e) => {
               e.preventDefault();
               setMobileMenuOpen(false);
               document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
             }}>Services</a>
             <a href="#deals" onClick={(e) => {
               e.preventDefault();
               setMobileMenuOpen(false);
               document.getElementById('deals')?.scrollIntoView({ behavior: 'smooth' });
             }}><Gift size={14} /> Rewards</a>
             {!isAuthenticated && <a href="#pro" className="pro-link" onClick={() => toast('Coming soon')}>Become a Pro</a>}
          </div>
          
          <div className="search-bar main-search">
            <Search size={18} className="search-icon" />
            <input 
              type="search" 
              placeholder="Search plumber, milk, electrician..." 
              value={searchValue}
              onChange={(e) => setSearchValue(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            {searchValue && (
               <button className="search-clear-btn" onClick={() => setSearchValue('')}>×</button>
            )}
            <button className="search-cta" onClick={handleSearchAction}>Go</button>
          </div>
        </div>

        {/* Right: Actions */}
        <div className="nav-right">
          <div className="nav-tools">
            <div className="desk-only"><NotificationPanel /></div>
            <button className="nav-icon-btn desk-only" onClick={onOpenAI}>
              <Bot size={20} />
            </button>
            <button className="nav-icon-btn cart-nav-btn" onClick={() => { setMobileMenuOpen(false); setCartOpen(true); }}>
              <ShoppingBag size={20} />
              {totalItems > 0 && <span className="cart-nav-badge">{totalItems}</span>}
            </button>
            
            {/* Mobile Toggle - Only visible via CSS media query */}
            <button className="mobile-toggle-btn" onClick={() => setMobileMenuOpen(!mobileMenuOpen)}>
              {mobileMenuOpen ? <X size={24} /> : <Search size={24} />}
            </button>
          </div>
          
          <div className="profile-group-nav desk-only">
             {isAuthenticated ? (
               <div className="profile-logged-in">
                 <button className="profile-btn-premium avatar-only-btn" onClick={onOpenProfile} title="View Profile Detail">
                   <div className="profile-avatar-mini">
                     {user?.photoURL
                       ? <img src={user.photoURL} alt="avatar" style={{ width: 36, height: 36, borderRadius: '50%', objectFit: 'cover' }} referrerPolicy="no-referrer" />
                       : <span style={{ fontWeight: 900, fontSize: 16 }}>{(user?.displayName || user?.email || 'U')[0].toUpperCase()}</span>
                     }
                   </div>
                 </button>
                 <button className="nav-icon-btn logout-accent-btn" onClick={onLogout} title="Sign Out">
                    <LogOut size={18} />
                 </button>
               </div>
             ) : (
               <button className="signin-btn-main" onClick={() => window.location.reload()}>
                  Get Started
               </button>
             )}
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
