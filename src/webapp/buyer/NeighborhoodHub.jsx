/* eslint-disable no-unused-vars, no-empty */
import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowRight, Plus, Sparkles, Sunrise, Users, ShoppingBasket } from 'lucide-react';
import { useTranslation } from '../LanguageContext';
import { toast } from 'react-hot-toast';
import { supabase } from '../../supabase';
import './NeighborhoodHub.css';

const NeighborhoodHub = ({ onNavigate }) => {
  const { t } = useTranslation();
  
  const cards = [
    {
      title: t('community'),
      subtitle: t('tagline'),
      image: "/neighbor.png",
      type: "peach",
      view: 'NEIGHBORS',
      tag: "JOIN FLOOR CHAT"
    },
    {
      title: t('expert_services'),
      subtitle: "Verified local pros",
      image: "/expert_services.png",
      type: "cream",
      view: 'EXPERT_SERVICES',
      tag: "BOOK PRO"
    },
    {
      title: t('near_shops'),
      subtitle: "Best neighborhood stores",
      image: "/near_shops.png",
      type: "green",
      view: 'NEAR_SHOPS',
      tag: "ORDER NOW"
    }
  ];

  const aiFeatures = [
    {
      icon: <Sparkles size={24} color="var(--primary)" />,
      title: "AI Smart Basket",
      desc: "Autofill essentials based on your usage",
      onClick: () => toast.success('AI: Suggested Milk, Eggs & Bread based on your weekly habit.')
    },
    {
      icon: <Users size={24} color="#3b82f6" />,
      title: "Apartment Group Order",
      desc: "Save delivery fees with Floor 4 neighbors",
      onClick: () => toast.loading('Finding society groups...', { duration: 1500 })
    }
  ];

  const [liveStats, setLiveStats] = useState({ shops: 0, pro: 0 });

  useEffect(() => {
    const fetchStats = async () => {
      try {
        if (!supabase) return;
        const { count: sCount } = await supabase.from('services').select('*', { count: 'exact', head: true });
        setLiveStats({ shops: sCount || 0, pro: Math.floor((sCount || 0) * 0.8) });
      } catch (err) {
        setLiveStats({ shops: 0, pro: 0 });
      }
    };
    fetchStats();
  }, []);

  return (
    <motion.section 
      initial={{ opacity: 0, y: 30 }}
      whileInView={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.6 }}
      viewport={{ once: true }}
      className="neighborhood-hub"
    >
      <div className="hub-container">
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

        {/* AI & Morning Delivery Features */}
        <div className="ai-hub-row">
           <div className="ai-feature-card glass" onClick={() => aiFeatures[0].onClick()}>
              <div className="ai-icon-box">{aiFeatures[0].icon}</div>
              <div className="ai-text">
                 <h4>{aiFeatures[0].title}</h4>
                 <p>{aiFeatures[0].desc}</p>
              </div>
           </div>
           
           <div className="ai-feature-card glass highlight" onClick={() => toast('Scheduling Morning Milk & Bread for 7:00 AM...')}>
              <div className="ai-icon-box"><Sunrise size={24} color="#f59e0b" /></div>
              <div className="ai-text">
                 <h4>Schedule Morning Delivery</h4>
                 <p>Get Milk & Bread by 7 AM daily</p>
              </div>
           </div>
           
           <div className="ai-feature-card glass" onClick={() => aiFeatures[1].onClick()}>
              <div className="ai-icon-box">{aiFeatures[1].icon}</div>
              <div className="ai-text">
                 <h4>{aiFeatures[1].title}</h4>
                 <p>{aiFeatures[1].desc}</p>
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
    </motion.section>
  );
};

export default NeighborhoodHub;

