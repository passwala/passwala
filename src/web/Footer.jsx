/* eslint-disable */
import React from 'react';
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin } from 'lucide-react';
import './Footer.css';

const Footer = () => {
  const currentYear = 2026;

  return (
    <footer className="footer-v2">
      <div className="container-wide">
        <div className="footer-top-grid">
          {/* Brand Info */}
          <div className="footer-col brand-col">
            <div className="footer-brand-header">
              <img src="/logo.png" alt="Logo" className="footer-logo-box" />
              <h3>Passwala_</h3>
            </div>
            <p className="footer-brand-desc">
              Your Neighborhood, Powered by AI. Frontier services in your hands.
            </p>
            <div className="footer-socials-v2">
              <Facebook size={18} />
              <Twitter size={18} />
              <Instagram size={18} />
              <Linkedin size={18} />
            </div>
          </div>

          {/* Why Passwala */}
          <div className="footer-col">
            <h4>Why Passwala</h4>
            <ul className="footer-links-list">
              <li>Values</li>
              <li>Safety</li>
              <li>Deployment</li>
              <li>Trust & Verification</li>
            </ul>
          </div>

          {/* Explore */}
          <div className="footer-col">
            <h4>Explore</h4>
            <ul className="footer-links-list">
              <li><Link to="/expert-services">Local Experts</Link></li>
              <li><Link to="/near-shops">Near Shops</Link></li>
              <li><Link to="/neighbors">Community</Link></li>
              <li><Link to="/track-orders">Tenders</Link></li>
            </ul>
          </div>

          {/* Build */}
          <div className="footer-col">
            <h4>Partner</h4>
            <ul className="footer-links-list">
              <li><Link to="/vendor">Vendor Portal</Link></li>
              <li><a href={`http://${window.location.hostname}:3005`} target="_blank" rel="noopener noreferrer">Admin Portal</a></li>
              <li>Documentation</li>
              <li>Pricing</li>
              <li>Support</li>
            </ul>
          </div>

          {/* Legal */}
          <div className="footer-col">
            <h4>Legal</h4>
            <ul className="footer-links-list">
              <li><Link to="/terms">Terms of Service</Link></li>
              <li><Link to="/privacy-policy">Privacy Policy</Link></li>
              <li><Link to="/data-deletion">Data Safety & Deletion</Link></li>
              <li><Link to="/policies">All Policies</Link></li>
            </ul>
          </div>
        </div>

        <div className="footer-bottom-v2">
          <p>&copy; {currentYear} Passwala. Built with ❤️ in Ahmedabad.</p>
          <div style={{ display: 'flex', gap: '24px' }}>
             <span>English (US)</span>
             <span>Status</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
