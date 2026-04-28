/* eslint-disable no-unused-vars */
import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
  HelpCircle, 
  MessageSquare, 
  Phone, 
  Mail, 
  ChevronDown, 
  ChevronUp, 
  Search, 
  ExternalLink,
  MessageCircle,
  Truck,
  CreditCard as CreditCardIcon,
  User as UserIcon,
  ShieldCheck as ShieldCheckIcon
} from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import './ProfilePages.css';

const HelpSupport = () => {
  const navigate = useNavigate();
  const [activeFaq, setActiveFaq] = useState(null);

  const faqs = [
    { 
      id: 1, 
      question: "How do I schedule a morning delivery?", 
      answer: "Go to the Neighborhood Hub and click 'Schedule Morning Delivery'. Choose your essentials (Milk, Bread, etc.) and pick a start date. Orders arrive by 7:00 AM daily." 
    },
    { 
      id: 2, 
      question: "What is an Apartment Group Order?", 
      answer: "Group ordering allows floor or society neighbors to order together to waive delivery fees. Join a group from the Hub, and your orders will be bundled during delivery." 
    },
    { 
      id: 3, 
      question: "Are neighborhood experts verified?", 
      answer: "Yes! All experts are 'Neighborhood-Verified' by our team and must carry valid ID. You can see social proof from neighbors who have used them before." 
    },
    { 
      id: 4, 
      question: "How can I return an order?", 
      answer: "Use the 'Order History' sub-page to select the order and click 'Return'. Our local partner will pick it up within 2 hours." 
    }
  ];

  return (
    <motion.div 
      initial={{ opacity: 0, x: 20 }}
      animate={{ opacity: 1, x: 0 }}
      exit={{ opacity: 0, x: -20 }}
      className="profile-sub-page"
    >
      <header className="sub-page-header">
        <button className="back-btn-profile" onClick={() => navigate('/profile')}>
          <ArrowLeft size={20} />
        </button>
        <h1>Help & Support</h1>
      </header>

      <main className="help-support-content">
        <div className="search-bar-help glass">
           <Search size={18} className="search-icon-help" />
           <input type="text" placeholder="Search topics, orders, issues..." />
        </div>

        <div className="quick-help-categories">
           <div className="help-cat-card glass" onClick={() => toast('Opening Order Support...')}>
              <div className="help-cat-icon"><Truck size={24} color="#f59e0b" /></div>
              <span>Orders</span>
           </div>
           <div className="help-cat-card glass" onClick={() => toast('Opening Payment Support...')}>
              <div className="help-cat-icon"><CreditCardIcon size={24} color="#3b82f6" /></div>
              <span>Payments</span>
           </div>
           <div className="help-cat-card glass" onClick={() => toast('Opening Account Support...')}>
              <div className="help-cat-icon"><UserIcon size={24} color="#10b981" /></div>
              <span>Account</span>
           </div>
           <div className="help-cat-card glass" onClick={() => toast('Opening Safety Support...')}>
              <div className="help-cat-icon"><ShieldCheckIcon size={24} color="#ef4444" /></div>
              <span>Safety</span>
           </div>
        </div>

        <div className="section-header-compact">
           <h3>TOP QUESTIONS</h3>
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
           <h3>STILL NEED HELP?</h3>
        </div>

        <div className="contact-methods">
           <button className="contact-btn glass whatsapp-btn" onClick={() => toast('Opening WhatsApp Support...')}>
              <div className="contact-icon-box"><MessageCircle size={20} /></div>
              <div className="contact-text">
                 <strong>WhatsApp Support</strong>
                 <span>Instant reply within 5 mins</span>
              </div>
              <ExternalLink size={16} />
           </button>
           <button className="contact-btn glass chat-btn" onClick={() => toast('Starting Live Chat...')}>
              <div className="contact-icon-box"><MessageSquare size={20} /></div>
              <div className="contact-text">
                 <strong>Live Chat</strong>
                 <span>Talk to our experts online</span>
              </div>
              <ExternalLink size={16} />
           </button>
           <button className="contact-btn glass call-btn" onClick={() => toast('Calling Support Center...')}>
              <div className="contact-icon-box"><Phone size={20} /></div>
              <div className="contact-text">
                 <strong>Call Support</strong>
                 <span>24/7 Helpline for emergency</span>
              </div>
              <ExternalLink size={16} />
           </button>
        </div>

        <div className="help-footer-meta">
           <Mail size={16} /> <span>support@passwala.com</span>
           <span className="separator">•</span>
           <span>App Version 2.0.4 Premium</span>
        </div>
      </main>
    </motion.div>
  );
};

export default HelpSupport;
