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

const ExpertServices = ({ onBack, location }) => {
  const { t } = useTranslation();
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
  }, []);

  useEffect(() => {
    setSelectedSub('All');
  }, [activeTab]);

  const fetchExperts = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('services')
        .select('*')
        .order('rating', { ascending: false });
      
      if (error) throw error;
      
      const uniqueExperts = [];
      const seen = new Set();
      
      (data || []).forEach(item => {
        const identifier = `${item.name}-${item.provider}`;
        if (!seen.has(identifier)) {
          seen.add(identifier);
          uniqueExperts.push(item);
        }
      });

      setExperts(uniqueExperts);
    } catch (err) {
      console.error('Fetch experts error:', err);
      toast.error('Could not load real experts data.');
    } finally {
      setLoading(false);
    }
  };

  const filteredExperts = experts.filter(e => {
    const mainMatch = activeTab === 'All' || (e.category || '').toLowerCase().includes(activeTab.toLowerCase());
    const subMatch = selectedSub === 'All' || (e.name || '').toLowerCase().includes(selectedSub.toLowerCase()) || (e.category || '').toLowerCase().includes(selectedSub.toLowerCase());
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

        <div className="ai-booking-hint" onClick={() => toast.success('AI: Scanning for 5-star plumbers within 2km...')}>
           <MessageCircle size={16} /> <span>BOOK WITH AI CHATBOLT</span>
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
                  <img src={expert.image} alt={expert.name} className="expert-avatar" />
                  {expert.verified && (
                    <div className="verified-badge-premium" title="Neighborhood Verified Resident">
                       <ShieldCheck size={12} fill="#ff7622" stroke="white" />
                    </div>
                  )}
               </div>
               <div className="expert-details">
                  <div className="name-row">
                    <div className="title-stack">
                      <h3>{expert.name}</h3>
                      <div className="neighbor-endorsement">
                         <UserCheck size={12} color="var(--primary)" />
                         <span>{t('trust_badge').replace('{n}', expert.recommendations || 0)} residents nearby</span>
                      </div>
                    </div>
                    <div className="rating-pill">
                      <Star size={12} fill="#FFB800" stroke="#FFB800" />
                      <span>{expert.rating}</span>
                    </div>
                  </div>
                  <span className="expert-type">{expert.category} • {expert.experience || '5 yr+'} exp</span>
                  
                  <div className="expert-features">
                    <span className="feature"><Timer size={12} /> Live ETA: 25 min</span>
                    <span className="feature seconded"><CheckCircle size={12} /> Seconded by {Math.floor(Math.random() * 10) + 2} neighbors</span>
                  </div>
               </div>
            </div>

            <div className="expert-footer">
               <div className="expert-price">
                  <span>Inspection Fee</span>
                  <strong>₹{expert.price || 199}</strong>
               </div>
               <div className="expert-actions">
                  <button className="chat-btn" onClick={() => toast(`AI: Connecting you to ${expert.name}...`)}><MessageCircle size={18} /></button>
                  <button 
                    className="hire-btn"
                    onClick={() => toast.loading(`Booking ${expert.name}...`, { duration: 1500 })}
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
