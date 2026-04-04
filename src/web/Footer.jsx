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
