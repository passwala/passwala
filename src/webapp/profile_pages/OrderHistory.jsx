import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ShoppingBag, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  MapPin,
  X,
  Store,
  CreditCard
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';
import './ProfilePages.css';

const _ = motion;

const OrderHistory = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedOrderDetails, setSelectedOrderDetails] = useState(null);

  useEffect(() => {
    fetchOrders();

    // ⚡ REAL-TIME: Listen for status updates on orders
    const channel = supabase
      .channel('buyer-order-updates')
      .on('postgres_changes', { 
        event: '*', 
        schema: 'public', 
        table: 'orders' 
      }, (payload) => {
        // If an order status changed, refresh the list
        fetchOrders();
        
        // If the new status is DELIVERED, show a celebratory toast
        if (payload.new && payload.new.status === 'DELIVERED') {
           toast.success("Your order has been delivered! Enjoy!", { icon: '🎁' });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // Get current user ID if available
      const savedUser = JSON.parse(localStorage.getItem('passwala_user') || '{}');
      let resolvedUserId = savedUser.id || savedUser.uid;
      
      const isUUID = resolvedUserId && resolvedUserId.length === 36;
      
      if (!isUUID && resolvedUserId) {
        // Resolve from database
        const phoneNo = savedUser.phoneNumber?.replace('+91', '') || savedUser.phone?.replace('+91', '');
        const orFilters = [];
        if (savedUser.uid) orFilters.push(`uid.eq.${savedUser.uid}`);
        if (savedUser.email) orFilters.push(`email.eq.${savedUser.email}`);
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

      let dbOrders = [];
      if (resolvedUserId && resolvedUserId.length === 36) {
        const apiBase = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const res = await fetch(`${apiBase}/api/orders/user-history/${resolvedUserId}`);
        if (!res.ok) throw new Error(`HTTP error! status: ${res.status}`);
        dbOrders = await res.json();
      } else {
        console.warn("Could not resolve a valid 36-char user UUID for OrderHistory, skipping query to avoid Postgres UUID cast crash.");
      }

      // Parse society dynamically from address_line_1 if not present or generic
      const processedOrders = dbOrders.map(order => {
        if (!order.addresses) {
          order.addresses = {
            id: 'fallback-addr',
            address_line_1: 'Thaltej, Ahmedabad',
            city: 'Ahmedabad',
            state: 'Gujarat',
            pincode: '380054',
            society: 'Thaltej, Ahmedabad',
            lat: 23.0753,
            lng: 72.5244
          };
        } else {
          if (!order.addresses.society || order.addresses.society.toLowerCase() === 'ahmedabad') {
            if (order.addresses.address_line_1 && order.addresses.address_line_1 !== 'Geo-location Pending') {
              const parts = order.addresses.address_line_1.split(',').map(p => p.trim());
              const lastPart = parts[parts.length - 1] || '';
              if (lastPart.toLowerCase() === 'ahmedabad') {
                order.addresses.society = parts[parts.length - 2] || parts[0] || 'Thaltej';
              } else {
                order.addresses.society = lastPart || 'Thaltej';
              }
            } else {
              order.addresses.address_line_1 = 'Thaltej, Ahmedabad';
              order.addresses.society = 'Thaltej';
            }
          }
        }

        // Map order_items to items
        order.items = order.order_items?.map(oi => ({
          name: oi.products?.name || 'Essential Item',
          qty: oi.quantity || 1,
          price: oi.price_at_purchase || 0
        })) || [];

        return order;
      });

      // 🔄 FAIL-SAFE: If any order has 0 items mapped (due to any Postgres join/caching issues in browser),
      // fetch its order items directly by order_id to guarantee they are loaded successfully!
      try {
        await Promise.all(processedOrders.map(async (order) => {
          if (!order.items || order.items.length === 0) {
            const { data: directItems, error: directErr } = await supabase
              .from('order_items')
              .select(`
                id,
                quantity,
                price_at_purchase,
                products(name)
              `)
              .eq('order_id', order.id);
            
            if (!directErr && directItems && directItems.length > 0) {
              order.items = directItems.map(oi => ({
                name: oi.products?.name || 'Essential Item',
                qty: oi.quantity || 1,
                price: oi.price_at_purchase || 0
              }));
            }
          }
        }));
      } catch (fallbackErr) {
        console.warn("Direct order items fallback fetch warning:", fallbackErr);
      }

      setOrders(processedOrders);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (order) => {
    setSelectedOrderDetails(order);

    // On-demand direct fetch if items are empty in the modal
    if (!order.items || order.items.length === 0) {
      try {
        const { data: directItems, error: directErr } = await supabase
          .from('order_items')
          .select(`
            id,
            quantity,
            price_at_purchase,
            products(name)
          `)
          .eq('order_id', order.id);
        
        if (!directErr && directItems && directItems.length > 0) {
          const mappedItems = directItems.map(oi => ({
            name: oi.products?.name || 'Essential Item',
            qty: oi.quantity || 1,
            price: oi.price_at_purchase || 0
          }));
          
          // Update the orders list state so the card dynamically updates from 0 to correct count!
          setOrders(prev => prev.map(o => o.id === order.id ? { ...o, items: mappedItems } : o));
          // Update the modal details state
          setSelectedOrderDetails(prev => prev && prev.id === order.id ? { ...prev, items: mappedItems } : prev);
        }
      } catch (err) {
        console.warn("Could not fetch order items on-demand for modal:", err);
      }
    }
  };

  const getStatusIcon = (status) => {
    switch (status?.toUpperCase()) {
      case 'DELIVERED': return <CheckCircle2 size={16} color="#10b981" />;
      case 'CANCELLED': return <XCircle size={16} color="#ef4444" />;
      case 'PENDING': return <Clock size={16} color="#f59e0b" />;
      default: return <AlertCircle size={16} color="#64748b" />;
    }
  };

  return (
    <>
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        exit={{ opacity: 0, x: -20 }}
        className="profile-sub-page"
      >
        <main className="sub-page-content">
          {loading ? (
            <div className="discovery-loading">
              <div className="spinner"></div>
              <p>Gathering your past orders...</p>
            </div>
          ) : (
            <div className="orders-list-profile">
              {orders.length === 0 ? (
                 <div className="empty-state-profile">
                    <ShoppingBag size={48} />
                    <h3>No orders yet</h3>
                    <p>When you place an order, it will appear here.</p>
                    <button onClick={() => navigate('/near-shops')} className="shop-now-btn">Shop Now</button>
                 </div>
              ) : (
                orders.map((order, i) => (
                  <motion.div 
                    key={order.id}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.05 }}
                    className="order-history-card glass"
                  >
                    <div className="order-card-top">
                        <div className="order-main-info">
                           <strong>Order #{order.id.toString().slice(0, 8)}</strong>
                           <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.75rem', color: '#64748b' }}>
                              <Clock size={12} /> {new Date(order.created_at).toLocaleDateString()}
                           </span>
                           {order.addresses?.society && (
                              <span style={{ color: 'var(--rider-primary)', fontSize: '0.75rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '4px', marginTop: '2px' }}>
                                 <MapPin size={12} /> {order.addresses.society}
                              </span>
                           )}
                        </div>
                        <div className={`order-status-badge status-${order.status?.toLowerCase() || 'pending'}`}>
                           {getStatusIcon(order.status)}
                           <span>{order.status || 'Processing'}</span>
                        </div>
                    </div>
                    <div className="order-card-items">
                       <p>{order.items?.reduce((sum, item) => sum + (item.qty || 0), 0) || 0} items purchased</p>
                       <strong>₹{order.total_amount || 0}</strong>
                    </div>
                     <div className="order-card-footer" onClick={() => handleViewDetails(order)} style={{ cursor: 'pointer' }}>
                        <button className="reorder-btn" onClick={(e) => { e.stopPropagation(); handleViewDetails(order); }}>View Details</button>
                        <ChevronRight size={18} />
                     </div>
                  </motion.div>
                ))
              )}
            </div>
          )}
        </main>
      </motion.div>

      <AnimatePresence>
        {selectedOrderDetails && (
          <div className="past-order-modal-overlay" style={{
            position: 'fixed', top: 0, left: 0, width: '100%', height: '100%',
            background: 'rgba(0,0,0,0.6)', zIndex: 99999,
            display: 'flex', alignItems: 'flex-end', justifyContent: 'center'
          }} onClick={() => setSelectedOrderDetails(null)}>
            <motion.div 
              initial={{ y: '100%' }}
              animate={{ y: 0 }}
              exit={{ y: '100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 300 }}
              className="past-order-modal-content"
              style={{
                width: '100%', maxWidth: '500px', background: 'var(--bg-soft, #fff)', 
                borderTopLeftRadius: '24px', borderTopRightRadius: '24px',
                padding: '24px', paddingBottom: '40px', boxShadow: '0 -10px 40px rgba(0,0,0,0.3)',
                border: '1px solid var(--border-light, #e2e8f0)',
                color: 'var(--text-primary, #0f172a)'
              }}
              onClick={e => e.stopPropagation()}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, fontSize: '1.25rem', fontWeight: 800, color: 'var(--text-primary, #0f172a)' }}>Order Details</h3>
                <button onClick={() => setSelectedOrderDetails(null)} style={{ background: 'var(--border-light, #f1f5f9)', border: 'none', borderRadius: '50%', padding: '8px', cursor: 'pointer', color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <X size={20} />
                </button>
              </div>
              
              <div style={{ display: 'flex', gap: '12px', marginBottom: '24px', background: 'rgba(0, 0, 0, 0.02)', padding: '16px', borderRadius: '16px', border: '1px solid var(--border-light, #f1f5f9)' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '12px', background: 'rgba(255, 107, 0, 0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary, #ff7622)' }}>
                  <Store size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontSize: '1rem', color: 'var(--text-primary, #1e293b)' }}>{selectedOrderDetails.stores?.name || selectedOrderDetails.items?.[0]?.store || 'Passwala Grocery Partner'}</h4>
                  <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'var(--text-secondary, #64748b)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                    <Clock size={14} /> Ordered on {new Date(selectedOrderDetails.created_at).toLocaleString([], { dateStyle: 'medium', timeStyle: 'short' })}
                  </p>
                </div>
              </div>

              {/* Address Section */}
              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>
                  Delivery Address
                </h4>
                <div style={{ display: 'flex', alignItems: 'flex-start', gap: '12px', padding: '16px', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '16px', border: '1px solid var(--border-light, #f1f5f9)' }}>
                  <MapPin size={20} color="var(--primary, #ff7622)" style={{ marginTop: '2px', flexShrink: 0 }} />
                  <div>
                    <div style={{ color: 'var(--text-primary, #1e293b)', fontWeight: 700, fontSize: '0.95rem' }}>{selectedOrderDetails.addresses?.society || 'Thaltej'}</div>
                    <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem', marginTop: '4px', lineHeight: 1.4 }}>{selectedOrderDetails.addresses?.address_line_1 || ''}</div>
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: '24px' }}>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Items Summary</h4>
                <div style={{ border: '1px solid var(--border-light, #e2e8f0)', borderRadius: '12px', overflow: 'hidden' }}>
                  {(selectedOrderDetails.items || []).map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', borderBottom: idx !== (selectedOrderDetails.items || []).length - 1 ? '1px solid var(--border-light, #e2e8f0)' : 'none', background: 'transparent' }}>
                      <span style={{ color: 'var(--text-primary, #334155)', fontWeight: 500 }}>{item.qty || 1}x {item.name || 'Item'}</span>
                      <span style={{ color: 'var(--text-primary, #0f172a)', fontWeight: 600 }}>₹{((item.price || 0) * (item.qty || 1)).toFixed(2)}</span>
                    </div>
                  ))}
                  {(!selectedOrderDetails.items || selectedOrderDetails.items.length === 0) && (
                    <div style={{ padding: '12px 16px', color: 'var(--text-secondary, #64748b)' }}>Details not available</div>
                  )}
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: '12px 16px', background: 'rgba(0, 0, 0, 0.03)', borderTop: '1px solid var(--border-light, #e2e8f0)' }}>
                    <span style={{ color: 'var(--text-secondary, #64748b)', fontWeight: 700 }}>Total Paid</span>
                    <span style={{ color: '#10b981', fontWeight: 800, fontSize: '1.1rem' }}>₹{(selectedOrderDetails.total_amount || 0).toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div>
                <h4 style={{ margin: '0 0 12px 0', fontSize: '0.85rem', color: 'var(--text-secondary, #475569)', textTransform: 'uppercase', letterSpacing: '0.5px', fontWeight: 700 }}>Payment Info</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px', padding: '16px', background: 'rgba(0, 0, 0, 0.02)', borderRadius: '12px', border: '1px solid var(--border-light, #f1f5f9)' }}>
                  <CreditCard size={20} color="var(--text-secondary, #64748b)" />
                  <div>
                    <div style={{ color: 'var(--text-primary, #334155)', fontWeight: 600 }}>{selectedOrderDetails.payment_method || 'Paid Online'}</div>
                    <div style={{ color: 'var(--text-secondary, #64748b)', fontSize: '0.85rem', marginTop: '2px' }}>
                      Transaction ID: {selectedOrderDetails.id ? (typeof selectedOrderDetails.id === 'string' ? selectedOrderDetails.id.split('-')[0].toUpperCase() : String(selectedOrderDetails.id)) : ''}
                    </div>
                  </div>
                  <div style={{ marginLeft: 'auto', background: '#10b981', color: 'white', fontSize: '0.75rem', fontWeight: 700, padding: '4px 8px', borderRadius: '8px' }}>
                    {selectedOrderDetails.status || 'SUCCESS'}
                  </div>
                </div>
              </div>

            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};

export default OrderHistory;
