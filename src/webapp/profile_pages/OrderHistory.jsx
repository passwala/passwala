import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { 
  ArrowLeft, 
  ShoppingBag, 
  ChevronRight, 
  Clock, 
  CheckCircle2, 
  XCircle,
  AlertCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
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
  }, []);

  const fetchOrders = async () => {
    try {
      setLoading(true);
      // In a real app, we'd filter by current user
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .order('created_at', { ascending: false });
      
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
                        <span>{new Date(order.created_at).toLocaleDateString()}</span>
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
