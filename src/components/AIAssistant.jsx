import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Bot, User, Loader2 } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import './AIAssistant.css';

const AIAssistant = ({ isOpen, onClose, onOpen }) => {
  const [messages, setMessages] = useState([
    { id: 1, text: "Hello! I'm your Passwala AI. How can I help you today?", sender: 'ai', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSend = async () => {
    if (!input.trim()) return;

    const userMsg = {
      id: Date.now(),
      text: input,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    // Simulate AI response
    setTimeout(() => {
      const responses = [
        "I can help you find the best local services in Ahmedabad!",
        "Looking for a plumber? I recommend checking out 'Ahmedabad Plumbing Experts'.",
        "The nearest quick service is just 500m away in Satellite.",
        "Passwala helps you connect with trusted vendors in your neighborhood.",
        "You can earn community points by referring your neighbors!"
      ];
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const aiMsg = {
        id: Date.now() + 1,
        text: randomResponse,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      setMessages(prev => [...prev, aiMsg]);
      setIsTyping(false);
    }, 1500);
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
