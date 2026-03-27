import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Star, Shield, TrendingUp } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import { supabase } from '../supabase';
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
        if (error) throw error;
        // Filter unique by name
        const uniqueData = data.reduce((acc, current) => {
          const x = acc.find(item => item.name === current.name);
          if (!x) return acc.concat([current]);
          else return acc;
        }, []);
        setServices(uniqueData);
      } catch (err) {
        console.error(err);
        toast.error('Could not load services from our Satellite node.');
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
            <div key={service.id} className="service-card card-hover glass">
              {service.premium && <div className="premium-badge"><TrendingUp size={12} /> Featured</div>}
              <div className="card-image-stub" style={{ 
                backgroundImage: `url('${service.image}')`, 
                backgroundSize: 'cover' 
              }}></div>
              <div className="card-body">
                <div className="provider-info">
                  <span className="provider-name">{service.provider}</span>
                  <div className="rating">
                    <Star size={14} fill="currentColor" />
                    <span>{service.rating} ({service.reviews})</span>
                  </div>
                </div>
                <h4 className="service-name">{service.name}</h4>
                <div className="neighbor-trust">
                  <Shield size={14} />
                  <span>{service.neighbors} Neighbors used this lately</span>
                </div>
                <div className="card-footer">
                  <div className="price-tag">
                    <span className="from">From</span>
                    <span className="price">₹{service.price}</span>
                  </div>
                  <button className="book-btn" onClick={() => { addToCart({ id: service.id, name: service.name, price: service.price, provider: service.provider, type: 'service' }); toast.success(`${service.name} added to cart!`, { icon: '🛒' }); }}>Add to Cart</button>
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
