import React, { useState, useEffect } from 'react';
import { toast } from 'react-hot-toast';
import { Plus } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useSearch } from '../context/SearchContext';
import { supabase } from '../supabase';
import './Essentials.css';

const Essentials = () => {
  const { cartItems, addToCart, updateQty } = useCart();
  const { searchQuery } = useSearch();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchEssentials = async () => {
      try {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        
        if (error) throw error;
        
        if (data) {
          // Filter unique names to avoid duplicates in the UI
          const uniqueData = data.reduce((acc, current) => {
            const x = acc.find(item => item.name === current.name);
            if (!x) return acc.concat([current]);
            else return acc;
          }, []);
          setItems(uniqueData);
        }
      } catch (err) {
        console.error('Fetch essentials error:', err);
        setItems([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEssentials();
  }, []);

  const filteredItems = items.filter(i => 
    i.name?.toLowerCase().includes(searchQuery.toLowerCase()) || 
    i.store?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (loading) return null;
  if (searchQuery && filteredItems.length === 0) return null;

  return (
    <section className="essentials" id="essentials">
      <div className="container">
        <div className="essentials-grid-main">
          <div className="essentials-info animate-fade-in">
            <span className="badge-secondary">{searchQuery ? 'Search Results' : 'Local Delivery'}</span>
            <h3 className="section-title">Home <span className="highlight-green">Essentials</span></h3>
            <p className="description">Get your daily needs from neighborhood stores within minutes. No minimum delivery for Prime neighbors!</p>
            <div className="featured-banner">
              <img src="/essentials_banner.png" alt="Fresh local groceries" />
              <div className="banner-content">
                <strong>Fresh & Fast</strong>
                <span>Directly from local partners</span>
              </div>
            </div>
          </div>
          
          <div className="essentials-items">
            {filteredItems.map(item => (
                <div key={item.id} className="item-card glass card-hover">
                   <div className="item-details">
                      <strong>{item.name}</strong>
                      <span className="store">{item.store} • {item.delivery_time}</span>
                      <span className="price">₹{item.price}</span>
                   </div>
                   {(() => {
                     const cartItem = cartItems.find(i => i.id === item.id && i.type === 'essential');
                     return cartItem ? (
                       <div className="quantity-selector-essentials" style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'var(--primary)', borderRadius: '50px', padding: '4px 10px', height: '36px', boxSizing: 'border-box' }}>
                         <button onClick={(e) => { e.stopPropagation(); updateQty(item.id, 'essential', -1); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>-</button>
                         <span style={{ fontWeight: 'bold', color: 'white', minWidth: '12px', textAlign: 'center', fontSize: '0.9rem' }}>{cartItem.qty}</span>
                         <button onClick={(e) => { e.stopPropagation(); updateQty(item.id, 'essential', 1); }} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer', fontWeight: 'bold', fontSize: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '0 4px' }}>+</button>
                       </div>
                     ) : (
                       <button className="add-icon-btn" onClick={() => { addToCart({ id: item.id, name: item.name, price: item.price, store: item.store, type: 'essential' }); toast.success(`${item.name} added!`, { icon: '🛒' }); }}><Plus size={20} /></button>
                     );
                   })()}
                </div>
             ))}
             <button className="view-all" onClick={() => toast('Fetching full essentials catalog...', { icon: '🛍️' })}>View All 50+ Items</button>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Essentials;
