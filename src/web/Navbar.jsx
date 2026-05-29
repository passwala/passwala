import React from 'react';
import './Navbar.css';

const Navbar = () => {
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
      <div className="container nav-content" style={{ justifyContent: 'center' }}>
        {/* Center: Brand */}
        <div className="nav-left" style={{ margin: '0 auto' }}>
          <div className="logo-wrapper">
             <img src="/logo.png" alt="Passwala Logo" className="navbar-main-logo" />
             <span className="logo-text-main">Passwala</span>
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
