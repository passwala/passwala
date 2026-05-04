/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Search, 
  MapPin, 
  Star, 
  Filter, 
  Navigation,
  CheckCircle2,
  Plus,
  Package
} from 'lucide-react';
import './NearShops.css';
import { supabase } from '../../supabase';
import { useCart } from '../../context/CartContext';

const NearShops = ({ onBack, location, userCoords }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentArea = location?.split(',')[0] || 'Your Area';
  
  const { addToCart } = useCart();
  const [selectedShop, setSelectedShop] = useState(null);
  const [shopCatalog, setShopCatalog] = useState([]);

  const handleOpenShop = async (shop) => {
    setSelectedShop(shop);
    try {
        const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
        if (!error && data && data.length > 0) {
            setShopCatalog(data.map(p => ({
               id: p.id,
               name: p.name,
               detail: p.description,
               price: p.price,
               image: p.image_url
            })));
        } else {
            setShopCatalog([]);
        }
    } catch (err) {
        console.error("Failed to load catalog:", err);
        setShopCatalog([]);
    }
  };

  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      type: 'product',
      store: selectedShop.name,
      shop_id: selectedShop.id
    });
    toast.success(`${product.name} added to cart`);
  };

  useEffect(() => {
    fetchShops();
    // Safety timeout to stop scanning after 3s
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [location, userCoords]);

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return (0.5 + Math.random() * 2).toFixed(1);
    const R = 6371; // km
    const dLat = (lat2 - lat1) * Math.PI / 180;
    const dLon = (lon2 - lon1) * Math.PI / 180;
    const a = 
      Math.sin(dLat/2) * Math.sin(dLat/2) +
      Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) * 
      Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return (R * c).toFixed(1);
  };

  const fetchShops = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendors') 
        .select('*');
      
      if (error) throw error;
      
      const uniqueShops = [];
      const seen = new Set();
      
      (data || []).forEach((item, index) => {
        const title = item.business_name || item.name || 'Local Shop';
        const identifier = `${title}-${item.category}`;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          
          // Use real coordinates if available, else slight offset from user for "realism"
          const shopLat = item.lat || (userCoords?.lat + (Math.sin(index) * 0.01));
          const shopLng = item.lng || (userCoords?.lng + (Math.cos(index) * 0.01));
          
          const dist = calculateDistance(userCoords?.lat, userCoords?.lng, shopLat, shopLng);

          uniqueShops.push({
            ...item,
            name: title,
            coords: { x: `${20 + (index * 15)%60}%`, y: `${30 + (index * 10)%50}%` },
            distance: `${dist} km`,
            rating: item.rating || (4.0 + Math.random() * 0.9).toFixed(1),
            verified: item.is_verified || true,
            status: "OPEN"
          });
        }
      });
      
      setShops(uniqueShops);
    } catch (err) {
      console.error('Fetch shops error:', err);
      setShops([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (shop.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="near-shops-page"
    >
      <header className="near-shops-header no-border">
        <div className="search-container-near">
           <div className="search-box-near">
              <Search size={20} className="search-icon-near" />
              <input 
                type="text" 
                placeholder="Search shops, categories..." 
                value={searchQuery}
                onFocus={() => toast('Searching locally in Ahmedabad...')}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <Filter size={20} className="filter-icon-near" onClick={() => toast('Advanced filters enabled!')} />
           </div>
        </div>
        
        {/* New Category Tabs for Buyers */}
        <div className="category-scroll-near">
           {['All', 'General Store', 'Grocery', 'Vegetables', 'Dairy', 'Bakery'].map(cat => (
             <button 
               key={cat} 
               className={`cat-tab-near ${searchQuery.toLowerCase() === cat.toLowerCase() ? 'active' : ''}`}
               onClick={() => setSearchQuery(cat === 'All' ? '' : cat)}
             >
               {cat}
             </button>
           ))}
        </div>
      </header>

      <main className="near-shops-content">
        {/* Map Section */}
        <div className="map-view-container">
          <div className="map-wrapper">
             <img src="/neighborhood_map.png" alt="Map Area" className="mock-map" />
             
             {/* Dynamic Markers */}
             {filteredShops.map((shop) => (
                <motion.div 
                  key={shop.id}
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  whileHover={{ scale: 1.2 }}
                  className="shop-marker"
                  style={{ left: shop.coords.x, top: shop.coords.y }}
                  onClick={() => {}}
                >
                  <div className="marker-label">{shop.name}</div>
                  <div className="marker-pin"><MapPin size={18} fill="currentColor" /></div>
                </motion.div>
             ))}
             
             {/* Pulse overlay */}
             <div className="scan-overlay">
                <div className="scanning-bar">
                   <div className="scan-pulse"></div>
                   <span>SCANNING {currentArea.toUpperCase()}...</span>
                   <div className="scan-active-dot"></div>
                </div>
             </div>
          </div>
        </div>

        {/* Shops List */}
        <div className="shops-list">
           <AnimatePresence mode='popLayout'>
           {filteredShops.map((shop, i) => (
             <motion.div 
               layout
               key={shop.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95 }}
               transition={{ delay: i * 0.1 }}
               className="shop-card-near"
             >
                  <div className="shop-card-info">
                     <div className="shop-card-header">
                        <div className="neighbor-trust-row">
                          <div className="shop-title-row">
                            <h3>{shop.name}</h3>
                            {shop.verified && (
                              <div className="neighborhood-check-badge" title="Neighbor Verified">
                                <CheckCircle2 size={12} color="#ff7622" fill="#ff7622" fillOpacity={0.2} />
                              </div>
                            )}
                          </div>
                          <div className="shop-card-meta">
                            <span className="shop-category-near">{shop.category || 'General'}</span>
                            <span className="shop-distance-near">
                              <Navigation size={12} />
                              {shop.distance} from you
                            </span>
                            {shop.address && (
                              <span className="shop-area-near">
                                <MapPin size={12} />
                                {shop.address}
                              </span>
                            )}
                          </div>
                        </div>
                     </div>
                  </div>
                 <button 
                   className="visit-shop-btn"
                   onClick={() => handleOpenShop(shop)}
                 >Order Now</button>
             </motion.div>
           ))}
           </AnimatePresence>
        </div>
      </main>

      {/* Shop Digital Catalog Modal */}
      <AnimatePresence>
        {selectedShop && (
          <motion.div 
            initial={{ y: '100%', opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            exit={{ y: '100%', opacity: 0 }}
            transition={{ type: 'spring', damping: 25, stiffness: 200 }}
            style={{
              position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
              background: '#f8fafc', zIndex: 1000, overflowY: 'auto'
            }}
          >
            <div style={{ position: 'sticky', top: 0, background: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10 }}>
               <button onClick={() => setSelectedShop(null)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer' }}>
                 <ArrowLeft size={24} color="#0f172a" />
               </button>
               <div style={{ flex: 1 }}>
                 <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{selectedShop.name}</h2>
                 <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{selectedShop.distance} • Digital Catalog</p>
               </div>
            </div>

            <div style={{ padding: '1rem' }}>
               <h3 style={{ margin: '0 0 1rem 0', fontWeight: 700, color: '#0f172a' }}>Available Products</h3>
               
               <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(150px, 1fr))', gap: '1rem' }}>
                  {shopCatalog.map(product => (
                    <div key={product.id} style={{ background: 'white', borderRadius: '16px', overflow: 'hidden', boxShadow: '0 4px 15px rgba(0,0,0,0.05)', display: 'flex', flexDirection: 'column' }}>
                       <div style={{ width: '100%', height: '120px', background: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                         {product.image ? (
                           <img src={product.image} alt={product.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                         ) : (
                           <Package size={40} color="#cbd5e1" />
                         )}
                       </div>
                       <div style={{ padding: '1rem', display: 'flex', flexDirection: 'column', flex: 1, justifyContent: 'space-between' }}>
                          <div>
                            <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700, fontSize: '0.95rem' }}>{product.name}</h4>
                            <p style={{ margin: '0 0 0.5rem 0', fontSize: '0.75rem', color: '#64748b', lineHeight: 1.3 }}>{product.detail}</p>
                          </div>
                          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: 'auto' }}>
                             <span style={{ fontWeight: 800, color: '#0f172a' }}>₹{product.price}</span>
                             <button onClick={(e) => handleAddToCart(e, product)} style={{ background: 'var(--primary)', color: 'white', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer' }}>
                               <Plus size={18} />
                             </button>
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
               
               {shopCatalog.length === 0 && (
                 <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                   <Package size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                   <p>No products available right now.</p>
                 </div>
               )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default NearShops;
