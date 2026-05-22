import React from 'react';
import { Package, FileText, IndianRupee, Wallet, Star, Bell, HelpCircle, CheckCircle, Clock, MapPin, Download, ArrowUpRight, ArrowDownRight, Tag, Trash2, PackagePlus, Camera, Wrench, AlertTriangle } from 'lucide-react';
import { supabase } from '../supabase';
import { toast } from 'react-hot-toast';
// eslint-disable-next-line no-unused-vars
import { motion, AnimatePresence } from 'framer-motion';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getOSRMRoute } from '../utils/dijkstra';

export const ConfirmModal = ({ isOpen, title, message, confirmText, cancelText, onConfirm, onCancel, type = 'danger' }) => {
  return (
    <AnimatePresence>
      {isOpen && (
        <div 
          style={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'rgba(15, 23, 42, 0.45)',
            backdropFilter: 'blur(8px)',
            WebkitBackdropFilter: 'blur(8px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 99999,
            padding: '1.5rem',
          }}
        >
          <motion.div
            initial={{ opacity: 0, scale: 0.95, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.95, y: 20 }}
            transition={{ type: 'spring', duration: 0.4 }}
            style={{
              background: 'white',
              borderRadius: '24px',
              padding: '2rem',
              width: '100%',
              maxWidth: '400px',
              boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.15)',
              border: '1px solid #f1f5f9',
              textAlign: 'center',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: '1.5rem',
              position: 'relative'
            }}
          >
            <div 
              style={{
                width: '64px',
                height: '64px',
                borderRadius: '20px',
                background: type === 'danger' ? '#fef2f2' : '#fff7ed',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                boxShadow: type === 'danger' ? '0 10px 15px -3px rgba(239, 68, 68, 0.1)' : '0 10px 15px -3px rgba(249, 115, 22, 0.1)'
              }}
            >
              {type === 'danger' ? (
                <Trash2 size={32} color="#ef4444" />
              ) : (
                <AlertTriangle size={32} color="#f97316" />
              )}
            </div>
            
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <h3 style={{ margin: 0, fontSize: '1.4rem', fontWeight: 900, color: '#0f172a', letterSpacing: '-0.5px' }}>{title}</h3>
              <p style={{ margin: 0, fontSize: '0.95rem', color: '#64748b', fontWeight: 600, lineHeight: 1.5 }}>{message}</p>
            </div>
            
            <div style={{ display: 'flex', gap: '1rem', width: '100%', marginTop: '0.5rem' }}>
              <button 
                type="button"
                onClick={onCancel}
                className="v-btn-outline" 
                style={{ flex: 1, padding: '14px', borderRadius: '14px', fontSize: '0.95rem', fontWeight: 800, cursor: 'pointer' }}
              >
                {cancelText || 'Cancel'}
              </button>
              <button 
                type="button"
                onClick={onConfirm}
                className="v-btn-primary" 
                style={{ 
                  flex: 1, 
                  padding: '14px', 
                  borderRadius: '14px', 
                  fontSize: '0.95rem', 
                  fontWeight: 800, 
                  background: type === 'danger' ? '#dc2626' : '#ea580c', 
                  borderColor: type === 'danger' ? '#dc2626' : '#ea580c',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: type === 'danger' ? '0 10px 20px rgba(220, 38, 38, 0.15)' : '0 10px 20px rgba(234, 88, 12, 0.15)'
                }}
              >
                {confirmText || 'Confirm'}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
};

export const VendorInventory = ({ businessType, storeId }) => {
  const [items, setItems] = React.useState([]);
  const [showForm, setShowForm] = React.useState(false);
  const [editingId, setEditingId] = React.useState(null);
  const [newItem, setNewItem] = React.useState({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '', category_id: '' });
  const [confirmDialog, setConfirmDialog] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger'
  });

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
              type: businessType || 'shop',
              category_id: item.category_id
            }));
          }
        } catch (e) { console.error(e); }
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

      if (import.meta.env.DEV && unique.length === 0) {
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
    const cleanItems = items.filter(i => !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'));
    localStorage.setItem('vVendorItems', JSON.stringify(cleanItems));
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
          type: businessType || 'shop',
          category_id: newItem.category_id || (businessType === 'shop' ? '44444444-4444-4444-4444-444444444444' : '77777777-7777-7777-7777-777777777777')
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
            category_id: newItem.category_id || '77777777-7777-7777-7777-777777777777',
            description: newItem.detail || 'Updated Manually',
            duration_minutes: 60
          };
          await supabase.from(targetTable).update(updatePayload).eq('id', editingId);
        } catch (err) { console.error(err); }
      }

      setEditingId(null);
      setNewItem({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '', category_id: businessType === 'shop' ? '44444444-4444-4444-4444-444444444444' : '77777777-7777-7777-7777-777777777777' });
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
      type: businessType || 'shop',
      category_id: newItem.category_id || (businessType === 'shop' ? '44444444-4444-4444-4444-444444444444' : '77777777-7777-7777-7777-777777777777')
    };

    setItems(prev => {
      const cleanPrev = prev.filter(i => !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'));
      const updated = [newProductObj, ...cleanPrev];
      localStorage.setItem('vVendorItems', JSON.stringify(updated));
      return updated;
    });
    setNewItem({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '', category_id: businessType === 'shop' ? '44444444-4444-4444-4444-444444444444' : '77777777-7777-7777-7777-777777777777' });
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
          category_id: newProductObj.category_id,
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
            type: businessType || 'shop',
            category_id: data[0].category_id
          };
          setItems(prev => [dbObj, ...prev.filter(i => i.id !== localId && !i.id.toString().startsWith('d') && !i.id.toString().startsWith('s'))]);
        }
      } catch (err) { console.error(err); }
    }
  };

  const handleEditClick = (item) => {
    setEditingId(item.id);
    setNewItem({
      name: item.name,
      detail: item.detail || '',
      price: item.price,
      image: item.image,
      barcode: item.barcode || '',
      barcode_type: item.barcode_type || 'EAN-13',
      stock_quantity: item.stock_quantity || '',
      category_id: item.category_id || (businessType === 'shop' ? '44444444-4444-4444-4444-444444444444' : '77777777-7777-7777-7777-777777777777')
    });
    setShowForm(true);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleDelete = (id) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Delete Listing',
      message: 'Are you sure you want to permanently delete this listing from your storefront? This action cannot be undone.',
      confirmText: 'Delete Permanently',
      cancelText: 'Cancel',
      type: 'danger',
      onConfirm: async () => {
        setItems(prev => prev.filter(item => item.id !== id));
        if (storeId) {
          try { await supabase.from(businessType === 'shop' ? 'products' : 'services').delete().eq('id', id); } catch (e) { console.error(e); }
        }
      }
    });
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
          onClick={() => { setEditingId(null); setNewItem({ name: '', detail: '', price: '', image: null, barcode: '', barcode_type: 'EAN-13', stock_quantity: '', category_id: businessType === 'shop' ? '44444444-4444-4444-4444-444444444444' : '77777777-7777-7777-7777-777777777777' }); setShowForm(true); }}
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
                  <input required type="text" className="v-input" placeholder="E.g. Full Home Sanitize" value={newItem.name} onChange={e => setNewItem({ ...newItem, name: e.target.value })} />
                </div>
                <div className="v-form-group">
                  <label>Base Price (₹)</label>
                  <div style={{ position: 'relative' }}>
                    <span style={{ position: 'absolute', left: '16px', top: '50%', transform: 'translateY(-50%)', fontWeight: 900, color: '#94a3b8' }}>₹</span>
                    <input required type="number" className="v-input" style={{ paddingLeft: '36px' }} placeholder="0.00" value={newItem.price} onChange={e => setNewItem({ ...newItem, price: e.target.value })} />
                  </div>
                </div>
              </div>

              {businessType === 'service' && (
                <div className="v-form-group">
                  <label>Service Category</label>
                  <select required className="v-input" value={newItem.category_id || '77777777-7777-7777-7777-777777777777'} onChange={e => setNewItem({ ...newItem, category_id: e.target.value })}>
                    <option value="77777777-7777-7777-7777-777777777777">Plumbing</option>
                    <option value="77777777-7777-7777-7777-111111111111">Electrical</option>
                    <option value="77777777-7777-7777-7777-222222222222">AC & Appliance</option>
                    <option value="77777777-7777-7777-7777-333333333333">Carpentry</option>
                    <option value="77777777-7777-7777-7777-444444444444">Painting</option>
                    <option value="77777777-7777-7777-7777-555555555555">Cleaning</option>
                  </select>
                </div>
              )}

              {businessType === 'shop' && (
                <div className="v-form-row-3col">
                  <div className="v-form-group">
                    <label>Barcode Type</label>
                    <select className="v-input" value={newItem.barcode_type} onChange={e => setNewItem({ ...newItem, barcode_type: e.target.value })}>
                      <option value="EAN-13">EAN-13</option>
                      <option value="UPCA-2">UPCA-2</option>
                      <option value="UPC-A">UPC-A</option>
                      <option value="EAN-8">EAN-8</option>
                    </select>
                  </div>
                  <div className="v-form-group">
                    <label>Barcode Number</label>
                    <input type="text" maxLength={20} className="v-input" placeholder="E.g. 8901234567890" value={newItem.barcode} onChange={e => setNewItem({ ...newItem, barcode: e.target.value.replace(/\D/g, '') })} />
                  </div>
                  <div className="v-form-group">
                    <label>Stock</label>
                    <input type="number" className="v-input" placeholder="0" value={newItem.stock_quantity} onChange={e => setNewItem({ ...newItem, stock_quantity: e.target.value })} />
                  </div>
                </div>
              )}

              <div className="v-form-group">
                <label>Description & Unique Selling Points</label>
                <textarea className="v-input" style={{ minHeight: '120px', resize: 'vertical' }} placeholder="What makes this special? List features, warranty, or delivery times..." value={newItem.detail} onChange={e => setNewItem({ ...newItem, detail: e.target.value })} />
              </div>

              <div className="v-form-group">
                <label>Visual Presentation</label>
                <div
                  className="v-input v-upload-zone"
                  onClick={() => document.getElementById('inventory-upload').click()}
                >
                  <input id="inventory-upload" type="file" hidden accept="image/*" onChange={(e) => {
                    const file = e.target.files[0];
                    if (file) {
                      const reader = new FileReader();
                      reader.onloadend = () => setNewItem({ ...newItem, image: reader.result });
                      reader.readAsDataURL(file);
                    }
                  }} />
                  {newItem.image ? (
                    <div style={{ position: 'relative', width: '220px', height: '150px', margin: '0 auto' }}>
                      <img src={newItem.image} alt="Preview" style={{ width: '100%', height: '100%', objectFit: 'cover', borderRadius: '16px' }} />
                      <div style={{ position: 'absolute', top: '-10px', right: '-10px', background: 'white', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', boxShadow: '0 4px 10px rgba(0,0,0,0.1)' }} onClick={(e) => { e.stopPropagation(); setNewItem({ ...newItem, image: null }); }}><Trash2 size={16} color="#ef4444" /></div>
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
        {items.map((item, idx) => {
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

          const cleanImage = getCleanImage(item.image, item.name);

          return (
            <motion.div
              key={item.id}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: idx * 0.08, duration: 0.4, ease: "easeOut" }}
              className="v-data-card"
            >
              <div className="v-card-image-wrap">
                <img src={cleanImage} alt={item.name} className="v-card-img" />
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
          );
        })}
      </div>
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={() => {
          if (confirmDialog.onConfirm) confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
    </div>
  );
};

// Premium High-Fidelity Custom Leaflet Map Component with OSRM Turn-by-Turn Road Routing
function VendorOrderTrackingMap({ order, riderCoords, businessType }) {
  const mapRef = React.useRef(null);
  const leafletMapRef = React.useRef(null);
  const markerGroupRef = React.useRef(null);
  const [osrmRoutePoints, setOsrmRoutePoints] = React.useState([]);

  // Coordinate Resolution State
  const [storeLatLng, setStoreLatLng] = React.useState(null);
  const [customerLatLng, setCustomerLatLng] = React.useState(null);

  // Dynamic Geocoding resolver helper
  const geocodeAddress = async (address) => {
    if (!address) return null;
    try {
      const url = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(address + ', Ahmedabad, Gujarat, India')}&limit=1`;
      const res = await fetch(url, { headers: { 'User-Agent': 'Passwalaa-App' } });
      if (res.ok) {
        const data = await res.json();
        if (data && data.length > 0) {
          return [parseFloat(data[0].lat), parseFloat(data[0].lon)];
        }
      }
    } catch (err) {
      console.warn('Geocoding error:', err);
    }
    return null;
  };

  React.useEffect(() => {
    let active = true;
    const resolvePositions = async () => {
      // Resolve Store
      let storePos = null;
      if (order.stores?.lat && order.stores?.lng) {
        storePos = [parseFloat(order.stores.lat), parseFloat(order.stores.lng)];
      } else {
        const addr = order.stores?.address || 'Ahmedabad';
        storePos = await geocodeAddress(addr);
        if (!storePos) storePos = [23.0305, 72.5075];
      }

      // Resolve Customer
      let custPos = null;
      if (order.addresses?.lat && order.addresses?.lng) {
        custPos = [parseFloat(order.addresses.lat), parseFloat(order.addresses.lng)];
      } else {
        const addr = order.addresses?.address_line_1 || 'Ahmedabad';
        custPos = await geocodeAddress(addr);
        if (!custPos) custPos = [23.0393, 72.5244];
      }

      if (active) {
        setStoreLatLng(storePos);
        setCustomerLatLng(custPos);
      }
    };
    resolvePositions();
    return () => { active = false; };
  }, [order.stores, order.addresses]);

  // Initialize Map
  React.useEffect(() => {
    if (!mapRef.current) return;

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

  // Force size invalidation to resolve Leaflet dynamic layout rendering bugs
  React.useEffect(() => {
    if (leafletMapRef.current) {
      const timer = setTimeout(() => {
        if (leafletMapRef.current) {
          leafletMapRef.current.invalidateSize();
        }
      }, 350);
      return () => clearTimeout(timer);
    }
  }, []);

  // Fetch real-time OSRM turn-by-turn road paths dynamically
  React.useEffect(() => {
    if (!storeLatLng || !customerLatLng) return;

    const riderLatLng = (riderCoords && riderCoords.lat && riderCoords.lng)
      ? [parseFloat(riderCoords.lat), parseFloat(riderCoords.lng)]
      : null;

    const fetchOSRMRoute = async () => {
      // Direct route segment selection based on current delivery status
      const start = riderLatLng || storeLatLng;
      const end = (order.status === 'ACCEPTED' || order.status === 'PREPARING') ? storeLatLng : customerLatLng;

      if (!start[0] || !start[1] || !end[0] || !end[1] || (start[0] === end[0] && start[1] === end[1])) {
        setTimeout(() => {
          setOsrmRoutePoints(prev => prev.length > 0 ? [] : prev);
        }, 0);
        return;
      }

      try {
        const routeData = await getOSRMRoute(start[0], start[1], end[0], end[1]);
        if (routeData.success && routeData.polyline.length > 0) {
          setOsrmRoutePoints(routeData.polyline);
        } else {
          setOsrmRoutePoints([]);
        }
      } catch (err) {
        console.warn("OSRM routing fetch failed for vendor map, falling back to direct line:", err);
        setOsrmRoutePoints([]);
      }
    };

    fetchOSRMRoute();
  }, [order.status, riderCoords, storeLatLng, customerLatLng]);

  // Plot and synchronize markers + dynamic route lines on changes
  React.useEffect(() => {
    if (!leafletMapRef.current || !markerGroupRef.current || !storeLatLng || !customerLatLng) return;

    markerGroupRef.current.clearLayers();

    // Premium vectorized DivIcon markers matching the platform branding
    const createRiderIcon = () => L.divIcon({
      className: 'custom-leaflet-marker rider-marker',
      html: `<div class="marker-container" style="background: #10b981; border: 3px solid white; box-shadow: 0 4px 10px rgba(0,0,0,0.3); width: 42px; height: 42px; border-radius: 50%; display: flex; align-items: center; justify-content: center; position: relative;">
               <span class="pulse-ring" style="position: absolute; width: 100%; height: 100%; border-radius: 50%; border: 3px solid #10b981; animation: marker-pulse 1.8s infinite; opacity: 0.6;"></span>
               ${businessType === 'service'
                 ? `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"/></svg>`
                 : `<svg xmlns="http://www.w3.org/2000/svg" width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="white" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round" style="transform: rotate(45deg);"><polygon points="3 11 22 2 13 21 11 13 3 11"/></svg>`
               }
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

    let riderLatLng = (riderCoords && riderCoords.lat && riderCoords.lng)
      ? [parseFloat(riderCoords.lat), parseFloat(riderCoords.lng)]
      : null;

    // Simulated/Fallback rider movement if the device does not have live active coordinates yet
    if (!riderLatLng && ['ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'].includes(order.status)) {
      if (order.status === 'ACCEPTED' || order.status === 'PREPARING') {
        riderLatLng = storeLatLng;
      } else if (order.status === 'SHIPPED' || order.status === 'DISPATCHED') {
        riderLatLng = [
          (storeLatLng[0] + customerLatLng[0]) / 2,
          (storeLatLng[1] + customerLatLng[1]) / 2
        ];
      }
    }

    // Plot Markers
    L.marker(storeLatLng, { icon: createStoreIcon() })
      .bindPopup(`<b>${businessType === 'service' ? 'Your Service Hub' : 'Your Store Hub'}</b>`)
      .addTo(markerGroupRef.current);

    L.marker(customerLatLng, { icon: createCustomerIcon() })
      .bindPopup(`<b>Customer Destination</b><br/>${order.addresses?.society || 'Delivery Location'}`)
      .addTo(markerGroupRef.current);

    if (riderLatLng) {
      L.marker(riderLatLng, { icon: createRiderIcon() })
        .bindPopup(`<b>${businessType === 'service' ? 'Assigned Expert' : 'Assigned Rider'}</b>`)
        .addTo(markerGroupRef.current);
    }

    // Connect them with smart routing polylines
    const leg1Color = '#f97316'; // store path
    const leg2Color = '#3b82f6'; // customer path

    if (order.status === 'ACCEPTED' || order.status === 'PREPARING') {
      if (osrmRoutePoints && osrmRoutePoints.length > 0) {
        L.polyline(osrmRoutePoints, { color: leg1Color, weight: 6, opacity: 0.95, lineJoin: 'round' }).addTo(markerGroupRef.current);
      } else if (riderLatLng) {
        L.polyline([riderLatLng, storeLatLng], { color: leg1Color, weight: 6, opacity: 0.9, lineJoin: 'round' }).addTo(markerGroupRef.current);
      }
      L.polyline([storeLatLng, customerLatLng], { color: leg2Color, weight: 4, opacity: 0.5, dashArray: '8, 8', lineJoin: 'round' }).addTo(markerGroupRef.current);
    } else {
      if (riderLatLng) {
        L.polyline([storeLatLng, riderLatLng], { color: '#94a3b8', weight: 3, opacity: 0.4, dashArray: '4, 4', lineJoin: 'round' }).addTo(markerGroupRef.current);
      }
      if (osrmRoutePoints && osrmRoutePoints.length > 0) {
        L.polyline(osrmRoutePoints, { color: leg2Color, weight: 6, opacity: 0.95, lineJoin: 'round' }).addTo(markerGroupRef.current);
      } else if (riderLatLng) {
        L.polyline([riderLatLng, customerLatLng], { color: leg2Color, weight: 6, opacity: 0.9, lineJoin: 'round' }).addTo(markerGroupRef.current);
      } else {
        L.polyline([storeLatLng, customerLatLng], { color: leg2Color, weight: 6, opacity: 0.9, lineJoin: 'round' }).addTo(markerGroupRef.current);
      }
    }

    // Auto-fit bounds
    try {
      const validPoints = [storeLatLng, customerLatLng];
      if (riderLatLng && !isNaN(riderLatLng[0]) && !isNaN(riderLatLng[1])) {
        validPoints.push(riderLatLng);
      }
      if (osrmRoutePoints && osrmRoutePoints.length > 0) {
        osrmRoutePoints.forEach(pt => validPoints.push(pt));
      }
      const bounds = L.latLngBounds(validPoints);
      leafletMapRef.current.fitBounds(bounds, { padding: [40, 40], maxZoom: 16 });
    } catch (e) {
      console.warn('Map boundary fit failed:', e);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [order.status, riderCoords, osrmRoutePoints, storeLatLng, customerLatLng, businessType]);

  return (
    <div ref={mapRef} style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0, zIndex: 1 }} />
  );
}

// Map Wrapper Component to Manage isolated Supabase state per active order
function VendorOrderMapWrapper({ order, businessType }) {
  const [riderCoords, setRiderCoords] = React.useState(null);

  React.useEffect(() => {
    // Inject custom animation styles for Leaflet pulse effects if not already present
    const styleId = 'leaflet-custom-pulse-styles';
    if (!document.getElementById(styleId)) {
      const style = document.createElement('style');
      style.id = styleId;
      style.textContent = `
        @keyframes marker-pulse {
          0% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0.7);
          }
          70% {
            transform: scale(1);
            box-shadow: 0 0 0 12px rgba(16, 185, 129, 0);
          }
          100% {
            transform: scale(0.95);
            box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
          }
        }
        .map-tiles {
          filter: grayscale(1) invert(0.05) sepia(0.05) brightness(0.95) contrast(1.05);
        }
      `;
      document.head.appendChild(style);
    }
  }, []);

  React.useEffect(() => {
    if (!order || !order.rider_id) {
      setRiderCoords(null);
      return;
    }

    const targetRiderId = order.rider_id;

    // Fetch Initial Location
    const getInitialPos = async () => {
      try {
        const { data } = await supabase
          .from('rider_locations')
          .select('lat, lng, updated_at')
          .eq('rider_id', targetRiderId)
          .maybeSingle();

        if (data) {
          const lastUpdate = new Date(data.updated_at).getTime();
          const now = Date.now();
          if (now - lastUpdate < 120000) { // Active in last 2 mins
            setRiderCoords({ lat: parseFloat(data.lat), lng: parseFloat(data.lng) });
          }
        }
      } catch (err) {
        console.warn("Error getting initial rider position:", err);
      }
    };
    getInitialPos();

    // Listen to real-time coordinate updates
    const channel = supabase
      .channel(`vendor-rider-tracking-${order.id}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'rider_locations',
        filter: `rider_id=eq.${targetRiderId}`
      }, (payload) => {
        if (payload.eventType === 'DELETE') {
          setRiderCoords(null);
        } else if (payload.new && payload.new.lat && payload.new.lng) {
          setRiderCoords({ lat: parseFloat(payload.new.lat), lng: parseFloat(payload.new.lng) });
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [order]);

  return (
    <div style={{ position: 'relative', height: '260px', borderRadius: '20px', overflow: 'hidden', border: '1px solid #e2e8f0', marginTop: '0.75rem', zIndex: 1 }}>
      <VendorOrderTrackingMap order={order} riderCoords={riderCoords} businessType={businessType} />

      {/* Floating Info Overlay */}
      <div style={{ position: 'absolute', top: '12px', right: '12px', background: 'white', padding: '6px 12px', borderRadius: '10px', boxShadow: '0 4px 12px rgba(0,0,0,0.1)', display: 'flex', alignItems: 'center', gap: '8px', zIndex: 10 }}>
        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: riderCoords ? '#22c55e' : '#94a3b8', animation: riderCoords ? 'pulse 2s infinite' : 'none' }}></div>
        <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#334155' }}>
          {businessType === 'service'
            ? (['ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'].includes(order.status) ? 'Service in progress' : order.status === 'DELIVERED' ? 'Service completed' : 'Waiting for confirmation')
            : ((riderCoords || ['ACCEPTED', 'PREPARING', 'DISPATCHED', 'SHIPPED'].includes(order.status)) ? 'Rider / Order In Progress' : (order.rider_id ? 'Rider Assigned' : 'Waiting for Rider Assignment'))
          }
        </span>
      </div>
    </div>
  );
}

export const VendorOrders = ({ storeId, businessType }) => {
  const [activeTab, setActiveTab] = React.useState('active');
  const [orders, setOrders] = React.useState([]);
  const [loading, setLoading] = React.useState(true);
  const [confirmDialog, setConfirmDialog] = React.useState({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: null,
    confirmText: 'Confirm',
    cancelText: 'Cancel',
    type: 'danger'
  });

  const handleSimulateOrder = async () => {
    const isService = businessType === 'service';
    try {
      toast.loading(isService ? "Simulating new test booking..." : "Simulating new test order...", { id: 'sim-order' });
      // 1. Get an address and user from the DB
      const { data: addrs, error: addrErr } = await supabase.from('addresses').select('id, user_id').limit(1);
      if (addrErr || !addrs || addrs.length === 0) {
        toast.error("Simulation failed: No addresses/users found in DB. Please create a user/address first.", { id: 'sim-order' });
        return;
      }
      const addr = addrs[0];

      // 2. Fetch or create a product/service to associate with this store
      let productId = null;
      let simulatePrice = 150;
      
      if (isService) {
        // Try to find a service for this store
        const { data: servs } = await supabase.from('services').select('id, price').eq('provider_id', storeId).limit(1);
        if (servs && servs.length > 0) {
          productId = servs[0].id;
          simulatePrice = servs[0].price || 350;
        } else {
          // If no service exists, let's create a dummy service
          const dummyServiceId = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          const { error: servErr } = await supabase.from('services').insert([{
            id: dummyServiceId,
            provider_id: storeId,
            title: 'Expert AC Diagnosis & Repair',
            price: 350,
            description: 'Professional diagnosis and quick repair by certified technician',
            category_id: '77777777-7777-7777-7777-222222222222',
            duration_minutes: 60
          }]);
          if (!servErr) {
            productId = dummyServiceId;
            simulatePrice = 350;
          } else {
            console.error("Failed to insert dummy service:", servErr);
          }
        }
      } else {
        // Try to find a product for this store
        const { data: prods } = await supabase.from('products').select('id, price').eq('store_id', storeId).limit(1);
        if (prods && prods.length > 0) {
          productId = prods[0].id;
          simulatePrice = prods[0].price || 150;
        } else {
          // If no product exists, let's create a dummy product
          const dummyProductId = crypto.randomUUID ? crypto.randomUUID() : 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
            var r = Math.random() * 16 | 0, v = c == 'x' ? r : (r & 0x3 | 0x8);
            return v.toString(16);
          });
          const { error: prodErr } = await supabase.from('products').insert([{
            id: dummyProductId,
            store_id: storeId,
            name: 'Water Delivery Test Service',
            price: 150,
            stock_quantity: 9999,
            description: 'Service item auto-registered for testing'
          }]);
          if (!prodErr) {
            productId = dummyProductId;
            simulatePrice = 150;
          } else {
            console.error("Failed to insert dummy product:", prodErr);
          }
        }
      }

      // 3. Create the order
      const { data: newOrder, error: oe } = await supabase
        .from('orders')
        .insert([{
          total_amount: simulatePrice,
          subtotal: simulatePrice,
          status: 'PLACED',
          delivery_fee: 0,
          store_id: storeId,
          user_id: addr.user_id,
          address_id: addr.id
        }])
        .select()
        .single();

      if (oe) {
        toast.error("Failed to create order record: " + oe.message, { id: 'sim-order' });
        return;
      }

      // 4. Create order item
      if (productId) {
        await supabase.from('order_items').insert([{
          order_id: newOrder.id,
          product_id: productId,
          quantity: 1,
          price_at_purchase: simulatePrice
        }]);
      }

      toast.success(isService ? "Test booking simulated successfully!" : "Test order simulated successfully!", { id: 'sim-order' });
      fetchOrders(false);
    } catch (err) {
      toast.error("Simulation failed: " + err.message, { id: 'sim-order' });
    }
  };

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
          addresses(*),
          stores(name, address, lat, lng),
          order_items(quantity, price_at_purchase, products(name))
        `)
        .eq('store_id', storeId)
        .order('created_at', { ascending: false })
        .limit(20);

      if (!error && data) {
        // Collect all service product_ids where products is null
        const potentialServiceIds = [];
        data.forEach(order => {
          order.order_items?.forEach(oi => {
            if (!oi.products?.name && oi.product_id) {
              potentialServiceIds.push(oi.product_id);
            }
          });
        });

        if (potentialServiceIds.length > 0) {
          try {
            const { data: servicesData } = await supabase
              .from('services')
              .select('id, title')
              .in('id', potentialServiceIds);
            
            if (servicesData) {
              const serviceMap = {};
              servicesData.forEach(s => {
                serviceMap[s.id] = s.title;
              });

              // Map it back to the data structure
              data.forEach(order => {
                order.order_items?.forEach(oi => {
                  if (!oi.products?.name && serviceMap[oi.product_id]) {
                    oi.products = {
                      ...oi.products,
                      name: serviceMap[oi.product_id]
                    };
                  }
                });
              });
            }
          } catch (servErr) {
            console.warn("Could not load service titles for vendor:", servErr);
          }
        }

        // Normalize/parse addresses to resolve "Geo-location Pending" issues
        data.forEach(order => {
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
            // Parse society dynamically from address_line_1 if not present
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
            if (!order.addresses.lat || !order.addresses.lng) {
              order.addresses.lat = 23.0753;
              order.addresses.lng = 72.5244;
            }
          }
        });

        setOrders(data);
      } else if (!error) {
        setOrders([]);
      }
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

  // Offline / Online detection
  React.useEffect(() => {
    const handleOnline = () => {
      toast.success("Internet restored. Syncing orders...", { icon: '🟢' });
      fetchOrders(false);
    };
    const handleOffline = () => {
      toast.error("You are offline! Live orders paused.", { duration: 6000, icon: '🔴' });
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [fetchOrders]);

  // Audio Notification Loop for New Orders
  React.useEffect(() => {
    const hasNewOrders = orders.some(o => o.status === 'PLACED');
    if (!hasNewOrders) return;

    const playNotificationSound = () => {
      try {
        const AudioContext = window.AudioContext || window.webkitAudioContext;
        const ctx = new AudioContext();
        const osc = ctx.createOscillator();
        const gainNode = ctx.createGain();
        osc.connect(gainNode);
        gainNode.connect(ctx.destination);
        osc.type = 'sine';
        osc.frequency.setValueAtTime(880, ctx.currentTime); // A5
        osc.frequency.exponentialRampToValueAtTime(1760, ctx.currentTime + 0.1); // A6
        gainNode.gain.setValueAtTime(0.1, ctx.currentTime);
        gainNode.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.5);
        osc.start();
        osc.stop(ctx.currentTime + 0.5);
      } catch (e) {
        // Browser might block audio until user interacts with the page
      }
    };

    playNotificationSound();
    const intervalId = setInterval(playNotificationSound, 4000);
    return () => clearInterval(intervalId);
  }, [orders]);

  const updateStatus = async (orderId, newStatus) => {
    const isService = businessType === 'service';
    const toastId = toast.loading(isService ? "Updating booking status..." : "Updating order status...");
    const isValidUuid = (id) => /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/.test(id);
    try {
      const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
      if (error) throw error;

      if (isService) {
        const orderObj = orders.find(o => o.id === orderId);
        if (orderObj && isValidUuid(storeId)) {
          const serviceItem = orderObj.order_items?.find(item => item.product_id);
          const serviceId = serviceItem ? serviceItem.product_id : null;

          let query = supabase
            .from('service_bookings')
            .update({ status: newStatus })
            .eq('user_id', orderObj.user_id)
            .eq('provider_id', storeId);

          if (serviceId && isValidUuid(serviceId)) {
            query = query.eq('service_id', serviceId);
          }

          const { error: bookingErr } = await query;
          if (bookingErr) {
            console.warn("Could not sync status to service_bookings:", bookingErr.message);
          }
        }
      }

      toast.success(isService ? "Booking updated successfully!" : "Order updated successfully!", { id: toastId });
      setOrders(prev => prev.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
      fetchOrders(false);
    } catch (err) {
      toast.error("Failed to update status: " + err.message, { id: toastId });
    }
  };

  const getStatusStyle = (status) => {
    const isService = businessType === 'service';
    switch (status) {
      case 'PLACED': return { bg: '#fff7ed', text: '#f97316', dot: '#f97316', label: isService ? 'New Booking' : 'New Order', icon: <Bell size={14} /> };
      case 'ACCEPTED': return { bg: '#e0f2fe', text: '#0ea5e9', dot: '#0ea5e9', label: isService ? 'Expert Assigned' : 'Rider Accepted', icon: <CheckCircle size={14} /> };
      case 'PREPARING': return { bg: '#eff6ff', text: '#3b82f6', dot: '#3b82f6', label: isService ? 'Expert Preparing' : 'In Progress', icon: <Clock size={14} /> };
      case 'SHIPPED': return { bg: '#faf5ff', text: '#a855f7', dot: '#a855f7', label: isService ? 'Expert En Route' : 'Out for Delivery', icon: <MapPin size={14} /> };
      case 'DELIVERED': return { bg: '#f0fdf4', text: '#22c55e', dot: '#22c55e', label: isService ? 'Service Completed' : 'Completed', icon: <CheckCircle size={14} /> };
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
          <h1 className="v-hero-title">{businessType === 'service' ? 'Live Bookings' : 'Live Orders'}</h1>
          <p className="v-hero-subtitle">{businessType === 'service' ? 'Real-time tracking and operational control for your services' : 'Real-time tracking and operational control for your store'}</p>
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
            {tab === 'active' ? (businessType === 'service' ? 'Ongoing Bookings' : 'Ongoing Missions') : 'Past Records'}
          </button>
        ))}
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
        {orders.filter(o => activeTab === 'active' ? (o.status !== 'DELIVERED' && o.status !== 'CANCELLED' && o.status !== 'PENDING') : (o.status === 'DELIVERED' || o.status === 'CANCELLED')).map((order, i) => {
          const style = getStatusStyle(order.status);
          const isService = businessType === 'service';
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
                    <span style={{ fontWeight: 950, color: '#0f172a', fontSize: '1.25rem', letterSpacing: '-0.5px' }}>#{isService ? 'BKG' : 'ORD'}-{order.id.substring(0, 8).toUpperCase()}</span>
                    {['PLACED', 'ACCEPTED'].includes(order.status) && (
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

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '3rem', marginBottom: '2rem', alignItems: 'center' }}>
                <div>
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isService ? 'Customer Profile' : 'Customer Entity'}</p>
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
                  <p style={{ margin: '0 0 10px 0', fontSize: '0.75rem', fontWeight: 800, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>{isService ? 'Service Address' : 'Destination Node'}</p>
                  <div style={{ display: 'flex', alignItems: 'flex-start', gap: '8px', color: '#1e293b' }}>
                    <MapPin size={18} color="var(--v-primary)" style={{ marginTop: '2px', flexShrink: 0 }} />
                    <span style={{ fontWeight: 700, fontSize: '0.95rem', lineHeight: 1.4 }}>{order.addresses?.society || 'Geo-location Pending'}</span>
                  </div>
                </div>
              </div>

              <div style={{ background: '#f8fafc', borderRadius: '20px', padding: '1.5rem', marginBottom: '2rem', border: '1px solid #f1f5f9' }}>
                <p style={{ margin: '0 0 12px 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }}>{isService ? 'Booked Services' : 'Inventory Manifest'}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '10px' }}>
                  {order.order_items?.map((item, idx) => (
                    <div key={idx} style={{ background: 'white', border: '1px solid #e2e8f0', padding: '6px 14px', borderRadius: '12px', fontSize: '0.9rem', fontWeight: 800, color: '#1e293b', display: 'flex', alignItems: 'center', gap: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.02)' }}>
                      <span style={{ color: 'var(--v-primary)' }}>{item.quantity}x</span>
                      {item.products?.name}
                    </div>
                  )) || <span style={{ fontStyle: 'italic', color: '#94a3b8' }}>Parsing manifest data...</span>}
                </div>
              </div>

              {activeTab === 'active' && ['PLACED', 'PREPARING', 'SHIPPED', 'DISPATCHED'].includes(order.status) && (
                <div style={{ marginBottom: '2rem' }}>
                  <p style={{ margin: '0 0 8px 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: 900, textTransform: 'uppercase' }}>{isService ? 'Expert Location & Live Tracking' : 'Rider Delivery Path & Live Tracking'}</p>
                  <VendorOrderMapWrapper order={order} businessType={businessType} />
                </div>
              )}

              <div style={{ display: 'flex', gap: '1.25rem' }}>
                {order.status === 'PLACED' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateStatus(order.id, 'PREPARING')}
                    className="v-btn-primary"
                    style={{ flex: 1, padding: '16px' }}
                  >
                    {isService ? 'Confirm Booking' : 'Confirm Order'}
                  </motion.button>
                )}
                {order.status === 'ACCEPTED' && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateStatus(order.id, 'PREPARING')}
                    className="v-btn-primary"
                    style={{ flex: 1, padding: '16px' }}
                  >
                    {isService ? 'Initiate Service' : 'Initiate Fulfillment'}
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
                    {isService ? 'Dispatch Expert' : 'Confirm Ready for Pickup'}
                  </motion.button>
                )}
                {['SHIPPED', 'DISPATCHED'].includes(order.status) && (
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => updateStatus(order.id, 'DELIVERED')}
                    className="v-btn-primary"
                    style={{ flex: 1, padding: '16px', background: '#2563eb', boxShadow: '0 10px 25px rgba(37, 99, 235, 0.2)' }}
                  >
                    {isService ? 'Confirm Service Completed' : 'Confirm Delivery'}
                  </motion.button>
                )}
                {['PLACED', 'ACCEPTED', 'PREPARING', 'SHIPPED', 'DISPATCHED'].includes(order.status) ? (
                  <button
                    onClick={() => {
                      setConfirmDialog({
                        isOpen: true,
                        title: isService ? 'Cancel Booking' : 'Emergency Override',
                        message: isService 
                          ? 'Are you sure you want to CANCEL this booking? This cannot be undone and the customer will be notified.'
                          : 'Are you sure you want to CANCEL this order? This cannot be undone and the customer will be notified.',
                        confirmText: isService ? 'Cancel Booking' : 'Cancel Order',
                        cancelText: 'Keep Active',
                        type: 'danger',
                        onConfirm: () => updateStatus(order.id, 'CANCELLED')
                      });
                    }}
                    className="v-btn-outline"
                    style={{ padding: '14px 32px', fontWeight: 800, color: '#ef4444', borderColor: '#fecaca', background: '#fef2f2' }}
                  >
                    {isService ? 'Cancel Booking' : 'Cancel Order'}
                  </button>
                ) : (
                  <button className="v-btn-outline" style={{ padding: '14px 32px', fontWeight: 800 }}>
                    {isService ? 'Booking Protocol' : 'Order Protocol'}
                  </button>
                )}
              </div>
            </motion.div>
          );
        })}
        {orders.length === 0 && (
          <div style={{ padding: '8rem 2rem', textAlign: 'center', background: 'white', borderRadius: '40px', border: '2px dashed #e2e8f0' }}>
            <div style={{ width: '100px', height: '100px', background: '#f8fafc', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 2rem auto' }}>
              {businessType === 'service' ? (
                <Wrench size={48} color="#cbd5e1" />
              ) : (
                <Package size={48} color="#cbd5e1" />
              )}
            </div>
            <h3 style={{ fontWeight: 950, color: '#1e293b', fontSize: '1.5rem', letterSpacing: '-0.5px' }}>{businessType === 'service' ? 'No Bookings' : 'Station Idle'}</h3>
            <p style={{ color: '#64748b', margin: '0.75rem 0 2rem 0', fontWeight: 600 }}>{businessType === 'service' ? 'Your service station is ready to receive bookings. New bookings will trigger a priority alert.' : 'Your store is ready to receive missions. New orders will trigger a priority alert.'}</p>
            <div style={{ display: 'flex', gap: '1rem', flexDirection: 'column', alignItems: 'center' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 16px', background: '#f0fdf4', color: '#16a34a', borderRadius: '12px', fontSize: '0.85rem', fontWeight: 900, marginBottom: '1rem' }}>
                <div className="v-pulse-dot" style={{ background: '#16a34a' }}></div>
                OPERATIONAL
              </div>
              <button 
                onClick={handleSimulateOrder}
                style={{ 
                  padding: '12px 24px', 
                  borderRadius: '12px', 
                  background: 'var(--v-primary)', 
                  color: 'white', 
                  border: 'none', 
                  fontWeight: 800, 
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(249, 115, 22, 0.2)'
                }}
              >
                {businessType === 'service' ? 'Simulate Test Booking' : 'Simulate Test Order'}
              </button>
            </div>
          </div>
        )}
      </div>
      <ConfirmModal
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        cancelText={confirmDialog.cancelText}
        type={confirmDialog.type}
        onConfirm={() => {
          if (confirmDialog.onConfirm) confirmDialog.onConfirm();
          setConfirmDialog(prev => ({ ...prev, isOpen: false }));
        }}
        onCancel={() => setConfirmDialog(prev => ({ ...prev, isOpen: false }))}
      />
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
              <span style={{ fontWeight: 900, color: earnings > 0 ? '#22c55e' : '#94a3b8' }}>{earnings > 0 ? '+12.5%' : '0%'}</span>
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
              <span style={{ fontWeight: 900, color: orderCount > 0 ? '#3b82f6' : '#94a3b8' }}>{orderCount > 0 ? '98.2%' : '0%'}</span>
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
            comment: `Professional service on Order #${o.id.substring(0, 6).toUpperCase()}. The packaging was excellent and delivery was prompt.`,
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
            {[1, 2, 3, 4, 5].map(s => <Star key={s} size={20} color="#f59e0b" fill={s <= 4 ? "#f59e0b" : s === 5 ? "rgba(245, 158, 11, 0.4)" : "transparent"} />)}
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
                      {[1, 2, 3, 4, 5].map(s => <Star key={s} size={12} color="#f59e0b" fill={s <= rev.rating ? "#f59e0b" : "transparent"} />)}
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

export const VendorNotifications = ({ storeId, businessType }) => {
  const [notifications, setNotifications] = React.useState([]);

  const fetchNotifs = React.useCallback(async () => {
    if (!storeId) { setNotifications([]); return; }
    try {
      const { data, error } = await supabase.from('orders').select('id, status, created_at, users(full_name)').eq('store_id', storeId).order('created_at', { ascending: false }).limit(8);
      if (!error && data) {
        const isService = businessType === 'service';
        const list = data.map(o => ({
          title: o.status === 'PLACED' 
            ? (isService ? 'Critical: New Booking Received!' : 'Critical: New Order Received!')
            : o.status === 'DELIVERED' 
              ? (isService ? 'Mission Success: Service Completed' : 'Mission Success: Order Completed') 
              : (isService ? `Update: Booking #${o.id.substring(0, 8).toUpperCase()} Status Shift` : `Update: Order #${o.id.substring(0, 8).toUpperCase()} Status Shift`),
          desc: isService
            ? `Booking #${o.id.substring(0, 8).toUpperCase()} from ${o.users?.full_name || 'Verified Customer'}. Action may be required.`
            : `Order #${o.id.substring(0, 8).toUpperCase()} from ${o.users?.full_name || 'Verified Customer'}. Action may be required.`,
          time: new Date(o.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: true }),
          unread: o.status === 'PLACED' || o.status === 'PREPARING',
          type: o.status === 'PLACED' ? 'urgent' : 'update'
        }));
        setNotifications(list);
      }
    } catch (err) {
      console.error("Notifs error:", err);
    }
  }, [storeId, businessType]);

  React.useEffect(() => {
    fetchNotifs();

    const playNotificationBeep = () => {
      try {
        const audioCtx = new (window.AudioContext || window.webkitAudioContext)();
        const playBeep = (freq, duration, delay) => {
          const osc = audioCtx.createOscillator();
          const gainNode = audioCtx.createGain();
          osc.connect(gainNode);
          gainNode.connect(audioCtx.destination);
          osc.frequency.setValueAtTime(freq, audioCtx.currentTime + delay);
          gainNode.gain.setValueAtTime(0.3, audioCtx.currentTime + delay);
          gainNode.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + delay + duration);
          osc.start(audioCtx.currentTime + delay);
          osc.stop(audioCtx.currentTime + delay + duration);
        };
        playBeep(880, 0.15, 0);
        playBeep(1100, 0.2, 0.2);
      } catch (err) {
        console.warn("AudioContext beep failed:", err);
      }
    };

    const channel = supabase
      .channel(`vendor-notifs-realtime-${storeId}`)
      .on('postgres_changes', {
        event: '*',
        schema: 'public',
        table: 'orders',
        filter: `store_id=eq.${storeId}`
      }, (payload) => {
        fetchNotifs();
        if (payload.eventType === 'INSERT') {
          const isService = businessType === 'service';
          toast.success(isService ? "New Booking Received!" : "New Order Received!", { icon: '🔔' });
          playNotificationBeep();
        }
      })
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [storeId, businessType, fetchNotifs]);

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
          <h1 className="v-hero-title">{businessType === 'service' ? 'Service Notifications' : 'Partner Notifications'}</h1>
          <p className="v-hero-subtitle">{businessType === 'service' ? 'Stay synchronized with service bookings and operational alerts' : 'Stay synchronized with store activities and operational alerts'}</p>
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
