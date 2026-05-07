/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, Clock, MapPin, ChevronRight, MessageCircle, X, Store, CreditCard } from 'lucide-react';
import { toast } from 'react-hot-toast';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import './TrackOrders.css';
import { supabase } from '../../supabase';
import { useNotifications } from '../../context/NotificationContext';

// High-end Sub-component for individual order tracking maps to safely manage isolated instances
function OrderTrackingMap({ order, riderCoords }) {
  const mapRef = useRef(null);
  const leafletMapRef = useRef(null);
  const markerGroupRef = useRef(null);

  useEffect(() => {
    if (!mapRef.current) return;

    // Initialize map
    const defaultCenter = [23.0225, 72.5714]; // Ahmedabad center
    leafletMapRef.current = L.map(mapRef.current, {
      zoomControl: false,
      attributionControl: false
    }).setView(defaultCenter, 14);

    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      maxZoom: 19,
      className: 'map-tiles'
    }).addTo(leafletMapRef.current);

    L.control.zoom({ position: 'topright' }).addTo(leafletMapRef.current);
    markerGroupRef.current = L.featureGroup().addTo(leafletMapRef.current);

    return () => {
      if (leafletMapRef.current) {
        leafletMapRef.current.remove();
        leafletMapRef.current = null;
        markerGroupRef.current = null;
      }
    };
  }, []);

  // Fix for Leaflet rendering issues in dynamic CSS layouts
  useEffect(() => {
    if (leafletMapRef.current) {
      const timer = setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  useEffect(() => {
    if (!leafletMapRef.current || !markerGroupRef.current) return;

    markerGroupRef.current.clearLayers();

    // Custom vectorized premium DivIcons matching the platform brand
    const createRiderIcon = () => L.divIcon({
      className: 'custom-leaflet-marker rider-marker',
      html: `<div class="marker-container" style="background: #10b981; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative;">
               <span class="pulse-ring" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 3px solid #10b981; animation: marker-pulse 1.8s infinite; opacity: 0.6;"></span>
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>
             </div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const createStoreIcon = () => L.divIcon({
      className: 'custom-leaflet-marker store-marker',
      html: `<div class="marker-container" style="background: #f97316; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 42px; height: 42px; border-radius: 12px; display: flex; align-items: center; justify-content: center; position: relative;">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m2 7 4.41-4.41A2 2 0 0 1 7.83 2h8.34a2 2 0 0 1 1.42.59L22 7"/><path d="M4 12v8a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-8"/><path d="M15 22v-4a2 2 0 0 0-2-2h-2a2 2 0 0 0-2 2v4"/><path d="M2 7h20"/><path d="M22 17H2"/></svg>
             </div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const createCustomerIcon = () => L.divIcon({
      className: 'custom-leaflet-marker customer-marker',
      html: `<div class="marker-container" style="background: #3b82f6; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative;">
               <svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>
             </div>`,
      iconSize: [42, 42],
      iconAnchor: [21, 21]
    });

    const storeLatLng = order.stores?.lat && order.stores?.lng 
      ? [parseFloat(order.stores.lat), parseFloat(order.stores.lng)]
      : [23.0305, 72.5075];

    const customerLatLng = order.addresses?.lat && order.addresses?.lng
      ? [parseFloat(order.addresses.lat), parseFloat(order.addresses.lng)]
      : [23.0393, 72.5244];

    let riderLatLng = riderCoords ? [riderCoords.lat, riderCoords.lng] : null;
    
    // Fallback simulation for rider position if live tracking is temporarily unavailable
    if (!riderLatLng && ['ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'].includes(order.status)) {
       if (order.status === 'ACCEPTED' || order.status === 'PREPARING') {
         // Simulated at store
         riderLatLng = storeLatLng;
       } else if (order.status === 'SHIPPED' || order.status === 'DISPATCHED') {
         // Simulated halfway between store and customer
         riderLatLng = [
           (storeLatLng[0] + customerLatLng[0]) / 2,
           (storeLatLng[1] + customerLatLng[1]) / 2
         ];
       }
    }

    // Plot Markers
    L.marker(storeLatLng, { icon: createStoreIcon() })
      .bindPopup(`<b>Store Hub:</b> ${order.stores?.name || 'Partner Store'}`)
      .addTo(markerGroupRef.current);

    L.marker(customerLatLng, { icon: createCustomerIcon() })
      .bindPopup(`<b>Your Delivery Location</b><br/>${order.addresses?.address_line_1 || ''}`)
      .addTo(markerGroupRef.current);

    if (riderLatLng) {
      L.marker(riderLatLng, { icon: createRiderIcon() })
        .bindPopup(`<b>Rider:</b> ${order.delivery_agent_name || 'Verified Partner'}`)
        .addTo(markerGroupRef.current);
    }

    // Connect them with smart routing polylines
    if (order.status === 'ACCEPTED' || order.status === 'PREPARING') {
      if (riderLatLng) {
        L.polyline([riderLatLng, storeLatLng], {
          color: '#f97316',
          weight: 6,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(markerGroupRef.current);
      }

      L.polyline([storeLatLng, customerLatLng], {
        color: '#3b82f6',
        weight: 4,
        opacity: 0.5,
        dashArray: '8, 8',
        lineJoin: 'round'
      }).addTo(markerGroupRef.current);
    } else {
      if (riderLatLng) {
        L.polyline([storeLatLng, riderLatLng], {
          color: '#94a3b8',
          weight: 3,
          opacity: 0.4,
          dashArray: '4, 4',
          lineJoin: 'round'
        }).addTo(markerGroupRef.current);

        L.polyline([riderLatLng, customerLatLng], {
          color: '#3b82f6',
          weight: 6,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(markerGroupRef.current);
      } else {
        // Fallback if no rider position at all
        L.polyline([storeLatLng, customerLatLng], {
          color: '#3b82f6',
          weight: 6,
          opacity: 0.9,
          lineJoin: 'round'
        }).addTo(markerGroupRef.current);
      }
    }

    // Auto fit viewport
    try {
      if (leafletMapRef.current) {
        leafletMapRef.current.invalidateSize();
      }
      const bounds = L.latLngBounds([storeLatLng, customerLatLng]);
      if (riderLatLng) bounds.extend(riderLatLng);
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } catch (e) {
      console.warn('Map boundary fit failed', e);
    }

  }, [order, riderCoords]);

  return (
    <div 
      ref={mapRef} 
      style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }}
    ></div>
  );
}

const TrackOrders = ({ onBack, user }) => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);
  const { addNotification } = useNotifications();

  useEffect(() => {
    fetchOrders();

    // REAL-TIME: Listen for order status updates
    const sub = supabase.channel('order_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setActiveOrders(prev => prev.map(o => {
          if (o.id === payload.new.id) {
            return {
              ...o,
              ...payload.new,
              items: o.items,
              stores: o.stores || payload.new.stores,
              addresses: o.addresses || payload.new.addresses
            };
          }
          return o;
        }));
        const shortId = payload.new.id.substring(0, 6).toUpperCase();
        toast.info(`Order #${shortId} is now: ${payload.new.status}`, { icon: '🛵' });
        
        // Push Real-Time Notification to Context
        addNotification({
          text: `Update on Order #${shortId}: Status changed to ${payload.new.status}`,
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        });
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const getProgress = (status) => {
    switch(status) {
      case 'ORDERED':
      case 'PLACED': return 10;
      case 'ACCEPTED': return 25;
      case 'PREPARING': return 45;
      case 'DISPATCHED': 
      case 'SHIPPED': return 75;
      case 'DELIVERED': return 100;
      default: return 5;
    }
  };



  const fetchOrders = async () => {
    try {
      if (!user) return;
      
      let resolvedUserId = user.id || user.uid;
      const isUUID = resolvedUserId && resolvedUserId.length === 36;
      
      if (!isUUID) {
        // Resolve from database
        const phoneNo = user.phoneNumber?.replace('+91', '') || user.phone?.replace('+91', '');
        const orFilters = [];
        if (user.uid) orFilters.push(`uid.eq.${user.uid}`);
        if (user.email) orFilters.push(`email.eq.${user.email}`);
        if (phoneNo) {
          orFilters.push(`phone.eq.${phoneNo}`);
          orFilters.push(`phone.eq.+91${phoneNo}`);
        }
        
        if (orFilters.length > 0) {
          const { data: usr } = await supabase
            .from('users')
            .select('id')
            .or(orFilters.join(','))
            .maybeSingle();
          if (usr) {
            resolvedUserId = usr.id;
          } else {
            resolvedUserId = null;
          }
        } else {
          resolvedUserId = null;
        }
      }

      // 1. Fetch orders from Supabase using resolved UUID
      let dbOrders = [];
      if (resolvedUserId && resolvedUserId.length === 36) {
        try {
          const { data, error } = await supabase
            .from('orders')
            .select(`
              *,
              stores(name, address, lat, lng),
              addresses(*),
              order_items(
                id,
                quantity,
                price_at_purchase,
                products(name)
              )
            `)
            .eq('user_id', resolvedUserId)
            .order('created_at', { ascending: false });
          
          if (!error && data) {
            dbOrders = data;
          }
        } catch (dbErr) {
          console.warn("Database fetch offline, using local storage orders fallback:", dbErr);
        }
      } else {
        console.warn("Could not resolve a valid 36-char user UUID, skipping Supabase query to avoid format crash.");
      }

      // 3. Format
      const formattedDbOrders = dbOrders.map(order => ({
        ...order,
        items: order.order_items?.map(oi => ({
          name: oi.products?.name || 'Item',
          type: oi.products?.type || 'essential',
          qty: oi.quantity,
          price: oi.price_at_purchase,
          store: order.stores?.name
        })) || []
      }));

      setActiveOrders(formattedDbOrders);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const [riderCoords, setRiderCoords] = useState(null);

  // Real-Time Supabase Rider Tracking
  useEffect(() => {
    const trackingStatuses = ['ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'];
    const activeShipment = activeOrders.find(o => trackingStatuses.includes(o.status));
    
    if (!activeShipment) return;

    // Supabase order rider tracking
    const targetRiderId = activeShipment.rider_id;

    const getInitialPos = async () => {
      let query = supabase.from('rider_locations').select('lat, lng, status');
      if (targetRiderId) {
        query = query.eq('rider_id', targetRiderId);
      } else {
        query = query.eq('status', 'ONLINE').order('updated_at', { ascending: false }).limit(1);
      }
      
      const { data } = await query.maybeSingle();
      const activeRider = Array.isArray(data) ? data[0] : data;
      
      if (activeRider && activeRider.status === 'ONLINE') {
        setRiderCoords({ lat: parseFloat(activeRider.lat), lng: parseFloat(activeRider.lng) });
      }
    };
    getInitialPos();

    const filterStr = targetRiderId ? `rider_id=eq.${targetRiderId}` : undefined;
    const channel = supabase
      .channel(`rider-tracking-global-${targetRiderId || 'general'}`)
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'rider_locations',
        ...(filterStr ? { filter: filterStr } : {})
      }, (payload) => {
        if (payload.new && payload.new.status === 'ONLINE') {
          setRiderCoords({ lat: parseFloat(payload.new.lat), lng: parseFloat(payload.new.lng) });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [activeOrders]);



  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="track-orders-page"
    >
      <div className="track-head-row">
         <div className="live-status">
           <div className="live-pulse"></div> 
           <span>{activeOrders.filter(o => o.status !== 'DELIVERED').length} ACTIVE ORDERS</span>
         </div>
      </div>

      <div className="orders-list-v2">
        {loading ? <p>Syncing neighborhood cloud...</p> : activeOrders.filter(o => o.status !== 'DELIVERED').map((order, i) => {
          const progress = getProgress(order.status);
          const firstItem = order.items?.[0] || { name: 'Order' };
          const itemCount = order.items?.length || 0;

          return (
            <motion.div 
              key={order.id}
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              className="tracking-card glass"
            >
              <div className="card-top">
                 <div className="shop-info">
                    <div className="shop-logo-box">
                       {firstItem.type === 'service' ? <Truck size={20} /> : <Package size={20} />}
                    </div>
                    <div>
                       <h4>{firstItem.provider || firstItem.store || 'Partner'}</h4>
                       <p>{firstItem.name} {itemCount > 1 ? `+ ${itemCount - 1} more` : ''}</p>
                    </div>
                 </div>
                 <div className="order-id-v2">#{order.id.slice(0, 8)}</div>
              </div>

              <div className="tracking-timeline">
                 <div className="timeline-progress-bg">
                    <motion.div 
                      className="timeline-progress-fill" 
                      initial={{ width: 0 }}
                      animate={{ width: `${progress}%` }}
                      transition={{ duration: 1.5, delay: 0.5 }}
                    ></motion.div>
                 </div>
                 <div className="timeline-labels">
                    <div className="label-item active"><CheckCircle size={14} /> Ordered</div>
                    <div className={`label-item ${progress >= 50 ? 'active' : ''}`}><Clock size={14} /> Shipped</div>
                    <div className={`label-item ${progress >= 90 ? 'active' : ''}`}><MapPin size={14} /> Delivery</div>
                 </div>
              </div>

              <div className="live-tracking-map-v4" style={{ height: '240px', overflow: 'hidden', borderRadius: '20px', position: 'relative', zIndex: 1, border: '1px solid rgba(0,0,0,0.05)' }}>
                {/* Embedded Fully Interactive Custom Leaflet Map Component */}
                <OrderTrackingMap order={order} riderCoords={riderCoords} />
                
                {/* Floating Overlay Info */}
                <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'white', padding: '8px 12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
                   <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: riderCoords ? '#22c55e' : '#94a3b8', animation: riderCoords ? 'pulse 2s infinite' : 'none' }}></div>
                   <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{riderCoords ? 'Live Tracking Active' : (order.status !== 'PLACED' ? 'Rider on the move' : 'Waiting for Rider...')}</span>
                </div>
              </div>

              <div className="tracking-meta-v4">
                <div className="eta-main">
                  <div className="eta-timer">
                    <Clock size={20} className="pulse-text" />
                    <span>
                      {order.status === 'PLACED' ? 'Confirming order...' : 
                       order.status === 'DELIVERED' ? 'Arrived!' : 
                       <>Arriving in <strong>{order.eta || '10 mins'}</strong></>}
                    </span>
                  </div>
                  <p className="eta-status">
                    {order.status === 'PLACED' ? 'Confirming order with nearby riders...' : 
                     order.status === 'ACCEPTED' ? 'Rider Assigned, heading to the store' :
                     order.status === 'PREPARING' ? 'Rider is at the store picking up' :
                     order.status === 'SHIPPED' || order.status === 'DISPATCHED' ? 'Rider is on the way to you' : 'Delivered'}
                  </p>
                </div>
                  <button className="rider-contact-btn" onClick={() => toast(`Opening chat with ${order.delivery_agent_name || 'Support'}...`)}>
                    <MessageCircle size={18} /> Chat
                  </button>
                
                <button className="rider-contact-btn" style={{ background: '#f1f5f9', color: '#475569', border: '1px solid #e2e8f0' }} onClick={() => setSelectedOrderDetails(order)}>
                  Details
                </button>
              </div>

              {((order.rider_id) || String(order.id).startsWith('local_')) && ['PREPARING', 'SHIPPED', 'DISPATCHED', 'DELIVERED'].includes(order.status) && (
                <div className="agent-small-info">
                   <img src={`https://i.pravatar.cc/150?u=${order.rider_id || order.id}`} alt="Agent" />
                   <p>{order.delivery_agent_name || 'Verified Partner'} • Verified Agent</p>
                </div>
              )}
            </motion.div>
          );
        })}
        {!loading && activeOrders.filter(o => o.status !== 'DELIVERED').length === 0 && (
          <div className="empty-orders-placeholder-card" style={{ border: 'none', background: 'transparent', boxShadow: 'none' }}>
            <div className="placeholder-icon" style={{ background: '#f1f5f9', color: '#94a3b8' }}>📦</div>
            <h3 style={{ color: '#64748b' }}>No Active Orders</h3>
            <p style={{ color: '#94a3b8' }}>You don't have any ongoing deliveries at the moment.</p>
          </div>
        )}
      </div>

      <div className="past-orders-shortcut">
         <h4>Previous Orders ({activeOrders.filter(o => o.status === 'DELIVERED').length})</h4>
          {activeOrders.filter(o => o.status === 'DELIVERED').map(order => (
            <div key={order.id} className="past-item-row" onClick={() => setSelectedOrderDetails(order)} style={{ cursor: 'pointer' }}>
               <div className="past-meta">
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  <p>{order.items?.[0]?.name || 'Order'} • ₹{order.total_price || order.total_amount}</p>
               </div>
               <div className="fulfilled-pill-small">Fulfilled</div>
               <ChevronRight size={16} color="#888" />
            </div>
         ))}
         {activeOrders.filter(o => o.status === 'DELIVERED').length === 0 && (
           <p className="no-past-p">No history available yet.</p>
         )}
      </div>

      {/* Order Details Modal */}
      {selectedOrderDetails && (
        <div className="past-order-modal-overlay" style={{
          position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
          background: 'rgba(0,0,0,0.5)', zIndex: 9999,
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
        }} onClick={() => setSelectedOrderDetails(null)}>
          <motion.div 
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
            className="past-order-modal-content"
            style={{
              width: '100%', maxWidth: '500px', background: '#fff', 
              borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
              padding: '24px', paddingBottom: '40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.1)'
            }}
            onClick={e => e.stopPropagation()}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700, color: '#0f172a' }}>Order Details</h3>
              <button onClick={() => setSelectedOrderDetails(null)} style={{ background: '#f1f5f9', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>
            
            <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: '#f8fafc', padding: '16px', borderRadius: '16px' }}>
              <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: '#e0e7ff', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#4f46e5' }}>
                <Store size={24} />
              </div>
              <div>
                <h4 style={{ margin: 0, fontSize: '1rem', color: '#1e293b' }}>{selectedOrderDetails.stores?.name || selectedOrderDetails.items?.[0]?.store || 'Passwala Partner'}</h4>
                <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}>
                  <Clock size={14} /> {selectedOrderDetails.status === 'DELIVERED' ? 'Delivered on' : 'Ordered on'} {new Date(selectedOrderDetails.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                </p>
              </div>
            </div>

            <div style={{ marginBottom: '24px' }}>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Items Summary</h4>
              <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', overflow: 'hidden' }}>
                {(selectedOrderDetails.items || []).map((item, idx) => (
                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: idx !== (selectedOrderDetails.items || []).length - 1 ? '1px solid #e2e8f0' : 'none', background: '#fff' }}>
                    <span style={{ color: '#334155', fontWeight: 500 }}>{item.quantity || 1}x {item.name || item.products?.name || 'Item'}</span>
                    <span style={{ color: '#0f172a', fontWeight: 600 }}>₹{item.price_at_purchase || item.price || 0}</span>
                  </div>
                ))}
                {(!selectedOrderDetails.items || selectedOrderDetails.items.length === 0) && (
                  <div style={{ padding: '12px 16px', color: '#64748b' }}>Details not available</div>
                )}
                <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: '#f8fafc', borderTop: '1px solid #e2e8f0' }}>
                  <span style={{ color: '#64748b', fontWeight: 600 }}>Total Paid</span>
                  <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>₹{selectedOrderDetails.total_price || selectedOrderDetails.total_amount}</span>
                </div>
              </div>
            </div>

            <div>
              <h4 style={{ margin: '0 0 12px 0', fontSize: '0.95rem', color: '#475569', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Payment Info</h4>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: '#f1f5f9', borderRadius: '12px' }}>
                <CreditCard size={20} color="#64748b" />
                <div>
                  <div style={{ color: '#334155', fontWeight: 600 }}>{selectedOrderDetails.payment_method || 'Paid Online'}</div>
                  <div style={{ color: '#64748b', fontSize: '0.85rem', marginTop: '2px' }}>Transaction ID: {selectedOrderDetails.id.split('-')[0]}</div>
                </div>
                <div style={{ marginLeft: 'auto', background: '#10b981', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '8px' }}>
                  SUCCESS
                </div>
              </div>
            </div>

          </motion.div>
        </div>
      )}

    </motion.div>
  );
};

export default TrackOrders;
