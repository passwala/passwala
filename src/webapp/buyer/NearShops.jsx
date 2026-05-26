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
import './NearShops.css';
import { supabase } from '../../supabase';
import { useCart } from '../../context/CartContext';
import { getOSRMRoute } from '../../utils/dijkstra';

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
    // 🛡️ Safety Check: Prevent crash if coordinates are partially undefined
    if (coords && coords.lat && coords.lng && !isNaN(coords.lat) && !isNaN(coords.lng)) {
      map.setView([coords.lat, coords.lng], 14);
    }
  }, [coords, map]);
  return null;
}

const NearShops = ({ location, userCoords }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentArea = location?.split(',')[0] || 'Your Area';
  
  const { cartItems, addToCart, updateQty, setCartOpen, totalItems } = useCart();
  const [viewType, setViewType] = useState('SHOPS'); // 'SHOPS' or 'SERVICES'
  const [shopCatalog, setShopCatalog] = useState([]);



  const [selectedShop, setSelectedShop] = useState(null);

  const handleOpenShop = async (shop) => {
    setSelectedShop(shop);
    try {
        if (shop.type === 'SERVICES') {
            const { data, error } = await supabase
              .from('services')
              .select('*')
              .eq('provider_id', shop.id)
              .order('created_at', { ascending: false });
            if (!error && data) {
                const getFallbackByName = (name = '') => {
                  const norm = name.toLowerCase();
                  if (norm.includes('ac') || norm.includes('appliance') || norm.includes('fridge') || norm.includes('washing')) {
                    return 'https://images.unsplash.com/photo-1581578731522-aa02d681b94d?auto=format&fit=crop&q=80&w=400';
                  }
                  if (norm.includes('clean') || norm.includes('sanitize') || norm.includes('maid') || norm.includes('wash')) {
                    return 'https://images.unsplash.com/photo-1581578731158-a5a3c262c1db?auto=format&fit=crop&q=80&w=400';
                  }
                  if (norm.includes('plumb') || norm.includes('leak') || norm.includes('pipe') || norm.includes('tap')) {
                    return 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&q=80&w=400';
                  }
                  if (norm.includes('electr') || norm.includes('wire') || norm.includes('fan') || norm.includes('switch')) {
                    return 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&q=80&w=400';
                  }
                  if (norm.includes('carpenter') || norm.includes('wood') || norm.includes('door') || norm.includes('furniture')) {
                    return 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&q=80&w=400';
                  }
                  if (norm.includes('paint') || norm.includes('wall') || norm.includes('waterproof')) {
                    return 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&q=80&w=400';
                  }
                  return 'https://images.unsplash.com/photo-1581578731522-aa02d681b94d?auto=format&fit=crop&q=80&w=400';
                };

                const getCleanImage = (imgSrc, name = '') => {
                  if (!imgSrc || typeof imgSrc !== 'string') return getFallbackByName(name);
                  const clean = imgSrc.trim();
                  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('/')) {
                    return clean;
                  }
                  return getFallbackByName(name);
                };

                setShopCatalog(data.map(s => ({
                   id: s.id,
                   name: s.title || s.name,
                   detail: s.description,
                   price: s.price,
                   image: getCleanImage(s.image_url || s.image, s.title || s.name)
                })));
            } else {
                setShopCatalog([]);
            }
        } else {
            const { data, error } = await supabase
              .from('products')
              .select('*')
              .eq('store_id', shop.id)
              .order('created_at', { ascending: false });
            if (!error && data) {
                const filteredData = data.filter(item => item.description !== 'Service item auto-registered');
                const getCleanProductImage = (imgSrc) => {
                  if (!imgSrc || typeof imgSrc !== 'string') return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400'; // Default Premium Grocery
                  const clean = imgSrc.trim();
                  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('/')) {
                    return clean;
                  }
                  return 'https://images.unsplash.com/photo-1542838132-92c53300491e?auto=format&fit=crop&q=80&w=400';
                };

                setShopCatalog(filteredData.map(p => ({
                   id: p.id,
                   name: p.name,
                   detail: p.description,
                   price: p.price,
                   image: getCleanProductImage(p.image_url || p.image)
                })));
            } else {
                setShopCatalog([]);
            }
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
      type: selectedShop.type === 'SERVICES' ? 'service' : 'product',
      store: selectedShop.name,
      shop_id: selectedShop.id
    });
    toast.success(`${product.name} added to cart`);
  };



  const geocodeAddress = useCallback(async (address) => {
    if (!address) return null;
    try {
      const searchString = address.toLowerCase().includes('ahmedabad') 
        ? address 
        : `${address}, Ahmedabad, Gujarat, India`; // Fallback, could be enhanced with user location string
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchString)}&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Passwalaa-App' } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return { lat: parseFloat(data[0].lat), lng: parseFloat(data[0].lon) };
        }
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    }
    return null;
  }, []);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      const table = viewType === 'SHOPS' ? 'vendors' : 'service_providers';
      const { data, error } = await supabase
        .from(table) 
        .select('*')
        .limit(100);
      
      if (error) throw error;
      
      const uniqueItems = [];
      const seen = new Set();
      
      (data || []).forEach((item) => {
        const title = item.business_name || item.name || (viewType === 'SHOPS' ? 'Local Shop' : 'Service Pro');
        
        // Quality Filter: Ignore if name is gibberish/too short
        if (title.length < 3 || ['nnknn', 'nzbsh', 'asdf'].some(g => title.toLowerCase().includes(g))) return;

        const identifier = `${title}-${item.id}`;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          
          let lat = item.lat;
          let lng = item.lng;

          uniqueItems.push({
            id: item.id,
            name: title,
            category: item.category || (viewType === 'SHOPS' ? 'General' : 'Professional Service'),
            rating: item.rating || (viewType === 'SERVICES' ? 4.5 : 0),
            // distance will be updated asynchronously below
            distance: 'N/A',
            lat: lat,
            lng: lng,
            address: item.address,
            image: item.photo_url || (viewType === 'SHOPS' ? "https://images.unsplash.com/photo-1441986300917-64674bd600d8?auto=format&fit=crop&q=80&w=800" : "https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=500&q=80"),
            isOpen: true,
            verified: item.is_verified || false,
            type: viewType
          });
        }
      });
      
      const itemsWithDistance = await Promise.all(uniqueItems.map(async (item) => {
        let lat = item.lat;
        let lng = item.lng;
        
        if ((!lat || !lng) && item.address) {
          const coords = await geocodeAddress(item.address);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            item.lat = lat;
            item.lng = lng;
          }
        }
        
        if (!userCoords?.lat || !userCoords?.lng || !lat || !lng) {
          return { ...item, distance: 'N/A' };
        }
        const routeInfo = await getOSRMRoute(userCoords.lat, userCoords.lng, lat, lng);
        return { ...item, distance: routeInfo.distanceKm.toFixed(1) };
      }));

      setShops(itemsWithDistance);
    } catch (err) {
      console.error("Failed to fetch data:", err);
      toast.error(`Could not load nearby ${viewType.toLowerCase()}`);
    } finally {
      setLoading(false);
    }
  }, [userCoords, viewType, geocodeAddress]);

  useEffect(() => {
    fetchData();
    const timer = setTimeout(() => setLoading(false), 3000);
    return () => clearTimeout(timer);
  }, [location, fetchData]);

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
        <div className="header-top-row-near" style={{ display: 'flex', width: '100%' }}>
          <div className="search-container-near" style={{ width: '100%' }}>
             <div className="search-box-near">
                <Search size={20} className="search-icon-near" />
                <input 
                  type="text" 
                  placeholder={viewType === 'SHOPS' ? "Search shops, items..." : "Search experts, services..."}
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
             </div>
          </div>
        </div>

        {/* Unified Type Toggle */}
        <div className="type-toggle-container">
           <div className={`type-toggle-track ${viewType}`}>
              <button 
                className={viewType === 'SHOPS' ? 'active' : ''} 
                onClick={() => setViewType('SHOPS')}
              >
                <ShoppingBag size={16} /> <span>Near Shops</span>
              </button>
              <button 
                className={viewType === 'SERVICES' ? 'active' : ''} 
                onClick={() => setViewType('SERVICES')}
              >
                <Star size={16} /> <span>Local Experts</span>
              </button>
           </div>
        </div>
        
        {/* New Category Tabs for Buyers */}
        <div className="category-scroll-near">
           {(viewType === 'SHOPS' 
             ? ['All', 'General Store', 'Grocery', 'Vegetables', 'Dairy', 'Bakery']
             : ['All', 'Plumbing', 'Electrical', 'AC Service', 'Cleaning', 'Carpentry']
           ).map(cat => (
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

      <main className="near-shops-content" style={{ paddingBottom: '120px' }}>
        {/* Map Section */}
        <div className="map-view-container">
          <div className="map-wrapper" style={{ height: '350px', position: 'relative' }}>
             <MapContainer 
               center={[userCoords?.lat || 23.0225, userCoords?.lng || 72.5714]} 
               zoom={14} 
               scrollWheelZoom={false}
               style={{ height: '100%', width: '100%', zIndex: 1 }}
               maxBounds={[[5.0, 65.0], [38.0, 98.0]]}
               minZoom={5}
               maxBoundsViscosity={1.0}
             >
                <TileLayer
                  attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                  url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                />
                
                {/* User Location Marker */}
                {userCoords && userCoords.lat && userCoords.lng && (
                  <Marker position={[userCoords.lat, userCoords.lng]} icon={blueIcon}>
                    <Popup>You are here</Popup>
                  </Marker>
                )}

                  {/* Item Markers */}
                  {filteredShops.map((item) => {
                    const lat = parseFloat(item.lat);
                    const lng = parseFloat(item.lng);
                    if (isNaN(lat) || isNaN(lng)) return null;
                    
                    const isService = item.type === 'SERVICES';

                    return (
                      <Marker 
                        key={item.id} 
                        position={[lat, lng]} 
                        icon={isService ? blueIcon : orangeIcon}
                        eventHandlers={{
                          click: () => isService ? toast(`Connecting to ${item.name}...`) : handleOpenShop(item),
                        }}
                      >
                      <Popup>
                        <div style={{ padding: '4px' }}>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: '14px' }}>{item.name}</h4>
                          <p style={{ margin: 0, fontSize: '11px', color: '#666' }}>{item.category}</p>
                          <button 
                            onClick={() => isService ? toast.success(`Calling ${item.name}...`) : handleOpenShop(item)}
                            style={{ 
                              marginTop: '8px', 
                              background: isService ? '#3b82f6' : 'var(--primary)', 
                              color: 'white', 
                              border: 'none', 
                              padding: '4px 8px', 
                              borderRadius: '4px', 
                              fontSize: '11px', 
                              width: '100%',
                              fontWeight: 'bold'
                            }}
                          >
                            {isService ? 'Book Service' : 'View Catalog'}
                          </button>
                        </div>
                      </Popup>
                      </Marker>
                    );
                  })}
                
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
        <div className="shops-list" style={{ paddingBottom: '120px' }}>
           <AnimatePresence mode='popLayout'>
           {filteredShops.length > 0 ? (
             filteredShops.map((shop, i) => (
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
                                {shop.distance === 'N/A' ? 'Distance Unknown' : `${shop.distance} km from you`}
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
                     onClick={(e) => { 
                       e.stopPropagation(); 
                       handleOpenShop(shop); 
                     }}
                   >
                     {shop.type === 'SERVICES' ? 'Book Expert' : 'Order Now'}
                   </button>
               </Motion.div>
             ))
           ) : (
             <Motion.div 
               initial={{ opacity: 0 }}
               animate={{ opacity: 1 }}
               className="no-shops-found"
               style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b' }}
             >
                <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>🛍️</div>
                <h4 style={{ fontWeight: 800, color: '#0f172a' }}>No matching shops found</h4>
                <p style={{ fontSize: '0.9rem' }}>Try searching for a different category or store name in your area.</p>
             </Motion.div>
           )}
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
              background: '#f8fafc', zIndex: 2500, overflowY: 'auto'
            }}
          >
            <div style={{ position: 'sticky', top: 0, background: 'white', padding: '1rem', display: 'flex', alignItems: 'center', gap: '1rem', boxShadow: '0 2px 10px rgba(0,0,0,0.05)', zIndex: 10 }}>
               <button onClick={() => setSelectedShop(null)} style={{ background: 'none', border: 'none', padding: '0.5rem', cursor: 'pointer' }}>
                 <ArrowLeft size={24} color="#0f172a" />
               </button>
               <div style={{ flex: 1 }}>
                 <h2 style={{ margin: 0, fontSize: '1.2rem', fontWeight: 800 }}>{selectedShop.name}</h2>
                 <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>{selectedShop.distance} km • {selectedShop.type === 'SERVICES' ? 'Service Portfolio' : 'Digital Catalog'}</p>
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
               <h3 style={{ margin: '0 0 1rem 0', fontWeight: 700, color: '#0f172a' }}>
                 {selectedShop.type === 'SERVICES' ? 'Available Services' : 'Available Products'}
               </h3>
               
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
                             {(() => {
                                const cartItem = cartItems.find(item => item.id === product.id && item.type === (selectedShop.type === 'SERVICES' ? 'service' : 'product'));
                                return cartItem ? (
                                  <div style={{ 
                                    display: 'flex', 
                                    alignItems: 'center', 
                                    gap: '10px', 
                                    background: 'white', 
                                    border: '1.5px solid var(--primary)',
                                    borderRadius: '10px', 
                                    padding: '4px 8px',
                                    height: '32px',
                                    boxSizing: 'border-box'
                                  }}>
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); updateQty(product.id, selectedShop.type === 'SERVICES' ? 'service' : 'product', -1); }} 
                                       style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                     >
                                       -
                                     </button>
                                     <span style={{ fontWeight: 800, color: '#0f172a', minWidth: '16px', textAlign: 'center', fontSize: '0.85rem' }}>
                                       {cartItem.qty}
                                     </span>
                                     <button 
                                       onClick={(e) => { e.stopPropagation(); updateQty(product.id, selectedShop.type === 'SERVICES' ? 'service' : 'product', 1); }} 
                                       style={{ background: 'none', border: 'none', color: 'var(--primary)', cursor: 'pointer', fontWeight: 800, fontSize: '1.1rem', padding: '0 4px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                     >
                                       +
                                     </button>
                                  </div>
                                ) : (
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
                                );
                              })()}
                          </div>
                       </div>
                    </div>
                  ))}
               </div>
               
               {shopCatalog.length === 0 && (
                 <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#94a3b8' }}>
                   <Package size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
                   <p>{selectedShop.type === 'SERVICES' ? 'No services available right now.' : 'No products available right now.'}</p>
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
