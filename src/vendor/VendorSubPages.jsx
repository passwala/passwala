import React from 'react';
import { Package, FileText, IndianRupee, Wallet, Star, Bell, HelpCircle, CheckCircle, Clock, MapPin, Download, ArrowUpRight, ArrowDownRight, Tag, Trash2 } from 'lucide-react';
import { supabase } from '../supabase';

export const VendorInventory = ({ businessType }) => {
  const [items, setItems] = React.useState([]);

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

  const [showForm, setShowForm] = React.useState(false);
  const [newItem, setNewItem] = React.useState({ name: '', detail: '', price: '', image: null });

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
       console.error("Failed to sync to admin:", err);
       alert("Network connection error while saving.");
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Are you sure you want to delete this item?')) return;
    try {
      const { error } = await supabase.from('products').delete().eq('id', id);
      if (error) {
        alert('Error deleting product: ' + error.message);
        return;
      }
      setItems(items.filter(item => item.id !== id));
    } catch (err) {
      console.error('Failed to delete item:', err);
      alert('Network connection error while deleting.');
    }
  };

  return (
    <div className="v-container" style={{ position: 'relative' }}>
      <div className="v-hero-section" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <h1>{businessType === 'shop' ? 'Product Catalog' : 'My Services'}</h1>
          <p>Manage your offerings and pricing</p>
        </div>
        <button onClick={() => setShowForm(true)} style={{ background: 'var(--v-primary)', color: 'white', border: 'none', padding: '10px 20px', borderRadius: '8px', fontWeight: 700, display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
          <Package size={18} />
          Add New {businessType === 'shop' ? 'Product' : 'Service'}
        </button>
      </div>

      {showForm && (
        <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--v-border)', marginBottom: '2rem', boxShadow: '0 4px 15px rgba(0,0,0,0.05)' }}>
          <h3 style={{ margin: '0 0 1.5rem 0', color: 'var(--v-primary)' }}>Add New {businessType === 'shop' ? 'Product' : 'Service'}</h3>
          <form style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }} onSubmit={handleAdd}>
            <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1fr)', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Name <span style={{color:'red'}}>*</span></label>
                <input required type="text" className="v-input" placeholder="E.g. Fresh Milk 1L" value={newItem.name} onChange={e => setNewItem({...newItem, name: e.target.value})} />
              </div>
              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Price (₹) <span style={{color:'red'}}>*</span></label>
                <input required type="number" className="v-input" placeholder="100" value={newItem.price} onChange={e => setNewItem({...newItem, price: e.target.value})} />
              </div>
            </div>
            
            <div>
               <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Details / Description</label>
               <input type="text" className="v-input" placeholder="e.g. Fresh, Organic, Available daily" value={newItem.detail} onChange={e => setNewItem({...newItem, detail: e.target.value})} />
            </div>

            <div>
               <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: 600, fontSize: '0.85rem' }}>Upload Image</label>
               <input type="file" accept="image/*" onChange={(e) => {
                 const file = e.target.files[0];
                 if(file) {
                    const reader = new FileReader();
                    reader.onloadend = () => setNewItem({...newItem, image: reader.result});
                    reader.readAsDataURL(file);
                 }
               }} style={{ display: 'block', width: '100%', padding: '12px', border: '2px dashed var(--v-border)', borderRadius: '12px', cursor: 'pointer', background: '#f8fafc' }} />
               {newItem.image && <img src={newItem.image} alt="Preview" style={{ marginTop: '1rem', width: '100px', height: '100px', objectFit: 'cover', borderRadius: '12px', border: '1px solid var(--v-border)' }} />}
            </div>

            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
               <button type="button" onClick={() => setShowForm(false)} style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 700, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Cancel</button>
               <button type="submit" style={{ background: '#0f172a', color: 'white', fontWeight: 700, padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Save to Catalog</button>
            </div>
          </form>
        </div>
      )}
      
      <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--v-border)', overflow: 'hidden' }}>
        <div style={{ padding: '1rem', borderBottom: '1px solid var(--v-border)', background: '#f8fafc', fontWeight: 700, color: '#64748b' }}>
          Active Items
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0' }}>
          {items.map(item => (
            <div key={item.id} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '1.5rem', borderBottom: '1px solid var(--v-border)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                <div style={{ width: '60px', height: '60px', background: '#f1f5f9', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', overflow: 'hidden' }}>
                  {item.image ? <img src={item.image} alt={item.name} style={{ width: '100%', height: '100%', objectFit: 'cover' }} /> : <Tag size={24} color="#94a3b8" />}
                </div>
                <div>
                  <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700 }}>{item.name}</h4>
                  <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b' }}>{item.detail} • ID: #{item.id}</p>
                </div>
              </div>
              <div style={{ textAlign: 'right', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.5rem' }}>
                <div style={{ fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>₹{item.price}</div>
                <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                   <span style={{ fontSize: '0.75rem', background: '#dcfce7', color: '#166534', padding: '2px 8px', borderRadius: '12px', fontWeight: 700 }}>In Stock</span>
                   <button onClick={() => handleDelete(item.id)} style={{ background: '#fee2e2', color: '#dc2626', border: 'none', width: '28px', height: '28px', borderRadius: '6px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', transition: 'all 0.2s' }} title="Delete Item">
                     <Trash2 size={14} />
                   </button>
                </div>
              </div>
            </div>
          ))}
          {items.length === 0 && (
            <div style={{ padding: '3rem', textAlign: 'center', color: '#94a3b8' }}>
               <Package size={48} style={{ margin: '0 auto 1rem auto', opacity: 0.5 }} />
               <p>No items found. Add your first {businessType === 'shop' ? 'product' : 'service'}!</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export const VendorOrders = ({ businessType }) => (
  <div className="v-container">
    <div className="v-hero-section">
      <h1>{businessType === 'shop' ? 'Recent Orders' : 'Work Bookings'}</h1>
      <p>Track your ongoing and completed requests</p>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      {[
        { id: 'ORD-8821', status: 'Prepping', price: '450', time: '10 mins ago' },
        { id: 'ORD-8820', status: 'Out for Delivery', price: '1200', time: '45 mins ago' },
        { id: 'ORD-8819', status: 'Completed', price: '320', time: '2 hours ago' }
      ].map((order, i) => (
        <div key={i} style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--v-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
               <h4 style={{ margin: 0, fontWeight: 800 }}>{order.id}</h4>
               <span style={{ fontSize: '0.7rem', padding: '2px 8px', borderRadius: '8px', background: order.status === 'Completed' ? '#f1f5f9' : '#fff7ed', color: order.status === 'Completed' ? '#64748b' : '#c2410c', fontWeight: 700 }}>{order.status}</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.85rem', color: '#64748b', display: 'flex', alignItems: 'center', gap: '4px' }}><Clock size={14} /> {order.time}</p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <p style={{ margin: 0, fontWeight: 800, fontSize: '1.1rem', color: '#0f172a' }}>₹{order.price}</p>
            <button style={{ marginTop: '0.5rem', background: 'none', border: '1px solid var(--v-border)', padding: '4px 12px', borderRadius: '6px', fontSize: '0.75rem', fontWeight: 600, cursor: 'pointer' }}>View Details</button>
          </div>
        </div>
      ))}
    </div>
  </div>
);

export const VendorEarnings = () => (
  <div className="v-container">
    <div className="v-hero-section">
      <h1>Revenue Stream</h1>
      <p>Financial overview and analytics</p>
    </div>

    <div className="v-stats-grid">
      <div className="v-stat-card">
        <div className="v-stat-header">
           <div className="v-stat-icon" style={{ background: '#dcfce7', color: '#166534' }}><IndianRupee size={20} /></div>
           <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>This Week</span>
        </div>
        <div>
           <p style={{ margin: '0 0 0.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>Total Earnings</p>
           <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800 }}>₹14,500</h3>
        </div>
      </div>
      <div className="v-stat-card">
        <div className="v-stat-header">
           <div className="v-stat-icon" style={{ background: '#e0e7ff', color: '#3730a3' }}><ArrowUpRight size={20} /></div>
           <span style={{ fontSize: '0.8rem', background: '#f1f5f9', padding: '2px 8px', borderRadius: '12px', fontWeight: 600 }}>vs Last Week</span>
        </div>
        <div>
           <p style={{ margin: '0 0 0.25rem 0', color: '#64748b', fontSize: '0.9rem' }}>Growth</p>
           <h3 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 800, color: '#166534' }}>+12.4%</h3>
        </div>
      </div>
    </div>
    
    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--v-border)', height: '250px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#94a3b8', flexDirection: 'column', gap: '1rem' }}>
       <IndianRupee size={32} opacity={0.5} />
       <p style={{ fontWeight: 600 }}>Revenue Chart Visualization (Syncing...)</p>
    </div>
  </div>
);

export const VendorWallet = () => (
  <div className="v-container">
    <div className="v-hero-section">
      <h1>Merchant Wallet</h1>
      <p>Manage payouts and settlements</p>
    </div>

    <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '2rem', borderRadius: '20px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', boxShadow: '0 10px 25px rgba(15, 23, 42, 0.2)' }}>
       <div>
          <p style={{ color: '#94a3b8', margin: '0 0 0.5rem 0', fontSize: '0.9rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '1px' }}>Available Balance</p>
          <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: 800 }}>₹8,250.00</h2>
       </div>
       <button style={{ background: 'var(--v-primary)', color: 'white', border: 'none', padding: '12px 24px', borderRadius: '12px', fontWeight: 800, display: 'flex', gap: '8px', alignItems: 'center', cursor: 'pointer' }}>
         <Download size={18} />
         Withdraw
       </button>
    </div>

    <h3 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '1rem' }}>Recent Wallet Activity</h3>
    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--v-border)' }}>
      {[
        { title: 'Order #8820 Settlement', amt: '+₹1,020', type: 'in' },
        { title: 'Bank Withdrawal', amt: '-₹5,000', type: 'out' },
        { title: 'Passwala Commission', amt: '-₹24', type: 'out' }
      ].map((tx, i) => (
         <div key={i} style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem 1.5rem', borderBottom: '1px solid #f1f5f9' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
               <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: tx.type === 'in' ? '#dcfce7' : '#fee2e2', color: tx.type === 'in' ? '#166534' : '#991b1b', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {tx.type === 'in' ? <ArrowDownRight size={20} /> : <ArrowUpRight size={20} />}
               </div>
               <span style={{ fontWeight: 600, color: '#0f172a' }}>{tx.title}</span>
            </div>
            <span style={{ fontWeight: 800, color: tx.type === 'in' ? '#166534' : '#0f172a' }}>{tx.amt}</span>
         </div>
      ))}
    </div>
  </div>
);

