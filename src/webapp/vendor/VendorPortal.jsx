import React, { useState, useEffect } from 'react';
import { 
  LayoutDashboard, 
  ShoppingBag, 
  Package, 
  BarChart3, 
  Settings, 
  Plus, 
  Check, 
  X, 
  Camera, 
  MessageSquare, 
  Clock, 
  Globe,
  Wallet,
  AlertTriangle,
  ChevronRight,
  User,
  Bell,
  Sunrise,
  TrendingUp,
  Zap,
  HelpCircle,
  Smartphone
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { supabase } from '../../supabase';
import { toast } from 'react-hot-toast';
import './VendorPortal.css';

const VendorPortal = ({ user, onLogout }) => {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [language, setLanguage] = useState('English');
  const [loading, setLoading] = useState(true);
  const [inventory, setInventory] = useState([]);
  const [orders, setOrders] = useState([]);
  const [isOnboarding, setIsOnboarding] = useState(false); // 🔥 Now defaults to False to show Dashboard directly
  const [earnings, setEarnings] = useState({ daily: 1420, dailyChange: '+15%', weekly: 9800, payout_status: 'On track' });

  // 🌍 5-Language Vernacular support
  const translations = {
    English: {
      hi: 'Namaste', dashboard: 'Dashboard', inventory: 'Products', orders: 'Orders', earnings: 'Earnings',
      lowStock: 'Low Stock', addWithAI: 'Add with AI', shopStatus: 'Shop is Open',
      quickstats: 'Performance', help: 'Setup Guide'
    },
    Gujarati: {
      hi: 'નમસ્તે', dashboard: 'ડેેશબોર્ડ', inventory: 'વસ્તુઓ', orders: 'ઓર્ડર', earnings: 'કમાણી',
      lowStock: 'ઓછો સ્ટોક', addWithAI: 'AI થી ઉમેરો', shopStatus: 'દુકાન ચાલુ છે',
      quickstats: 'પ્રદર્શન', help: 'માર્ગદર્શન'
    },
    Hindi: {
      hi: 'नमस्ते', dashboard: 'डैशबोर्ड', inventory: 'सामान', orders: 'ऑर्डर', earnings: 'कमाई',
      lowStock: 'कम स्टॉक', addWithAI: 'AI से जोड़ें', shopStatus: 'दुकान खुली है',
      quickstats: 'प्रदर्शन', help: 'मदद'
    },
    Marathi: {
      hi: 'नमस्ते', dashboard: 'डॅशबोर्ड', inventory: 'उत्पादने', orders: 'ऑर्डर्स', earnings: 'कमाई',
      lowStock: 'कमी साठा', addWithAI: 'AI सह जोडा', shopStatus: 'दुकान सुरू आहे',
      quickstats: 'कामगिरी', help: 'मदत'
    },
    Tamil: {
      hi: 'வணக்கம்', dashboard: 'டாஷ்போர்டு', inventory: 'தயாரிப்புகள்', orders: 'ஆர்டர்கள்', earnings: 'வருமானம்',
      lowStock: 'குறைந்த இருப்பு', addWithAI: 'AI உடன் சேர்', shopStatus: 'கடை திறந்துள்ளது',
      quickstats: 'செயல்திறன்', help: 'உதவி'
    }
  };

  const t = translations[language] || translations.English;

  useEffect(() => {
    fetchVendorData();
    const sub = supabase.channel('vendor_live').on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'orders' }, (p) => {
        setOrders(prev => [p.new, ...prev]);
        toast.success('🔔 New Order Alert!', { style: { background: '#ff7622', color: '#fff' } });
    }).subscribe();
    return () => supabase.removeChannel(sub);
  }, []);

  const fetchVendorData = async () => {
    try {
      setLoading(true);
      const { data: items } = await supabase.from('services').select('*').limit(8);
      setInventory(items?.map(i => ({ ...i, stock: Math.floor(Math.random() * 10) + 1 })) || []);
      const { data: oData } = await supabase.from('orders').select('*').order('created_at', { ascending: false }).limit(5);
      setOrders(oData || []);
    } finally { setLoading(false); }
  };

  // --- RENDERING VIEWS ---

  const renderDashboard = () => (
    <div className="v-proper-app-view">
      <div className="v-hero-stats">
         <div className="v-welcome">
            <h2>{t.hi}, {user?.displayName?.split(' ')[0] || 'Partner'}!</h2>
            <div className="v-shop-status pulse-green">{t.shopStatus}</div>
         </div>
         <div className="v-earnings-main">
            <span className="v-label">TODAY'S EARNINGS</span>
            <div className="v-value-row">
               <h1>₹{earnings.daily}</h1>
               <span className="v-trend up">{earnings.dailyChange} <TrendingUp size={14} /></span>
            </div>
         </div>
      </div>

      <div className="v-bento-grid">
         <div className="v-bento-box glass secondary" onClick={() => setActiveTab('orders')}>
            <Package size={24} />
            <div className="v-bento-content">
               <strong>{orders.length}</strong>
               <span>Active Orders</span>
            </div>
         </div>
         <div className="v-bento-box glass warning" onClick={() => setActiveTab('inventory')}>
            <AlertTriangle size={24} />
            <div className="v-bento-content">
               <strong>{inventory.filter(i => i.stock < 5).length}</strong>
               <span>{t.lowStock}</span>
            </div>
         </div>
      </div>

      <div className="v-section-title">{t.quickstats}</div>
      <div className="v-performance-card glass">
         <div className="performance-item">
            <div className="p-circle"><Zap size={18} /></div>
            <div className="p-text">
               <strong>98%</strong>
               <span>Accept Rate</span>
            </div>
         </div>
         <div className="performance-item">
            <div className="p-circle"><Clock size={18} /></div>
            <div className="p-text">
               <strong>14 min</strong>
               <span>Avg Cleanup</span>
            </div>
         </div>
      </div>

      {orders.length > 0 && (
        <div className="v-recent-order-hint" onClick={() => setActiveTab('orders')}>
           <Smartphone size={20} />
           <div className="hint-text">
              <strong>Pending #{orders[0].id.slice(0, 6)}</strong>
              <span>Approve order to start delivery</span>
           </div>
           <ChevronRight size={18} />
        </div>
      )}
    </div>
  );

  const renderInventory = () => (
    <div className="v-proper-app-view">
       <div className="view-header-app">
          <h2>{t.inventory}</h2>
          <button className="add-ai-floating" onClick={() => toast.loading('AI Scanner Active...')}>
             <Camera size={20} />
          </button>
       </div>

       <div className="v-catalog-list">
          {inventory.map(item => (
            <div key={item.id} className="v-item-card-proper glass">
               <img src={item.image} alt={item.name} />
               <div className="v-item-info">
                  <h3>{item.name}</h3>
                  <p>₹{item.price}</p>
                  <div className={`v-stock-tag ${item.stock < 5 ? 'danger' : 'safe'}`}>
                     Stock: {item.stock}
                  </div>
               </div>
               <div className="v-item-actions">
                  <button className="v-qty-btn"><Plus size={16} /></button>
                  <button className="v-edit-btn"><Settings size={16} /></button>
               </div>
            </div>
          ))}
       </div>
    </div>
  );

  const renderOrdersView = () => (
    <div className="v-proper-app-view">
       <div className="view-header-app">
          <h2>{t.orders}</h2>
          <div className="live-badge">LIVE</div>
       </div>

       <div className="v-orders-timeline">
          {orders.map(order => (
            <div key={order.id} className="v-proper-order-card glass">
               <div className="vo-header">
                  <div className="vo-id">#{order.id.toString().slice(0, 6)}</div>
                  <div className={`vo-status ${order.status}`}>{order.status}</div>
               </div>
               <div className="vo-items">
                  {order.location || 'Home Delivery'} • ₹{order.total_price || '240'}
               </div>
               <div className="vo-btn-row">
                  <button className="vo-btn outline" onClick={() => toast('Details coming soon')}><HelpCircle size={14} /> Help</button>
                  <button className="vo-btn primary" onClick={() => toast.success('Order Accepted')}>ACCEPT ORDER</button>
               </div>
            </div>
          ))}
       </div>
    </div>
  );

  return (
    <div className="v-app-wrapper">
      {/* 🚀 AI ONBOARDING CHAT VIEW */}
      {isOnboarding ? (
        <motion.div 
          initial={{ opacity: 0, y: 50 }}
          animate={{ opacity: 1, y: 0 }}
          className="v-onboarding-chat-view"
        >
          <div className="v-chat-header">
             <div className="v-chat-avatar">AI</div>
             <div className="v-chat-meta">
                <strong>Passwala Business Bot</strong>
                <span>Online • Always available</span>
             </div>
             <button className="v-chat-lang" onClick={() => setLanguage(language === 'English' ? 'Hindi' : 'English')}>
                 {language === 'English' ? 'हिन्दी' : 'EN'}
             </button>
          </div>

          <div className="v-chat-body">
             <div className="msg bot">Namaste! I am your AI Business Assistant. Let's get your shop registered on Passwala in 2 minutes.</div>
             <div className="msg bot">What is the name of your shop?</div>
             <div className="msg user-mock">Karan's Kirana Stores</div>
             <div className="msg bot pulsate">Perfect! Now, please upload a photo of your menu or shop front. I will automatically list your products.</div>
          </div>

          <div className="v-chat-footer">
             <button className="v-chat-upload" onClick={() => setIsOnboarding(false)}>
                <Camera size={24} />
                <span>Upload & Start Selling</span>
             </button>
             <button className="v-skip" onClick={() => setIsOnboarding(false)}>Demo Mode</button>
          </div>
        </motion.div>
      ) : (
        <>
          <header className="v-top-app-bar">
             <div className="v-logo">PASSWALA</div>
             <div className="v-top-actions">
                <button onClick={() => setLanguage(language === 'English' ? 'Hindi' : 'English')} className="v-lang-pill">
                  <Globe size={16} /> <span>{language}</span>
                </button>
                <button className="v-notif"><Bell size={20} /></button>
                <button className="v-user-profile" onClick={onLogout}><LogOutIcon size={18} /></button>
             </div>
          </header>

          <main className="v-app-scroll-body">
             {activeTab === 'dashboard' && renderDashboard()}
             {activeTab === 'inventory' && renderInventory()}
             {activeTab === 'orders' && renderOrdersView()}
             {activeTab === 'earnings' && <div className="v-proper-app-view"><h2>Earnings History</h2><p>Coming Soon...</p></div>}
          </main>

          {/* 📞 WhatsApp Support FAB */}
          <a 
            href="https://wa.me/919999999999?text=Namaste! I need help with my Passwala Shop" 
            target="_blank" 
            rel="noopener noreferrer"
            className="v-whatsapp-fab"
          >
             <MessageSquare size={28} />
             <span className="v-fab-badge">1</span>
          </a>

          <nav className="v-bottom-navbar">
             <button className={activeTab === 'dashboard' ? 'active' : ''} onClick={() => setActiveTab('dashboard')}>
                <LayoutDashboard size={24} />
                <span>Home</span>
             </button>
             <button className={activeTab === 'orders' ? 'active' : ''} onClick={() => setActiveTab('orders')}>
                <Package size={24} />
                <span>Orders</span>
             </button>
             <button className={activeTab === 'inventory' ? 'active' : ''} onClick={() => setActiveTab('inventory')}>
                <ShoppingBag size={24} />
                <span>Stock</span>
             </button>
             <button className={activeTab === 'earnings' ? 'active' : ''} onClick={() => setActiveTab('earnings')}>
                <BarChart3 size={24} />
                <span>Money</span>
             </button>
          </nav>
        </>
      )}
    </div>
  );
};

const LogOutIcon = ({ size }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
);

export default VendorPortal;
