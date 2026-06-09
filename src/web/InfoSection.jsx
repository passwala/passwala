import React from 'react';
import { Search, CreditCard, Smile, UserPlus, Map, IndianRupee, CalendarCheck, ShieldCheck } from 'lucide-react';
import './InfoSection.css';

const InfoSection = () => {
  return (
    <section className="info-section">
      <div className="info-container">
        
        {/* Buyer Section */}
        <div className="info-block buyer-block animate-fade-up">
          <div className="info-header">
            <h2>Everything You Need, <span className="highlight-buyer">Delivered</span></h2>
            <p>From getting across the city to booking premium event tickets, the Passwala Buyer App is your all-in-one local companion.</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon buyer-icon"><Search size={28} /></div>
              <h3>1. Discover</h3>
              <p>Find local rides, exclusive community events, and neighborhood shops instantly.</p>
            </div>
            <div className="step-card">
              <div className="step-icon buyer-icon"><CalendarCheck size={28} /></div>
              <h3>2. Book & Buy</h3>
              <p>Book your cab or purchase your digital QR-code event tickets securely.</p>
            </div>
            <div className="step-card">
              <div className="step-icon buyer-icon"><Smile size={28} /></div>
              <h3>3. Enjoy</h3>
              <p>Experience fast pickups and skip the lines at your favorite local events!</p>
            </div>
          </div>
        </div>

        {/* Rider Section */}
        <div className="info-block rider-block animate-fade-up" style={{ animationDelay: '0.2s' }}>
          <div className="info-header">
            <h2>Turn Your Miles into <span className="highlight-rider">Money</span></h2>
            <p>Whether you have a bike, rickshaw, or mini-bus, you can join Passwala's fleet and start earning on your own schedule.</p>
          </div>
          
          <div className="steps-grid">
            <div className="step-card">
              <div className="step-icon rider-icon"><UserPlus size={28} /></div>
              <h3>1. Register</h3>
              <p>Sign up quickly with your vehicle details and get verified by our team.</p>
            </div>
            <div className="step-card">
              <div className="step-icon rider-icon"><Map size={28} /></div>
              <h3>2. Drive or Deliver</h3>
              <p>Accept city ride requests or deliver neighborhood packages using our smart GPS.</p>
            </div>
            <div className="step-card">
              <div className="step-icon rider-icon"><IndianRupee size={28} /></div>
              <h3>3. Get Paid Fast</h3>
              <p>Enjoy transparent earnings with low commissions and instant digital payouts.</p>
            </div>
          </div>
        </div>

        {/* Security / Trust Section */}
        <div className="trust-banner animate-fade-up" style={{ animationDelay: '0.4s' }}>
          <ShieldCheck size={40} className="trust-icon" />
          <div className="trust-text">
            <h3>100% Secure & Verified Community</h3>
            <p>All drivers, vendors, and experts on Passwala undergo strict verification to ensure a safe environment for everyone in Ahmedabad.</p>
          </div>
        </div>

      </div>
    </section>
  );
};

export default InfoSection;
