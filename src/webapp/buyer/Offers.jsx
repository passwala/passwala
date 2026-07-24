import React, { useState } from 'react';
import { ArrowLeft, Gift, ShieldAlert, Sparkles, Copy, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './Offers.css';

const OFFERS_DATA = [
  {
    code: 'FIRST50',
    title: '50% Wallet Cashback',
    description: 'Get 50% cashback up to ₹150 in your Passwala wallet on your first event or sports booking.',
    expiry: 'Expires in 7 days',
    terms: 'Valid on first booking only. Min order value ₹200.'
  },
  {
    code: 'PLAYFREE',
    title: 'Flat ₹100 Off on Sports Venue',
    description: 'Book any synthetic turf or wooden badminton court and get flat ₹100 discount instantly.',
    expiry: 'Valid till end of this month',
    terms: 'Applicable once per user. Active for all venues.'
  },
  {
    code: 'FESTIVAL20',
    title: '20% Off on Live Events',
    description: 'Enjoy 20% off on all live indie concerts and stand-up comedy shows around Ahmedabad.',
    expiry: 'Limited period offer',
    terms: 'Max discount ₹200. Applicable on select shows.'
  }
];

const Offers = () => {
  const navigate = useNavigate();
  const [copiedCode, setCopiedCode] = useState(null);

  const handleCopyCode = (code) => {
    navigator.clipboard.writeText(code);
    setCopiedCode(code);
    toast.success(`Coupon code ${code} copied!`);
    setTimeout(() => setCopiedCode(null), 3000);
  };

  return (
    <div className="offers-root">
      <div className="offers-header">
        <button className="offers-back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h2>Coupons & Offers</h2>
      </div>

      <div className="offers-container">
        {/* Referral Card Banner */}
        <div className="referral-banner">
          <div className="ref-text-col">
            <span className="ref-badge"><Sparkles size={11} /> SHARE & EARN</span>
            <h3>Invite Neighbors & Get ₹100</h3>
            <p>Share Passwala with your society friends. When they make their first booking, both get ₹100 in wallet!</p>
          </div>
          <button className="ref-btn" onClick={() => toast.success('Referral link copied to clipboard!')}>Invite Now</button>
        </div>

        {/* Coupon Card List */}
        <h3 className="section-title">Available Coupons</h3>
        <div className="coupons-grid">
          {OFFERS_DATA.map((offer) => (
            <div key={offer.code} className="coupon-card">
              <div className="coupon-left">
                <div className="gift-icon-wrap">
                  <Gift size={24} color="#ff7622" />
                </div>
              </div>
              <div className="coupon-right">
                <div className="coupon-header-row">
                  <span className="coupon-badge">{offer.title}</span>
                  <button className="copy-code-btn" onClick={() => handleCopyCode(offer.code)}>
                    {copiedCode === offer.code ? (
                      <>
                        <Check size={14} color="#22c55e" />
                        <span>Copied</span>
                      </>
                    ) : (
                      <>
                        <Copy size={14} />
                        <span>Copy Code: <strong>{offer.code}</strong></span>
                      </>
                    )}
                  </button>
                </div>
                <p className="coupon-desc">{offer.description}</p>
                <div className="coupon-footer">
                  <span className="coupon-expiry">{offer.expiry}</span>
                  <span className="coupon-terms" onClick={() => toast(offer.terms, { icon: 'ℹ️' })}>T&C Apply</span>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default Offers;
