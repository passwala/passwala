/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  ExternalLink,
  MessageCircle
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './ProfilePages.css';
import { useTranslation } from '../LanguageContext';

const HelpSupport = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    { 
      id: 1, 
      question: t('faq_q1') !== 'faq_q1' ? t('faq_q1') : "How do I schedule a morning delivery?", 
      answer: t('faq_a1') !== 'faq_a1' ? t('faq_a1') : "Go to the Neighborhood Hub and click 'Schedule Morning Delivery'. Choose your essentials (Milk, Bread, etc.) and pick a start date. Orders arrive by 7:00 AM daily." 
    },
    { 
      id: 2, 
      question: t('faq_q2') !== 'faq_q2' ? t('faq_q2') : "What is an Apartment Group Order?", 
      answer: t('faq_a2') !== 'faq_a2' ? t('faq_a2') : "Group ordering allows floor or society neighbors to order together to waive delivery fees. Join a group from the Hub, and your orders will be bundled during delivery." 
    },
    { 
      id: 3, 
      question: t('faq_q3') !== 'faq_q3' ? t('faq_q3') : "Are neighborhood experts verified?", 
      answer: t('faq_a3') !== 'faq_a3' ? t('faq_a3') : "Yes! All experts are 'Neighborhood-Verified' by our team and must carry valid ID. You can see social proof from neighbors who have used them before." 
    },
    { 
      id: 4, 
      question: t('faq_q4') !== 'faq_q4' ? t('faq_q4') : "How can I return an order?", 
      answer: t('faq_a4') !== 'faq_a4' ? t('faq_a4') : "Use the 'Order History' sub-page to select the order and click 'Return'. Our local partner will pick it up within 2 hours." 
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="profile-sub-page"
    >
      <main className="help-support-content">

        <div className="section-header-compact">
           <h3>{t('top_questions')}</h3>
        </div>

        <div className="faq-list">
           {faqs.map((faq) => (
             <div key={faq.id} className={`faq-item glass ${activeFaq === faq.id ? 'active' : ''}`} onClick={() => setActiveFaq(activeFaq === faq.id ? null : faq.id)}>
                <div className="faq-header">
                   <strong>{faq.question}</strong>
                   {activeFaq === faq.id ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                </div>
                <AnimatePresence>
                   {activeFaq === faq.id && (
                     <motion.div 
                       initial={{ height: 0, opacity: 0 }}
                       animate={{ height: 'auto', opacity: 1 }}
                       exit={{ height: 0, opacity: 0 }}
                       className="faq-answer"
                     >
                       <p>{faq.answer}</p>
                     </motion.div>
                   )}
                </AnimatePresence>
             </div>
           ))}
        </div>

        <div className="section-header-compact">
           <h3>{t('still_need_help')}</h3>
        </div>

        <div className="contact-methods">
           {/* BUG B7 FIX: Open real links instead of empty toast('Coming soon') */}
           <a
             className="contact-btn glass whatsapp-btn"
             href="https://wa.me/919876543210?text=Hi%20Passwala%20Support%2C%20I%20need%20help"
             target="_blank"
             rel="noopener noreferrer"
             style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}
           >
              <div className="contact-icon-box"><MessageCircle size={20} /></div>
              <div className="contact-text">
                 <strong>{t('whatsapp_support')}</strong>
                 <span>{t('whatsapp_support_sub')}</span>
              </div>
              <ExternalLink size={16} />
           </a>
           <a
             className="contact-btn glass chat-btn"
             href="mailto:passwalaoffcial@gmail.com?subject=Support%20Request"
             style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}
           >
              <div className="contact-icon-box"><MessageSquare size={20} /></div>
              <div className="contact-text">
                 <strong>{t('email_support')}</strong>
                 <span>{t('email_support_sub')}</span>
              </div>
              <ExternalLink size={16} />
           </a>
           <a
             className="contact-btn glass call-btn"
             href="tel:+919876543210"
             style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', gap: '12px' }}
           >
              <div className="contact-icon-box"><Phone size={20} /></div>
              <div className="contact-text">
                 <strong>{t('call_support')}</strong>
                 <span>{t('call_support_sub')}</span>
              </div>
              <ExternalLink size={16} />
           </a>
        </div>

        <div className="help-footer-meta">
           <Mail size={16} /> <a href="mailto:passwalaoffcial@gmail.com" style={{ color: 'inherit', textDecoration: 'none' }}>passwalaoffcial@gmail.com</a>
           <span className="separator">•</span>
           <span>{t('app_version')}</span>
        </div>
      </main>
    </motion.div>
  );
};

export default HelpSupport;
