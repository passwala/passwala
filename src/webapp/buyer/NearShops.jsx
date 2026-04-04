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
  CheckCircle2
} from 'lucide-react';
import './NearShops.css';
import { supabase } from '../../supabase';

const NearShops = ({ onBack, location }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentArea = location?.split(',')[0] || 'Your Area';

  useEffect(() => {
    fetchShops();
  }, []);

  const fetchShops = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services') 
        .select('*')
        .order('rating', { ascending: false });
      
      if (error) throw error;
      
      // Deduplicate by name and category
      const uniqueShops = [];
      const seen = new Set();
      
      (data || []).forEach(item => {
        const identifier = `${item.name}-${item.category}`;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          
          // Inject mock coordinates for the map projection
          const i = seen.size;
          uniqueShops.push({
            ...item,
            coords: { x: `${20 + (i * 15)%60}%`, y: `${30 + (i * 10)%50}%` },
            status: "OPEN"
          });
        }
      });
      
      setShops(uniqueShops);
    } catch (err) {
      console.error('Fetch shops error:', err);
      toast.error('Could not load real shop data.');
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
           {['All', 'Grocery', 'Vegetables', 'Dairy', 'Bakery', 'Non-Veg'].map(cat => (
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
                  onClick={() => toast(`📍 ${shop.name} is ${shop.distance} away.`)}
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
                         <div className="title-group">
                           <div className="shop-title-row">
                             <h3>{shop.name}</h3>
                             {shop.verified && (
                               <div className="neighborhood-check-badge" title="Verified local resident reviews only">
                                 <CheckCircle2 size={12} fill="var(--primary)" stroke="white" />
                               </div>
                             )}
                           </div>
                           <div className="neighbor-trust-row">
                              <span className="trust-main">Recommended locally</span>
                              <span className="seconded-meta">Neighborhood endorsed</span>
                           </div>
                         </div>
                       <div className="rating-badge-near">
                          <Star size={14} fill="#FFB800" stroke="#FFB800" />
                          <span>{shop.rating}</span>
                       </div>
                    </div>
                    <div className="shop-card-meta">
                       <span className="shop-category-near">{shop.category}</span>
                       <span className="dot">•</span>
                       <span className="shop-distance-near">
                         <MapPin size={12} /> {shop.distance} from you
                       </span>
                    </div>
                 </div>
                 <button 
                   className="visit-shop-btn"
                   onClick={() => toast.loading(`Opening ${shop.name} Digital Catalog...`, { duration: 2000 })}
                 >Order Now</button>
             </motion.div>
           ))}
           </AnimatePresence>
        </div>
      </main>
    </motion.div>
  );
};

export default NearShops;
