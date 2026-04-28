import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Star, Shield, TrendingUp, MapPin, Users } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import { supabase } from '../supabase';
import { MOCK_SERVICES } from '../data/mockData';
import './Services.css';

const Services = () => {
  const { addToCart } = useCart();
  const { searchQuery } = useSearch();
  const [services, setServices] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchServices = async () => {
      try {
        const { data, error } = await supabase.from('services').select('*').order('created_at', { ascending: false });
        
        if (error || !data || data.length === 0) {
          console.warn('Supabase fetch failed or returned empty, using mock data.');
          setServices(MOCK_SERVICES);
        } else {
          // Filter unique by name
          const uniqueData = data.reduce((acc, current) => {
            const x = acc.find(item => item.name === current.name);
            if (!x) return acc.concat([current]);
            else return acc;
          }, []);
          setServices(uniqueData);
        }
      } catch (err) {
        console.error('Fetch error:', err);
        setServices(MOCK_SERVICES);
      } finally {
        setLoading(false);
      }
    };
    fetchServices();
  }, []);

  const filteredServices = services.filter(s => 
    s.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    s.provider?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return (
    <section className="services" id="services">
      <div className="container text-center">
        <p className="pulse">Syncing neighborhood experts in Satellite...</p>
      </div>
    </section>
  );

  if (searchQuery && filteredServices.length === 0) return null;

  return (
    <section className="services" id="services">
      <div className="container">
        <div className="section-header">
          <h3 className="section-title">{searchQuery ? `Results for "${searchQuery}"` : 'Trending in'} <span className="highlight">Satellite</span></h3>
          <p>{searchQuery ? `Found ${filteredServices.length} matching services.` : 'Based on your neighborhood activity in Ahmedabad.'}</p>
        </div>
        
        <div className="services-grid">
          {filteredServices.map(service => (
            <div key={service.id} className="service-card-v2">
              <div className="service-card-image">
                <img src={service.image} alt={service.name} />
                {service.premium && <span className="service-badge-trending">TRENDING</span>}
                <div className="service-card-overlay">
                  <span className="service-badge-location"><MapPin size={10} /> Satellite</span>
                </div>
              </div>
              
              <div className="service-card-content">
                <div className="service-provider-meta">
                  <span className="provider-label">{service.provider}</span>
                  <div className="service-rating-v2">
                    <Star size={12} fill="currentColor" />
                    <span>{service.rating}</span>
                  </div>
                </div>
                
                <h4 className="service-title-v2">{service.name}</h4>
                
                <div className="service-trust-bar">
                  <Users size={12} />
                  <span>{service.neighbors} Neighbors booked</span>
                </div>
                
                <div className="service-card-footer">
                  <div className="service-price-v2">
                    <span className="price-label">Starts from</span>
                    <span className="price-value">₹{service.price}</span>
                  </div>
                  <button 
                    className="service-action-btn"
                    onClick={() => { 
                      addToCart({ id: service.id, name: service.name, price: service.price, provider: service.provider, type: 'service' }); 
                      toast.success(`${service.name} added to cart!`, { icon: '🛒' }); 
                    }}
                  >
                    Add to Cart
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Services;
