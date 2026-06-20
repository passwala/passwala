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
import GoogleMapWrapper from '../../utils/GoogleMapWrapper';
import './NearShops.css';
import { supabase } from '../../supabase';
import { useCart } from '../../context/CartContext';
import { getOSRMRoute } from '../../utils/dijkstra';
import { useTranslation } from '../LanguageContext';


const NearShops = ({ location, userCoords }) => {
  const { t } = useTranslation();
  const [searchQuery, setSearchQuery] = useState('');
  const [shops, setShops] = useState([]);
  const [loading, setLoading] = useState(true);
  const currentArea = location?.split(',')[0] || 'Your Area';
  
  const { cartItems, addToCart, updateQty, setCartOpen, totalItems } = useCart();
  const [mapCenter, setMapCenter] = useState([userCoords?.lat || 23.0225, userCoords?.lng || 72.5714]);

  useEffect(() => {
    if (userCoords?.lat && userCoords?.lng) {
      setMapCenter([userCoords.lat, userCoords.lng]);
    }
  }, [userCoords]);



  const [viewType, setViewType] = useState('SHOPS'); // 'SHOPS' or 'SERVICES'
  const [shopCatalog, setShopCatalog] = useState([]);
  const [selectedShop, setSelectedShop] = useState(null);

  const loadCatalog = useCallback(async (shop) => {
    if (!shop) return;
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
                    return '/ac_repair.png';
                  }
                  if (norm.includes('clean') || norm.includes('sanitize') || norm.includes('maid') || norm.includes('wash')) {
                    return '/cleaning.png';
                  }
                  if (norm.includes('plumb') || norm.includes('leak') || norm.includes('pipe') || norm.includes('tap')) {
                    return '/plumbing.png';
                  }
                  if (norm.includes('electr') || norm.includes('wire') || norm.includes('fan') || norm.includes('switch')) {
                    return '/electrician.png';
                  }
                  if (norm.includes('carpenter') || norm.includes('wood') || norm.includes('door') || norm.includes('furniture')) {
                    return '/carpentry.png';
                  }
                  if (norm.includes('paint') || norm.includes('wall') || norm.includes('waterproof')) {
                    return '/expert_services.png';
                  }
                  return '/essentials.png';
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
                  if (!imgSrc || typeof imgSrc !== 'string') return '/essentials.png';
                  const clean = imgSrc.trim();
                  if (clean.startsWith('http://') || clean.startsWith('https://') || clean.startsWith('data:') || clean.startsWith('/')) {
                    return clean;
                  }
                  return '/essentials.png';
                };

                setShopCatalog(filteredData.map(p => ({
                   id: p.id,
                   name: p.name,
                   detail: p.description,
                   price: p.price,
                   image: getCleanProductImage(p.image_url || p.image),
                   stock: p.stock_quantity !== null && p.stock_quantity !== undefined ? p.stock_quantity : 9999
                })));
            } else {
                setShopCatalog([]);
            }
        }
    } catch (err) {
        console.error("Failed to load catalog:", err);
        setShopCatalog([]);
    }
  }, []);

  const handleOpenShop = useCallback(async (shop) => {
    setSelectedShop(shop);
    await loadCatalog(shop);
  }, [loadCatalog]);

  // Realtime subscription: auto-refresh catalog when products/services change for selected shop
  // This ensures stock quantities update immediately after an order is placed
  useEffect(() => {
    if (!selectedShop || !supabase) return;

    const table = selectedShop.type === 'SERVICES' ? 'services' : 'products';
    const filterCol = selectedShop.type === 'SERVICES' ? 'provider_id' : 'store_id';

    const channel = supabase
      .channel(`shop_catalog_${selectedShop.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table,
        filter: `${filterCol}=eq.${selectedShop.id}`
      }, () => {
        loadCatalog(selectedShop);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [selectedShop, loadCatalog]);


  const handleAddToCart = (e, product) => {
    e.stopPropagation();
    const success = addToCart({
      id: product.id,
      name: product.name,
      price: product.price,
      image: product.image,
      type: selectedShop.type === 'SERVICES' ? 'service' : 'product',
      store: selectedShop.name,
      shop_id: selectedShop.id,
      stock: product.stock !== null && product.stock !== undefined ? product.stock : 9999
    });
    if (success) {
      toast.success(`${product.name} added to cart`);
    }
  };



  const geocodeAddress = useCallback(async (address) => {
    if (!address) return null;
    try {
      const searchString = address.toLowerCase().includes('ahmedabad') 
        ? address 
        : `${address}, Ahmedabad, Gujarat, India`; // Fallback, could be enhanced with user location string
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchString)}&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Passwalaa-App/1.0 (contact@passwalaa.com)' } });
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
      const query = supabase.from(table).select(viewType === 'SHOPS' ? '*, stores(*)' : '*');
      const { data, error } = await query.limit(100);
      
      if (error) throw error;
      
      const uniqueItems = [];
      const seen = new Set();
      
      (data || []).forEach((item) => {
        const title = item.business_name || item.name || (viewType === 'SHOPS' ? 'Local Shop' : 'Service Pro');
        
        // Quality Filter: Ignore if name is gibberish/too short
        if (title.length < 3 || ['nnknn', 'nzbsh', 'asdf'].some(g => title.toLowerCase().includes(g))) return;
        if (viewType === 'SHOPS' && title.toLowerCase().includes('shiv')) return;

        const identifier = `${title}-${item.id}`;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          
          let lat = item.lat || item.stores?.lat;
          let lng = item.lng || item.stores?.lng;

          uniqueItems.push({
            id: item.id,
            name: title,
            category: item.category || (viewType === 'SHOPS' ? 'General' : 'Professional Service'),
            rating: item.rating || item.stores?.rating || (viewType === 'SERVICES' ? 4.5 : 0),
            // distance will be updated asynchronously below
            distance: 'N/A',
            lat: lat,
            lng: lng,
            address: item.address || item.stores?.address,
            image: item.photo_url || item.stores?.logo_url || (viewType === 'SHOPS' ? "/essentials.png" : "/expert_services.png"),
            isOpen: true,
            verified: item.is_verified || false,
            type: viewType
          });
        }
      });
      
      const withConcurrency = async (items, fn, limit = 5) => {
        const results = [];
        for (let i = 0; i < items.length; i += limit) {
          results.push(...await Promise.all(items.slice(i, i + limit).map(fn)));
        }
        return results;
      };

      const itemsWithDistance = await withConcurrency(uniqueItems, async (item) => {
        let lat = item.lat;
        let lng = item.lng;
        
        if ((!lat || !lng) && item.address) {
          const coords = await geocodeAddress(item.address);
          if (coords) {
            lat = coords.lat;
            lng = coords.lng;
            item.lat = lat;
            item.lng = lng;
            try {
              if (viewType === 'SHOPS') {
                await supabase.from('stores').update({ lat, lng }).eq('vendor_id', item.id);
              } else {
                await supabase.from('service_providers').update({ lat, lng }).eq('id', item.id);
              }
            } catch (dbErr) {
              console.warn('Failed to persist geocoded coordinates:', dbErr);
            }
          }
        }
        
        if (!userCoords?.lat || !userCoords?.lng || !lat || !lng) {
          return { ...item, distance: 'N/A' };
        }
        const routeInfo = await getOSRMRoute(userCoords.lat, userCoords.lng, lat, lng);
        return { ...item, distance: routeInfo.distanceKm.toFixed(1) };
      }, 5);

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
                  placeholder={viewType === 'SHOPS' ? t('search_shops_items') : t('search_experts_services')}
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
                <ShoppingBag size={16} /> <span>{t('near_shops')}</span>
              </button>
              <button 
                className={viewType === 'SERVICES' ? 'active' : ''} 
                onClick={() => setViewType('SERVICES')}
              >
                <Star size={16} /> <span>{t('expert_services')}</span>
              </button>
           </div>
        </div>
        
        {/* New Category Tabs for Buyers */}
        <div className="category-scroll-near">
           {(viewType === 'SHOPS' 
             ? [
                 { label: t('all'), value: 'All' },
                 { label: t('general_store'), value: 'General Store' },
                 { label: t('grocery'), value: 'Grocery' },
                 { label: t('vegetables'), value: 'Vegetables' },
                 { label: t('dairy'), value: 'Dairy' },
                 { label: t('bakery'), value: 'Bakery' }
               ]
             : [
                 { label: t('all'), value: 'All' },
                 { label: t('plumbing'), value: 'Plumbing' },
                 { label: t('electrical'), value: 'Electrical' },
                 { label: t('ac_service'), value: 'AC Service' },
                 { label: t('cleaning'), value: 'Cleaning' },
                 { label: t('carpentry'), value: 'Carpentry' }
               ]
           ).map(cat => (
             <button 
               key={cat.value} 
               className={`cat-tab-near ${searchQuery.toLowerCase() === cat.value.toLowerCase() ? 'active' : ''}`}
               onClick={() => setSearchQuery(cat.value === 'All' ? '' : cat.value)}
             >
               {cat.label}
             </button>
           ))}
        </div>
      </header>

      <main className="near-shops-content" style={{ paddingBottom: '120px' }}>
        {/* Responsive split: map left, list right on desktop */}
        <div className="near-shops-content-split">

        {/* Map Section */}
        <div className="map-view-container">
          {/* ── Map wrapper: height is controlled by CSS (no inline override) ── */}
          <div className="map-wrapper" style={{ position: 'relative' }}>
             {(() => {
               const googleMarkers = [];
               if (userCoords?.lat && userCoords?.lng) {
                 googleMarkers.push({
                   position: [userCoords.lat, userCoords.lng],
                   title: t('you_are_here'),
                   svgIcon: `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0zm0 21.8c-3.8 0-6.8-3-6.8-6.8s3-6.8 6.8-6.8 6.8 3 6.8 6.8-3 6.8-6.8 6.8z" fill="#3b82f6" stroke="white" stroke-width="2"/></svg>`,
                   iconSize: [25, 41],
                   iconAnchor: [12, 41]
                 });
               }
               filteredShops.forEach((item) => {
                 const lat = parseFloat(item.lat);
                 const lng = parseFloat(item.lng);
                 if (isNaN(lat) || isNaN(lng)) return;
                 const isService = item.type === 'SERVICES';
                 googleMarkers.push({
                   position: [lat, lng],
                   title: item.name,
                   svgIcon: isService
                     ? `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0zm0 21.8c-3.8 0-6.8-3-6.8-6.8s3-6.8 6.8-6.8 6.8 3 6.8 6.8-3 6.8-6.8 6.8z" fill="#10b981" stroke="white" stroke-width="2"/></svg>`
                     : `<svg xmlns="http://www.w3.org/2000/svg" width="30" height="42" viewBox="0 0 30 42"><path d="M15 0C6.7 0 0 6.7 0 15c0 11.2 15 27 15 27s15-15.8 15-27C30 6.7 23.3 0 15 0zm0 21.8c-3.8 0-6.8-3-6.8-6.8s3-6.8 6.8-6.8 6.8 3 6.8 6.8-3 6.8-6.8 6.8z" fill="#f97316" stroke="white" stroke-width="2"/></svg>`,
                   iconSize: [25, 41],
                   iconAnchor: [12, 41],
                   onClick: () => handleOpenShop(item)
                 });
               });

               const fitPoints = [];
               if (userCoords?.lat && userCoords?.lng) {
                 fitPoints.push([userCoords.lat, userCoords.lng]);
               }
               filteredShops.forEach((item) => {
                 const lat = parseFloat(item.lat);
                 const lng = parseFloat(item.lng);
                 if (!isNaN(lat) && !isNaN(lng)) {
                   fitPoints.push([lat, lng]);
                 }
               });

               return (
                 <>
                   <GoogleMapWrapper
                     center={mapCenter}
                     zoom={14}
                     markers={googleMarkers}
                     fitBoundsPoints={fitPoints}
                     style={{ height: '100%', width: '100%', zIndex: 1 }}
                   />
                   {userCoords?.lat && userCoords?.lng && (
                     <button
                       onClick={() => setMapCenter([userCoords.lat, userCoords.lng])}
                       style={{
                         position: 'absolute',
                         bottom: '12px',
                         right: '12px',
                         zIndex: 1000,
                         background: 'white',
                         border: '1.5px solid #e2e8f0',
                         borderRadius: '50%',
                         width: '40px',
                         height: '40px',
                         display: 'flex',
                         alignItems: 'center',
                         justifyContent: 'center',
                         cursor: 'pointer',
                         boxShadow: '0 4px 12px rgba(0,0,0,0.12)',
                         color: '#ff7622'
                       }}
                       title="Re-center to my location"
                       type="button"
                     >
                       <Navigation size={18} fill="#ff7622" />
                     </button>
                   )}
                 </>
               );
             })()}
             
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
        <div className="shops-list-panel">
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
                              <span className="shop-category-near">
                                {(() => {
                                  const key = (shop.category || 'general').toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
                                  const trans = t(key);
                                  return trans === key ? (shop.category || 'General Store') : trans;
                                })()}
                              </span>
                              {shop.type !== 'SERVICES' && shop.distance !== 'N/A' && (
                                <span className="shop-distance-near">
                                  <Navigation size={12} />
                                  {t('km_from_you').replace('{dist}', shop.distance)}
                                </span>
                              )}
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
                <h4 style={{ fontWeight: 800, color: '#0f172a' }}>{t('no_shops_found')}</h4>
                <p style={{ fontSize: '0.9rem' }}>{t('no_shops_found_sub')}</p>
             </Motion.div>
           )}
           </AnimatePresence>
        </div>{/* /shops-list */}
        </div>{/* /shops-list-panel */}
        </div>{/* /near-shops-content-split */}

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
                  <p style={{ margin: 0, fontSize: '0.8rem', color: '#64748b' }}>
                    {selectedShop.type === 'SERVICES' 
                      ? t('service_portfolio') 
                      : selectedShop.distance === 'N/A'
                        ? t('digital_catalog')
                        : `${selectedShop.distance} km • ${t('digital_catalog')}`}
                  </p>
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
                     borderRadius: '99px',
                     display: 'inline-flex',
                     alignItems: 'center',
                     justifyContent: 'center',
                     border: '2px solid white',
                     boxShadow: '0 2px 5px rgba(255,118,34,0.3)',
                     padding: '0 5px',
                     boxSizing: 'border-box',
                     whiteSpace: 'nowrap'
                   }}>
                     {totalItems}
                   </span>
                 )}
               </button>
            </div>

            <div style={{ padding: '1rem' }}>
               <h3 style={{ margin: '0 0 1rem 0', fontWeight: 700, color: '#0f172a' }}>
                 {selectedShop.type === 'SERVICES' ? t('available_services') : t('available_products')}
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
                                  selectedShop.type !== 'SERVICES' && product.stock <= 0 ? (
                                    <button 
                                      disabled
                                      style={{ 
                                        background: '#e2e8f0', 
                                        color: '#94a3b8', 
                                        border: 'none', 
                                        padding: '6px 14px', 
                                        borderRadius: '10px', 
                                        display: 'flex', 
                                        alignItems: 'center', 
                                        gap: '6px',
                                        cursor: 'not-allowed',
                                        fontWeight: 700,
                                        fontSize: '0.8rem'
                                      }}
                                    >
                                      {t('out_of_stock') || 'Out of Stock'}
                                    </button>
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
                                      onMouseDown={(e) => { e.currentTarget.style.transform = 'scale(0.95)'; }}
                                      onMouseUp={(e) => { e.currentTarget.style.transform = 'scale(1)'; }}
                                    >
                                      <Plus size={16} /> {t('add_to_cart')}
                                    </button>
                                  )
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
                   <p>{selectedShop.type === 'SERVICES' ? t('no_services_available') : t('no_products_available')}</p>
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
