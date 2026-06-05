/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, Sparkles, Sunrise, Users, ShoppingBasket, MapPin, X, Check, Clock } from 'lucide-react';
import { useTranslation } from '../LanguageContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';
import { useCart } from '../../context/CartContext';
import './NeighborhoodHub.css';

const NeighborhoodHub = ({ user, onNavigate, isProfileComplete }) => {
  const { t } = useTranslation();
  const { addToCart, setCartOpen } = useCart();

  // State management for interactive features
  const [activeModal, setActiveModal] = useState(null); // 'GROUP_ORDER' | 'MORNING_DELIVERY' | null
  const [joinedPool, setJoinedPool] = useState(() => {
    const savedPool = localStorage.getItem('passwala_joined_pool');
    return savedPool ? JSON.parse(savedPool) : null;
  });
  const [activeSubscription, setActiveSubscription] = useState(() => {
    const savedSub = localStorage.getItem('passwala_morning_sub');
    return savedSub ? JSON.parse(savedSub) : null;
  });

  const cards = [
    {
      title: t('community'),
      subtitle: t('tagline'),
      image: "/neighbor.png",
      type: "peach",
      view: 'NEIGHBORS',
      tag: t('join_floor_chat')
    },
    {
      title: t('expert_services'),
      subtitle: t('verified_pros'),
      image: "/expert_services.png",
      type: "cream",
      view: 'EXPERT_SERVICES',
      tag: t('book_pro')
    },
    {
      title: t('near_shops'),
      subtitle: t('best_stores'),
      image: "/near_shops.png",
      type: "green",
      view: 'NEAR_SHOPS',
      tag: t('order_now')
    },
    {
      title: t('city_rides'),
      subtitle: t('city_rides_sub'),
      image: "https://cdn-icons-png.flaticon.com/512/3202/3202926.png",
      type: "peach",
      view: 'CITY_RIDES',
      tag: t('book_ticket')
    },
    {
      title: t('event_tickets'),
      subtitle: t('event_tickets_sub'),
      image: "https://cdn-icons-png.flaticon.com/512/825/825590.png",
      type: "purple",
      view: 'EVENTS',
      tag: t('book_now_caps')
    }
  ];

  // AI Smart Basket logic
  const handleSmartBasket = () => {
    const essentials = [
      {
        id: 'ai-smart-milk',
        name: 'Amul Taaza Fresh Milk (1L)',
        price: 66,
        image: 'https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=200&q=80',
        type: 'product',
        store: 'AI Smart Recommendations',
        shop_id: 'ai-smart-basket'
      },
      {
        id: 'ai-smart-eggs',
        name: 'Premium Farm Fresh Eggs (6 pcs)',
        price: 48,
        image: 'https://images.unsplash.com/photo-1506976785307-8732e854ad03?auto=format&fit=crop&w=200&q=80',
        type: 'product',
        store: 'AI Smart Recommendations',
        shop_id: 'ai-smart-basket'
      },
      {
        id: 'ai-smart-bread',
        name: 'Harvest Gold Brown Bread (400g)',
        price: 45,
        image: 'https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=200&q=80',
        type: 'product',
        store: 'AI Smart Recommendations',
        shop_id: 'ai-smart-basket'
      }
    ];

    const loadId = toast.loading('AI analyzing your weekly purchase pattern...');
    setTimeout(() => {
      essentials.forEach(item => addToCart(item));
      toast.dismiss(loadId);
      toast.success('AI predicted 3 weekly essentials & added them to your basket!');
      setCartOpen(true);
    }, 1200);
  };

  // Apartment Group Orders Data
  const availablePools = [
    {
      id: 'pool-1',
      host: 'Divya Patel (A-502)',
      title: 'A-Wing Fruits & Vegetables Pool',
      members: 4,
      timeLeft: '8 min',
      saving: '₹35 Delivery Fee Waived'
    },
    {
      id: 'pool-2',
      host: 'Kabir Shah (B-104)',
      title: 'B-Wing Daily Groceries Pool',
      members: 2,
      timeLeft: '23 min',
      saving: '₹35 Delivery Fee Waived'
    }
  ];

  const handleJoinPool = (pool) => {
    const poolData = { host: pool.host, title: pool.title };
    localStorage.setItem('passwala_joined_pool', JSON.stringify(poolData));
    setJoinedPool(poolData);
    setActiveModal(null);
    toast.success(`Successfully joined ${pool.host}'s order pool! Your next delivery fee is waived.`);
  };

  const handleLeavePool = () => {
    localStorage.removeItem('passwala_joined_pool');
    setJoinedPool(null);
    toast.error('Left the apartment order pool.');
  };

  // Morning Subscriptions Setup State
  const [selectedSubItems, setSelectedSubItems] = useState(['milk']); // default milk
  const [frequency, setFrequency] = useState('daily');
  const [timeSlot, setTimeSlot] = useState('06:00 AM - 07:00 AM');

  const subscriptionProducts = [
    { id: 'milk', name: 'Fresh Cow Milk (500ml)', price: 33, freq: 'daily', img: 'https://images.unsplash.com/photo-1563636619-e9143da7973b?auto=format&fit=crop&w=200&q=80' },
    { id: 'bread', name: 'Whole Wheat Bread (400g)', price: 45, freq: 'alternate', img: 'https://images.unsplash.com/photo-1549931319-a545dcf3bc73?auto=format&fit=crop&w=200&q=80' },
    { id: 'eggs', name: 'Organic Farm Eggs (6 Pack)', price: 60, freq: 'weekends', img: 'https://images.unsplash.com/photo-1516448620398-c5f44bf9f441?auto=format&fit=crop&w=200&q=80' }
  ];

  const toggleSubItem = (id) => {
    if (selectedSubItems.includes(id)) {
      setSelectedSubItems(selectedSubItems.filter(item => item !== id));
    } else {
      setSelectedSubItems([...selectedSubItems, id]);
    }
  };

  const handleActivateSubscription = () => {
    if (selectedSubItems.length === 0) {
      toast.error('Please select at least one item for subscription');
      return;
    }
    const items = subscriptionProducts.filter(item => selectedSubItems.includes(item.id));
    const subData = {
      items,
      frequency,
      timeSlot,
      active: true
    };
    localStorage.setItem('passwala_morning_sub', JSON.stringify(subData));
    setActiveSubscription(subData);
    setActiveModal(null);
    toast.success('Morning Delivery Subscription Activated Successfully!');
  };

  const handleCancelSubscription = () => {
    localStorage.removeItem('passwala_morning_sub');
    setActiveSubscription(null);
    toast.error('Morning delivery subscription canceled.');
  };

  const [liveStats, setLiveStats] = useState({ shops: 0, pro: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!supabase) return;
        const { count: sCount } = await supabase.from('stores').select('*', { count: 'exact', head: true });
        const { count: pCount } = await supabase.from('service_providers').select('*', { count: 'exact', head: true });
        setLiveStats({ 
          shops: sCount || 0, 
          pro: pCount || 0 
        });
      } catch (err) {
        setLiveStats({ shops: 0, pro: 0 });
      }
    };
    fetchStats();

    const channel1 = supabase.channel('stores-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stores' }, fetchStats)
      .subscribe();
    const channel2 = supabase.channel('providers-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'service_providers' }, fetchStats)
      .subscribe();

    return () => {
      supabase.removeChannel(channel1);
      supabase.removeChannel(channel2);
    };
  }, []);

  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="neighborhood-hub"
      style={{ paddingBottom: '120px' }}
    >
      <div className="hub-container">
        {/* Dynamic Join Active Pool Alert */}
        {joinedPool && (
          <div className="completion-banner" style={{ borderStyle: 'solid', background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.1) 0%, var(--bg-surface) 100%)', borderColor: '#3b82f6' }}>
            <div className="banner-icon-box" style={{ background: '#3b82f6', color: 'white' }}>
              <Users size={22} />
            </div>
            <div className="banner-text-content">
              <h4>Active Apartment Pool: {joinedPool.host}</h4>
              <p>You joined "{joinedPool.title}". All orders to your society will have delivery fee waived!</p>
            </div>
            <button className="complete-now-btn" style={{ background: '#ef4444' }} onClick={handleLeavePool}>
              LEAVE POOL
            </button>
          </div>
        )}

        {/* Dynamic Morning Subscription Active Alert */}
        {activeSubscription && (
          <div className="completion-banner" style={{ borderStyle: 'solid', background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.1) 0%, var(--bg-surface) 100%)', borderColor: '#f59e0b' }}>
            <div className="banner-icon-box" style={{ background: '#f59e0b', color: 'white' }}>
              <Sunrise size={22} />
            </div>
            <div className="banner-text-content">
              <h4>Morning Delivery Subscription is Active</h4>
              <p>
                Delivering {activeSubscription.items.map(i => i.name.split(' (')[0]).join(', ')} every{' '}
                <span style={{ textTransform: 'capitalize', fontWeight: 'bold' }}>{activeSubscription.frequency}</span> between{' '}
                {activeSubscription.timeSlot}.
              </p>
            </div>
            <button className="complete-now-btn" style={{ background: '#64748b' }} onClick={handleCancelSubscription}>
              CANCEL SUB
            </button>
          </div>
        )}

        <div className="hub-cards-grid">
          {cards.map((card, i) => (
            <motion.div 
              key={i} 
              onClick={() => onNavigate(card.view)}
              whileHover={{ scale: 1.05, translateY: -10 }}
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.1, duration: 0.4 }}
              className={`hub-card ${card.type}`}
            >
              <div className="hub-card-text">
                <span className="hub-card-tag">{card.tag}</span>
                <h3>{card.title}</h3>
                <p>{card.subtitle}</p>
                <div className="card-explore-btn">
                  Explore <ArrowRight size={14} />
                </div>
              </div>
              <div className="hub-card-image">
                <img src={card.image} alt={card.title} />
              </div>
            </motion.div>
          ))}
        </div>

        {/* AI & Morning Delivery Features Row */}
        <div className="ai-hub-row">
           <div className="ai-feature-card glass" onClick={handleSmartBasket}>
              <div className="ai-icon-box">
                <Sparkles size={24} color="var(--primary)" />
              </div>
              <div className="ai-text">
                 <h4>AI Smart Basket</h4>
                 <p>Autofill essentials based on your usage</p>
              </div>
           </div>
           
           <div className="ai-feature-card glass highlight" onClick={() => setActiveModal('MORNING_DELIVERY')}>
              <div className="ai-icon-box">
                <Sunrise size={24} color="#f59e0b" />
              </div>
              <div className="ai-text">
                 <h4>Schedule Morning Delivery</h4>
                 <p>Get Milk & Bread by 7 AM daily</p>
              </div>
           </div>
           
           <div className="ai-feature-card glass" onClick={() => setActiveModal('GROUP_ORDER')}>
              <div className="ai-icon-box">
                <Users size={24} color="#3b82f6" />
              </div>
              <div className="ai-text">
                 <h4>Apartment Group Order</h4>
                 <p>Save delivery fees with building neighbors</p>
              </div>
           </div>
        </div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          whileInView={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          className="hub-banner card-hover"
        >
          <div className="banner-bg">
            <img src="/hub_banner.png" alt="Neighborhood" />
          </div>
          <div className="banner-content-hub">
            <div className="banner-text">
              <h2>{t('welcome')}</h2>
              <div className="banner-meta">
                 <span className="live-status"><div className="live-pulse"></div> {liveStats.shops} NEARBY SHOPS ACTIVE</span>
                 <span className="separator">•</span>
                 <span>{liveStats.pro} VERIFIED EXPERTS</span>
              </div>
            </div>
            <button className="post-request-btn">
              POST REQUEST <Plus size={20} />
            </button>
          </div>
        </motion.div>
      </div>

      {/* --- PREMIUM MODALS --- */}
      <AnimatePresence>
        {activeModal === 'GROUP_ORDER' && (
          <div className="hub-modal-overlay">
            <div className="hub-modal">
              <div className="hub-modal-header">
                <h3>Apartment Group Ordering</h3>
                <button className="hub-close-btn" onClick={() => setActiveModal(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="hub-modal-body">
                <div className="pool-benefit-card">
                  <p>
                    💡 <strong>Pool Benefit:</strong> Order together with active pools in your building. Your orders will be packaged individually but delivered together, <strong>waiving all delivery fees!</strong>
                  </p>
                </div>
                
                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Active Pools In Your Society:
                </h4>

                <div className="pool-list">
                  {availablePools.map(pool => (
                    <div key={pool.id} className="pool-item">
                      <div className="pool-info">
                        <h4>{pool.title}</h4>
                        <p>Host: {pool.host}</p>
                        <div className="pool-meta">
                          <span className="pool-badge">{pool.members} Joined</span>
                          <span className="pool-timer">
                            <Clock size={12} style={{ display: 'inline', marginRight: '4px', verticalAlign: 'middle' }} />
                            {pool.timeLeft} left
                          </span>
                        </div>
                      </div>
                      <button className="pool-join-btn" onClick={() => handleJoinPool(pool)}>
                        JOIN
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        )}

        {activeModal === 'MORNING_DELIVERY' && (
          <div className="hub-modal-overlay">
            <div className="hub-modal">
              <div className="hub-modal-header">
                <h3>Schedule Morning Delivery</h3>
                <button className="hub-close-btn" onClick={() => setActiveModal(null)}>
                  <X size={18} />
                </button>
              </div>
              <div className="hub-modal-body">
                <div className="pool-benefit-card" style={{ background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.08) 0%, rgba(255, 118, 34, 0.05) 100%)', borderColor: 'rgba(245, 158, 11, 0.3)' }}>
                  <p>
                    ☀️ Subscribe to breakfast essentials. Guaranteed contact-free silent doorstep delivery before 7:00 AM daily. No delivery fees!
                  </p>
                </div>

                <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Select Subscription Items:</h4>
                
                <div className="sub-item-selector">
                  {subscriptionProducts.map(prod => {
                    const isSelected = selectedSubItems.includes(prod.id);
                    return (
                      <div 
                        key={prod.id} 
                        className={`sub-item ${isSelected ? 'selected' : ''}`}
                        onClick={() => toggleSubItem(prod.id)}
                      >
                        <div className="sub-item-left">
                          <img src={prod.img} alt={prod.name} className="sub-item-img" />
                          <div className="sub-item-text">
                            <h4>{prod.name}</h4>
                            <p>₹{prod.price} / delivery</p>
                          </div>
                        </div>
                        <div className="sub-checkbox">
                          {isSelected && <Check size={12} color="white" />}
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="sub-options">
                  <div>
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Delivery Frequency:</h4>
                    <div className="sub-frequency-row">
                      {['daily', 'alternate', 'weekends'].map(freq => (
                        <button 
                          key={freq}
                          className={`freq-btn ${frequency === freq ? 'active' : ''}`}
                          onClick={() => setFrequency(freq)}
                        >
                          {freq === 'daily' ? 'Daily' : freq === 'alternate' ? 'Alternate' : 'Weekends Only'}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="sub-time-selector">
                    <h4 style={{ fontSize: '0.9rem', color: 'var(--text-secondary)', marginBottom: '0.5rem' }}>Delivery Time Slot:</h4>
                    <select value={timeSlot} onChange={(e) => setTimeSlot(e.target.value)}>
                      <option value="05:00 AM - 06:00 AM">05:00 AM - 06:00 AM</option>
                      <option value="06:00 AM - 07:00 AM">06:00 AM - 07:00 AM (Recommended)</option>
                      <option value="07:00 AM - 08:00 AM">07:00 AM - 08:00 AM</option>
                    </select>
                  </div>

                  <button className="sub-activate-btn" onClick={handleActivateSubscription}>
                    ACTIVATE SUBSCRIPTION
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
      </AnimatePresence>
    </motion.section>
  );
};

export default NeighborhoodHub;
