import React, { useState } from 'react';
import { toast } from 'react-hot-toast';
import { Search, MapPin, TrendingUp, Sparkles, ShieldCheck, CheckCircle2 } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import './Hero.css';

const Hero = () => {
  const { addToCart } = useCart();
  const { updateSearch } = useSearch();
  const [heroSearch, setHeroSearch] = useState('');

  const handleHeroSearch = (e) => {
    e.preventDefault();
    if (heroSearch.trim()) {
      updateSearch(heroSearch);
      toast.success(`Locating ${heroSearch}...`, { icon: '🔍' });
      const servicesEl = document.getElementById('services');
      if (servicesEl) servicesEl.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <section className="hero">
      <div className="container hero-grid">
        <div className="hero-content animate-fade-in">
          <div className="hero-badge-container">
            <span className="badge-ai"><Sparkles size={12} /> Neighborhood Trust</span>
            <span className="badge-location"><MapPin size={12} /> Live in Satellite, Ahmedabad</span>
          </div>
          
          <h2 className="hero-title">
            Your Neighborhood <br />
            <span className="gradient-text">At Your Fingertips.</span>
          </h2>
          
          <p className="hero-description">
            Experience the future of local commerce. Verified experts, daily essentials, and exclusive community rewards—all in one place.
          </p>

          <form className="hero-search-box glass" onSubmit={handleHeroSearch}>
             <Search size={22} className="search-icon-hero" />
             <input 
               type="text" 
               placeholder="Need help today? Search for anything..."
               value={heroSearch}
               onChange={(e) => setHeroSearch(e.target.value)}
             />
             <button type="submit" className="hero-search-btn">Find Now</button>
          </form>

          <div className="hero-benefits">
             <div className="benefit-item">
                <CheckCircle2 size={18} />
                <span>100% Background Verified</span>
             </div>
             <div className="benefit-item">
                <CheckCircle2 size={18} />
                <span>Zero Hidden Commissions</span>
             </div>
             <div className="benefit-item">
                <CheckCircle2 size={18} />
                <span>Trusted by 500+ Neighbors</span>
             </div>
          </div>
        </div>
        
        <div className="hero-visual">
          <div className="hero-main-container glass shadow-2xl">
             <img src="/hero_main.png" alt="Passwala Services" className="hero-proper-img" />
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
