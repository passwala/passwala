import React from 'react';
import './Navbar.css';

const Navbar = ({ isAuthenticated, user, _onLogout, onOpenProfile, _onOpenAI, _onJoin }) => {
  const [isMenuOpen, setIsMenuOpen] = React.useState(false);
  const [scrolled, setScrolled] = React.useState(false);

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
          {/* Tabs removed as per request */}
        </div>

        {/* Right: Actions */}
        <div className="nav-right">
          {isAuthenticated && (
            <div className="user-profile-pill" onClick={onOpenProfile}>
               {user?.photoURL ? (
                 <img src={user.photoURL} alt="Profile" className="user-avatar-img" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover' }} />
               ) : (
                 <div className="user-avatar">{user?.displayName?.charAt(0) || user?.full_name?.charAt(0) || 'U'}</div>
               )}
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
