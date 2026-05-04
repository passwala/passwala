/* eslint-disable */
import { Link } from 'react-router-dom';
import { Facebook, Twitter, Instagram, Linkedin, Mail, Phone, MapPin, ShieldCheck, Heart } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './Footer.css';

const Footer = () => {
  const currentYear = 2026;

  const handleLinkClick = (name) => {
    toast(`Opening ${name}...`, { icon: '🔗' });
  };

  return (
    <footer className="footer-v2">
      <div className="container-wide">
        <div className="footer-top-grid">
          {/* Brand Info */}
          <div className="footer-col brand-col">
            <div className="footer-brand-header">
              <div className="footer-logo-box">P</div>
              <h3>Passwala</h3>
            </div>
            <p className="footer-brand-desc">
              Ahmedabad's leading community marketplace for verified services, daily essentials, and local tenders.
            </p>
            <div className="footer-socials-v2">
              <Facebook size={18} />
              <Twitter size={18} />
              <Instagram size={18} />
              <Linkedin size={18} />
            </div>
            
            <div className="footer-app-downloads">
              <button className="footer-download-btn" onClick={() => toast('Redirecting to App Store...', { icon: '🍎' })}>
                <svg viewBox="0 0 384 512" width="20" height="20" fill="currentColor"><path d="M318.7 268.7c-.2-36.7 16.4-64.4 50-84.8-18.8-26.9-47.2-41.7-84.7-44.6-35.5-2.8-74.3 20.7-88.5 20.7-15 0-49.4-19.7-76.4-19.7C63.3 141.2 4 184.8 4 273.5q0 39.3 14.4 81.2c12.8 36.7 59 126.7 107.2 125.2 25.2-.6 43-17.9 75.8-17.9 31.8 0 48.3 17.9 76.4 17.9 48.6-.7 90.4-82.5 102.6-119.3-65.2-30.7-61.7-90-61.7-91.9zm-56.6-164.2c27.3-32.4 24.8-61.9 24-72.5-24.1 1.4-52 16.4-67.9 34.9-17.5 19.8-27.8 44.3-25.6 71.9 26.1 2 49.9-11.4 69.5-34.3z"/></svg>
                <div className="btn-text">
                  <span className="small-text">Download on the</span>
                  <span className="big-text">App Store</span>
                </div>
              </button>
              <button className="footer-download-btn" onClick={() => toast('Redirecting to Google Play...', { icon: '▶️' })}>
                <svg viewBox="0 0 512 512" width="20" height="20" fill="currentColor"><path d="M325.3 234.3L104.6 13l280.8 161.2-60.1 60.1zM47 0C34 6.8 25.3 19.2 25.3 35.3v441.3c0 16.1 8.7 28.5 21.7 35.3l256.6-256L47 0zm425.2 225.6l-58.9-34.1-65.7 64.5 65.7 64.5 60.1-34.1c18-14.3 18-46.5-1.2-60.8zM104.6 499l280.8-161.2-60.1-60.1L104.6 499z"/></svg>
                <div className="btn-text">
                  <span className="small-text">GET IT ON</span>
                  <span className="big-text">Google Play</span>
                </div>
              </button>
            </div>
          </div>

          {/* Quick Links */}
          <div className="footer-col">
            <h4>Platform</h4>
            <ul className="footer-links-list">
              <li><Link to="/track-orders">Auctions & Tenders</Link></li>
              <li><Link to="/expert-services">Verified Services</Link></li>
              <li><Link to="/near-shops">Daily Essentials</Link></li>
              <li><Link to="/neighbors">Community Hub</Link></li>
              <li><Link to="/vendor">Vendor Portal</Link></li>
              <li><Link to="/admin">Admin Portal</Link></li>
            </ul>
          </div>

          {/* Company */}
          <div className="footer-col">
            <h4>Company</h4>
            <ul className="footer-links-list">
              <li>About Us</li>
              <li>Contact Support</li>
              <li>Privacy Policy</li>
              <li>Terms of Service</li>
              <li>Security & Trust</li>
            </ul>
          </div>

          {/* Support/Bank Details style from Trademax */}
          <div className="footer-col support-col">
            <h4>Registered Address</h4>
            <div className="footer-address-box">
              <p>Passwala Technologies Pvt Ltd.</p>
              <p>Shivam Residency, Flat 402,</p>
              <p>Satellite, Ahmedabad 380015</p>
              <div className="footer-contact-pills">
                <span className="contact-pill"><Phone size={14} /> +91 999 888 7777</span>
                <span className="contact-pill"><Mail size={14} /> support@passwala.ai</span>
              </div>
            </div>
          </div>
        </div>

        <div className="footer-bottom-v2">
          <div className="copyright-info">
            <p>&copy; {currentYear} Passwala. Built with ❤️ in Ahmedabad.</p>
          </div>
          <div className="trust-logos">
             <ShieldCheck size={16} />
             <span>PCI-DSS Compliant</span>
             <div className="divider-v"></div>
             <span>ISO 27001 Certified</span>
          </div>
        </div>
      </div>
    </footer>
  );
};

export default Footer;
