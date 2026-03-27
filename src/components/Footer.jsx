import React from 'react';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, ShieldCheck, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Footer.css';

const Footer = () => {
  const currentYear = 2026;

  const handleLinkClick = (name) => {
    toast(`Opening ${name}...`, { icon: '🔗' });
  };

  return (
    <footer className="footer-premium">
      <div className="footer-wave">
        <svg data-name="Layer 1" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 1200 120" preserveAspectRatio="none">
          <path d="M321.39,56.44c58-10.79,114.16-30.13,172-41.86,82.39-16.72,168.19-17.73,250.45-.39C823.78,31,906.67,72,985.66,92.83c70.05,18.48,146.53,26.09,214.34,3V0H0V27.35A600.21,600.21,0,0,0,321.39,56.44Z" className="shape-fill"></path>
        </svg>
      </div>

      <div className="container-wide">
        <div className="footer-main-grid">
          {/* Brand Identity */}
          <div className="footer-section brand-column">
            <div className="footer-logo">
              <div className="logo-box">P</div>
              <div className="logo-name">
                <h3>Passwala</h3>
                <span>Premium Neighborhood Ecosystem</span>
              </div>
            </div>
            <p className="brand-pitch">
              Passwala is Ahmedabad's most trusted community-driven AI platform. We bridge the gap between local verified experts and neighborhood needs with transparency and trust.
            </p>
            <div className="social-links">
              <button className="social-icon" onClick={() => handleLinkClick('Facebook')}><Facebook size={18} /></button>
              <button className="social-icon" onClick={() => handleLinkClick('X')}><Twitter size={18} /></button>
              <button className="social-icon" onClick={() => handleLinkClick('Instagram')}><Instagram size={18} /></button>
              <button className="social-icon" onClick={() => handleLinkClick('LinkedIn')}><Linkedin size={18} /></button>
            </div>
          </div>

          {/* Quick Services */}
          <div className="footer-section">
            <h4>Quick Services</h4>
            <ul className="footer-list">
              <li onClick={() => handleLinkClick('Home Cleaning')}>Home Cleaning</li>
              <li onClick={() => handleLinkClick('AC & Appliances')}>AC & Appliances</li>
              <li onClick={() => handleLinkClick('Electricians')}>Electricians</li>
              <li onClick={() => handleLinkClick('Plumbers')}>Plumbers</li>
              <li onClick={() => handleLinkClick('Painting')}>Painting & Decor</li>
              <li onClick={() => handleLinkClick('Pest Control')}>Pest Control</li>
            </ul>
          </div>

          {/* Company & Legal */}
          <div className="footer-section">
            <h4>Company</h4>
            <ul className="footer-list">
              <li onClick={() => handleLinkClick('About Us')}>About Us</li>
              <li onClick={() => handleLinkClick('Join as Pro')} className="highlight-pro">Become a Partner</li>
              <li onClick={() => handleLinkClick('Careers')}>Careers</li>
              <li onClick={() => handleLinkClick('Terms')}>Terms & Conditions</li>
              <li onClick={() => handleLinkClick('Privacy')}>Privacy Policy</li>
              <li onClick={() => handleLinkClick('Safety')}>Safety & Trust</li>
            </ul>
          </div>

          {/* Contact & Support */}
          <div className="footer-section support-column">
            <h4>Support</h4>
            <div className="contact-info">
              <div className="contact-item">
                <MapPin size={18} className="contact-icon" />
                <span>शिवम Residency, Flat 402, Satellite, Ahmedabad 380015</span>
              </div>
              <div className="contact-item">
                <Phone size={18} className="contact-icon" />
                <span>+91 9999900000</span>
              </div>
              <div className="contact-item">
                <Mail size={18} className="contact-icon" />
                <span>support@passwala.ai</span>
              </div>
            </div>
            <div className="newsletter-box">
              <p>Get neighborly updates</p>
              <div className="newsletter-input">
                <input type="email" placeholder="Your email..." />
                <button onClick={() => toast.success('Subscribed to Passwala!')}>Join</button>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-divider"></div>

        <div className="footer-legal">
          <div className="legal-left">
            <p>&copy; {currentYear} Passwala Inc. All rights reserved.</p>
            <div className="trust-badges">
              <span className="badge"><ShieldCheck size={14} /> PCI Verified</span>
              <span className="badge"><Heart size={14} fill="#ff4d4d" color="#ff4d4d" /> Made in India</span>
            </div>
          </div>
          <div className="legal-right">
             <div className="app-download-links">
                <img src="https://upload.wikimedia.org/wikipedia/commons/7/78/Google_Play_Store_badge_EN.svg" alt="Play Store" className="store-img" />
                <img src="https://upload.wikimedia.org/wikipedia/commons/3/3c/Download_on_the_App_Store_Badge.svg" alt="App Store" className="store-img" />
             </div>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
