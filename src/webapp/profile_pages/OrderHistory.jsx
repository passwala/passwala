/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ShoppingBag, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle,
  MapPin
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';
import { useTranslation } from '../LanguageContext';
import './ProfilePages.css';

const OrderHistory = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

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
      const userId = savedUser.id || savedUser.uid;

      let query = supabase
        .from('orders')
        .select('*, addresses(society)')
        .order('created_at', { ascending: false });
      
      // If we have a user ID, filter by it
      if (userId) {
        query = query.eq('user_id', userId);
      }

      const { data, error } = await query;
      
      if (error) throw error;
      setOrders(data || []);
    } catch (err) {
      console.error('Error fetching orders:', err);
    } finally {
      setLoading(false);
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
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="profile-sub-page"
    >
      <header className="sub-page-header">
        <button className="back-btn-profile" onClick={() => navigate('/profile')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Order History</h1>
      </header>

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
                      <div className="order-status-badge">
                         {getStatusIcon(order.status)}
                         <span>{order.status || 'Processing'}</span>
                      </div>
                  </div>
                  <div className="order-card-items">
                     <p>{order.items?.length || 0} items purchased</p>
                     <strong>₹{order.total_amount || 0}</strong>
                  </div>
                  <div className="order-card-footer">
                     <button className="reorder-btn">View Details</button>
                     <ChevronRight size={18} />
                  </div>
                </motion.div>
              ))
            )}
          </div>
        )}
      </main>
    </motion.div>
  );
};

export default OrderHistory;
