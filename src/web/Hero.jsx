import React from 'react';
import { ShoppingBag, Ticket, Car, Navigation, DollarSign, Clock, ShieldCheck, MapPin } from 'lucide-react';
import './Hero.css';

const Hero = () => {
  const buyerAppUrl = `http://${window.location.hostname}:3001`;
  const riderAppUrl = `http://${window.location.hostname}:3003`;

  return (
    <section className="hero">
      <div className="hero-split-container animate-fade-in">
        
        {/* Buyer Side */}
        <div className="hero-half buyer-half">
          <div className="hero-content">
            <div className="hero-badge buyer-badge">
              <ShoppingBag size={16} />
              <span>For Buyers & Users</span>
            </div>
            
            <h1 className="hero-title">
              Your City,<br />
              <span>At Your Fingertips.</span>
            </h1>
            
            <p className="hero-desc">
              Book City Rides, buy tickets for local events, shop from neighborhood stores, and hire verified experts all from one app.
            </p>

            <div className="feature-grid">
              <div className="feature-item"><Car size={20}/> <span>City Rides</span></div>
              <div className="feature-item"><Ticket size={20}/> <span>Event Tickets</span></div>
              <div className="feature-item"><ShoppingBag size={20}/> <span>Local Shops</span></div>
              <div className="feature-item"><ShieldCheck size={20}/> <span>Verified Pros</span></div>
            </div>

            <button 
              className="btn btn-buyer" 
              onClick={() => window.open(buyerAppUrl, '_self')}
            >
              Open Buyer App
            </button>
          </div>
        </div>

        {/* Divider */}
        <div className="hero-divider">
          <div className="divider-line"></div>
          <span className="divider-text">OR</span>
          <div className="divider-line"></div>
        </div>

        {/* Rider Side */}
        <div className="hero-half rider-half">
          <div className="hero-content">
            <div className="hero-badge rider-badge">
              <Navigation size={16} />
              <span>For Riders & Drivers</span>
            </div>
            
            <h1 className="hero-title">
              Drive, Deliver,<br />
              <span>Earn on Your Terms.</span>
            </h1>
            
            <p className="hero-desc">
              Join Passwala's fleet! Drive passengers across Ahmedabad or deliver essential goods. Flexible hours, instant payouts.
            </p>

            <div className="feature-grid">
              <div className="feature-item"><DollarSign size={20}/> <span>Great Earnings</span></div>
              <div className="feature-item"><Clock size={20}/> <span>Flexible Hours</span></div>
              <div className="feature-item"><MapPin size={20}/> <span>Local Routes</span></div>
              <div className="feature-item"><Navigation size={20}/> <span>Smart GPS</span></div>
            </div>

            <button 
              className="btn btn-rider" 
              onClick={() => window.open(riderAppUrl, '_self')}
            >
              Open Rider App
            </button>
          </div>
        </div>

      </div>
    </section>
  );
};

export default Hero;
