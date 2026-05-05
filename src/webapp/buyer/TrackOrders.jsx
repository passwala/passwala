/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { Package, Truck, CheckCircle, Clock, MapPin, ChevronRight, MessageCircle } from 'lucide-react';
import { toast } from 'react-hot-toast';
import './TrackOrders.css';
import { supabase } from '../../supabase';

const TrackOrders = ({ onBack, user }) => {
  const [activeOrders, setActiveOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchOrders();

    // REAL-TIME: Listen for order status updates
    const sub = supabase.channel('order_updates')
      .on('postgres_changes', { event: 'UPDATE', schema: 'public', table: 'orders' }, (payload) => {
        setActiveOrders(prev => prev.map(o => o.id === payload.new.id ? payload.new : o));
        toast.info(`Order #${payload.new.id.slice(0,4)} is now: ${payload.new.status}`);
      })
      .subscribe();

    return () => supabase.removeChannel(sub);
  }, []);

  const getProgress = (status) => {
    switch(status) {
      case 'ORDERED': return 10;
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
      const userId = user.uid || user.id;

      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          stores(name, address),
          order_items(
            id,
            quantity,
            price_at_purchase,
            products(name, type)
          )
        `)
        .eq('user_id', userId)
        .order('created_at', { ascending: false });
      
      if (error) throw error;
      
      // Map for easier usage in render
      const formattedData = (data || []).map(order => ({
        ...order,
        items: order.order_items.map(oi => ({
          name: oi.products?.name || 'Item',
          type: oi.products?.type || 'essential',
          qty: oi.quantity,
          price: oi.price_at_purchase,
          store: order.stores?.name
        }))
      }));

      setActiveOrders(formattedData);
    } catch (err) {
      console.error('Fetch orders error:', err);
    } finally {
      setLoading(false);
    }
  };

  const [riderCoords, setRiderCoords] = useState(null);

  useEffect(() => {
    let interval;
    const updateRiderPos = async () => {
      // TRACKING: Find orders where a rider is assigned and active
      const trackingStatuses = ['ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'];
      const activeShipment = activeOrders.find(o => trackingStatuses.includes(o.status));
      
      if (activeShipment?.rider_id) {
        const { data } = await supabase
          .from('rider_locations')
          .select('lat, lng, status')
          .eq('rider_id', activeShipment.rider_id)
          .maybeSingle();
        
        if (data && data.status === 'ONLINE') {
          setRiderCoords({ lat: data.lat, lng: data.lng });
        }
      }
    };

    const hasActiveTracking = activeOrders.some(o => 
      ['ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'].includes(o.status)
    );

    if (hasActiveTracking) {
      updateRiderPos();
      interval = setInterval(updateRiderPos, 10000);
    }
    return () => clearInterval(interval);
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
        {loading ? <p>Syncing neighborhood cloud...</p> : activeOrders.map((order, i) => {
          const progress = getProgress(order.status);
          const firstItem = order.items?.[0] || { name: 'Order' };
          const itemCount = order.items?.length || 0;
          const displayLat = riderCoords?.lat || 23.0225;
          const displayLng = riderCoords?.lng || 72.5714;

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

                <div className="live-tracking-map-v4" style={{ height: '240px', overflow: 'hidden', borderRadius: '20px', position: 'relative' }}>
                  <iframe 
                    width="100%" 
                    height="100%" 
                    frameBorder="0" 
                    src={`https://www.openstreetmap.org/export/embed.html?bbox=${displayLng-0.01},${displayLat-0.01},${displayLng+0.01},${displayLat+0.01}&layer=mapnik&marker=${displayLat},${displayLng}`}
                    style={{ border: 'none', filter: 'grayscale(0.2) contrast(1.1)' }}
                  ></iframe>
                  
                  {/* Floating Overlay Info */}
                  <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'white', padding: '8px 12px', borderRadius: '12px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px' }}>
                     <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: riderCoords ? '#22c55e' : '#94a3b8', animation: riderCoords ? 'pulse 2s infinite' : 'none' }}></div>
                     <span style={{ fontSize: '0.75rem', fontWeight: 700 }}>{riderCoords ? 'Live Tracking Active' : 'Waiting for Rider...'}</span>
                  </div>
                </div>

                <div className="tracking-meta-v4">
                  <div className="eta-main">
                    <div className="eta-timer">
                      <Clock size={20} className="pulse-text" />
                      <span>Arriving in <strong>{order.eta || '8 mins'}</strong></span>
                    </div>
                    <p className="eta-status">{order.status === 'SHIPPED' ? 'Rider is on the way to you' : 'Store is preparing your order'}</p>
                  </div>
                  <button className="rider-contact-btn" onClick={() => toast(`Opening chat with ${order.delivery_agent_name || 'Rider'}...`)}>
                    <MessageCircle size={18} /> Chat
                  </button>
                </div>
                <div className="eta-section">
                  <div className="eta-big">
                    <span>Estimated Arrival</span>
                    <strong>{order.eta || 'Calculating...'}</strong>
                  </div>
                  <button className="chat-agent-btn" onClick={() => toast(`Chatting with ${order.delivery_agent_name}...`)}>
                    <MessageCircle size={18} /> Chat
                  </button>
                </div>

              <div className="agent-small-info">
                 <img src={`https://i.pravatar.cc/150?u=${order.id}`} alt="Agent" />
                 <p>{order.delivery_agent_name} • Verified Partner</p>
              </div>
            </motion.div>
          );
        })}
      </div>

      <div className="past-orders-shortcut">
         <h4>Previous Orders ({activeOrders.filter(o => o.status === 'DELIVERED').length})</h4>
         {activeOrders.filter(o => o.status === 'DELIVERED').map(order => (
            <div key={order.id} className="past-item-row" onClick={() => toast('Opening past order details...')}>
               <div className="past-meta">
                  <span>{new Date(order.created_at).toLocaleDateString()}</span>
                  <p>{order.items?.[0]?.name || 'Order'} • ₹{order.total_price}</p>
               </div>
               <div className="fulfilled-pill-small">Fulfilled</div>
               <ChevronRight size={16} color="#888" />
            </div>
         ))}
         {activeOrders.filter(o => o.status === 'DELIVERED').length === 0 && (
           <p className="no-past-p">No history available yet.</p>
         )}
      </div>
    </motion.div>
  );
};

export default TrackOrders;
