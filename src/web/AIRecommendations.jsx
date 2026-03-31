import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import { supabase } from '../supabase';
import './AIRecommendations.css';

const AIRecommendations = () => {
  const { addToCart } = useCart();
  const { searchQuery } = useSearch();
  const [recs, setRecs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRecs = async () => {
      try {
        const { data, error } = await supabase.from('recommendations').select('*').order('created_at', { ascending: false });
        if (error) throw error;
        // Filter unique names
        const uniqueData = data.reduce((acc, current) => {
          const x = acc.find(item => item.name === current.name);
          if (!x) return acc.concat([current]);
          else return acc;
        }, []);
        setRecs(uniqueData);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchRecs();
  }, []);

  const filteredRecs = recs.filter(r => 
    r.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    r.provider?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || (searchQuery && filteredRecs.length === 0)) return null;

  return (
    <section className="ai-recs" id="recommendations">
      <div className="container">
        <div className="section-header-ai">
           <h3 className="section-title">{searchQuery ? `Top matches for "${searchQuery}"` : 'Recommended for you'}</h3>
           <span className="ai-status">✨ AI Suggestion</span>
        </div>
        <div className="rec-scroll">
          {filteredRecs.map(r => (
            <div key={r.id} className="rec-card glass card-hover flex-column items-center">
               <div className="rec-image-box">
                  <img src={r.image} alt={r.name} />
               </div>
               <div className="rec-details text-center">
                  <div className="rec-badge">✨ Optimized</div>
                  <strong>{r.name}</strong>
                  <span>{r.reason}</span>
                  <button className="book-btn-sm" onClick={() => {
                    addToCart({ id: r.id, name: r.name, price: r.price, provider: r.provider, type: 'service' });
                    toast.success(`${r.name} added to cart! 🛒`);
                  }}>Book Now</button>
               </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default AIRecommendations;
