/* eslint-disable */
import React, { useState, useEffect } from 'react';
import { Search, Sparkles, ArrowRight, ShieldCheck, TrendingUp } from 'lucide-react';
import { useSearch } from '../context/SearchContext';
import { supabase } from '../supabase';
import './Hero.css';

const Hero = () => {
  const { updateSearch } = useSearch();
  const [heroSearch, setHeroSearch] = useState('');
  const [counts, setCounts] = useState({ users: '5k+', partners: '150+' });

  useEffect(() => {
    const fetchCounts = async () => {
      try {
        if (!supabase) return;
        const { count: uCount } = await supabase.from('users').select('*', { count: 'exact', head: true });
        const { count: pCount } = await supabase.from('vendors').select('*', { count: 'exact', head: true });
        if (uCount) setCounts(prev => ({ ...prev, users: `${uCount}+` }));
        if (pCount) setCounts(prev => ({ ...prev, partners: `${pCount}+` }));
      } catch (err) {}
    };
    fetchCounts();
  }, []);

  const handleSearch = (e) => {
    e.preventDefault();
    updateSearch(heroSearch);
    document.getElementById('services')?.scrollIntoView({ behavior: 'smooth' });
  };

  return (
    <section className="hero">
      <div className="container hero-container animate-fade-in">
        <div className="hero-content">
          <div className="hero-badge">
            <Sparkles size={16} />
            <span>#1 Neighborhood App in Ahmedabad</span>
          </div>
          
          <h1 className="hero-title">
            Your Neighborhood, <br />
            <span>Powered by Trust.</span>
          </h1>
          
          <p className="hero-desc">
            Discover verified services, daily essentials, and exclusive community tenders in Satellite and surrounding areas.
          </p>

          <form className="hero-search-box" onSubmit={handleSearch}>
            <Search size={20} color="var(--text-muted)" />
            <input 
              type="text" 
              placeholder="What are you looking for today?"
              value={heroSearch}
              onChange={(e) => setHeroSearch(e.target.value)}
            />
            <button type="submit" className="btn btn-primary">
              Search
            </button>
          </form>

          <div className="hero-stats">
            <div className="stat-item">
              <span className="stat-num">{counts.users}</span>
              <span className="stat-label">Happy Neighbors</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">{counts.partners}</span>
              <span className="stat-label">Verified Partners</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">24/7</span>
              <span className="stat-label">Local Support</span>
            </div>
          </div>
        </div>

        <div className="hero-image">
          <div className="hero-img-container">
            <img src="https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&q=80&w=800" alt="Local Community" />
          </div>
          {/* Floating tags */}
          <div style={{ position: 'absolute', top: '20%', right: '-20px', background: 'white', padding: '12px', borderRadius: '12px', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
            <ShieldCheck color="#10b981" />
            <span style={{ fontWeight: 600, fontSize: '14px' }}>Verified Pros</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
