import React, { useState, useEffect } from 'react';
import { Tag } from 'lucide-react';
import { toast } from 'react-hot-toast';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import { supabase } from '../supabase';
import { MOCK_DEALS } from '../data/mockData';
import './NearbyDeals.css';

const NearbyDeals = () => {
  const { addToCart } = useCart();
  const { searchQuery } = useSearch();
  const [deals, setDeals] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchDeals = async () => {
      try {
        const { data, error } = await supabase.from('deals').select('*').order('created_at', { ascending: false });
        
        if (error || !data || data.length === 0) {
          console.warn('Supabase fetch failed or returned empty, using mock data for deals.');
          setDeals(MOCK_DEALS);
        } else {
          // Filter unique names
          const uniqueData = data.reduce((acc, current) => {
            const x = acc.find(item => item.name === current.name);
            if (!x) return acc.concat([current]);
            else return acc;
          }, []);
          setDeals(uniqueData);
        }
      } catch (err) {
        console.error('Fetch deals error:', err);
        setDeals(MOCK_DEALS);
      } finally {
        setLoading(false);
      }
    };
    fetchDeals();
  }, []);

  const filteredDeals = deals.filter(d => 
    d.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    d.store?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading || (searchQuery && filteredDeals.length === 0)) return null;

  return (
    <section className="nearby-deals" id="deals">
      <div className="container">
        <h3 className="section-title">{searchQuery ? `Deals for "${searchQuery}"` : 'Nearby Deals'}</h3>
        <div className="deals-grid">
          {filteredDeals.map(deal => (
            <div 
              key={deal.id} 
              className="deal-card glass card-hover-orange" 
              onClick={() => toast(`Viewing details for ${deal.name} from ${deal.store}`)}
            >
              <div className="offer-tag"><Tag size={12} /> {deal.offer}</div>
              <div className="deal-content">
                <strong>{deal.name}</strong>
                <span>{deal.store}</span>
              </div>
              <button 
                className="claim-btn" 
                onClick={(e) => { 
                  e.stopPropagation(); 
                  addToCart({ id: deal.id, name: `${deal.name} (${deal.offer})`, price: deal.price, provider: deal.store, type: 'essential' });
                  toast.success(`${deal.name} deal added to cart! 🛒`);
                }}
              >
                Claim Deal
              </button>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default NearbyDeals;
