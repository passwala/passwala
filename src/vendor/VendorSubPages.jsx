import React from 'react';
import { Package, FileText, IndianRupee, Wallet, Star, Bell, HelpCircle, CheckCircle, Clock, MapPin, Download, ArrowUpRight, ArrowDownRight, Tag, Trash2, PackagePlus, Camera } from 'lucide-react';
import { supabase } from '../supabase';
import { motion, AnimatePresence } from 'framer-motion';

export const VendorInventory = ({ businessType }) => {
  const [items, setItems] = React.useState([]);
  const [showForm, setShowForm] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ name: '', detail: '', price: '', image: null });

  React.useEffect(() => {
    const fetchCatalog = async () => {
       try {
         const { data, error } = await supabase.from('products').select('*').order('created_at', { ascending: false });
         if (!error && data) {
            setItems(data.map(p => ({
               id: p.id,
               name: p.name,
               detail: p.description,
               price: p.price,
               image: p.image_url
            })));
         }
       } catch (err) {
         console.error('Failed to load catalog:', err);
       }
    };
    fetchCatalog();
  }, []);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    
    try {
       const { data, error } = await supabase.from('products').insert([{
         name: newItem.name,
         description: newItem.detail || 'Added Manually',
         price: parseFloat(newItem.price),
         image_url: newItem.image,
         is_active: true
       }]).select();

       if (error) {
          alert('Error saving product: ' + error.message);
          return;
       }

       if (data && data[0]) {
           const dbItem = data[0];
           setItems([{
             id: dbItem.id,
             name: dbItem.name,
             detail: dbItem.description,
             price: dbItem.price,
             image: dbItem.image_url
           }, ...items]);
       }

       setNewItem({ name: '', detail: '', price: '', image: null });
       setShowForm(false);
    } catch (err) {
       console.error("Failed to sync:", err);
       alert("Network connection error.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this item from catalog?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        alert('Error deleting product');
        return;
      }
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
    }
  };

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fff7ed' }}>
              <Package size={20} color="#f97316" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#f97316' }}>Inventory Management</span>
          </div>
          <h1 className="v-hero-title">{businessType === 'shop' ? 'Product Catalog' : 'My Services'}</h1>
          <p className="v-hero-subtitle">Manage your digital storefront and price list</p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => setShowForm(true)} 
          className="v-btn-secondary"
        >
          <PackagePlus size={20} />
          New {businessType === 'shop' ? 'Product' : 'Service'}
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            style={{ 
              background: 'white', 
              padding: '2.5rem', 
              borderRadius: '24px', 
              border: '1px solid #e2e8f0', 
              marginBottom: '3rem', 
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.08)' 
            }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
              <h3 style={{ margin: 0, fontWeight: 900, fontSize: '1.25rem' }}>Add New {businessType === 'shop' ? 'Item' : 'Service'}</h3>
              <button onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', border: 'none', width: '32px', height: '32px', borderRadius: '50%', cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center' }}><Trash2 size={16} /></button>
            </div>
            
            <form style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }} onSubmit={handleAdd}>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.5rem' }}>
                <div className="v-form-group">
                  <label>Item Name</label>
                  <input required type="text" className="v-input" placeholder="E.g. Fresh Milk 1L" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div className="v-form-group">
                  <label>Price (₹)</label>
                  <input required type="number" className="v-input" placeholder="0.00" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                </div>
              </div>
              
              <div className="v-form-group">
                 <label>Short Description</label>
                 <input type="text" className="v-input" placeholder="E.g. Organic, available daily" value={newItem.detail} onChange={e => setNewItem({...newItem, detail: e.target.value})} />
              </div>

              <div className="v-form-group">
                 <label>Visual Representation</label>
                 <div 
                   style={{ 
                     border: '2px dashed #e2e8f0', 
                     borderRadius: '16px', 
                     padding: '2rem', 
                     textAlign: 'center', 
                     background: '#f8fafc',
                     cursor: 'pointer',
                     transition: 'all 0.2s'
                   }}
                   onClick={() => document.getElementById('inventory-upload').click()}
                   onMouseOver={(e) => e.currentTarget.style.borderColor = '#0ea5e9'}
                   onMouseOut={(e) => e.currentTarget.style.borderColor = '#e2e8f0'}
                 >
                   <input 
                     id="inventory-upload"
                     type="file" 
                     hidden
                     accept="image/*" 
                     onChange={(e) => {
                       const file = e.target.files[0];
                       if(file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setNewItem({...newItem, image: reader.result});
                          reader.readAsDataURL(file);
                       }
                     }} 
                   />
                   {newItem.image ? (
                     <div style={{ position: 'relative', width: '120px', height: '120px', margin: '0 auto' }}>
                        <img src={newItem.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                        <div style={{ position: 'absolute', top: '-8px', right: '-8px', background: 'white', borderRadius: '50%', padding: '4px', boxShadow: '0 2px 4px rgba(0,0,0,0.1)' }} onClick={(e) => { e.stopPropagation(); setNewItem({...newItem, image: null}); }}><Trash2 size={14} color="#ef4444" /></div>
                     </div>
                   ) : (
                     <div>
                       <Camera size={32} color="#94a3b8" style={{ marginBottom: '12px' }} />
                       <p style={{ margin: 0, fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Click to upload product image</p>
                       <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Supports JPG, PNG (Max 2MB)</p>
                     </div>
                   )}
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                  <button type="button" onClick={() => setShowForm(false)} className="v-btn-outline" style={{ padding: '12px 28px' }}>Discard</button>
                  <button type="submit" className="v-btn-primary">Publish Item</button>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      {items.length === 0 ? (
        <div style={{ padding: '6rem 2rem', textAlign: 'center', background: 'white', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
           <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
             <Package size={40} color="#94a3b8" />
           </div>
           <h3 style={{ fontWeight: 900, color: '#1e293b', marginBottom: '0.5rem' }}>No items in catalog</h3>
           <p style={{ color: '#64748b', maxWidth: '300px', margin: '0 auto 2rem auto', lineHeight: 1.5 }}>Start adding your products or services to reach more customers in your area.</p>
           <button onClick={() => setShowForm(true)} className="v-btn-primary" style={{ margin: '0 auto' }}>Create First Listing</button>
        </div>
      ) : (
        <div className="v-grid-auto">
          {items.map((item, idx) => (
            <motion.div 
              key={item.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              whileHover={{ y: -8 }}
              className="v-data-card"
              style={{ padding: 0, overflow: 'hidden' }}
            >
              <div style={{ position: 'relative', height: '180px', background: '#f8fafc' }}>
                {item.image ? (
                  <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                ) : (
                  <div style={{ width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Tag size={40} color="#cbd5e1" />
                  </div>
                )}
                <div style={{ position: 'absolute', top: '12px', right: '12px', display: 'flex', gap: '8px' }}>
                  <button onClick={() => handleDelete(item.id)} style={{ background: 'rgba(255, 255, 255, 0.9)', color: '#ef4444', border: 'none', width: '32px', height: '32px', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                    <Trash2 size={16} />
                  </button>
                </div>
                <div style={{ position: 'absolute', bottom: '12px', left: '12px' }}>
                  <span className="v-badge-success" style={{ fontSize: '0.7rem', padding: '4px 10px', borderRadius: '8px', fontWeight: 800, textTransform: 'uppercase', boxShadow: '0 4px 6px rgba(0,0,0,0.05)' }}>In Stock</span>
                </div>
              </div>
              
              <div style={{ padding: '1.25rem', flex: 1, display: 'flex', flexDirection: 'column' }}>
                <h4 style={{ margin: '0 0 4px 0', fontWeight: 800, fontSize: '1.1rem', color: '#1e293b' }}>{item.name}</h4>
                <p style={{ margin: '0 0 1.25rem 0', fontSize: '0.85rem', color: '#64748b', flex: 1 }}>{item.detail || 'No description provided.'}</p>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'baseline', gap: '2px' }}>
                    <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#0f172a' }}>₹</span>
                    <span style={{ fontSize: '1.25rem', fontWeight: 900, color: '#0f172a' }}>{item.price}</span>
                  </div>
                  <button className="v-btn-outline" style={{ padding: '6px 12px', borderRadius: '10px', fontSize: '0.75rem', fontWeight: 700 }}>Edit Details</button>
                </div>
              </div>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  );
};

export const VendorOrders = ({ businessType }) => {
  const [activeTab, setActiveTab] = React.useState('active');
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchOrders = async (isInitial = false) => {
    try {
      if (isInitial) setLoading(true);
      const { data, error } = await supabase
        .from('orders')
        .select(`
          *,
          users(full_name, phone),
          addresses(society),
          order_items(quantity, price_at_purchase, products(name))
        `)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error) setOrders(data || []);
    } catch (err) {
      console.error("Order fetch failed:", err);
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    fetchOrders(true);
    const channel = supabase
      .channel('vendor-orders-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders(false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  const updateStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      // Background refresh will handle the UI update via Supabase Realtime
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'PLACED': return { bg: '#fff7ed', text: '#f97316', dot: '#f97316', label: 'New Order' };
      case 'PREPARING': return { bg: '#eff6ff', text: '#3b82f6', dot: '#3b82f6', label: 'Preparing' };
      case 'SHIPPED': return { bg: '#faf5ff', text: '#a855f7', dot: '#a855f7', label: 'Out for Delivery' };
      case 'DELIVERED': return { bg: '#f0fdf4', text: '#22c55e', dot: '#22c55e', label: 'Delivered' };
      default: return { bg: '#f1f5f9', text: '#64748b', dot: '#64748b', label: status };
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '6rem' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1, ease: "linear" }}>
        <Clock size={40} color="#f97316" />
      </motion.div>
      <p style={{ marginTop: '1.5rem', fontWeight: 800, color: '#64748b' }}>Refreshing order station...</p>
    </div>
  );

  return (
    <div className="v-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fef2f2' }}>
              <FileText size={24} color="#ef4444" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#ef4444' }}>Order Station</span>
          </div>
          <h1 className="v-hero-title">Live Fulfillment</h1>
          <p className="v-hero-subtitle">Live tracking and fulfillment management</p>
        </div>
      </div>

      <div className="v-tab-group">
        {['active', 'history'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`v-tab-btn ${activeTab === tab ? 'active' : ''}`}
          >
            {tab === 'active' ? 'Live Orders' : 'Order History'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        {orders.filter(o => activeTab === 'active' ? o.status !== 'DELIVERED' : o.status === 'DELIVERED').map((order, i) => {
          const style = getStatusStyle(order.status);
          return (
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.1 }}
              key={order.id} 
              style={{ 
                background: 'white', borderRadius: '24px', padding: '1.75rem', 
                border: '1px solid #f1f5f9', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)',
                position: 'relative', overflow: 'hidden'
              }}
              whileHover={{ y: -4, boxShadow: '0 20px 25px -5px rgba(0,0,0,0.05)' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '6px', height: '100%', background: style.dot }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '6px' }}>
                    <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>#ORD-{order.id.substring(0, 6).toUpperCase()}</span>
                    {order.status === 'PLACED' && <div className="v-pulse-badge" style={{ padding: '2px 8px', background: '#ef4444', color: 'white', borderRadius: '6px', fontSize: '0.65rem', fontWeight: 900 }}>LIVE</div>}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: '#64748b', fontSize: '0.85rem', fontWeight: 600 }}>
                    <Clock size={14} /> {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', borderRadius: '12px', 
                  background: style.bg, color: style.text, fontSize: '0.8rem', fontWeight: 800, border: `1px solid ${style.dot}20`
                }}>
                  <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: style.dot }}></div>
                  {style.label}
                </div>
              </div>

              <div style={{ display: 'flex', gap: '2rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                <div style={{ flex: 1, minWidth: '200px' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', background: '#f1f5f9', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Star size={14} color="#64748b" fill="#64748b" />
                    </div>
                    <span style={{ fontWeight: 800, color: '#1e293b' }}>{order.users?.full_name || 'Anonymous Partner'}</span>
                  </div>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#64748b', fontSize: '0.9rem' }}>
                    <MapPin size={16} color="var(--v-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontWeight: 600 }}>{order.addresses?.society || 'Location Pending'}</span>
                  </div>
                </div>
                
                <div style={{ minWidth: '120px', textAlign: 'right' }}>
                   <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 700, textTransform: 'uppercase' }}>Payout Value</p>
                   <p style={{ margin: 0, fontSize: '1.75rem', fontWeight: 900, color: '#0f172a' }}>₹{order.total_amount}</p>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '16px', padding: '1rem', marginBottom: '1.5rem' }}>
                 <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Items to Fulfill</p>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                    {order.order_items?.map((item, idx) => (
                      <span key={idx} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '4px 10px', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>
                        {item.quantity}x {item.products?.name}
                      </span>
                    )) || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Load items details...</span>}
                 </div>
              </div>

                 <div style={{ display: 'flex', gap: '1rem' }}>
                {order.status === 'PLACED' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'PREPARING')}
                    className="v-btn-primary"
                    style={{ flex: 1 }}
                  >
                    Accept Order
                  </button>
                )}
                {order.status === 'PREPARING' && (
                  <button 
                    onClick={() => updateStatus(order.id, 'SHIPPED')}
                    className="v-btn-primary"
                    style={{ flex: 1, background: '#16a34a', boxShadow: '0 8px 20px rgba(22, 163, 74, 0.2)' }}
                  >
                    Ready for Pickup
                  </button>
                )}
                <button className="v-btn-outline" style={{ padding: '14px 24px' }}>
                  Details
                </button>
              </div>
            </motion.div>
          );
        })}
        {orders.length === 0 && (
          <div style={{ padding: '6rem 2rem', textAlign: 'center', background: 'white', borderRadius: '32px', border: '2px dashed #e2e8f0' }}>
             <Package size={48} color="#cbd5e1" style={{ margin: '0 auto 1.5rem auto' }} />
             <h3 style={{ fontWeight: 900, color: '#1e293b' }}>No live orders</h3>
             <p style={{ color: '#64748b', margin: '0.5rem 0' }}>Your upcoming bookings will appear here instantly.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export const VendorEarnings = () => (
   <div className="v-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
    <div className="v-hero-section">
      <div className="v-hero-info">
        <div className="v-hero-badge">
          <div className="v-hero-badge-icon" style={{ background: '#dcfce7' }}>
            <IndianRupee size={24} color="#166534" />
          </div>
          <span className="v-hero-badge-text" style={{ color: '#166534' }}>Revenue Center</span>
        </div>
        <h1 className="v-hero-title">Business Earnings</h1>
        <p className="v-hero-subtitle">Real-time business performance & analytics</p>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: '1.5rem', marginBottom: '2.5rem' }}>
      <motion.div 
        whileHover={{ y: -5 }}
        style={{ background: 'white', padding: '2rem', borderRadius: '28px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '44px', height: '44px', background: '#f0fdf4', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={22} color="#22c55e" />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#22c55e', background: '#dcfce7', padding: '4px 10px', borderRadius: '8px' }}>+12% vs LW</span>
        </div>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Weekly Revenue</p>
        <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 900, color: '#0f172a' }}>₹14,500</h2>
      </motion.div>

      <motion.div 
        whileHover={{ y: -5 }}
        style={{ background: 'white', padding: '2rem', borderRadius: '28px', border: '1px solid #f1f5f9', boxShadow: '0 4px 6px rgba(0,0,0,0.02)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
          <div style={{ width: '44px', height: '44px', background: '#eff6ff', borderRadius: '14px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={22} color="#3b82f6" />
          </div>
          <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#3b82f6', background: '#dbeafe', padding: '4px 10px', borderRadius: '8px' }}>Active</span>
        </div>
        <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase' }}>Orders Fulfilled</p>
        <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 900, color: '#0f172a' }}>128</h2>
      </motion.div>
    </div>
    
    <div style={{ background: 'white', padding: '2.5rem', borderRadius: '32px', border: '1px solid #f1f5f9', height: '300px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '1rem', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
       <div style={{ width: '64px', height: '64px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', border: '2px dashed #e2e8f0' }}>
         <IndianRupee size={32} opacity={0.3} />
       </div>
       <p style={{ fontWeight: 800, fontSize: '1rem' }}>Revenue Analytics Syncing...</p>
       <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Your earnings visualization is being prepared.</p>
    </div>
  </div>
);

export const VendorWallet = () => {
  const [balance, setBalance] = React.useState(0);
  const transactions = [
    { id: 1, type: 'credit', amount: 1200, status: 'Completed', date: 'Today, 2:30 PM', label: 'Order #8821' },
    { id: 2, type: 'debit', amount: 4500, status: 'Processing', date: 'Yesterday', label: 'Bank Withdrawal' },
    { id: 3, type: 'credit', amount: 850, status: 'Completed', date: '2 days ago', label: 'Order #8815' }
  ];

  return (
   <div className="v-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fff7ed' }}>
              <Wallet size={24} color="#f97316" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#f97316' }}>Digital Wallet</span>
          </div>
          <h1 className="v-hero-title">Payouts & PNL</h1>
          <p className="v-hero-subtitle">Manage your payouts and transaction history</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '2rem', flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
            borderRadius: '32px', padding: '2.5rem', color: 'white', 
            position: 'relative', overflow: 'hidden', boxShadow: '0 20px 40px rgba(0,0,0,0.1)'
          }}>
            <div style={{ position: 'absolute', top: '-10%', right: '-10%', width: '150px', height: '150px', background: 'rgba(249, 115, 22, 0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
            <p style={{ margin: '0 0 8px 0', fontSize: '0.85rem', fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Available Balance</p>
            <h2 style={{ margin: '0 0 2rem 0', fontSize: '3rem', fontWeight: 900 }}>₹{balance.toLocaleString()}</h2>
            
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button style={{ flex: 1, padding: '14px', borderRadius: '14px', border: 'none', background: 'var(--v-primary)', color: 'white', fontWeight: 900, cursor: 'pointer', boxShadow: '0 8px 20px -6px rgba(249, 115, 22, 0.4)' }}>Withdraw</button>
              <button style={{ flex: 1, padding: '14px', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'white', fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(10px)' }}>Add Money</button>
            </div>
          </div>

          <div style={{ background: '#f8fafc', padding: '1.5rem', borderRadius: '24px', border: '1px solid #e2e8f0' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '1rem' }}>
               <CheckCircle size={18} color="#16a34a" />
               <span style={{ fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>Linked Bank Account</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>HDFC Bank - XXXX 4289</p>
            <p style={{ margin: '4px 0 0 0', fontSize: '0.75rem', color: '#94a3b8' }}>Verified & Primary for payouts</p>
          </div>
        </div>

        <div style={{ background: 'white', borderRadius: '32px', border: '1px solid #f1f5f9', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.02)' }}>
           <h3 style={{ margin: '0 0 1.5rem 0', fontWeight: 900, fontSize: '1.1rem' }}>Recent Activity</h3>
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              {transactions.map((tx, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1rem', borderRadius: '18px', background: '#f8fafc', border: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <div style={{ width: '40px', height: '40px', borderRadius: '12px', background: tx.type === 'credit' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      {tx.type === 'credit' ? <ArrowDownRight size={18} color="#166534" /> : <ArrowUpRight size={18} color="#991b1b" />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 800, color: '#1e293b', fontSize: '0.9rem' }}>{tx.label}</p>
                      <p style={{ margin: 0, fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{tx.date}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 900, color: tx.type === 'credit' ? '#16a34a' : '#ef4444', fontSize: '1rem' }}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                    </p>
                    <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>{tx.status}</span>
                  </div>
                </div>
              ))}
           </div>
           <button style={{ width: '100%', marginTop: '1.5rem', background: 'none', border: '1px solid #e2e8f0', padding: '12px', borderRadius: '14px', fontWeight: 800, color: '#64748b', cursor: 'pointer' }}>View All Transactions</button>
        </div>
      </div>
    </div>
  );
};

export const VendorReviews = () => {
  const reviews = [
    { user: 'Amit K.', rating: 5, comment: 'Amazing service and super fast delivery. The quality was top notch!', date: '2 days ago', avatar: 'AK' },
    { user: 'Sonia M.', rating: 4, comment: 'Product was good, but packaging could be better.', date: '1 week ago', avatar: 'SM' },
    { user: 'Raj P.', rating: 5, comment: 'Reliable and affordable. Best in the area.', date: 'May 01, 2026', avatar: 'RP' }
  ];

  return (
    <div className="v-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fffbeb' }}>
              <Star size={20} color="#f59e0b" fill="#f59e0b" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#f59e0b' }}>Partner Reputation</span>
          </div>
          <h1 className="v-hero-title">Store Feedback</h1>
          <p className="v-hero-subtitle">See what your customers are saying</p>
        </div>
        
        <div style={{ textAlign: 'right' }}>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
             <span style={{ fontSize: '2.75rem', fontWeight: 950, color: 'var(--v-text-main)' }}>4.8</span>
             <span style={{ fontSize: '1rem', color: '#94a3b8', fontWeight: 700 }}>/5</span>
           </div>
           <div style={{ display: 'flex', gap: '2px', justifyContent: 'flex-end' }}>
             {[1,2,3,4,5].map(s => <Star key={s} size={16} color="#f59e0b" fill={s <= 4 ? "#f59e0b" : "transparent"} />)}
           </div>
        </div>
      </div>

      <div className="v-grid-auto">
        {reviews.map((rev, i) => (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: i * 0.1 }}
            key={i} 
            className="v-data-card"
            style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: '#f8fafc', border: '1px solid #f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#475569', fontSize: '1rem' }}>
                  {rev.avatar}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>{rev.user}</h4>
                  <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>Verified Customer</span>
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '0.95rem', color: '#475569', lineHeight: 1.6, fontStyle: 'italic' }}>
              "{rev.comment}"
            </p>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f8fafc' }}>
              <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 600 }}>{rev.date}</span>
              <div style={{ display: 'flex', gap: '2px' }}>
                {[1,2,3,4,5].map(s => <Star key={s} size={12} color="#f59e0b" fill={s <= rev.rating ? "#f59e0b" : "transparent"} />)}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const VendorNotifications = () => (
  <div className="v-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
    <div className="v-hero-section">
      <div className="v-hero-info">
        <div className="v-hero-badge">
          <div className="v-hero-badge-icon" style={{ background: '#fffbeb' }}>
            <Bell size={24} color="#d97706" />
          </div>
          <span className="v-hero-badge-text" style={{ color: '#d97706' }}>Alerts Center</span>
        </div>
        <h1 className="v-hero-title">Partner Updates</h1>
        <p className="v-hero-subtitle">Operational updates and important messages</p>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
       {[
          { title: 'New Order Received!', desc: 'Order #8822 from Neha. High priority delivery.', time: 'Just now', unread: true },
          { title: 'Settlement Successful', desc: '₹5,000 has been credited to your linked bank account.', time: 'Yesterday, 10:45 AM', unread: false },
          { title: 'Passwala Partner Tip', desc: 'Add photos to your products to increase visibility by 40%.', time: '2 days ago', unread: false }
       ].map((notif, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.1 }}
            style={{ 
              padding: '1.5rem 1.75rem', borderRadius: '24px', border: '1px solid #f1f5f9', display: 'flex', gap: '1.25rem', 
              background: notif.unread ? '#fffbeb' : 'white', boxShadow: '0 4px 6px rgba(0,0,0,0.02)',
              position: 'relative'
            }}
          >
             {notif.unread && <div style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }}></div>}
             <div style={{ width: '48px', height: '48px', borderRadius: '16px', background: notif.unread ? '#fef3c7' : '#f1f5f9', color: notif.unread ? '#d97706' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={22} />
             </div>
             <div>
                <h4 style={{ margin: '0 0 6px 0', fontWeight: 800, color: '#0f172a', fontSize: '1rem' }}>{notif.title}</h4>
                <p style={{ margin: '0 0 8px 0', color: '#475569', fontSize: '0.9rem', lineHeight: 1.5 }}>{notif.desc}</p>
                <span style={{ fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>{notif.time}</span>
             </div>
          </motion.div>
       ))}
    </div>
  </div>
);

export const VendorSupport = () => (
  <div className="v-container animate-fade-in" style={{ paddingBottom: '4rem' }}>
    <div className="v-hero-section" style={{ textAlign: 'center', marginBottom: '3rem' }}>
      <div style={{ width: '80px', height: '80px', background: '#fff1f2', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
        <HelpCircle size={40} color="#e11d48" />
      </div>
      <h1 style={{ fontSize: '2.25rem', fontWeight: 900, letterSpacing: '-1px' }}>How can we help?</h1>
      <p style={{ fontSize: '1rem', opacity: 0.7, maxWidth: '500px', margin: '0.5rem auto' }}>Our dedicated partner success team is available 24/7 to help you grow your business.</p>
    </div>

    <div className="v-grid-auto">
       <div className="v-data-card" style={{ textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', background: '#f0f9ff', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
            <FileText size={24} color="#0ea5e9" />
          </div>
          <h3 style={{ fontWeight: 800, margin: '0 0 0.5rem 0' }}>Merchant Guide</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>Learn how to manage inventory and increase sales with our partner handbook.</p>
          <button className="v-btn-outline" style={{ width: '100%', padding: '12px' }}>Read Articles</button>
       </div>

       <div className="v-data-card" style={{ textAlign: 'center' }}>
          <div style={{ width: '52px', height: '52px', background: '#fdf2f8', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.25rem auto' }}>
            <CheckCircle size={24} color="#db2777" />
          </div>
          <h3 style={{ fontWeight: 800, margin: '0 0 0.5rem 0' }}>Priority Support</h3>
          <p style={{ fontSize: '0.9rem', color: '#64748b', lineHeight: 1.5, marginBottom: '1.5rem' }}>Direct line for technical issues or payout queries with 15min response time.</p>
          <button className="v-btn-secondary" style={{ width: '100%', padding: '12px' }}>Chat with Expert</button>
       </div>
    </div>

    <div style={{ marginTop: '3rem', padding: '1.5rem', background: '#f1f5f9', borderRadius: '24px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '2rem', flexWrap: 'wrap' }}>
       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Live Chat: <span style={{ color: '#0f172a' }}>Online</span></span>
       </div>
       <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '8px', height: '8px', background: '#22c55e', borderRadius: '50%' }}></div>
          <span style={{ fontSize: '0.85rem', fontWeight: 700, color: '#475569' }}>Phone Support: <span style={{ color: '#0f172a' }}>Active</span></span>
       </div>
    </div>
  </div>
);
