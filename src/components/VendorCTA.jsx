import React from 'react';
import { toast } from 'react-hot-toast';
import { ArrowRight, CheckCircle } from 'lucide-react';
import VendorRegistrationModal from './VendorRegistrationModal';
import './VendorCTA.css';

const VendorCTA = () => {
  const [selectedPlan, setSelectedPlan] = React.useState('Growth');
  const [isModalOpen, setIsModalOpen] = React.useState(false);

  const plans = [
    { name: 'Starter', price: '₹499/mo' },
    { name: 'Growth', price: '₹999/mo' },
    { name: 'Pro', price: '₹1999/mo' }
  ];

  return (
    <section id="pro" className="vendor-cta glass-bg">
      <div className="container vendor-container">
        <div className="cta-box glass card-hover flex-row animate-fade-in">
          <div className="cta-content">
            <span className="premium-label">For Business Owners</span>
            <h3 className="cta-title">Are you a <span className="highlight-text">Local Hero?</span></h3>
            <p>Grow your neighborhood business with Passwala Premium. Get prioritized, build trust, and reach more families.</p>
            <ul className="cta-benefits">
              <li><CheckCircle size={14} className="icon-green" /> Top Search Ranking</li>
              <li><CheckCircle size={14} className="icon-green" /> Targeted Community Ads</li>
              <li><CheckCircle size={14} className="icon-green" /> Commission: 10–20% per service</li>
            </ul>
            <div className="subscription-pricing">
              <span className="pricing-label">Choose your plan</span>
              <div className="tiers-box">
                {plans.map((plan) => (
                  <div 
                    key={plan.name}
                    className={`tier ${selectedPlan === plan.name ? 'featured active' : ''}`}
                    onClick={() => setSelectedPlan(plan.name)}
                  >
                    <span className="tier-price">{plan.price}</span>
                    <span className="tier-name">{plan.name}</span>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="passwala-advantage">
               <strong>Why Passwala?</strong>
               <p>Unlike Nextdoor or Urban Company, we combine <strong>Community + AI + Essentials</strong> under one trusted local brand.</p>
            </div>
            <button className="cta-button" onClick={() => setIsModalOpen(true)}>Register as {selectedPlan} Vendor <ArrowRight size={18} /></button>
          </div>
          <div className="cta-visual animate-slide-in">
             <div className="gradient-circle"></div>
             <div className="community-preview">
                <strong>Community Trust Score</strong>
                <div className="score">4.9/5</div>
                <div className="growth">+25% more bookings</div>
             </div>
          </div>
        </div>
      </div>
      
      {isModalOpen && (
        <VendorRegistrationModal 
          plan={selectedPlan} 
          onClose={() => setIsModalOpen(false)} 
        />
      )}
    </section>
  );
};

export default VendorCTA;