export const VendorReviews = () => (
  <div className="v-container">
    <div className="v-hero-section">
      <h1>Customer Feedback</h1>
      <p>See what people are saying</p>
    </div>

    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
       {[
          { name: 'Karan P.', rating: 5, comment: 'Excellent quality and fast delivery! Highly recommend.', date: '2 days ago' },
          { name: 'Mehul S.', rating: 4, comment: 'Good service, but packaging could be slightly better.', date: '1 week ago' }
       ].map((rev, i) => (
          <div key={i} style={{ background: 'white', padding: '1.5rem', borderRadius: '16px', border: '1px solid var(--v-border)' }}>
             <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '1rem' }}>
                <span style={{ fontWeight: 700, color: '#0f172a' }}>{rev.name}</span>
                <span style={{ color: '#64748b', fontSize: '0.8rem' }}>{rev.date}</span>
             </div>
             <div style={{ display: 'flex', gap: '4px', marginBottom: '0.5rem', color: '#f59e0b' }}>
                {[...Array(5)].map((_, j) => <Star key={j} size={16} fill={j < rev.rating ? 'currentColor' : 'none'} color={j < rev.rating ? '#f59e0b' : '#cbd5e1'} />)}
             </div>
             <p style={{ margin: 0, color: '#475569', lineHeight: 1.5 }}>"{rev.comment}"</p>
          </div>
       ))}
    </div>
  </div>
);

