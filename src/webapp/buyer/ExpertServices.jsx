/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { toast } from 'react-hot-toast';
import { 
  ArrowLeft, 
  Search, 
  Star, 
  MessageCircle, 
  ShieldCheck,
  UserCheck,
  Timer,
  CheckCircle
} from 'lucide-react';
import './ExpertServices.css';
import { supabase } from '../../supabase';
import { useTranslation } from '../LanguageContext';
import { useCart } from '../../context/CartContext';

const ExpertServices = ({ onBack, location }) => {
  const { t } = useTranslation();
  const { addToCart } = useCart();
  const currentArea = location?.split(',')[0] || 'your area';
  const [activeTab, setActiveTab] = useState('All');
  const [experts, setExperts] = useState([]);
  const [loading, setLoading] = useState(true);
  const categories = ['All', 'Electrical', 'Plumbing', 'AC & Appliance', 'Carpentry', 'Painting', 'Cleaning'];
  
  const subCategories = {
    'Electrical': ['Wiring', 'Fan Installation', 'Switchboard Repair', 'Inverter Service'],
    'Plumbing': ['Pipe Leak', 'Tap Repair', 'Water Heater', 'RO Installation'],
    'AC & Appliance': ['AC Servicing', 'Washing Machine', 'Refrigerator Repair'],
    'Carpentry': ['Furniture Repair', 'Door/Window Work', 'Custom Woodwork'],
    'Painting': ['Interior Painting', 'Exterior Painting', 'Waterproofing'],
    'Cleaning': ['Deep Cleaning', 'Sofa/Carpet Cleaning', 'Pest Control']
  };

  const [selectedSub, setSelectedSub] = useState('All');

  useEffect(() => {
    fetchExperts();
    window.addEventListener('storage', fetchExperts);
    return () => {
      window.removeEventListener('storage', fetchExperts);
    };
  }, []);

  useEffect(() => {
    setSelectedSub('All');
    fetchExperts();
  }, [activeTab]);

  const fetchExperts = async () => {
    try {
      setLoading(true);
      if (!supabase) return;

      // 🔄 Join services with providers and users to get rich data
      const { data: servicesData, error } = await supabase
        .from('services')
        .select(`
          id, 
          title, 
          price, 
          description,
          duration_minutes,
          service_providers (
            id,
            business_name,
            rating,
            is_verified,
            about,
            users (
              full_name,
              photo_url
            )
          ),
          service_categories (
            name
          )
        `);

      if (error) throw error;

      // Premium static fallback helper based on service/provider category
      const getCategoryPhoto = (catName) => {
        const norm = (catName || '').toLowerCase();
        if (norm.includes('electrical')) return 'https://images.unsplash.com/photo-1621905252507-b35492cc74b4?auto=format&fit=crop&w=500&q=80';
        if (norm.includes('plumbing')) return 'https://images.unsplash.com/photo-1504148455328-c376907d081c?auto=format&fit=crop&w=500&q=80';
        if (norm.includes('ac') || norm.includes('appliance')) return 'https://images.unsplash.com/photo-1581578731522-aa02d681b94d?auto=format&fit=crop&w=500&q=80';
        if (norm.includes('carpentry')) return 'https://images.unsplash.com/photo-1533090161767-e6ffed986c88?auto=format&fit=crop&w=500&q=80';
        if (norm.includes('paint')) return 'https://images.unsplash.com/photo-1562259949-e8e7689d7828?auto=format&fit=crop&w=500&q=80';
        if (norm.includes('clean')) return 'https://images.unsplash.com/photo-1581578731158-a5a3c262c1db?auto=format&fit=crop&w=500&q=80';
        return 'https://images.unsplash.com/photo-1581578731522-aa02d681b94d?auto=format&fit=crop&w=500&q=80';
      };

      const getStableRating = (id, baseRating) => {
        if (baseRating && parseFloat(baseRating) > 0) return parseFloat(baseRating).toFixed(1);
        return null;
      };

      const getStableRecommendations = (id) => {
        return 0;
      };

      if (servicesData) {
        const formatted = servicesData.map(s => {
          const provider = s.service_providers || {};
          const user = provider.users || {};
          const category = s.service_categories?.name || 'Service';

          // Safe photo check
          const rawPhoto = user.photo_url || provider.photo_url || '';
          const isValidPhoto = typeof rawPhoto === 'string' && 
            (rawPhoto.startsWith('http://') || rawPhoto.startsWith('https://') || rawPhoto.startsWith('data:') || rawPhoto.startsWith('/'));
          const expertPhoto = isValidPhoto ? rawPhoto : getCategoryPhoto(category);

          return {
            id: s.id,
            title: s.title,
            name: provider.business_name || provider.name || user.full_name || 'Expert Provider',
            category: category,
            price: s.price || 0,
            image: expertPhoto,
            rating: getStableRating(provider.id || s.id, provider.rating),
            recommendations: provider.recommendations || 0,
            experience: provider.experience ? `${provider.experience} years exp` : null,
            verified: provider.is_verified || false,
            description: s.description,
            providerId: provider.id
          };
        });

        setExperts(formatted);
      }
    } catch (err) {
      console.error('Fetch experts error:', err);
      toast.error('Could not load experts.');
    } finally {
      setLoading(false);
    }
  };

  const filteredExperts = experts.filter(e => {
    const mainMatch = activeTab === 'All' || 
      (e.category || '').toLowerCase().includes(activeTab.toLowerCase()) ||
      (e.title || '').toLowerCase().includes(activeTab.toLowerCase()) ||
      (e.description || '').toLowerCase().includes(activeTab.toLowerCase());
    const subMatch = selectedSub === 'All' || 
      (e.name || '').toLowerCase().includes(selectedSub.toLowerCase()) || 
      (e.title || '').toLowerCase().includes(selectedSub.toLowerCase()) || 
      (e.category || '').toLowerCase().includes(selectedSub.toLowerCase());
    return mainMatch && subMatch;
  });
  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="expert-services-page"
    >
      <header className="expert-header no-top-row">
        <div className="search-bar-expert">
          <Search size={18} className="search-icon-expert" />
          <input 
            type="text" 
            placeholder="Describe issue (e.g. leaking tap, AC service)..." 
            onFocus={() => toast.success('AI: Tell me what happened, I will find the right expert.')}
          />
        </div>

        <div className="category-tabs-scroll">
          {categories.map((tab) => (
            <button 
              key={tab} 
              className={`tab-btn-v3 ${activeTab === tab ? 'active' : ''}`}
              onClick={() => setActiveTab(tab)}
            >
              {tab === 'All' ? t('expert_services') : tab}
            </button>
          ))}
        </div>
      </header>

      <main className="expert-list">
        {filteredExperts.map((expert, i) => (
          <motion.div 
            key={expert.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
            className="expert-card card-hover"
          >
            <div className="expert-main-info">
               <div className="expert-avatar-container">
                  <div className="expert-avatar-fallback">
                    {expert.name ? expert.name.charAt(0).toUpperCase() : 'E'}
                  </div>
                  <img 
                    src={expert.image} 
                    alt={expert.name} 
                    className="expert-avatar" 
                    onError={(e) => { e.target.style.display = 'none'; }} 
                  />
                  {expert.verified && (
                    <div className="verified-badge-premium" title="Neighborhood Verified Resident">
                       <ShieldCheck size={12} fill="#ff7622" stroke="white" />
                    </div>
                  )}
               </div>
               <div className="expert-details">
                  <div className="name-row">
                    <div className="title-stack">
                      <h3>{expert.title || 'Expert Service'}</h3>
                       <span className="expert-provider-name">by {expert.name}</span>
                      {expert.recommendations > 0 && (
                        <div className="neighbor-endorsement">
                           <UserCheck size={12} color="var(--primary)" />
                           <span>{t('trust_badge').replace('{n}', expert.recommendations)} residents nearby</span>
                        </div>
                      )}
                    </div>
                    {expert.rating && (
                      <div className="rating-pill">
                        <Star size={12} fill="#FFB800" stroke="#FFB800" />
                        <span>{expert.rating}</span>
                      </div>
                    )}
                  </div>
                  <span className="expert-type">{expert.category}{expert.experience ? ` • ${expert.experience}` : ''}</span>
                   {expert.description && (
                     <p className="expert-description-snippet">{expert.description}</p>
                   )}
                  
               </div>
            </div>

            <div className="expert-footer">
               <div className="expert-price">
                  <span>Inspection Fee</span>
                  <strong>₹{expert.price || 199}</strong>
               </div>
                <div className="expert-actions">
                   <button className="chat-btn" onClick={() => {
                     toast.dismiss();
                     toast.success(`Opening Passwala Help Bot for ${expert.name}...`);
                     window.dispatchEvent(new CustomEvent('open-ai-chat', { detail: { expert } }));
                   }}><MessageCircle size={18} /></button>
                   <button 
                     className="hire-btn"
                     onClick={() => {
                       addToCart({
                         id: expert.id,
                         name: expert.title,
                         price: expert.price,
                         image: expert.image,
                         type: 'service',
                         store: expert.name,
                         shop_id: expert.providerId || expert.id
                       });
                       toast.success(`${expert.title} added to cart`);
                     }}
                   >{t('book_now')}</button>
                </div>
            </div>
          </motion.div>
        ))}
      </main>
    </motion.div>
  );
};

export default ExpertServices;
