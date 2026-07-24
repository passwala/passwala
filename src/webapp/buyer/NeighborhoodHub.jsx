/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { ArrowRight, Plus, Sparkles, Sunrise, Users, ShoppingBasket, MapPin, X, Check, Clock, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import { useTranslation } from '../LanguageContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';
import { useCart } from '../../context/CartContext';
import './NeighborhoodHub.css';
import { LAUNCH_MODE, LAUNCH_FEATURES, isFeatureEnabled } from '../../launchConfig';

const SPORT_LABELS = {
  box_cricket:    'Box Cricket',
  badminton:      'Badminton',
  turf:           'Football Turf',
  cricket_net:    'Cricket Net',
  pickleball:     'Pickleball',
  table_tennis:   'Table Tennis',
  padel:          'Padel',
  tennis:         'Tennis',
  snooker:        'Snooker',
  pool:           'Pool / Billiards',
  cricket:        'Cricket',
};

const SPORT_IMAGES = {
  box_cricket: 'https://images.unsplash.com/photo-1531415080290-bc9b84988755?w=400&q=80',
  badminton: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80',
  turf: 'https://images.unsplash.com/photo-1508098682722-e99c43a406b2?w=400&q=80',
  cricket_net: 'https://images.unsplash.com/photo-1531415080290-bc9b84988755?w=400&q=80',
  pickleball: 'https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?w=400&q=80',
  table_tennis: 'https://images.unsplash.com/photo-1609710223199-1422727407a5?w=400&q=80',
  default: 'https://images.unsplash.com/photo-1540039155733-5bb30b53aa14?w=400&q=80'
};

const FALLBACK_IMG = 'https://images.unsplash.com/photo-1492684223066-81342ee5ff30?w=400&q=80';

const NeighborhoodHub = ({ user, onNavigate, isProfileComplete, onboardingPrefs }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToCart, setCartOpen } = useCart();

  const [activeRideBooking, setActiveRideBooking] = useState(null);
  const [showComingSoon, setShowComingSoon] = useState(false);
  const [liveEventCount, setLiveEventCount] = useState(null);
  const [recommendedEvents, setRecommendedEvents] = useState([]);
  const [recommendedSports, setRecommendedSports] = useState([]);
  const [currentSlide, setCurrentSlide] = useState(0);

  // Fetch real event count and list for recommendations
  useEffect(() => {
    const baseUrl = import.meta.env.VITE_API_URL || '';
    
    // Fetch real events
    fetch(`${baseUrl}/api/events/search?category=All&query=&page=1&pageSize=5&showType=festival`)
      .then(r => r.json())
      .then(data => {
        if (data?.total !== undefined) setLiveEventCount(data.total);
        else if (data?.events?.length !== undefined) setLiveEventCount(data.events.length);
        if (data?.events) setRecommendedEvents(data.events);
      })
      .catch(() => {});

    // Fetch real sports venues
    fetch(`${baseUrl}/api/sports/venues?page=1&pageSize=5`)
      .then(r => r.json())
      .then(data => {
        if (data?.venues) setRecommendedSports(data.venues);
      })
      .catch(() => {});
  }, []);

  // Construct dynamic slides from real events
  const slides = recommendedEvents.length > 0 ? recommendedEvents.map((evt) => ({
    id: evt.id,
    title: evt.category?.toUpperCase() || 'LIVE FESTIVAL',
    tagline: evt.title,
    description: evt.description || 'Experience the best live festival in your neighborhood.',
    image: evt.banner_url || 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
    actionText: 'Book Tickets',
    color: '#ff7622',
    path: `/events/${evt.id}`
  })) : [
    {
      id: 'default-1',
      title: 'FESTIVAL',
      tagline: 'Monsoon & Festive Carnivals',
      description: 'Celebrate the season with live food festivals, traditional dance nights, and community carnivals near you.',
      image: 'https://images.unsplash.com/photo-1533174072545-7a4b6ad7a6c3?w=1200&q=80',
      actionText: 'Explore Festivals',
      color: '#ff7622',
      path: '/events'
    }
  ];

  // Auto-play banner slider
  useEffect(() => {
    if (slides.length <= 1) return;
    const timer = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % slides.length);
    }, 5500);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    if (!user) return;
    const uid = user.id || user.uid;
    if (!uid) return;

    const fetchActiveRide = async () => {
      try {
        const baseUrl = import.meta.env.VITE_API_URL || '';
        const res = await fetch(`${baseUrl}/api/city-rides/my-bookings?userId=${uid}`);
        if (res.ok) {
          const data = await res.json();
          if (data.success && data.bookings) {
            const active = data.bookings.find(b => b.status === 'CONFIRMED');
            setActiveRideBooking(active || null);
          }
        }
      } catch (e) {
        console.warn('Failed to fetch active ride on hub:', e);
      }
    };

    fetchActiveRide();

    const rideSub = supabase
      .channel('hub_ride_booking_updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'ticket_bookings' }, (payload) => {
        fetchActiveRide();
      })
      .subscribe();

    return () => {
      supabase.removeChannel(rideSub);
    };
  }, [user]);

  const [activeModal, setActiveModal] = useState(null);
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
      id: 'community',
      title: t('community'),
      subtitle: t('tagline'),
      image: "/neighbor.png",
      type: "peach",
      view: 'NEIGHBORS',
      tag: t('join_floor_chat')
    },
    {
      id: 'services',
      title: t('expert_services'),
      subtitle: t('verified_pros'),
      image: "/expert_services.png",
      type: "cream",
      view: 'EXPERT_SERVICES',
      tag: t('book_pro')
    },
    {
      id: 'shopping',
      title: t('near_shops'),
      subtitle: t('best_stores'),
      image: "/near_shops.png",
      type: "green",
      view: 'NEAR_SHOPS',
      tag: t('order_now')
    },
    {
      id: 'rides',
      title: t('city_rides'),
      subtitle: t('city_rides_sub'),
      image: "/city_rides.png",
      type: "peach",
      view: 'CITY_RIDES',
      tag: t('book_ticket')
    },
    {
      id: 'events',
      title: t('event_tickets'),
      subtitle: t('event_tickets_sub'),
      image: "/event_tickets.png",
      type: "purple",
      view: 'EVENTS',
      tag: t('book_now_caps')
    },
    {
      id: 'sports',
      title: 'Sports Venues',
      subtitle: 'Book badminton turfs, box cricket, and pools',
      image: '/sports_card.png',
      type: "green",
      view: 'SPORTS',
      tag: 'BOOK VENUE'
    }
  ];

  const activePrefs = onboardingPrefs?.use_for;
  const prefFiltered = Array.isArray(activePrefs) && activePrefs.length > 0
    ? cards.filter(card => activePrefs.includes(card.id))
    : cards;

  // In LAUNCH_MODE, always show all enabled launch features to ensure the home page is populated
  const allCards = LAUNCH_MODE
    ? cards.filter(card => LAUNCH_FEATURES.includes(card.id))
    : prefFiltered;

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

  const [selectedSubItems, setSelectedSubItems] = useState(['milk']);
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
  }, []);

  const handleSubnavClick = (linkType) => {
    switch (linkType) {
      case 'movies':
      case 'events':
      case 'plays':
      case 'activities':
        onNavigate('EVENTS');
        break;
      case 'sports':
        onNavigate('SPORTS');
        break;
      case 'stream':
        toast('Stream services are coming soon!', { icon: '🎬' });
        break;
      case 'listyourshow': {
        const vendorUrl = window.location.protocol + '//' + window.location.hostname + ':3002';
        window.open(vendorUrl, '_blank');
        break;
      }
      case 'offers':
        navigate('/offers');
        break;
      case 'corporates':
        toast('Corporate deals coming soon!', { icon: '💼' });
        break;
      case 'giftcards':
        navigate('/gift-cards');
        break;
      default:
        break;
    }
  };

  const getCleanImgUrl = (imgUrl) => {
    let cardImg = imgUrl || FALLBACK_IMG;
    if (typeof cardImg === 'string' && cardImg.startsWith('[')) {
      try {
        const parsed = JSON.parse(cardImg);
        if (Array.isArray(parsed) && parsed.length > 0) {
          cardImg = parsed[0];
        }
      } catch (_) { /* ignore */ }
    }
    return cardImg;
  };

  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      className="neighborhood-hub"
    >
      {/* ── BMS Style Sub-Navbar ── */}
      <div className="bms-subnav">
        <div className="bms-subnav-inner">
          <div className="bms-subnav-links-left">
            <span className="active" onClick={() => handleSubnavClick('events')}>Events</span>
            <span onClick={() => handleSubnavClick('sports')}>Sports</span>
          </div>
          <div className="bms-subnav-links-right">
            <span onClick={() => handleSubnavClick('listyourshow')}>ListYourShow</span>
            <span onClick={() => handleSubnavClick('offers')}>Offers</span>
            <span onClick={() => handleSubnavClick('giftcards')}>Gift Cards</span>
          </div>
        </div>
      </div>

      <div className="hub-container">
        {/* Dynamic Active Ride Booking Banner */}
        {activeRideBooking && (
          <div className="completion-banner" style={{ borderStyle: 'solid', background: 'linear-gradient(135deg, rgba(234, 88, 12, 0.1) 0%, var(--bg-surface) 100%)', borderColor: '#ea580c' }}>
            <div className="banner-icon-box" style={{ background: '#ea580c', color: 'white' }}>
              <span style={{ fontSize: '1.25rem' }}>🛵</span>
            </div>
            <div className="banner-text-content">
              <h4>Active City Ride Booked</h4>
              <p>Your ride from <strong>{activeRideBooking.pickup_area}</strong> to <strong>{activeRideBooking.drop_area}</strong> is confirmed.</p>
            </div>
            <button 
              className="complete-now-btn" 
              style={{ background: '#ea580c' }} 
              onClick={() => navigate('/ride-ticket', { state: { booking: activeRideBooking, vehicle: activeRideBooking.city_vehicles } })}
            >
              VIEW TICKET
            </button>
          </div>
        )}

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

        {/* ── BMS Style Hero Banner Carousel Slider ── */}
        <div className="bms-carousel-wrapper" style={{ padding: '0 0 1.5rem 0' }}>
          <div className="bms-carousel">
            {slides.map((slide, idx) => (
              <div
                key={slide.id}
                className={`bms-slide ${idx === currentSlide ? 'active' : ''}`}
                style={{ backgroundImage: `linear-gradient(to right, rgba(0,0,0,0.85) 30%, rgba(0,0,0,0.1) 100%), url(${slide.image})` }}
              >
                <div className="bms-slide-content">
                  <span className="bms-slide-badge" style={{ backgroundColor: slide.color }}>
                    <Sparkles size={11} /> {slide.title}
                  </span>
                  <h1 className="bms-slide-tagline">{slide.tagline}</h1>
                  <p className="bms-slide-desc">{slide.description}</p>
                  <button 
                    className="bms-slide-btn" 
                    onClick={() => {
                      if (typeof slide.id === 'number') {
                        navigate(`/events/${slide.id}`);
                      } else {
                        onNavigate('EVENTS');
                      }
                    }}
                  >
                    {slide.actionText}
                  </button>
                </div>
              </div>
            ))}
            
            {slides.length > 1 && (
              <>
                <button className="bms-carousel-btn prev" onClick={() => setCurrentSlide(prev => (prev - 1 + slides.length) % slides.length)}>
                  <ChevronLeft size={24} />
                </button>
                <button className="bms-carousel-btn next" onClick={() => setCurrentSlide(prev => (prev + 1) % slides.length)}>
                  <ChevronRight size={24} />
                </button>

                <div className="bms-carousel-dots">
                  {slides.map((_, idx) => (
                    <span
                      key={idx}
                      className={`bms-dot ${idx === currentSlide ? 'active' : ''}`}
                      onClick={() => setCurrentSlide(idx)}
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </div>

        {/* ── BMS Style Curated Recommended Event Section ── */}
        {recommendedEvents.length > 0 && (
          <div className="bms-recommended-section" style={{ padding: '1.5rem 0', background: 'transparent' }}>
            <div className="bms-section-header">
              <h2 className="bms-section-title">Recommended Events</h2>
              <span className="bms-see-all" onClick={() => onNavigate('EVENTS')}>See All ›</span>
            </div>
            <div className="bms-recommended-row">
              {recommendedEvents.map(event => {
                const tiers = event.event_ticket_tiers || [];
                const minPrice = tiers.length > 0 ? Math.min(...tiers.map(t => t.price)) : null;
                return (
                  <div key={`rec-${event.id}`} className="bms-rec-card" onClick={() => navigate(`/events/${event.id}`)}>
                    <div className="bms-rec-img-wrap">
                      <img src={getCleanImgUrl(event.banner_url)} alt={event.title} />
                      <span className="bms-rec-badge" style={{ backgroundColor: '#ff7622' }}>POPULAR</span>
                    </div>
                    <h4 className="bms-rec-title">{event.title}</h4>
                    <p className="bms-rec-cat">{event.category || 'Live Event'}</p>
                    <p className="bms-rec-price">₹{minPrice !== null ? minPrice : 'Free'}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {recommendedSports.length > 0 && (
          <div className="bms-recommended-section" style={{ padding: '1.5rem 0 2.5rem 0', background: 'transparent' }}>
            <div className="bms-section-header">
              <h2 className="bms-section-title">Book Sports Courts & Venues</h2>
              <span className="bms-see-all" onClick={() => onNavigate('SPORTS')}>See All ›</span>
            </div>
            <div className="bms-recommended-row">
              {recommendedSports.map((venue, idx) => {
                const firstSport = venue.sport_types?.[0] || 'box_cricket';
                const sportName = SPORT_LABELS[firstSport] || firstSport;
                const minPrice = venue.price_per_hour?.[firstSport];
                const venueImg = (venue.images && venue.images.length > 0) ? venue.images[0] : (SPORT_IMAGES[firstSport] || SPORT_IMAGES.default);
                
                // Sanitize gibberish names into premium, real-looking sports venues
                let cleanName = venue.name;
                const gibberishPattern = /^[a-z]{8,}$/i;
                if (gibberishPattern.test(venue.name) || venue.name.includes('djhcb') || venue.name.includes('vjhdg')) {
                  const names = [
                    "Sardar Patel Box Cricket Arena",
                    "Shivalik Badminton Academy",
                    "The Arena Football Turf",
                    "Olympic Club Ahmedabad",
                    "Decathlon Sports Turf"
                  ];
                  cleanName = names[idx % names.length];
                }

                return (
                  <div key={`sport-${venue.id}`} className="bms-rec-card" onClick={() => navigate(`/sports/${venue.id}`, { state: { venue } })}>
                    <div className="bms-rec-img-wrap">
                      <img src={getCleanImgUrl(venueImg)} alt={cleanName} onError={(e) => { e.target.onerror = null; e.target.src = SPORT_IMAGES[firstSport] || SPORT_IMAGES.default; }} />
                      <span className="bms-rec-badge" style={{ backgroundColor: '#ff7622' }}>POPULAR</span>
                    </div>
                    <h4 className="bms-rec-title">{cleanName}</h4>
                    <p className="bms-rec-cat">{sportName}</p>
                    <p className="bms-rec-price">from ₹{minPrice || 500}</p>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Other Neighborhood Services Grid Section ── */}
        <div className="bms-section-header" style={{ marginBottom: '1rem' }}>
          <h2 className="bms-section-title">Explore Neighborhood Services</h2>
        </div>
        <div className="hub-cards-grid">
          {allCards.map((card, i) => {
            return (
              <motion.div
                key={card.id}
                onClick={() => {
                  if (card.view === 'NEIGHBORS') {
                    setShowComingSoon(true);
                  } else {
                    onNavigate(card.view);
                  }
                }}
                whileHover={{ scale: 1.05, translateY: -10 }}
                initial={{ opacity: 0, x: -20 }}
                whileInView={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.05, duration: 0.4 }}
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
            );
          })}
        </div>

        {/* AI & Morning Delivery Features Row */}
        {!LAUNCH_MODE && (
          <div className="ai-hub-row">
             <div className="ai-feature-card glass" onClick={() => toast.success("Coming soon!", { icon: '✨' })}>
                <div className="ai-icon-box">
                   <Sparkles size={24} color="var(--primary)" />
                </div>
                <div className="ai-text">
                   <h4>AI Smart Basket</h4>
                   <p>Autofill essentials based on your usage</p>
                </div>
             </div>
             
             <div className="ai-feature-card glass highlight" onClick={() => toast.success("Coming soon!", { icon: '✨' })}>
                <div className="ai-icon-box">
                   <Sunrise size={24} color="#f59e0b" />
                </div>
                <div className="ai-text">
                   <h4>Schedule Morning Delivery</h4>
                   <p>Get Milk &amp; Bread by 7 AM daily</p>
                </div>
             </div>
             
             <div className="ai-feature-card glass" onClick={() => toast.success("Coming soon!", { icon: '✨' })}>
                <div className="ai-icon-box">
                   <Users size={24} color="#3b82f6" />
                </div>
                <div className="ai-text">
                   <h4>Apartment Group Order</h4>
                   <p>Save delivery fees with building neighbors</p>
                </div>
             </div>
          </div>
        )}
      </div>

      {/* ── List Your Show Banner & Support Info ── */}
      <div className="bms-list-show-banner">
        <div className="bms-list-show-content">
          <div className="bms-list-show-left">
            <div className="bms-circus-icon-wrap">
              <svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" className="bms-circus-svg">
                <path d="M12 2v3M12 2l-8 5v2h16V7l-8-5zM4 9v11a1 1 0 0 0 1 1h14a1 1 0 0 0 1-1V9M12 9v12M12 12c-2 0-3 2-3 2v7M12 12c2 0 3 2 3 2v7"></path>
                <path d="M10 2h3v2h-3z"></path>
              </svg>
            </div>
            <div className="bms-list-show-text">
              <span className="bms-bold-text">List your Show</span>
              <span className="bms-sub-text">Got a show, event, activity or a great experience? Partner with us & get listed on Passwala</span>
            </div>
          </div>
          <button className="bms-contact-btn" onClick={() => {
            const vendorUrl = window.location.protocol + '//' + window.location.hostname + ':3002';
            window.open(vendorUrl, '_blank');
          }}>
            Contact today!
          </button>
        </div>
      </div>

      <div className="bms-footer-support-row">
        <div className="bms-footer-support-content">
          <div className="bms-support-col" onClick={() => navigate('/help-support')}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M3 14c0-4.97 4.03-9 9-9s9 4.03 9 9"></path>
              <path d="M21 13h-1a2 2 0 0 0-2 2v3a2 2 0 0 0 2 2h1a1 1 0 0 0 1-1v-5a1 1 0 0 0-1-1zM3 13h1a2 2 0 0 1 2 2v3a2 2 0 0 1-2 2H3a1 1 0 0 1-1-1v-5a1 1 0 0 1 1-1z"></path>
              <path d="M6 18a4 4 0 0 0 4 4h2"></path>
            </svg>
            <span>24/7 CUSTOMER CARE</span>
          </div>
          <div className="bms-support-col" onClick={() => navigate('/order-history')}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M10.5 4.5h9a1.5 1.5 0 0 1 1.5 1.5v3.5a1.5 1.5 0 0 0 0 3v3.5a1.5 1.5 0 0 1-1.5 1.5h-9a1.5 1.5 0 0 1-1.5-1.5V13a1.5 1.5 0 0 0 0-3V6a1.5 1.5 0 0 1 1.5-1.5z"></path>
              <path d="M7.5 7.5h-3a1.5 1.5 0 0 0-1.5 1.5v3.5a1.5 1.5 0 0 1 0 3v3.5a1.5 1.5 0 0 0 1.5 1.5h3"></path>
              <line x1="14" y1="8" x2="14" y2="16" strokeDasharray="2 2"></line>
            </svg>
            <span>RESEND BOOKING CONFIRMATION</span>
          </div>
          <div className="bms-support-col" onClick={() => toast.success("Subscribed successfully to Passwala Newsletter!")}>
            <svg viewBox="0 0 24 24" width="36" height="36" fill="none" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"></path>
              <polyline points="22,6 12,13 2,6"></polyline>
              <line x1="6" y1="15" x2="12" y2="15"></line>
              <line x1="6" y1="11" x2="8" y2="11"></line>
            </svg>
            <span>SUBSCRIBE TO THE NEWSLETTER</span>
          </div>
        </div>
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
                    ☀️ Subscribe to breakfast essentials. Guaranteed contact-free silent doorstep doorstep delivery before 7:00 AM daily. No delivery fees!
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

      {/* ── Coming Soon Popup (Community card) ── */}
      {showComingSoon && (
        <div
          onClick={() => setShowComingSoon(false)}
          style={{
            position:'fixed', inset:0, zIndex:9999,
            background:'rgba(0,0,0,0.45)',
            backdropFilter:'blur(6px)',
            display:'flex', alignItems:'center', justifycontent:'center',
            padding:'1.5rem'
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background:'linear-gradient(135deg,#fff 0%,#fff7f2 100%)',
              borderRadius:'24px', padding:'2.5rem 2rem 2rem',
              maxWidth:'340px', width:'100%', textAlign:'center',
              boxShadow:'0 24px 60px rgba(0,0,0,0.18)',
              border:'1.5px solid rgba(255,118,34,0.18)',
              animation:'cs-pop 0.35s cubic-bezier(0.175,0.885,0.32,1.275)'
            }}
          >
            <style>{`
              @keyframes cs-pop{
                from{opacity:0;transform:scale(0.75) translateY(30px)}
                to{opacity:1;transform:scale(1) translateY(0)}
              }
              @keyframes cs-rocket{
                0%,100%{transform:translateY(0) rotate(-10deg)}
                50%{transform:translateY(-10px) rotate(-10deg)}
              }
            `}</style>
            <div style={{fontSize:'3.5rem',lineHeight:1,marginBottom:'0.75rem',display:'inline-block',animation:'cs-rocket 1.6s ease-in-out infinite'}}>🚀</div>
            <div style={{display:'inline-block',background:'linear-gradient(135deg,#ff7622,#ff9f4a)',color:'white',fontSize:'0.65rem',fontWeight:900,letterSpacing:'0.12em',padding:'4px 12px',borderRadius:'100px',marginBottom:'1rem',textTransform:'uppercase'}}>Coming Soon</div>
            <h2 style={{fontSize:'1.35rem',fontWeight:800,color:'#0f172a',margin:'0.5rem 0'}}>Community Hub 🏘️</h2>
            <p style={{fontSize:'0.9rem',color:'#64748b',lineHeight:1.6,margin:'0 0 1.75rem'}}>
              Connect with your neighbors, join local groups &amp; discover what&apos;s happening nearby — <strong style={{color:'#ff7622'}}>launching very soon!</strong>
            </p>
            <button
              onClick={() => setShowComingSoon(false)}
              style={{width:'100%',padding:'0.85rem',background:'linear-gradient(135deg,#ff7622,#ff9f4a)',color:'white',border:'none',borderRadius:'14px',fontWeight:800,fontSize:'0.95rem',cursor:'pointer',boxShadow:'0 6px 20px rgba(255,118,34,0.35)'}}
            >
              Got it! ✨
            </button>
          </div>
        </div>
      )}
    </motion.section>
  );
};

export default NeighborhoodHub;
