import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Bot, User, Loader2 } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import './AIAssistant.css';

const AIAssistant = ({ isOpen, onClose, onOpen, onRegisterVendor }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Jai Shree Krishna! I'm your Ahmedabad Community AI. 🙏 How can I help you today? (I support Hindi, Gujarati & English)", sender: 'ai', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionState, setSessionState] = useState('IDLE'); // IDLE, ONBOARDING, BOOKING, DONE
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({});
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userInput = input.trim();
    const userMsg = { id: Date.now(), text: userInput, sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    setTimeout(() => {
      let aiResponse = "";
      const lowerInput = userInput.toLowerCase();

      // --- VERNACULAR GREETINGS ---
      if (lowerInput.includes('kem cho') || lowerInput.includes('kevu')) {
        aiResponse = "Maja ma! 🙏 Hoon tamari Ahmedabad Community AI chhu. Su madad karu? (I can help in Gujarati, Hindi & English)";
      }
      else if (lowerInput.includes('kaise ho') || lowerInput.includes('namaste')) {
        aiResponse = "Main bilkul theek hoon! 🙏 Aapki Ahmedabad neighborhood AI sahayta ke liye taiyar hai. Kya madad karu?";
      }

      // --- VENDOR ONBOARDING FLOW (WA STYLE) ---
      else if (lowerInput.includes('vendor') || lowerInput.includes('sell') || lowerInput.includes('dukaan') || lowerInput.includes('bhandar')) {
        setSessionState('ONBOARDING');
        setOnboardingStep(1);
        aiResponse = "Wonderful choice! Joining Passwala as a Vendor is as easy as sending a message. 📱 Let's start. \n\nWhat is your **Business Name**?";
      } 
      else if (sessionState === 'ONBOARDING') {
        if (onboardingStep === 1) {
          setOnboardingData({ ...onboardingData, name: userInput });
          setOnboardingStep(2);
          aiResponse = `Got it, *${userInput}*! ✍️ \n\nNext, what **Category** best describes your shop? (e.g. Grocery, Dairy, Fruits, or Plumbing Service)`;
        } else if (onboardingStep === 2) {
          setOnboardingData({ ...onboardingData, category: userInput });
          setOnboardingStep(3);
          aiResponse = "Perfect! 🎯 Almost there. \n\nPlease share your **Shop Location** or Landmark in Ahmedabad (e.g. Near Shivam Residency, Satellite). \n\nOur AI will auto-create your digital catalog for you!";
        } else if (onboardingStep === 3) {
          setSessionState('IDLE');
          setOnboardingStep(0);
          aiResponse = "Congratulations! 🎊 Your application is complete. \n\nI've generated a draft **Digital Catalog** with predicted items for your category. Click the button below to review your products on the Ahmedabad Vendor Cloud!";
          if (onRegisterVendor) {
             setTimeout(() => {
                onRegisterVendor();
                onClose();
             }, 3000);
          }
        }
      }

      // --- SERVICE BOOKING FLOW ---
      else if (lowerInput.includes('leak') || lowerInput.includes('plumb') || lowerInput.includes('tap')) {
        aiResponse = "I identify a Plumbing issue. 🚰 I've found 3 verified Plumbers in your neighborhood. Most residents prefer 'Ahmedabad Tap Experts' (4.9⭐). Should I book a inspection?";
      }
      else if (lowerInput.includes('light') || lowerInput.includes('wire') || lowerInput.includes('fan') || lowerInput.includes('electric')) {
        aiResponse = "Electrical issue detected. ⚡ I'm checking available 'Neighborhood Endorsed' electricians within 2km. One professional is just 15 mins away. Book now?";
      }

      // --- ORDER TRACKING ---
      else if (lowerInput.includes('track') || lowerInput.includes('order status') || lowerInput.includes('kaha hai')) {
        aiResponse = "I'm checking your active orders. 📦 Your 'Fresh Milk & Bread' order from Krishna Dairy is just 8 mins away. Ramesh Bhai is delivering it. You can see the live map in the 'Track' tab!";
      }

      // --- SCHEDULING & GROUPING ---
      else if (lowerInput.includes('morning') || lowerInput.includes('schedule') || lowerInput.includes('group')) {
        aiResponse = "Good idea! ⏰ You can 'Schedule for 7 AM' directly from your cart for daily essentials. Also, if your neighbors are ordering, you'll see a 'Floor Group' discount automatically!";
      }

      // --- LANGUAGE & GENERAL ---
      else if (lowerInput.includes('kevu') || lowerInput.includes('kem cho')) {
        aiResponse = "Maja ma! Badhu saru che. I can help you find nearby shops or book home services. Su madad karu?";
      }
      else if (lowerInput.includes('kaise') || lowerInput.includes('baat')) {
        aiResponse = "Main aapki sahayata kar sakti hoon! Aapko plumber chahiye ya grocery ki dukaan? Mujhe batayein.";
      }
      else {
        aiResponse = "Passwala AI at your service! 🏙️ I can help you find groceries, book home services, or register your local business. Just ask me!";
      }

      setMessages(prev => [...prev, { id: Date.now() + 1, text: aiResponse, sender: 'ai', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      setIsTyping(false);
    }, 1200);
  };

  return (
    <>
      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ai-chat-window glass shadow-2xl"
            initial={{ opacity: 0, y: 100, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 100, scale: 0.8 }}
          >
            <div className="ai-chat-header">
              <div className="header-info">
                <div className="bot-avatar">
                   <Bot size={20} color="white" />
                </div>
                <div>
                  <h3>Passwala AI</h3>
                  <span>Online • Ready to help</span>
                </div>
              </div>
              <button className="close-chat" onClick={onClose}>
                <X size={20} />
              </button>
            </div>

            <div className="ai-chat-messages" ref={scrollRef}>
              {messages.map((msg) => (
                <div key={msg.id} className={`message-wrapper ${msg.sender}`}>
                  <div className="message-bubble">
                    {msg.text}
                    <span className="message-time">{msg.time}</span>
                  </div>
                </div>
              ))}
              {isTyping && (
                <div className="message-wrapper ai">
                  <div className="message-bubble typing">
                    <Loader2 size={16} className="animate-spin" /> 
                    <span>Passwala AI is thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="ai-chat-input">
              <input 
                type="text" 
                placeholder="Ask me anything..." 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSend()}
              />
              <button disabled={!input.trim()} onClick={handleSend}>
                <Send size={20} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;
