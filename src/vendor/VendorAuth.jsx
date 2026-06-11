import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import './VendorAuth.css';

const VendorAuth = ({ onLogin }) => {
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(false);
  const [focused, setFocused] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const clean = phone.replace(/\D/g, '');
    if (clean.length !== 10) { toast.error('Enter a valid 10-digit number'); return; }
    setLoading(true);
    toast.success('Welcome to Passwala Partner!');
    onLogin(clean, { name: 'Vendor Partner' });
  };

  const isValid = phone.length === 10;

  return (
    <div className="va-page">

      {/* ── DESKTOP LEFT ASIDE ── */}
      <aside className="va-aside">
        <div className="va-aside-glow1" />
        <div className="va-aside-glow2" />
        <div className="va-aside-dots" />

        <div className="va-aside-brand">
          <div className="va-aside-logo">
            <img src="/logo.png" alt="" width={22} height={22} style={{objectFit:'contain'}} />
          </div>
          <div>
            <p className="va-aside-bname">Passwala</p>
            <p className="va-aside-btag">Partner Portal</p>
          </div>
        </div>

        <div className="va-aside-hero">
          <div className="va-aside-chip">● For Vendors &amp; Experts</div>
          <h1 className="va-aside-h1">
            Run your store.<br/>
            <span className="va-aside-orange">Grow faster.</span>
          </h1>
          <p className="va-aside-desc">Manage products, track orders, receive instant payouts and reach thousands of nearby customers.</p>
        </div>

        <div className="va-aside-pills">
          {['📦 Inventory management','📊 Sales analytics','💸 Instant payouts','🛵 Live delivery tracking'].map(t => (
            <div key={t} className="va-aside-pill">{t}</div>
          ))}
          <p className="va-aside-copy">© 2026 Passwala Technologies</p>
        </div>
      </aside>

      {/* ── MOBILE DARK HEADER ── */}
      <div className="va-mob-header">
        <div className="va-mob-glow1" /><div className="va-mob-glow2" />
        <div className="va-mob-brand">
          <div className="va-mob-logo">
            <img src="/logo.png" alt="" width={24} height={24} style={{objectFit:'contain'}} />
          </div>
          <span className="va-mob-bname">Passwala Partner</span>
        </div>
        <div className="va-mob-headline">
          <p className="va-mob-tagline">For Vendors &amp; Experts</p>
          <h2 className="va-mob-title">Run your store. <span className="va-mob-orange">Grow faster.</span></h2>
        </div>
      </div>

      {/* ── FORM CARD ── */}
      <div className="va-form-card">

        {/* Desktop heading only */}
        <div className="va-desk-head">
          <div className="va-desk-logo">
            <img src="/logo.png" alt="" width={28} height={28} style={{objectFit:'contain'}} />
          </div>
          <h2 className="va-desk-title">Sign in to Partner Portal</h2>
          <p className="va-desk-sub">Enter your mobile number to continue</p>
        </div>

        {/* Mobile heading */}
        <h3 className="va-mob-form-title">Sign in</h3>
        <p className="va-mob-form-sub">Enter your 10-digit mobile number</p>

        <label className="va-label">Mobile Number</label>
        <form onSubmit={handleSubmit} className="va-form">
          <div className={`va-field${focused?' va-f':''}${isValid?' va-ok':''}`}>
            <span className="va-flag">🇮🇳</span>
            <span className="va-code">+91</span>
            <input
              className="va-inp"
              type="tel" placeholder="Enter 10-digit number"
              maxLength={10} value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g,''))}
              onFocus={() => setFocused(true)}
              onBlur={() => setFocused(false)}
              autoFocus
            />
            {isValid && <span className="va-tick">✓</span>}
          </div>
          <button className={`va-btn${isValid?' va-btn-on':''}`} type="submit" disabled={!isValid||loading}>
            {loading ? <><span className="loader-ring"/>Signing in…</> : <>Continue <span className="va-arr">→</span></>}
          </button>
        </form>

        <div className="va-feats">
          {[['📦','Products'],['📊','Analytics'],['💸','Payouts'],['🛵','Delivery']].map(([i,t])=>(
            <div key={t} className="va-feat"><span>{i}</span><span className="va-feat-t">{t}</span></div>
          ))}
        </div>

        <p className="va-terms">By continuing you agree to our <span className="va-lnk">Terms</span> &amp; <span className="va-lnk">Privacy Policy</span></p>
      </div>
    </div>
  );
};

export default VendorAuth;
