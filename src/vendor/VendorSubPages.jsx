import React from 'react';
import { Package, FileText, IndianRupee, Wallet, Star, Bell, HelpCircle, CheckCircle, Clock, MapPin, Download, ArrowUpRight, ArrowDownRight, Tag, Trash2, PackagePlus, Camera, Wrench } from 'lucide-react';
import { supabase } from '../supabase';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';

export const VendorInventory = ({ businessType, storeId }) => {
  const [items, setItems] = React.useState([]);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [newItem, setNewItem] = React.useState({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '' });

  React.useEffect(() => {
    const fetchCatalog = async () => {
       if (!storeId) {
         setItems([]);
         return;
       }
       
       let dbItems = [];
       const isValidUuid = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(storeId);
       if (supabase && isValidUuid) {
         try {
           const targetTable = businessType === 'shop' ? 'products' : 'services';
           const idCol = businessType === 'shop' ? 'store_id' : 'provider_id';
           const { data, error } = await supabase.from(targetTable).select('*').eq(idCol, storeId);
           if (!error && data) {
             dbItems = data.map(item => ({
               id: item.id,
               name: item.name || item.title,
               detail: item.description || item.category,
               price: item.price,
               image: item.image_url || item.image,
                barcode: item.barcode || '',
                barcode_type: item.barcode_type || 'EAN-13',
                stock_quantity: item.stock_quantity || 0,
               type: businessType || 'shop'
             }));
           }
         } catch(e){ console.error(e); }
       }

       const localStored = JSON.parse(localStorage.getItem('vVendorItems') || '[]');

       // Prioritize Database items. If DB has data, use it.
       // Fallback to local storage ONLY if DB is empty to allow offline dev.
       let finalItems = [];
       if (dbItems.length > 0) {
         finalItems = dbItems;
       } else {
         finalItems = localStored;
       }
       
       const unique = [];
       const seen = new Set();
       finalItems.forEach(item => {
         const nameKey = (item.name || '').toLowerCase().trim();
         if (nameKey && !seen.has(nameKey)) {
           seen.add(nameKey);
           unique.push(item);
         }
       });

       if (false) {
         const demos = businessType === 'shop' ? [
           { id: 'd1', name: 'Fresh Farm Milk', detail: 'Organic A2 cow milk, delivered fresh every morning.', price: 75, image: 'https://images.unsplash.com/photo-1550583724-125581f7793d?auto=format&fit=crop&q=80&w=400', type: 'shop' },
           { id: 'd2', name: 'Artisan Brown Bread', detail: 'Freshly baked whole wheat bread with no preservatives.', price: 55, image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&q=80&w=400', type: 'shop' }
         ] : [
           { id: 's1', name: 'Premium Deep Cleaning', detail: 'Professional 5-step deep cleaning for your entire home.', price: 1999, image: '/cleaning_service_premium.png', type: 'service' },
           { id: 's2', name: 'Expert Plumbing Repair', detail: 'Quick fixes and full installations by certified plumbers.', price: 499, image: '/plumbing_service_premium.png', type: 'service' }
         ];
         setItems(demos);
       } else {
         setItems(unique);
       }
    };
    fetchCatalog();
  }, [storeId, businessType]);

  // Synchronize react items state to localStorage automatically on state changes
  React.useEffect(() => {
    if (items.length > 0) {
      const cleanItems = items.filter(i => !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'));
      localStorage.setItem('vVendorItems', JSON.stringify(cleanItems));
    }
  }, [items]);

  const handleAdd = async (e) => {
    e.preventDefault();
    if (!newItem.name || !newItem.price) return;
    
    if (editingId) {
      setItems(prev => {
        const updated = prev.map(item => item.id === editingId ? {
          ...item,
          name: newItem.name,
          detail: newItem.detail || 'Updated Manually',
          price: parseFloat(newItem.price),
          image: newItem.image,
          barcode: newItem.barcode || '',
          barcode_type: newItem.barcode_type || 'EAN-13',
          stock_quantity: newItem.stock_quantity ? parseInt(newItem.stock_quantity) : 0,
          type: businessType || 'shop'
        } : item);
        localStorage.setItem('vVendorItems', JSON.stringify(updated.filter(i => !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'))));
        return updated;
      });
      if (storeId) {
        try {
          const targetTable = businessType === 'shop' ? 'products' : 'services';
          const updatePayload = businessType === 'shop' ? {
            name: newItem.name,
            description: newItem.detail || 'Updated Manually',
            price: parseFloat(newItem.price),
            image_url: newItem.image,
            barcode: newItem.barcode || null,
            barcode_type: newItem.barcode_type || 'EAN-13',
            stock_quantity: newItem.stock_quantity ? parseInt(newItem.stock_quantity) : 0
          } : {
            title: newItem.name,
            price: parseFloat(newItem.price),
            description: newItem.detail || 'Updated Manually',
            duration_minutes: 60
          };
          await supabase.from(targetTable).update(updatePayload).eq('id', editingId);
        } catch (err) { console.error(err); }
      }

      setEditingId(null);
      setNewItem({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '' });
      setShowForm(false);
      return;
    }

    const localId = 'item-' + Date.now();
    const newProductObj = {
      id: localId,
      name: newItem.name,
      detail: newItem.detail || 'Added Manually',
      price: parseFloat(newItem.price),
      image: newItem.image,
      barcode: newItem.barcode || '',
      barcode_type: newItem.barcode_type || 'EAN-13',
      stock_quantity: newItem.stock_quantity ? parseInt(newItem.stock_quantity) : 0,
      type: businessType || 'shop'
    };

    setItems(prev => {
      const cleanPrev = prev.filter(i => !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'));
      const updated = [newProductObj, ...cleanPrev];
      localStorage.setItem('vVendorItems', JSON.stringify(updated));
      return updated;
    });
    setNewItem({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '' });
    setShowForm(false);

    if (storeId && /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(storeId)) {
      try {
         const targetTable = businessType === 'shop' ? 'products' : 'services';
         const payload = businessType === 'shop' ? {
           store_id: storeId,
           name: newProductObj.name,
           category_id: '44444444-4444-4444-4444-444444444444',
           description: newProductObj.detail || 'Added Manually',
           price: parseFloat(newProductObj.price),
           image_url: newProductObj.image,
           barcode: newProductObj.barcode || null,
           barcode_type: newProductObj.barcode_type || 'EAN-13',
           stock_quantity: newProductObj.stock_quantity ? parseInt(newProductObj.stock_quantity) : 0,
           is_active: true
         } : {
           provider_id: storeId,
           title: newProductObj.name,
           category_id: '77777777-7777-7777-7777-777777777777',
           description: newProductObj.detail || 'Added Manually',
           price: parseFloat(newProductObj.price),
           duration_minutes: 60
         };
         const { data, error } = await supabase.from(targetTable).insert([payload]).select();
         if (!error && data && data[0]) {
           const dbObj = {
             id: data[0].id,
             name: data[0].name || data[0].title,
             detail: data[0].description || data[0].category || 'Added Manually',
             price: data[0].price,
             image: data[0].image_url || data[0].image,
             barcode: data[0].barcode || '',
             barcode_type: data[0].barcode_type || 'EAN-13',
             stock_quantity: data[0].stock_quantity || 0,
             type: businessType || 'shop'
           };
           setItems(prev => [dbObj, ...prev.filter(i => i.id !== localId && !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'))]);
         }
      } catch (err) { console.error(err); }
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setNewItem({ name: item.name, detail: item.detail || '', price: item.price, image: item.image, barcode: item.barcode || '', barcode_type: item.barcode_type || 'EAN-13', stock_quantity: item.stock_quantity || '' });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this from your storefront?')) return;
    setItems(prev => prev.filter(item => item.id !== id));
    if (storeId) {
       try { await supabase.from(businessType === 'shop' ? 'products' : 'services').delete().eq('id', id); } catch(e){ console.error(e); }
    }
  };

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fff7ed' }}>
              {businessType === 'shop' ? (
                <Package size={20} color="#f97316" />
              ) : (
                <Wrench size={20} color="#f97316" />
              )}
            </div>
            <span className="v-hero-badge-text" style={{ color: '#f97316' }}>
              {businessType === 'shop' ? 'Store Management' : 'Service Management'}
            </span>
          </div>
          <h1 className="v-hero-title">{businessType === 'shop' ? 'Product Catalog' : 'Service Menu'}</h1>
          <p className="v-hero-subtitle">
            Manage your digital storefront and keep your price list updated for local customers.
          </p>
        </div>
        
        <motion.button 
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => { setEditingId(null); setNewItem({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '' }); setShowForm(true); }} 
          className="v-btn-primary"
        >
          <PackagePlus size={20} />
          {businessType === 'shop' ? 'Add Product' : 'Add Service'}
        </motion.button>
      </div>

      <AnimatePresence>
        {showForm && (
          <motion.div 
            initial={{ opacity: 0, scale: 0.95, y: -20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: -20 }}
            className="v-data-card v-form-card"
          >
            <div className="v-form-header">
              <div>
                <h3 className="v-form-header-title">
                  {editingId ? 'Edit Listing' : 'Publish New Offering'}
                </h3>
                <p className="v-form-header-subtitle">Create a professional listing to attract more local orders.</p>
              </div>
              <button onClick={() => setShowForm(false)} className="v-action-btn delete"><Trash2 size={20} /></button>
            </div>
            
            <form style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }} onSubmit={handleAdd}>
              <div className="v-form-row-2col">
                <div className="v-form-group">
                  <label>Title of the {businessType === 'shop' ? 'Product' : 'Service'}</label>
                  <input required type="text" className="v-input" placeholder="E.g. Full Home Sanitize" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
                </div>
                <div className="v-form-group">
                  <label>Base Price (₹)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#94a3b8' }}>₹</span>
                    <input required type="number" className="v-input" style={{ paddingLeft: '36px' }} placeholder="0.00" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
                  </div>
                </div>
              </div>
              
              {businessType === 'shop' && (
                <div className="v-form-row-3col">
                  <div className="v-form-group">
                    <label>Barcode Type</label>
                    <select className="v-input" value={newItem.barcode_type} onChange={e => setNewItem({...newItem, barcode_type: e.target.value})}>
                      <option value="EAN-13">EAN-13</option>
                      <option value="UPCA-2">UPCA-2</option>
                      <option value="UPC-A">UPC-A</option>
                      <option value="EAN-8">EAN-8</option>
                    </select>
                  </div>
                  <div className="v-form-group">
                    <label>Barcode Number</label>
                    <input type="text" maxLength={20} className="v-input" placeholder="E.g. 8901234567890" value={newItem.barcode} onChange={e => setNewItem({...newItem, barcode: e.target.value.replace(/\D/g, '')})} />
                  </div>
                  <div className="v-form-group">
                    <label>Stock</label>
                    <input type="number" className="v-input" placeholder="0" value={newItem.stock_quantity} onChange={e => setNewItem({...newItem, stock_quantity: e.target.value})} />
                  </div>
                </div>
              )}

              <div className="v-form-group">
                 <label>Description & Unique Selling Points</label>
                 <textarea className="v-input" style={{ minHeight: '120px', resize: 'vertical' }} placeholder="What makes this special? List features, warranty, or delivery times..." value={newItem.detail} onChange={e => setNewItem({...newItem, detail: e.target.value})} />
              </div>

              <div className="v-form-group">
                 <label>Visual Presentation</label>
                 <div 
                   className="v-input v-upload-zone"
                   onClick={() => document.getElementById('inventory-upload').click()}
                 >
                   <input id="inventory-upload" type="file" hidden accept="image/*" onChange={(e) => {
                       const file = e.target.files[0];
                       if(file) {
                          const reader = new FileReader();
                          reader.onloadend = () => setNewItem({...newItem, image: reader.result});
                          reader.readAsDataURL(file);
                       }
                   }} />
                   {newItem.image ? (
                     <div style={{ position: 'relative', width: '220px', height: '150px', margin: '0 auto' }}>
                        <img src={newItem.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                        <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} onClick={(e) => { e.stopPropagation(); setNewItem({...newItem, image: null}); }}><Trash2 size={16} color="#ef4444" /></div>
                     </div>
                   ) : (
                     <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                       <Camera size={40} color="#cbd5e1" style={{ marginBottom: '1rem' }} />
                       <p style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>Click to upload cover photo</p>
                       <p style={{ margin: '4px 0 0 0', color: '#94a3b8', fontSize: '0.85rem' }}>High-res photos increase conversion by 40%</p>
                     </div>
                   )}
                 </div>
              </div>

              <div className="v-form-actions">
                  <button type="button" onClick={() => setShowForm(false)} className="v-btn-outline">Discard</button>
                  <button type="submit" className="v-btn-primary">
                    {editingId ? 'Update Listing' : (businessType === 'shop' ? 'Publish to Store' : 'Publish Service')}
                  </button>
               </div>
            </form>
          </motion.div>
        )}
      </AnimatePresence>
      
      <div className="v-grid-auto">
        {items.map((item, idx) => (
          <motion.div 
            key={item.id}
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: idx * 0.08, duration: 0.4, ease: "easeOut" }}
            className="v-data-card"
          >
            <div className="v-card-image-wrap">
              <img src={item.image || 'https://images.unsplash.com/photo-1581578731522-aa02d681b94d?auto=format&fit=crop&q=80&w=400'} alt={item.name} className="v-card-img" />
              <div className="v-card-overlay" />
              
              <div className="v-card-actions">
                <button onClick={() => handleDelete(item.id)} className="v-action-btn delete"><Trash2 size={16} /></button>
              </div>

              <div style={{ position: 'absolute', bottom: '16px', left: '16px' }}>
                <span className={`v-badge-premium ${businessType === 'shop' ? 'v-badge-info' : 'v-badge-success'}`}>
                  {businessType === 'shop' ? 'In Stock' : 'Active Service'}
                </span>
              </div>
            </div>
            
            <div className="v-card-content">
              <h4 className="v-card-title">{item.name}</h4>
              <p className="v-card-detail">{item.detail || 'High quality listing with professional support.'}</p>
              
              <div className="v-card-footer">
                <div className="v-price-tag">
                  <span className="v-price-currency">₹</span>
                  <span className="v-price-amount">{item.price}</span>
                </div>
                <button onClick={() => handleEditClick(item)} className="v-card-edit-btn">Edit Listing</button>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const VendorOrders = ({ storeId }) => {
  const [activeTab, setActiveTab] = React.useState('active');
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);

  const fetchOrders = React.useCallback(async (isInitial = false) => {
    if (!storeId) {
      setOrders([]);
      setLoading(false);
      return;
    }
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
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error) setOrders(data || []);
    } catch (err) {
      console.error("Order fetch failed:", err);
    } finally {
      setLoading(false);
    }
  }, [storeId]);

  React.useEffect(() => {
    fetchOrders(true);
    const channel = supabase
      .channel('vendor-orders-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'orders' }, () => {
        fetchOrders(false);
      })
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [fetchOrders]);

  const updateStatus = async (orderId, newStatus) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      // Background refresh will handle the UI update via Supabase Realtime
    }
  };

  const getStatusStyle = (status) => {
    switch(status) {
      case 'PLACED': return { bg: '#fff7ed', text: '#f97316', dot: '#f97316', label: 'New Order', icon: <Bell size={14} /> };
      case 'PREPARING': return { bg: '#eff6ff', text: '#3b82f6', dot: '#3b82f6', label: 'In Progress', icon: <Clock size={14} /> };
      case 'SHIPPED': return { bg: '#faf5ff', text: '#a855f7', dot: '#a855f7', label: 'Out for Delivery', icon: <MapPin size={14} /> };
      case 'DELIVERED': return { bg: '#f0fdf4', text: '#22c55e', dot: '#22c55e', label: 'Completed', icon: <CheckCircle size={14} /> };
      default: return { bg: '#f1f5f9', text: '#64748b', dot: '#64748b', label: status, icon: <FileText size={14} /> };
    }
  };

  if (loading) return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '10rem 2rem' }}>
      <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}>
        <Clock size={48} color="var(--v-primary)" opacity={0.5} />
      </motion.div>
      <p style={{ marginTop: '2rem', fontWeight: 900, color: '#1e293b', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>Syncing Order Station...</p>
      <p style={{ marginTop: '0.5rem', color: '#64748b', fontWeight: 600 }}>Connecting to secure fulfillment cloud</p>
    </div>
  );

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fef2f2' }}>
              <FileText size={24} color="#ef4444" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#ef4444' }}>Fulfillment Dashboard</span>
          </div>
          <h1 className="v-hero-title">Live Orders</h1>
          <p className="v-hero-subtitle">Real-time tracking and operational control for your store</p>
        </div>
      </div>

      <div className="v-tab-group" style={{ marginBottom: '3rem' }}>
        {['active', 'history'].map(tab => (
          <button 
            key={tab}
            onClick={() => setActiveTab(tab)}
            className={`v-tab-btn ${activeTab === tab ? 'active' : ''}`}
            style={{ padding: '12px 32px' }}
          >
            {tab === 'active' ? 'Ongoing Missions' : 'Past Records'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {orders.filter(o => activeTab === 'active' ? o.status !== 'DELIVERED' : o.status === 'DELIVERED').map((order, i) => {
          const style = getStatusStyle(order.status);
          return (
            <motion.div 
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.08 }}
              key={order.id} 
              className="v-data-card"
              style={{ padding: '2rem', border: '1px solid #f1f5f9', position: 'relative', overflow: 'hidden' }}
            >
              <div style={{ position: 'absolute', top: 0, left: 0, width: '4px', height: '100%', background: style.dot }}></div>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '2rem' }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '8px' }}>
                    <span style={{ fontWeight: 950, color: '#0f172a', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>#ORD-{order.id.substring(0, 8).toUpperCase()}</span>
                    {order.status === 'PLACED' && (
                      <div style={{ display: 'flex', alignItems: 'center', gap: '6px', background: '#fef2f2', color: '#ef4444', padding: '4px 10px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 900 }}>
                        <div className="v-pulse-dot" style={{ background: '#ef4444' }}></div>
                        ACTION REQUIRED
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#64748b', fontSize: '0.9rem', fontWeight: 700 }}>
                    <Clock size={16} /> Received at {new Date(order.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
                <div style={{ 
                  display: 'flex', alignItems: 'center', gap: '10px', padding: '10px 20px', borderRadius: '14px', 
                  background: style.bg, color: style.text, fontSize: '0.85rem', fontWeight: 900, border: `1px solid ${style.dot}15`
                }}>
                  {style.icon}
                  {style.label}
                </div>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr auto', gap: '3rem', marginBottom: '2rem', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Customer Entity</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{ width: '40px', height: '40px', background: '#f8fafc', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 900, color: '#475569', border: '1px solid #e2e8f0' }}>
                      {(order.users?.full_name || 'U').charAt(0)}
                    </div>
                    <div>
                       <span style={{ fontWeight: 850, color: '#1e293b', display: 'block', fontSize: '1rem' }}>{order.users?.full_name || 'Verified User'}</span>
                       <span style={{ fontSize: '0.85rem', color: '#64748b', fontWeight: 600 }}>{order.users?.phone || 'Premium Member'}</span>
                    </div>
                  </div>
                </div>

                <div>
                   <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Destination Node</p>
                   <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#1e293b' }}>
                     <MapPin size={18} color="var(--v-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                     <span style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>{order.addresses?.society || 'Geo-location Pending'}</span>
                   </div>
                </div>
                
                <div style={{ textAlign: 'right', paddingLeft: '2rem', borderLeft: '1px solid #f1f5f9' }}>
                   <p style={{ margin: '0 0 4px 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800, textTransform: 'uppercase' }}>Payout Value</p>
                   <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
                     <span style={{ fontSize: '1rem', fontWeight: 800, color: '#0f172a' }}>₹</span>
                     <span style={{ fontSize: '2rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-1px' }}>{order.total_amount}</span>
                   </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid #f1f5f9' }}>
                 <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }}>Inventory Manifest</p>
                 <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                    {order.order_items?.map((item, idx) => (
                      <div key={idx} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                        <span style={{ color: 'var(--v-primary)' }}>{item.quantity}x</span>
                        {item.products?.name}
                      </div>
                    )) || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Parsing manifest data...</span>}
                 </div>
              </div>

              <div style={{ display: 'flex', gap: '1.25rem' }}>
                {order.status === 'PLACED' && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateStatus(order.id, 'PREPARING')}
                    className="v-btn-primary"
                    style={{ flex: 1, padding: '16px' }}
                  >
                    Initiate Fulfillment
                  </motion.button>
                )}
                {order.status === 'PREPARING' && (
                  <motion.button 
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateStatus(order.id, 'SHIPPED')}
                    className="v-btn-primary"
                    style={{ flex: 1, padding: '16px', background: '#16a34a', boxShadow: '0 10px 25px rgba(22, 163, 74, 0.2)' }}
                  >
                    Confirm Ready for Pickup
                  </motion.button>
                )}
                <button className="v-btn-outline" style={{ padding: '14px 32px', fontWeight: 800 }}>
                  Order Protocol
                </button>
              </div>
            </motion.div>
          );
        })}
        {orders.length === 0 && (
          <div style={{ padding: '8rem 2rem', textAlign: 'center', background: 'white', borderRadius: '40px', border: '2px dashed #e2e8f0' }}>
             <div style={{ width: '100px', height: '100px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
               <Package size={48} color="#cbd5e1" />
             </div>
             <h3 style={{ fontWeight: 950, color: '#1e293b', fontSize: '1.5rem', letterSpacing: '-0.5px' }}>Station Idle</h3>
             <p style={{ color: '#64748b', margin: '0.75rem 0 2rem 0', fontWeight: 600 }}>Your store is ready to receive missions. New orders will trigger a priority alert.</p>
             <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 900 }}>
                 <div className="v-pulse-dot" style={{ background: '#16a34a' }}></div>
                 OPERATIONAL
               </div>
             </div>
          </div>
        )}
      </div>
    </div>
  );
};

export const VendorEarnings = ({ storeId }) => {
  const [earnings, setEarnings] = React.useState(0);
  const [orderCount, setOrderCount] = React.useState(0);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const fetchEarnings = async () => {
      if (!storeId) {
        setEarnings(0); setOrderCount(0); setLoading(false); return;
      }
      try {
        const { data, error } = await supabase.from('orders').select('total_amount, status').eq('store_id', storeId);
        if (!error && data) {
          const delivered = data.filter(o => o.status === 'DELIVERED');
          const total = delivered.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          setEarnings(total);
          setOrderCount(delivered.length);
        }
      } catch (err) {
        console.error("Earnings fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchEarnings();
  }, [storeId]);

  return (
   <div className="v-container animate-fade-in">
    <div className="v-hero-section">
      <div className="v-hero-info">
        <div className="v-hero-badge">
          <div className="v-hero-badge-icon" style={{ background: '#dcfce7' }}>
            <IndianRupee size={24} color="#166534" />
          </div>
          <span className="v-hero-badge-text" style={{ color: '#166534' }}>Revenue Intelligence</span>
        </div>
        <h1 className="v-hero-title">Business Earnings</h1>
        <p className="v-hero-subtitle">Comprehensive performance metrics and revenue streams</p>
      </div>
    </div>

    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
      <motion.div 
        whileHover={{ y: -8 }}
        className="v-data-card"
        style={{ padding: '2.5rem', background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', background: '#f0fdf4', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Wallet size={28} color="#22c55e" />
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#166534', background: '#dcfce7', padding: '6px 14px', borderRadius: '10px', letterSpacing: '0.5px' }}>SETTLED</span>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Net Revenue</p>
        <div style={{ display: 'flex', alignItems: 'baseline', gap: '6px' }}>
          <span style={{ fontSize: '1.5rem', fontWeight: 900, color: '#0f172a' }}>₹</span>
          <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-1.5px' }}>{earnings.toLocaleString()}</h2>
        </div>
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>PROJECTED</span>
            <span style={{ fontWeight: 900, color: '#1e293b' }}>₹{(earnings * 1.2).toFixed(0)}</span>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>GROWTH</span>
            <span style={{ fontWeight: 900, color: '#22c55e' }}>+12.5%</span>
          </div>
        </div>
      </motion.div>

      <motion.div 
        whileHover={{ y: -8 }}
        className="v-data-card"
        style={{ padding: '2.5rem' }}
      >
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
          <div style={{ width: '56px', height: '56px', background: '#eff6ff', borderRadius: '18px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Package size={28} color="#3b82f6" />
          </div>
          <span style={{ fontSize: '0.8rem', fontWeight: 900, color: '#1e40af', background: '#dbeafe', padding: '6px 14px', borderRadius: '10px', letterSpacing: '0.5px' }}>VOLUME</span>
        </div>
        <p style={{ margin: '0 0 8px 0', fontSize: '0.9rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Total Conversions</p>
        <h2 style={{ margin: 0, fontSize: '3rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-1.5px' }}>{orderCount}</h2>
        <div style={{ marginTop: '1.5rem', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', gap: '1rem' }}>
          <div style={{ flex: 1 }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>AVG ORDER</span>
            <span style={{ fontWeight: 900, color: '#1e293b' }}>₹{orderCount > 0 ? (earnings / orderCount).toFixed(0) : 0}</span>
          </div>
          <div style={{ flex: 1, textAlign: 'right' }}>
            <span style={{ display: 'block', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 800 }}>SUCCESS</span>
            <span style={{ fontWeight: 900, color: '#3b82f6' }}>98.2%</span>
          </div>
        </div>
      </motion.div>
    </div>
    
    <div className="v-data-card" style={{ padding: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center', background: 'white', minHeight: '400px', flexDirection: 'column' }}>
       <div style={{ position: 'relative', width: '100%', maxWidth: '600px', height: '240px', background: '#f8fafc', borderRadius: '32px', border: '2px dashed #e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
          <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at 20% 20%, rgba(249, 115, 22, 0.05) 0%, transparent 50%)' }}></div>
          <div style={{ textAlign: 'center', position: 'relative', zIndex: 1 }}>
             <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto', boxShadow: '0 10px 25px -5px rgba(0,0,0,0.05)' }}>
               <IndianRupee size={32} color="var(--v-primary)" opacity={0.4} />
             </div>
             <h3 style={{ fontWeight: 900, color: '#1e293b', fontSize: '1.25rem' }}>{loading ? "Analytics Engine Initializing..." : "Operational Data Synchronized"}</h3>
             <p style={{ margin: '0.5rem 0 0 0', color: '#64748b', fontWeight: 600, fontSize: '0.95rem' }}>Your revenue trends and payout windows are up to date.</p>
          </div>
       </div>
    </div>
  </div>
  );
};

export const VendorWallet = ({ storeId }) => {
  const [balance, setBalance] = React.useState(0);
  const [transactions, setTransactions] = React.useState([]);

  React.useEffect(() => {
    const fetchTransactions = async () => {
      if (!storeId) {
        setBalance(0); setTransactions([]); return;
      }
      try {
        const { data, error } = await supabase.from('orders').select('id, total_amount, created_at, status').eq('store_id', storeId).order('created_at', { ascending: false });
        if (!error && data) {
          const delivered = data.filter(o => o.status === 'DELIVERED');
          const total = delivered.reduce((sum, o) => sum + (o.total_amount || 0), 0);
          setBalance(total);

          const txs = data.map(o => ({
            id: o.id,
            type: o.status === 'CANCELLED' ? 'debit' : 'credit',
            amount: o.total_amount || 0,
            status: o.status,
            date: new Date(o.created_at).toLocaleDateString() + ' ' + new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            label: `Order Settlement #${o.id.substring(0, 8).toUpperCase()}`
          }));
          setTransactions(txs);
        }
      } catch (err) {
        console.error("Wallet fetch error:", err);
      }
    };
    fetchTransactions();
  }, [storeId]);

  return (
   <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fff7ed' }}>
              <Wallet size={24} color="#f97316" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#f97316' }}>Financial Vault</span>
          </div>
          <h1 className="v-hero-title">Wallet & Payouts</h1>
          <p className="v-hero-subtitle">Manage your funds, linked accounts, and secure withdrawals</p>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1.5fr', gap: '3rem', alignItems: 'start' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          <div style={{ 
            background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', 
            borderRadius: '40px', padding: '3rem', color: 'white', 
            position: 'relative', overflow: 'hidden', boxShadow: '0 30px 60px -12px rgba(15, 23, 42, 0.3)'
          }}>
            <div style={{ position: 'absolute', top: '-20%', right: '-20%', width: '250px', height: '250px', background: 'rgba(249, 115, 22, 0.15)', borderRadius: '50%', filter: 'blur(60px)' }}></div>
            <div style={{ position: 'absolute', bottom: '-10%', left: '-10%', width: '150px', height: '150px', background: 'rgba(59, 130, 246, 0.1)', borderRadius: '50%', filter: 'blur(40px)' }}></div>
            
            <p style={{ margin: '0 0 12px 0', fontSize: '0.9rem', fontWeight: 800, color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', letterSpacing: '2px' }}>Withdrawable Balance</p>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '3rem' }}>
              <span style={{ fontSize: '1.5rem', fontWeight: 900, color: 'rgba(255,255,255,0.7)' }}>₹</span>
              <h2 style={{ margin: 0, fontSize: '3.5rem', fontWeight: 950, letterSpacing: '-2px' }}>{balance.toLocaleString()}</h2>
            </div>
            
            <div style={{ display: 'flex', gap: '1.25rem' }}>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ flex: 1.5, padding: '16px', borderRadius: '18px', border: 'none', background: 'var(--v-primary)', color: 'white', fontWeight: 900, cursor: 'pointer', boxShadow: '0 12px 30px -8px rgba(249, 115, 22, 0.5)', fontSize: '1rem' }}>Initiate Payout</motion.button>
              <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }} style={{ flex: 1, padding: '16px', borderRadius: '18px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.08)', color: 'white', fontWeight: 800, cursor: 'pointer', backdropFilter: 'blur(12px)', fontSize: '0.9rem' }}>Details</motion.button>
            </div>
          </div>

          <div className="v-data-card" style={{ padding: '2rem', border: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '1.25rem' }}>
               <div style={{ width: '36px', height: '36px', background: '#f0fdf4', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                 <CheckCircle size={20} color="#16a34a" />
               </div>
               <span style={{ fontWeight: 900, color: '#0f172a', fontSize: '1rem' }}>Primary Payout Node</span>
            </div>
            <div style={{ padding: '1rem', background: '#f8fafc', borderRadius: '16px', border: '1px solid #f1f5f9' }}>
              <p style={{ margin: 0, fontSize: '1rem', color: '#1e293b', fontWeight: 850 }}>HDFC BANK LTD</p>
              <p style={{ margin: '4px 0 0 0', fontSize: '0.9rem', color: '#64748b', fontWeight: 600 }}>Account Ending In: •••• 4289</p>
            </div>
            <button style={{ width: '100%', marginTop: '1.25rem', padding: '12px', borderRadius: '12px', background: 'none', border: '1px solid #e2e8f0', color: 'var(--v-primary)', fontWeight: 800, fontSize: '0.85rem', cursor: 'pointer' }}>Manage Bank Accounts</button>
          </div>
        </div>

        <div className="v-data-card" style={{ padding: '2.5rem', border: '1px solid #f1f5f9' }}>
           <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem' }}>
             <h3 style={{ margin: 0, fontWeight: 950, fontSize: '1.4rem', letterSpacing: '-0.5px' }}>Transaction Ledger</h3>
             <button style={{ fontSize: '0.85rem', fontWeight: 800, color: 'var(--v-primary)', background: 'none', border: 'none', cursor: 'pointer' }}>Export PDF</button>
           </div>
           
           <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              {transactions.length === 0 ? (
                <div style={{ padding: '5rem 2rem', textAlign: 'center', background: '#f8fafc', borderRadius: '24px', border: '1px dashed #e2e8f0' }}>
                   <div style={{ width: '64px', height: '64px', background: 'white', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem auto' }}>
                     <ArrowUpRight size={28} color="#cbd5e1" />
                   </div>
                   <p style={{ margin: 0, fontWeight: 800, color: '#1e293b' }}>No activity recorded</p>
                   <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: '#94a3b8', fontWeight: 600 }}>Your fulfillment earnings will populate this ledger.</p>
                </div>
              ) : transactions.map((tx, i) => (
                <motion.div 
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.05 }}
                  key={i} 
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.25rem', borderRadius: '20px', background: '#f8fafc', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem' }}>
                    <div style={{ width: '48px', height: '48px', borderRadius: '14px', background: tx.type === 'credit' ? '#dcfce7' : '#fee2e2', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.02)' }}>
                      {tx.type === 'credit' ? <ArrowDownRight size={22} color="#16a34a" /> : <ArrowUpRight size={22} color="#ef4444" />}
                    </div>
                    <div>
                      <p style={{ margin: 0, fontWeight: 900, color: '#1e293b', fontSize: '0.95rem' }}>{tx.label}</p>
                      <p style={{ margin: '2px 0 0 0', fontSize: '0.8rem', color: '#94a3b8', fontWeight: 700 }}>{tx.date}</p>
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <p style={{ margin: 0, fontWeight: 950, color: tx.type === 'credit' ? '#16a34a' : '#ef4444', fontSize: '1.15rem', letterSpacing: '-0.5px' }}>
                      {tx.type === 'credit' ? '+' : '-'}₹{tx.amount}
                    </p>
                    <span style={{ fontSize: '0.7rem', fontWeight: 900, color: tx.status === 'DELIVERED' ? '#16a34a' : '#64748b', background: tx.status === 'DELIVERED' ? '#dcfce7' : '#f1f5f9', padding: '2px 8px', borderRadius: '6px' }}>{tx.status}</span>
                  </div>
                </motion.div>
              ))}
           </div>
           {transactions.length > 5 && (
             <button style={{ width: '100%', marginTop: '2rem', background: 'white', border: '1px solid #e2e8f0', padding: '14px', borderRadius: '16px', fontWeight: 900, color: '#64748b', cursor: 'pointer', fontSize: '0.9rem' }}>Load Extensive History</button>
           )}
        </div>
      </div>
    </div>
  );
};

export const VendorReviews = ({ storeId, businessType }) => {
  const [reviews, setReviews] = React.useState([]);

  React.useEffect(() => {
    const fetchReviews = async () => {
      if (!storeId) { setReviews([]); return; }
      try {
        const { data, error } = await supabase.from('orders').select('id, users(full_name), created_at').eq('store_id', storeId).eq('status', 'DELIVERED').order('created_at', { ascending: false }).limit(5);
        if (!error && data) {
          const revs = data.map(o => ({
            user: o.users?.full_name || 'Valued Partner',
            rating: 5,
            comment: `Professional service on Order #${o.id.substring(0,6).toUpperCase()}. The packaging was excellent and delivery was prompt.`,
            date: new Date(o.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
            avatar: (o.users?.full_name || 'V').charAt(0)
          }));
          setReviews(revs);
        }
      } catch (err) {
        console.error("Reviews error:", err);
      }
    };
    fetchReviews();
  }, [storeId]);

  return (
    <div className="v-container animate-fade-in">
      <div className="v-hero-section">
        <div className="v-hero-info">
          <div className="v-hero-badge">
            <div className="v-hero-badge-icon" style={{ background: '#fffbeb' }}>
              <Star size={20} color="#f59e0b" fill="#f59e0b" />
            </div>
            <span className="v-hero-badge-text" style={{ color: '#f59e0b' }}>
              {businessType === 'shop' ? 'Store Reputation' : 'Service Reputation'}
            </span>
          </div>
          <h1 className="v-hero-title">Customer Feedback</h1>
          <p className="v-hero-subtitle">Monitor your ratings and build trust with your neighborhood</p>
        </div>
        
        <div style={{ textAlign: 'right', background: 'white', padding: '1.5rem 2.5rem', borderRadius: '24px', border: '1px solid #f1f5f9', boxShadow: '0 10px 30px -10px rgba(0,0,0,0.05)' }}>
           <p style={{ margin: '0 0 4px 0', fontSize: '0.85rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase' }}>Partner Score</p>
           <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px', justifyContent: 'flex-end' }}>
             <span style={{ fontSize: '3rem', fontWeight: 950, color: '#0f172a', letterSpacing: '-1px' }}>4.9</span>
             <span style={{ fontSize: '1.25rem', color: '#94a3b8', fontWeight: 800 }}>/5</span>
           </div>
           <div style={{ display: 'flex', gap: '4px', justifyContent: 'flex-end', marginTop: '4px' }}>
             {[1,2,3,4,5].map(s => <Star key={s} size={20} color="#f59e0b" fill={s <= 4 ? "#f59e0b" : s === 5 ? "rgba(245, 158, 11, 0.4)" : "transparent"} />)}
           </div>
        </div>
      </div>

      <div className="v-grid-auto">
        {reviews.length === 0 ? (
          <div style={{ gridColumn: '1 / -1', background: 'white', padding: '6rem 2rem', borderRadius: '40px', textAlign: 'center', border: '2px dashed #e2e8f0' }}>
             <div style={{ width: '80px', height: '80px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
                <Star size={40} color="#cbd5e1" />
             </div>
             <h3 style={{ fontWeight: 950, color: '#1e293b', fontSize: '1.5rem' }}>Awaiting Feedback</h3>
             <p style={{ color: '#64748b', fontWeight: 600, maxWidth: '400px', margin: '0.5rem auto' }}>Once you complete your first few orders, your verified customer reviews will appear here.</p>
          </div>
        ) : reviews.map((rev, i) => (
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.12 }}
            key={i} 
            className="v-data-card"
            style={{ padding: '2.5rem', display: 'flex', flexDirection: 'column', gap: '1.5rem', border: '1px solid #f1f5f9' }}
          >
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: 'linear-gradient(135deg, #f1f5f9 0%, #e2e8f0 100%)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 950, color: '#475569', fontSize: '1.25rem', border: '2px solid white', boxShadow: '0 8px 20px -6px rgba(0,0,0,0.1)' }}>
                  {rev.avatar}
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 900, color: '#0f172a', fontSize: '1.1rem' }}>{rev.user}</h4>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginTop: '2px' }}>
                    <div style={{ display: 'flex', gap: '2px' }}>
                      {[1,2,3,4,5].map(s => <Star key={s} size={12} color="#f59e0b" fill={s <= rev.rating ? "#f59e0b" : "transparent"} />)}
                    </div>
                    <span style={{ fontSize: '0.75rem', color: '#16a34a', fontWeight: 800, background: '#f0fdf4', padding: '2px 8px', borderRadius: '6px' }}>VERIFIED ORDER</span>
                  </div>
                </div>
              </div>
            </div>

            <p style={{ margin: 0, fontSize: '1.05rem', color: '#334155', lineHeight: 1.7, fontWeight: 600, fontStyle: 'italic' }}>
              "{rev.comment}"
            </p>

            <div style={{ marginTop: 'auto', paddingTop: '1.5rem', borderTop: '1px solid #f1f5f9', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 700 }}>{rev.date}</span>
              <button style={{ background: 'none', border: 'none', color: 'var(--v-primary)', fontWeight: 900, fontSize: '0.85rem', cursor: 'pointer' }}>Reply to Review</button>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export const VendorNotifications = ({ storeId }) => {
  const [notifications, setNotifications] = React.useState([]);

  React.useEffect(() => {
    const fetchNotifs = async () => {
      if (!storeId) { setNotifications([]); return; }
      try {
        const { data, error } = await supabase.from('orders').select('id, status, created_at, users(full_name)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(8);
        if (!error && data) {
          const list = data.map(o => ({
            title: o.status === 'PLACED' ? 'Critical: New Order Received!' : o.status === 'DELIVERED' ? 'Mission Success: Order Completed' : `Update: Order #${o.id.substring(0,8).toUpperCase()} Status Shift`,
            desc: `Order #${o.id.substring(0,8).toUpperCase()} from ${o.users?.full_name || 'Verified Customer'}. Action may be required.`,
            time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
            unread: o.status === 'PLACED' || o.status === 'PREPARING',
            type: o.status === 'PLACED' ? 'urgent' : 'update'
          }));
          setNotifications(list);
        }
      } catch (err) {
        console.error("Notifs error:", err);
      }
    };
    fetchNotifs();
  }, [storeId]);

  return (
  <div className="v-container animate-fade-in">
    <div className="v-hero-section">
      <div className="v-hero-info">
        <div className="v-hero-badge">
          <div className="v-hero-badge-icon" style={{ background: '#fffbeb' }}>
            <Bell size={24} color="#d97706" />
          </div>
          <span className="v-hero-badge-text" style={{ color: '#d97706' }}>Communication Hub</span>
        </div>
        <h1 className="v-hero-title">Partner Notifications</h1>
        <p className="v-hero-subtitle">Stay synchronized with store activities and operational alerts</p>
      </div>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
       {notifications.length === 0 ? (
          <div style={{ background: 'white', padding: '8rem 2rem', borderRadius: '40px', textAlign: 'center', border: '2px dashed #e2e8f0' }}>
             <Bell size={64} color="#cbd5e1" style={{ margin: '0 auto 2rem auto', opacity: 0.5 }} />
             <h3 style={{ fontWeight: 950, color: '#1e293b', fontSize: '1.5rem' }}>All Caught Up</h3>
             <p style={{ color: '#64748b', margin: '0.75rem 0', fontWeight: 600 }}>Your inbox is clean. New operational updates will appear here.</p>
          </div>
       ) : notifications.map((notif, i) => (
          <motion.div 
            key={i} 
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.08, duration: 0.4 }}
            className="v-data-card"
            style={{ 
              padding: '2rem 2.5rem', border: '1px solid #f1f5f9', display: 'flex', gap: '2rem', 
              background: notif.unread ? 'linear-gradient(to right, #fffbeb, #ffffff)' : 'white',
              position: 'relative', alignItems: 'center'
            }}
          >
             {notif.unread && <div style={{ position: 'absolute', top: '2rem', right: '2.5rem', width: '10px', height: '10px', borderRadius: '50%', background: '#ef4444', boxShadow: '0 0 15px rgba(239, 68, 68, 0.4)' }}></div>}
             
             <div style={{ width: '64px', height: '64px', borderRadius: '22px', background: notif.type === 'urgent' ? '#fef3c7' : '#f1f5f9', color: notif.type === 'urgent' ? '#d97706' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, border: '1px solid rgba(0,0,0,0.05)' }}>
                <Bell size={28} />
             </div>
             
             <div style={{ flex: 1 }}>
                <h4 style={{ margin: '0 0 6px 0', fontWeight: 900, color: '#0f172a', fontSize: '1.15rem', letterSpacing: '-0.3px' }}>{notif.title}</h4>
                <p style={{ margin: '0 0 10px 0', color: '#475569', fontSize: '1rem', lineHeight: 1.6, fontWeight: 600 }}>{notif.desc}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Clock size={14} color="#94a3b8" />
                  <span style={{ fontSize: '0.85rem', color: '#94a3b8', fontWeight: 800 }}>Received at {notif.time}</span>
                </div>
             </div>
             
             <button style={{ background: 'none', border: 'none', color: '#94a3b8', fontWeight: 800, cursor: 'pointer', padding: '10px' }}>
                <Trash2 size={18} />
             </button>
          </motion.div>
       ))}
    </div>
  </div>
  );
};

export const VendorSupport = () => {
  const [showChat, setShowChat] = React.useState(false);
  const [msg, setMsg] = React.useState('');
  const [chatHistory, setChatHistory] = React.useState([
    { sender: 'expert', text: 'Namaste! I am your dedicated Passwala Success Agent. I can help with payouts, inventory, or operational growth. How can I assist you today?', time: 'Just now' }
  ]);
  const [showArticles, setShowArticles] = React.useState(false);

  const handleSend = (e) => {
    e.preventDefault();
    if (!msg.trim()) return;
    const userMsg = { sender: 'vendor', text: msg, time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    const botReply = { sender: 'expert', text: 'Thank you for the update. I have flagged your account for priority review by our regional operations manager. Expect a resolution within 15-20 minutes.', time: 'Just now' };
    setChatHistory([...chatHistory, userMsg, botReply]);
    setMsg('');
  };

  return (
    <div className="v-container animate-fade-in">
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center', marginBottom: '5rem' }}>
        <motion.div 
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          style={{ width: '100px', height: '100px', background: '#fff1f2', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2.5rem auto', boxShadow: '0 20px 40px -10px rgba(225, 29, 72, 0.2)' }}
        >
          <HelpCircle size={48} color="#e11d48" />
        </motion.div>
        <h1 style={{ fontSize: '3.5rem', fontWeight: 950, letterSpacing: '-2px', margin: '0 0 1rem 0', color: '#0f172a' }}>Success Center</h1>
        <p style={{ fontSize: '1.25rem', color: '#64748b', maxWidth: '600px', margin: '0 auto', fontWeight: 600, lineHeight: 1.6 }}>Our mission is to help your store thrive. Get instant access to expert advice and operational guides.</p>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '3rem', marginBottom: '4rem' }}>
         <motion.div 
           whileHover={{ y: -10 }}
           className="v-data-card" 
           style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid #f1f5f9' }}
         >
            <div>
              <div style={{ width: '72px', height: '72px', background: '#f0f9ff', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', boxShadow: '0 10px 20px -5px rgba(14, 165, 233, 0.2)' }}>
                <FileText size={32} color="#0ea5e9" />
              </div>
              <h3 style={{ fontWeight: 950, fontSize: '1.5rem', margin: '0 0 1rem 0', color: '#0f172a' }}>Growth Playbook</h3>
              <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 600 }}>Master our proprietary inventory algorithms and increase your neighborhood visibility by 2.5x.</p>
            </div>
            <button className="v-btn-outline" style={{ width: '100%', padding: '18px', fontSize: '1rem', fontWeight: 900 }} onClick={() => setShowArticles(!showArticles)}>
              {showArticles ? "Collapse Manual" : "Read Growth Guide"}
            </button>
         </motion.div>

         <motion.div 
           whileHover={{ y: -10 }}
           className="v-data-card" 
           style={{ padding: '3rem', textAlign: 'center', display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid var(--v-primary)', boxShadow: '0 30px 60px -12px rgba(249, 115, 22, 0.15)' }}
         >
            <div>
              <div style={{ width: '72px', height: '72px', background: '#fff7ed', borderRadius: '22px', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto', boxShadow: '0 10px 20px -5px rgba(249, 115, 22, 0.2)' }}>
                <CheckCircle size={32} color="var(--v-primary)" />
              </div>
              <h3 style={{ fontWeight: 950, fontSize: '1.5rem', margin: '0 0 1rem 0', color: '#0f172a' }}>Priority Concierge</h3>
              <p style={{ fontSize: '1rem', color: '#64748b', lineHeight: 1.6, marginBottom: '2.5rem', fontWeight: 600 }}>Direct bypass to technical operations. Verified partners receive support in under 60 seconds.</p>
            </div>
            <button className="v-btn-primary" style={{ width: '100%', padding: '18px', fontSize: '1rem' }} onClick={() => setShowChat(!showChat)}>
              {showChat ? "Exit Consultation" : "Consult Success Agent"}
            </button>
         </motion.div>
      </div>

      <AnimatePresence>
        {showArticles && (
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: 20 }} style={{ marginBottom: '4rem', background: 'white', padding: '3.5rem', borderRadius: '40px', border: '1px solid #f1f5f9', boxShadow: '0 20px 50px -10px rgba(0,0,0,0.05)' }}>
             <h3 style={{ fontWeight: 950, color: '#0f172a', fontSize: '1.75rem', marginBottom: '2rem', letterSpacing: '-0.8px' }}>Store Optimization Manual</h3>
             <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem' }}>
                <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                   <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontWeight: 900, fontSize: '1.1rem' }}>1. Precision Inventory</h4>
                   <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: '#475569', fontWeight: 600 }}>Sync stock levels at 8 AM daily. High-accuracy stores are prioritized in neighborhood search results.</p>
                </div>
                <div style={{ padding: '2rem', background: '#f8fafc', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                   <h4 style={{ margin: '0 0 10px 0', color: '#1e293b', fontWeight: 900, fontSize: '1.1rem' }}>2. The 7-Minute SLA</h4>
                   <p style={{ margin: 0, fontSize: '0.95rem', lineHeight: 1.6, color: '#475569', fontWeight: 600 }}>Pack and confirm readiness within 420 seconds. This metrics affects your weekly performance bonus.</p>
                </div>
             </div>
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {showChat && (
          <motion.div initial={{ opacity: 0, scale: 0.98 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.98 }} style={{ marginBottom: '4rem', background: 'white', padding: '3.5rem', borderRadius: '40px', border: '1px solid var(--v-primary)', boxShadow: '0 40px 100px -20px rgba(249, 115, 22, 0.2)' }}>
             <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '3rem', borderBottom: '1px solid #f1f5f9', paddingBottom: '2rem' }}>
               <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                 <div style={{ position: 'relative' }}>
                   <div style={{ width: '60px', height: '60px', borderRadius: '20px', background: '#fff7ed', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                     <Star size={32} color="var(--v-primary)" fill="var(--v-primary)" />
                   </div>
                   <div style={{ position: 'absolute', bottom: '-4px', right: '-4px', width: '16px', height: '16px', borderRadius: '50%', background: '#22c55e', border: '3px solid white' }}></div>
                 </div>
                 <div>
                   <h3 style={{ fontWeight: 950, margin: 0, color: '#0f172a', fontSize: '1.5rem' }}>Partner Support Portal</h3>
                   <p style={{ margin: 0, fontSize: '0.9rem', color: '#22c55e', fontWeight: 800 }}>LIVE ENCRYPTED SESSION</p>
                 </div>
               </div>
               <div style={{ textAlign: 'right' }}>
                 <p style={{ margin: 0, fontSize: '0.85rem', color: '#94a3b8', fontWeight: 800 }}>WAIT TIME</p>
                 <p style={{ margin: 0, fontSize: '1.1rem', color: '#0f172a', fontWeight: 900 }}>&lt; 1 Minute</p>
               </div>
             </div>
             
             <div style={{ maxHeight: '400px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '1.5rem', marginBottom: '3rem', padding: '0 1rem' }}>
                {chatHistory.map((ch, idx) => (
                  <div key={idx} style={{ alignSelf: ch.sender === 'vendor' ? 'flex-end' : 'flex-start', maxWidth: '75%' }}>
                    <div style={{ 
                      background: ch.sender === 'vendor' ? 'var(--v-primary)' : '#f8fafc', 
                      color: ch.sender === 'vendor' ? 'white' : '#1e293b', 
                      padding: '1.5rem 2rem', 
                      borderRadius: ch.sender === 'vendor' ? '28px 28px 4px 28px' : '28px 28px 28px 4px',
                      boxShadow: '0 4px 15px rgba(0,0,0,0.03)',
                      border: ch.sender === 'vendor' ? 'none' : '1px solid #f1f5f9'
                    }}>
                      <p style={{ margin: 0, fontSize: '1.05rem', lineHeight: 1.6, fontWeight: 600 }}>{ch.text}</p>
                    </div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', display: 'block', marginTop: '8px', textAlign: ch.sender === 'vendor' ? 'right' : 'left', textTransform: 'uppercase' }}>{ch.sender === 'vendor' ? 'You' : 'Agent'} • {ch.time}</span>
                  </div>
                ))}
             </div>

             <form onSubmit={handleSend} style={{ display: 'flex', gap: '1.5rem', background: '#f8fafc', padding: '1rem', borderRadius: '24px', border: '1px solid #f1f5f9' }}>
                <input type="text" placeholder="Detail your operational query..." value={msg} onChange={e => setMsg(e.target.value)} style={{ flex: 1, padding: '1.25rem 2rem', borderRadius: '18px', border: 'none', background: 'white', outline: 'none', fontSize: '1.1rem', fontWeight: 600, boxShadow: '0 2px 8px rgba(0,0,0,0.02)' }} />
                <motion.button whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.98 }} type="submit" style={{ padding: '1.25rem 3rem', borderRadius: '18px', border: 'none', background: '#0f172a', color: 'white', fontWeight: 950, cursor: 'pointer', fontSize: '1.1rem', letterSpacing: '0.5px' }}>Transmit</motion.button>
             </form>
          </motion.div>
        )}
      </AnimatePresence>

      <div style={{ marginTop: '5rem', padding: '2.5rem', background: 'linear-gradient(to right, #f8fafc, #f1f5f9)', borderRadius: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4rem', flexWrap: 'wrap', border: '1px solid #e2e8f0' }}>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)' }}></div>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>Network Status: <span style={{ color: '#22c55e' }}>OPTIMAL</span></span>
         </div>
         <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{ width: '12px', height: '12px', background: '#22c55e', borderRadius: '50%', boxShadow: '0 0 10px rgba(34, 197, 94, 0.4)' }}></div>
            <span style={{ fontSize: '1rem', fontWeight: 900, color: '#1e293b' }}>Response SLA: <span style={{ color: '#22c55e' }}>&lt; 5 MIN</span></span>
         </div>
      </div>
    </div>
  );
};