export const VendorNotifications = () => (
  <div className="v-container">
    <div className="v-hero-section">
      <h1>Alerts Center</h1>
      <p>Important updates and messages</p>
    </div>

    <div style={{ background: 'white', borderRadius: '16px', border: '1px solid var(--v-border)' }}>
       {[
          { title: 'New Order Received!', desc: 'Order #8822 from Neha. Please prepare.', time: 'Just now', unread: true },
          { title: 'Settlement Complete', desc: '₹5,000 has been transferred to your bank account ending in 4921.', time: 'Yesterday', unread: false }
       ].map((notif, i) => (
          <div key={i} style={{ padding: '1.5rem', borderBottom: '1px solid #f1f5f9', display: 'flex', gap: '1rem', background: notif.unread ? '#fffbeb' : 'white' }}>
             <div style={{ width: '40px', height: '40px', borderRadius: '50%', background: notif.unread ? '#fef3c7' : '#f1f5f9', color: notif.unread ? '#d97706' : '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                <Bell size={20} />
             </div>
             <div>
                <h4 style={{ margin: '0 0 0.25rem 0', fontWeight: 700, color: '#0f172a' }}>{notif.title}</h4>
                <p style={{ margin: '0 0 0.5rem 0', color: '#475569', fontSize: '0.9rem' }}>{notif.desc}</p>
                <span style={{ fontSize: '0.75rem', color: '#94a3b8', fontWeight: 600 }}>{notif.time}</span>
             </div>
          </div>
       ))}
    </div>
  </div>
);

export const VendorSupport = () => (
  <div className="v-container">
    <div className="v-hero-section">
      <h1>Support Inquiry</h1>
      <p>We are here to help you</p>
    </div>

    <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', border: '1px solid var(--v-border)', textAlign: 'center' }}>
       <HelpCircle size={48} color="var(--v-primary)" style={{ margin: '0 auto 1.5rem auto' }} />
       <h2 style={{ margin: '0 0 1rem 0', fontWeight: 800 }}>Need Assistance?</h2>
       <p style={{ color: '#64748b', marginBottom: '2rem', maxWidth: '400px', margin: '0 auto 2rem auto' }}>Our dedicated partner support team is available 24/7 to resolve any issues regarding orders, payouts, or your profile.</p>
       <button style={{ background: '#0f172a', color: 'white', border: 'none', padding: '14px 32px', borderRadius: '12px', fontWeight: 800, cursor: 'pointer' }}>Contact Support</button>
    </div>
  </div>
);
