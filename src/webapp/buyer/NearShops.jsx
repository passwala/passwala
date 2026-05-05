import React, { useState, useEffect, useCallback } from 'react';
import { motion as Motion, AnimatePresence } from 'framer-motion';
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
  Package,
  ShoppingBag
} from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './NearShops.css';
import { supabase } from '../../supabase';
import { useCart } from '../../context/CartContext';
import { getShortestPathDistance } from '../../utils/dijkstra';

// --- Leaflet Icon Fix & Customization ---
const orangeIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

const blueIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41]
});

// Helper component to center map when coords change
function RecenterMap({ coords }) {
  const map = useMap();
  useEffect(() => {
    if (coords) map.setView([coords.lat, coords.lng], 14);
  }, [coords, map]);
  return null;
}

const NearShops = ({ onBack, location, userCoords }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentArea = location?.split(',')[0] || 'Your Area';
  
  const { addToCart, setCartOpen, totalItems } = useCart();
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

  const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return (0.5 + Math.random() * 2).toFixed(1);
    const dist = getShortestPathDistance(lat1, lon1, lat2, lon2);
    return dist.toFixed(1);
  };

  const fetchShops = useCallback(async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('vendors') 
        .select('*');
      
      if (error) throw error;
      
      const uniqueShops = [];
      const seen = new Set();
      
      (data || []).forEach((item) => {
        const title = item.business_name || item.name || 'Local Shop';
        const identifier = `${title}-${item.category}`;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          uniqueShops.push({
            id: item.id,
            name: title,
            category: item.category || 'General',
            rating: 4.0 + Math.random(),
            distance: calculateDistance(userCoords?.lat, userCoords?.lng, item.lat, item.lng),
            lat: item.lat || 23.0225 + (Math.random() - 0.5) * 0.02, // Fallback near Ahmedabad
            lng: item.lng || 72.5714 + (Math.random() - 0.5) * 0.02,
            image: item.photo_url || "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800",
            isOpen: true,
            verified: item.is_verified || true
          });
        }
      });
      setShops(uniqueShops);
    } catch (err) {
      console.error("Failed to fetch shops:", err);
      toast.error("Could not load nearby shops");
    } finally {
      setLoading(false);
    }
  }, [userCoords]);

  useEffect(() => {
    fetchShops();
    // Safety timeout to stop scanning after 3s
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [location, fetchShops]);

  const filteredShops = shops.filter(shop => 
    shop.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (shop.category || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="near-shops-page"
    >
      <header className="near-shops-header no-border">
        <div className="header-top-row-near">
          <button onClick={onBack} className="back-btn-near">
            <ArrowLeft size={24} />
          </button>
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
          <div className="map-wrapper" style={{ height: '350px', position: 'relative' }}>
             <MapContainer 
               center={[userCoords?.lat || 23.0225, userCoords?.lng || 72.5714]} 
               zoom={14} 
               scrollWheelZoom={false}
               style={{ height: '100%', width: '100%', zIndex: 1 }}
             >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* User Location Marker */}
                {userCoords && (
                  <Marker position={[userCoords.lat, userCoords.lng]} icon={blueIcon}>
                    <Popup>You are here</Popup>
                  </Marker>
                )}

                {/* Shop Markers */}
                {filteredShops.map((shop) => (
                   <Marker 
                     key={shop.id} 
                     position={[shop.lat, shop.lng]} 
                     icon={orangeIcon}
                     eventHandlers={{
                       click: () => handleOpenShop(shop),
                     }}
                   >
                     <Popup>
                       <div style={{ padding: '4px' }}>
                         <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{shop.name}</h4>
                         <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>{shop.category}</p>
                         <button 
                           onClick={() => handleOpenShop(shop)}
                           style={{ 
                             marginTop: '8px', 
                             background: 'var(--primary)', 
                             color: 'white', 
                             border: 'none', 
                             padding: '4px 8px', 
                             borderRadius: '4px', 
                             fontSize: '11px', 
                             width: '100%' 
                           }}
                         >
                           View Catalog
                         </button>
                       </div>
                     </Popup>
                   </Marker>
                ))}
                
                <RecenterMap coords={userCoords} />
             </MapContainer>
             
             {/* Pulse overlay */}
             {loading && (
               <div className="scan-overlay">
                  <div className="scanning-bar">
                     <div className="scan-pulse"></div>
                     <span>SCANNING {currentArea.toUpperCase()}...</span>
                     <div className="scan-active-dot"></div>
                  </div>
               </div>
             )}
          </div>
        </div>

        {/* Shops List */}
        <div className="shops-list">
           <AnimatePresence mode='popLayout'>
           {filteredShops.map((shop, i) => (
             <Motion.div 
               layout
               key={shop.id}
               initial={{ opacity: 0, y: 20 }}
               animate={{ opacity: 1, y: 0 }}
               exit={{ opacity: 0, scale: 0.95 }}
               transition={{ delay: i * 0.1 }}
               className="shop-card-near"
               onClick={() => handleOpenShop(shop)}
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
                              {shop.distance} km from you
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
                   onClick={(e) => { e.stopPropagation(); handleOpenShop(shop); }}
                 >Order Now</button>
             </Motion.div>
           ))}
           </AnimatePresence>
        </div>
      </main>

      {/* Shop Digital Catalog Modal */}
      <AnimatePresence>
        {selectedShop && (
          <Motion.div 
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
                 <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{selectedShop.distance} km • Digital Catalog</p>
               </div>
               
               <button 
                 onClick={() => setCartOpen(true)}
                 style={{
                   background: '#fff7f2',
                   border: '1.5px solid #ff7622',
                   borderRadius: '12px',
                   padding: '8px',
                   display: 'flex',
                   alignItems: 'center',
                   justifyContent: 'center',
                   position: 'relative',
                   cursor: 'pointer',
                   color: '#ff7622'
                 }}
               >
                 <ShoppingBag size={22} />
                 {totalItems > 0 && (
                   <span style={{
                     position: 'absolute',
                     top: '-6px',
                     right: '-6px',
                     background: '#ff7622',
                     color: 'white',
                     fontSize: '0.65rem',
                     fontWeight: 800,
                     minWidth: '18px',
                     height: '18px',
                     borderRadius: '10px',
                     display: 'flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     border: '2px solid white',
                     boxShadow: '0 2px 5px rgba(255,118,34,0.3)'
                   }}>
                     {totalItems}
                   </span>
                 )}
               </button>
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
                             <button 
                               onClick={(e) => handleAddToCart(e, product)} 
                               style={{ 
                                 background: 'var(--primary)', 
                                 color: 'white', 
                                 border: 'none', 
                                 padding: '6px 14px', 
                                 borderRadius: '10px', 
                                 display: 'flex', 
                                 alignItems: 'center', 
                                 gap: '6px',
                                 cursor: 'pointer',
                                 fontWeight: 700,
                                 fontSize: '0.8rem',
                                 transition: 'transform 0.2s active'
                               }}
                               onMouseDown={(e) => e.currentTarget.style.transform = 'scale(0.95)'}
                               onMouseUp={(e) => e.currentTarget.style.transform = 'scale(1)'}
                             >
                               <Plus size={16} /> ADD
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
          </Motion.div>
        )}
      </AnimatePresence>
    </Motion.div>
  );
};

export default NearShops;
