import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, MessageSquare, Bot, User, Loader2, ArrowLeft } from 'lucide-react';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../supabase';
import './AIAssistant.css';

const AIAssistant = ({ isOpen, onClose, onRegisterVendor, user }) => {
  const [activeTab, setActiveTab] = useState('AI'); // 'AI' or 'CHATS'
  const [selectedVendor, setSelectedVendor] = useState(null); // null or expert object
  const [chatThreads, setChatThreads] = useState(() => {
    const saved = localStorage.getItem('passwala_chat_threads');
    return saved ? JSON.parse(saved) : [];
  });

  const [messages, setMessages] = useState([
    { id: 1, text: "Jai Shree Krishna! I'm your Ahmedabad Community Help Bot. 🙏 How can I help you today? (I support Hindi, Gujarati & English)", sender: 'ai', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [sessionState, setSessionState] = useState('IDLE'); // IDLE, ONBOARDING, BOOKING, DONE
  const [onboardingStep, setOnboardingStep] = useState(0);
  const [onboardingData, setOnboardingData] = useState({});
  const scrollRef = useRef(null);

  const saveThreads = (newThreads) => {
    setChatThreads(newThreads);
    localStorage.setItem('passwala_chat_threads', JSON.stringify(newThreads));
  };

  // Helper to find or create chat thread in Supabase
  const findOrCreateChat = useCallback(async (expert) => {
    if (!user?.id || !supabase) return null;
    try {
      const { data: existing } = await supabase
        .from('chats')
        .select('*')
        .eq('user_id', user.id)
        .eq('vendor_id', expert.id)
        .maybeSingle();
        
      if (existing) return existing;
      
      const payload = {
        user_id: user.id,
        vendor_id: expert.id,
        vendor_name: expert.name,
        vendor_title: expert.title || 'Expert Service',
        vendor_image: expert.image || null,
        category: expert.category || 'Service',
        price: expert.price || 199,
        provider_id: expert.providerId || expert.id,
        last_message: `Namaste! I am the provider from "${expert.name}". How can I help you today?`,
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };
      
      const { data: created, error: insErr } = await supabase
        .from('chats')
        .insert([payload])
        .select()
        .single();
        
      if (insErr) throw insErr;

      // Seed the first welcome message
      await supabase
        .from('chat_messages')
        .insert([{
          chat_id: created.id,
          sender: 'vendor',
          text: `Namaste! I am the service provider from "${expert.name}". How can I help you today with our "${expert.title}" service?`
        }]);

      return created;
    } catch (err) {
      console.warn('⚠️ Error finding/creating chat in Supabase:', err);
      return null;
    }
  }, [user?.id]);

  // 1. Fetch & Sync remote threads and messages from Supabase when user logs in
  useEffect(() => {
    const syncAndFetchThreads = async () => {
      if (!user?.id || !supabase) return;
      
      try {
        // First sync local unsynced threads to Supabase
        const saved = localStorage.getItem('passwala_chat_threads');
        const localThreads = saved ? JSON.parse(saved) : [];
        
        if (localThreads.length > 0) {
          for (const thread of localThreads) {
            if (!thread.vendorId) continue;
            
            // Check if thread exists in DB
            const { data: existingChat } = await supabase
              .from('chats')
              .select('id')
              .eq('user_id', user.id)
              .eq('vendor_id', thread.vendorId)
              .maybeSingle();
              
            if (!existingChat) {
              // Create chat in DB
              const { data: created, error: insErr } = await supabase
                .from('chats')
                .insert([{
                  user_id: user.id,
                  vendor_id: thread.vendorId,
                  vendor_name: thread.vendorName,
                  vendor_title: thread.vendorTitle,
                  vendor_image: thread.vendorImage,
                  category: thread.category,
                  price: thread.price ? Number(thread.price) : 199,
                  provider_id: thread.providerId,
                  last_message: thread.lastMessage,
                  timestamp: thread.timestamp
                }])
                .select()
                .single();
                
              if (!insErr && created && thread.messages && thread.messages.length > 0) {
                const msgsToInsert = thread.messages.map(m => ({
                  chat_id: created.id,
                  sender: m.sender === 'ai' ? 'vendor' : m.sender, // Normalize sender for DB
                  text: m.text
                }));
                await supabase.from('chat_messages').insert(msgsToInsert);
              }
            } else {
              // Sync missing messages
              const { data: existingMsgs } = await supabase
                .from('chat_messages')
                .select('text, sender')
                .eq('chat_id', existingChat.id);
                
              const missing = (thread.messages || []).filter(tm => 
                !existingMsgs?.some(em => em.text === tm.text && em.sender === (tm.sender === 'ai' ? 'vendor' : tm.sender))
              );
              
              if (missing.length > 0) {
                const msgsToInsert = missing.map(m => ({
                  chat_id: existingChat.id,
                  sender: m.sender === 'ai' ? 'vendor' : m.sender,
                  text: m.text
                }));
                await supabase.from('chat_messages').insert(msgsToInsert);
              }
            }
          }
        }
      } catch (err) {
        console.warn('⚠️ Error syncing local threads to Supabase:', err);
      }

      // Now fetch remote threads
      try {
        const { data, error } = await supabase
          .from('chats')
          .select('*, chat_messages(*)')
          .eq('user_id', user.id)
          .order('updated_at', { ascending: false });

        if (error) {
          console.warn('⚠️ Supabase chat fetch failed or table missing, falling back to localStorage:', error.message);
          return;
        }

        if (data && data.length > 0) {
          // Map DB columns back to UI structure
          const mapped = data.map(t => {
            const sortedMsgs = (t.chat_messages || []).sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
            const uiMessages = sortedMsgs.map((m, idx) => ({
              id: m.id || idx,
              text: m.text,
              sender: m.sender,
              time: new Date(m.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }));

            return {
              id: t.id,
              vendorId: t.vendor_id,
              vendorName: t.vendor_name,
              vendorTitle: t.vendor_title,
              vendorImage: t.vendor_image,
              category: t.category,
              price: t.price ? Number(t.price) : 199,
              providerId: t.provider_id,
              lastMessage: t.last_message,
              timestamp: t.timestamp,
              messages: uiMessages.length > 0 ? uiMessages : [
                {
                  id: 1,
                  text: `Namaste! I am the service provider from "${t.vendor_name}". How can I help you today with our "${t.vendor_title}" service?`,
                  sender: 'vendor',
                  time: t.timestamp || new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                }
              ]
            };
          });
          
          setChatThreads(mapped);
          localStorage.setItem('passwala_chat_threads', JSON.stringify(mapped));
        }
      } catch (err) {
        console.warn('⚠️ Error fetching chat threads from Supabase:', err);
      }
    };

    syncAndFetchThreads();
  }, [user]);

  // 2. Real-time delivery via Supabase Channel subscription
  useEffect(() => {
    if (!user?.id || !supabase) return;

    const channel = supabase
      .channel('realtime-chat-messages')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'chat_messages'
        },
        async (payload) => {
          const newMsg = payload.new;
          
          // Verify if this message belongs to one of our active chats
          const { data: chatRow } = await supabase
            .from('chats')
            .select('*')
            .eq('id', newMsg.chat_id)
            .eq('user_id', user.id)
            .maybeSingle();

          if (!chatRow) return;

          setChatThreads(prevThreads => {
            const uiMsg = {
              id: newMsg.id,
              text: newMsg.text,
              sender: newMsg.sender,
              time: new Date(newMsg.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            };

            const threadExists = prevThreads.find(t => t.vendorId === chatRow.vendor_id);
            if (threadExists) {
              const msgAlreadyExists = threadExists.messages.some(m => m.id === newMsg.id || (m.text === newMsg.text && m.sender === newMsg.sender));
              if (msgAlreadyExists) return prevThreads;

              const updatedMessages = [...threadExists.messages, uiMsg];
              const updated = prevThreads.map(t => {
                if (t.vendorId === chatRow.vendor_id) {
                  return {
                    ...t,
                    lastMessage: newMsg.text,
                    timestamp: uiMsg.time,
                    messages: updatedMessages
                  };
                }
                return t;
              });
              localStorage.setItem('passwala_chat_threads', JSON.stringify(updated));
              return updated;
            } else {
              const newThread = {
                id: chatRow.id,
                vendorId: chatRow.vendor_id,
                vendorName: chatRow.vendor_name,
                vendorTitle: chatRow.vendor_title,
                vendorImage: chatRow.vendor_image,
                category: chatRow.category,
                price: chatRow.price ? Number(chatRow.price) : 199,
                providerId: chatRow.provider_id,
                lastMessage: newMsg.text,
                timestamp: uiMsg.time,
                messages: [uiMsg]
              };
              const updated = [newThread, ...prevThreads];
              localStorage.setItem('passwala_chat_threads', JSON.stringify(updated));
              return updated;
            }
          });
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  useEffect(() => {
    const handleOpenChatEvent = async (e) => {
      const expert = e.detail?.expert;
      if (expert) {
        // Switch to CHATS tab and select this vendor
        setActiveTab('CHATS');
        setSelectedVendor(expert);
        
        // Find or create chat thread
        setChatThreads(prevThreads => {
          const exists = prevThreads.find(t => t.vendorId === expert.id);
          if (exists) {
            const filtered = prevThreads.filter(t => t.vendorId !== expert.id);
            const updated = [exists, ...filtered];
            localStorage.setItem('passwala_chat_threads', JSON.stringify(updated));
            return updated;
          }
          const newThread = {
            vendorId: expert.id,
            vendorName: expert.name,
            vendorTitle: expert.title || 'Expert Service',
            vendorImage: expert.image || null,
            category: expert.category || 'Service',
            price: expert.price || 199,
            providerId: expert.providerId || expert.id,
            lastMessage: `Namaste! I am the provider from "${expert.name}". How can I help you today?`,
            timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            messages: [
              {
                id: 1,
                text: `Namaste! I am the service provider from "${expert.name}". How can I help you today with our "${expert.title}" service?`,
                sender: 'vendor',
                time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
              }
            ]
          };
          const updated = [newThread, ...prevThreads];
          localStorage.setItem('passwala_chat_threads', JSON.stringify(updated));
          return updated;
        });

        // Trigger remote persistence in the background
        await findOrCreateChat(expert);
      }
    };
    window.addEventListener('open-ai-chat', handleOpenChatEvent);
    return () => window.removeEventListener('open-ai-chat', handleOpenChatEvent);
  }, [chatThreads, user, findOrCreateChat]);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, selectedVendor, activeTab, chatThreads]);

  const handleSend = async () => {
    if (!input.trim()) return;
    const userInput = input.trim();
    const userMsg = { id: Date.now(), text: userInput, sender: 'user', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) };
    
    // Update local messages immediately so user sees their message
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setInput('');
    setIsTyping(true);

    const lowerInput = userInput.toLowerCase();

    // 1. Check if we need to route to Vendor Onboarding
    const isVendorKeyword = lowerInput.includes('vendor') || lowerInput.includes('sell') || lowerInput.includes('dukaan') || lowerInput.includes('bhandar');
    if (isVendorKeyword || sessionState === 'ONBOARDING') {
      setTimeout(() => {
        let aiResponse = "";
        if (isVendorKeyword) {
          setSessionState('ONBOARDING');
          setOnboardingStep(1);
          aiResponse = "Wonderful choice! Joining Passwala as a Vendor is as easy as sending a message. 📱 Let's start. \n\nWhat is your **Business Name**?";
        } else if (onboardingStep === 1) {
          setOnboardingData({ ...onboardingData, name: userInput });
          setOnboardingStep(2);
          aiResponse = `Got it, *${userInput}*! ✍️ \n\nNext, what **Category** best describes your shop? (e.g. Grocery, Dairy, Fruits, or Plumbing Service)`;
        } else if (onboardingStep === 2) {
          setOnboardingData({ ...onboardingData, category: userInput });
          setOnboardingStep(3);
          aiResponse = "Perfect! 🎯 Almost there. \n\nPlease share your **Shop Location** or Landmark in Ahmedabad (e.g. Near Shivam Residency, Satellite). \n\nOur Help Bot will auto-create your digital catalog for you!";
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
        setMessages(prev => [...prev, { id: Date.now() + 1, text: aiResponse, sender: 'ai', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
        setIsTyping(false);
      }, 1000);
      return;
    }

    // 2. Otherwise, delegate to the real AI proxy endpoint
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
      const res = await fetch(`${baseUrl}/api/ai/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ messages: updatedMessages })
      });

      if (!res.ok) throw new Error('API server returned error');
      const data = await res.json();
      
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: data.text,
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (err) {
      console.warn('⚠️ Real AI Chat call failed, using rule-based local backup:', err);
      // Local keyword matching backup
      setTimeout(() => {
        let aiResponse = "";
        if (lowerInput.includes('kem cho') || lowerInput.includes('kevu')) {
          aiResponse = "Maja ma! 🙏 Hoon tamari Ahmedabad Community Help Bot chhu. Su madad karu? (I can help in Gujarati, Hindi & English)";
        } else if (lowerInput.includes('kaise ho') || lowerInput.includes('namaste')) {
          aiResponse = "Main bilkul theek hoon! 🙏 Aapki Ahmedabad neighborhood Help Bot sahayta ke liye taiyar hai. Kya madad karu?";
        } else if (lowerInput.includes('leak') || lowerInput.includes('plumb') || lowerInput.includes('tap')) {
          aiResponse = "I identify a Plumbing issue. 🚰 I've found verified Plumbers in your neighborhood. Should I book a inspection with a top-rated professional?";
        } else if (lowerInput.includes('light') || lowerInput.includes('wire') || lowerInput.includes('fan') || lowerInput.includes('electric')) {
          aiResponse = "Electrical issue detected. ⚡ I'm checking available 'Neighborhood Endorsed' electricians. I've found a professional nearby. Book now?";
        } else if (lowerInput.includes('track') || lowerInput.includes('order status') || lowerInput.includes('kaha hai')) {
          aiResponse = "I'm checking your active orders. 📦 Your order is being prepared and will be with you shortly. You can see the live map in the 'Track' tab!";
        } else if (lowerInput.includes('morning') || lowerInput.includes('schedule') || lowerInput.includes('group')) {
          aiResponse = "Good idea! ⏰ You can 'Schedule for 7 AM' directly from your cart for daily essentials. Also, if your neighbors are ordering, you'll see a 'Floor Group' discount automatically!";
        } else {
          aiResponse = "Passwala Help Bot at your service! 🏙️ I can help you find groceries, book home services, or register your local business. Just ask me!";
        }
        setMessages(prev => [...prev, { id: Date.now() + 1, text: aiResponse, sender: 'ai', time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) }]);
      }, 1000);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSendVendorMessage = async (text) => {
    if (!text.trim() || !selectedVendor) return;
    const msgText = text.trim();
    
    const userMsg = {
      id: Date.now(),
      text: msgText,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };
    
    setInput('');
    setIsTyping(true);

    // Attempt to persist in database if user is logged in
    let dbSuccess = false;
    let activeChat = null;

    if (user?.id && supabase) {
      try {
        activeChat = await findOrCreateChat(selectedVendor);
        if (activeChat) {
          const { error: msgErr } = await supabase
            .from('chat_messages')
            .insert([{
              chat_id: activeChat.id,
              sender: 'user',
              text: msgText
            }]);
            
          if (!msgErr) {
            await supabase
              .from('chats')
              .update({
                last_message: msgText,
                timestamp: userMsg.time
              })
              .eq('id', activeChat.id);
              
            dbSuccess = true;
          }
        }
      } catch (err) {
        console.warn('⚠️ Supabase message save failed, falling back to local:', err);
      }
    }

    // Fallback: if DB save was not successful, update state locally
    if (!dbSuccess) {
      const updatedThreads = chatThreads.map(t => {
        if (t.vendorId === selectedVendor.id) {
          return {
            ...t,
            lastMessage: msgText,
            timestamp: userMsg.time,
            messages: [...t.messages, userMsg]
          };
        }
        return t;
      });
      saveThreads(updatedThreads);
    }
    
    // Simulated reply from the vendor
    setTimeout(async () => {
      let replyText = "";
      const lower = msgText.toLowerCase();
      const cat = (selectedVendor.category || '').toLowerCase();
      
      if (lower.includes('price') || lower.includes('cost') || lower.includes('charge') || lower.includes('fees') || lower.includes('fee')) {
        replyText = `The inspection fee for "${selectedVendor.title}" is ₹${selectedVendor.price || 199}. Any additional material or repair work cost will be discussed before we begin.`;
      } else if (lower.includes('time') || lower.includes('when') || lower.includes('schedule') || lower.includes('visit') || lower.includes('available')) {
        replyText = `I can visit your location in Ahmedabad today. What is your preferred time slot? (e.g. 2 PM - 4 PM)`;
      } else if (lower.includes('address') || lower.includes('location') || lower.includes('area')) {
        replyText = `Please share your address details or landmark. I will reach there accordingly.`;
      } else if (lower.includes('book') || lower.includes('confirm') || lower.includes('yes') || lower.includes('order')) {
        // Trigger auto add to cart
        window.dispatchEvent(new CustomEvent('add-to-cart-external', { detail: { 
          id: selectedVendor.id,
          name: selectedVendor.title,
          price: selectedVendor.price,
          image: selectedVendor.image,
          type: 'service',
          store: selectedVendor.name,
          shop_id: selectedVendor.providerId || selectedVendor.id
        } }));
        replyText = `Great choice! I have added the service "${selectedVendor.title}" to your cart. Please check your cart at the top right to complete the booking!`;
      } else {
        if (cat.includes('ac') || cat.includes('appliance')) {
          replyText = `I can inspect your AC today. Please let me know what specific issue you're facing (cooling issue, noise, or general service).`;
        } else if (cat.includes('plumb')) {
          replyText = `Got it. I have all the plumbing tools ready. Just tell me if it's a pipe leak, tap repair, or installation.`;
        } else if (cat.includes('elect')) {
          replyText = `Certainly! I've been doing electrical wiring, switchboard repairs, and fan installation in Ahmedabad for years. What seems to be the issue?`;
        } else {
          replyText = `Thanks for reaching out! Let me know when you would like me to visit, or if you want to book the "${selectedVendor.title}" service.`;
        }
      }
      
      const vendorReply = {
        id: Date.now() + 1,
        text: replyText,
        sender: 'vendor',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      };

      let vendorDbSuccess = false;
      if (dbSuccess && activeChat && supabase) {
        try {
          const { error: replyErr } = await supabase
            .from('chat_messages')
            .insert([{
              chat_id: activeChat.id,
              sender: 'vendor',
              text: replyText
            }]);

          if (!replyErr) {
            await supabase
              .from('chats')
              .update({
                last_message: replyText,
                timestamp: vendorReply.time
              })
              .eq('id', activeChat.id);
              
            vendorDbSuccess = true;
          }
        } catch (err) {
          console.warn('⚠️ Supabase vendor reply save failed, falling back to local:', err);
        }
      }

      if (!vendorDbSuccess) {
        const updatedThreads = chatThreads.map(t => {
          if (t.vendorId === selectedVendor.id) {
            return {
              ...t,
              lastMessage: replyText,
              timestamp: vendorReply.time,
              messages: [...t.messages, vendorReply]
            };
          }
          return t;
        });
        saveThreads(updatedThreads);
      }
      
      setIsTyping(false);
    }, 1200);
  };

  const activeThread = chatThreads.find(t => t.vendorId === selectedVendor?.id);
  const vendorMessages = activeThread ? activeThread.messages : [];

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
            {/* Header */}
            <div className="ai-chat-header">
              <div className="header-info">
                {activeTab === 'CHATS' && selectedVendor ? (
                  <>
                    <button className="back-chat-btn" onClick={() => setSelectedVendor(null)} style={{ marginRight: '10px', background: 'none', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', padding: 0 }}>
                      <ArrowLeft size={20} />
                    </button>
                    {selectedVendor.image ? (
                      <img src={selectedVendor.image} alt={selectedVendor.name} className="chat-vendor-img" style={{ width: '36px', height: '36px', borderRadius: '50%', objectFit: 'cover', marginRight: '10px' }} />
                    ) : (
                      <div className="bot-avatar" style={{ background: '#f97316', width: '36px', height: '36px', marginRight: '10px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'white', fontWeight: 'bold', borderRadius: '50%' }}>
                        {selectedVendor.name.charAt(0).toUpperCase()}
                      </div>
                    )}
                    <div>
                      <h3 style={{ fontSize: '1rem', margin: 0 }}>{selectedVendor.name}</h3>
                      <span style={{ fontSize: '0.75rem', opacity: 0.8 }}>Online • Local Provider</span>
                    </div>
                  </>
                ) : (
                  <>
                    <div className="bot-avatar">
                      <Bot size={20} color="white" />
                    </div>
                    <div>
                      <h3>Passwala Help Bot</h3>
                      <span>Online • Ready to help</span>
                    </div>
                  </>
                )}
              </div>
              <button className="close-chat" onClick={onClose} style={{ background: 'none', border: 'none', color: 'white', cursor: 'pointer' }}>
                <X size={20} />
              </button>
            </div>

            {/* Tab Switched Header (Visible only when not viewing a specific chat thread) */}
            {(!selectedVendor || activeTab === 'AI') && (
              <div className="chat-tabs-bar" style={{ display: 'flex', borderBottom: '1px solid rgba(0,0,0,0.06)', padding: '5px 10px', background: 'var(--bg-surface)' }}>
                <button 
                  onClick={() => setActiveTab('AI')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    background: 'none',
                    fontWeight: activeTab === 'AI' ? '700' : '500',
                    color: activeTab === 'AI' ? '#0f766e' : '#64748b',
                    borderBottom: activeTab === 'AI' ? '2px solid #0f766e' : 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Passwala Help Bot
                </button>
                <button 
                  onClick={() => setActiveTab('CHATS')}
                  style={{
                    flex: 1,
                    padding: '8px',
                    border: 'none',
                    background: 'none',
                    fontWeight: activeTab === 'CHATS' ? '700' : '500',
                    color: activeTab === 'CHATS' ? '#0f766e' : '#64748b',
                    borderBottom: activeTab === 'CHATS' ? '2px solid #0f766e' : 'none',
                    cursor: 'pointer',
                    fontSize: '0.85rem'
                  }}
                >
                  Direct Chats
                </button>
              </div>
            )}

            {/* Main Chat Area */}
            {activeTab === 'AI' ? (
              /* Passwala AI Assistant View */
              <>
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
                        <span>Passwala Help Bot is thinking...</span>
                      </div>
                    </div>
                  )}
                </div>

                <div className="ai-chat-input">
                  <input 
                    type="text" 
                    placeholder="Ask Help Bot anything..." 
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                  />
                  <button disabled={!input.trim()} onClick={handleSend} style={{ border: 'none', cursor: 'pointer' }}>
                    <Send size={20} />
                  </button>
                </div>
              </>
            ) : (
              /* Direct Vendor Chats View */
              selectedVendor ? (
                /* Thread View */
                <>
                  <div className="ai-chat-messages" ref={scrollRef}>
                    {vendorMessages.map((msg) => (
                      <div key={msg.id} className={`message-wrapper ${msg.sender === 'user' ? 'user' : 'ai'}`}>
                        <div className="message-bubble" style={msg.sender === 'vendor' ? { background: '#eff6ff', color: '#1e3a8a' } : {}}>
                          {msg.text}
                          <span className="message-time">{msg.time}</span>
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="message-wrapper ai">
                        <div className="message-bubble typing" style={{ background: '#eff6ff', color: '#1e3a8a' }}>
                          <Loader2 size={16} className="animate-spin" /> 
                          <span>Provider is typing...</span>
                        </div>
                      </div>
                    )}
                  </div>

                  <div className="ai-chat-input">
                    <input 
                      type="text" 
                      placeholder="Type a message to provider..." 
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      onKeyPress={(e) => e.key === 'Enter' && handleSendVendorMessage(input)}
                    />
                    <button disabled={!input.trim()} onClick={() => handleSendVendorMessage(input)} style={{ border: 'none', cursor: 'pointer' }}>
                      <Send size={20} />
                    </button>
                  </div>
                </>
              ) : (
                /* Threads List View */
                <div className="chat-threads-list" style={{ flex: 1, overflowY: 'auto', background: 'var(--bg-surface)' }}>
                  {chatThreads.length === 0 ? (
                    <div className="empty-threads-state" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', padding: '20px', textAlign: 'center', color: 'var(--text-secondary)' }}>
                      <MessageSquare size={48} style={{ opacity: 0.3, marginBottom: '15px' }} />
                      <h4 style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--text-primary)', margin: 0 }}>No direct chats yet</h4>
                      <p style={{ fontSize: '0.8rem', marginTop: '5px', lineHeight: '1.4' }}>Click the chat button next to any service provider on the Local Experts page to start chatting with them directly!</p>
                    </div>
                  ) : (
                    chatThreads.map((thread) => (
                      <div 
                        key={thread.vendorId} 
                        onClick={() => setSelectedVendor({ id: thread.vendorId, name: thread.vendorName, title: thread.vendorTitle, image: thread.vendorImage, category: thread.category, price: thread.price, providerId: thread.providerId })}
                        className="chat-thread-item"
                        style={{
                          display: 'flex',
                          alignItems: 'center',
                          padding: '15px',
                          borderBottom: '1px solid #e2e8f0',
                          background: 'var(--bg-card)',
                          cursor: 'pointer',
                          transition: 'background 0.2s'
                        }}
                      >
                        {thread.vendorImage ? (
                          <img src={thread.vendorImage} alt={thread.vendorName} style={{ width: '40px', height: '40px', borderRadius: '50%', objectFit: 'cover', marginRight: '12px' }} />
                        ) : (
                          <div style={{ background: '#f97316', width: '40px', height: '40px', marginRight: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: '50%', color: 'white', fontWeight: 'bold' }}>
                            {thread.vendorName.charAt(0).toUpperCase()}
                          </div>
                        )}
                        <div style={{ flex: 1, overflow: 'hidden' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
                            <h4 style={{ margin: 0, fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)' }}>{thread.vendorName}</h4>
                            <span style={{ fontSize: '0.7rem', color: '#94a3b8' }}>{thread.timestamp}</span>
                          </div>
                          <span style={{ fontSize: '0.75rem', color: '#0f766e', display: 'block', margin: '2px 0' }}>{thread.vendorTitle}</span>
                          <p style={{ margin: 0, fontSize: '0.75rem', color: 'var(--text-secondary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{thread.lastMessage}</p>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIAssistant;

