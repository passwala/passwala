import React, { useState, useRef, useEffect, useCallback } from 'react';
import { Send, X, MessageSquare, MessageCircle, Bot, User, Loader2, Phone, ShieldCheck, ShoppingBag, Wrench, Ticket, Bike, Check, MapPin, RefreshCw, Camera, Wallet, ArrowRight, Mic, MicOff, Menu, SquarePen, ChevronDown, Sparkles, Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
// eslint-disable-next-line no-unused-vars
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../supabase';
import { auth } from '../../firebase';
import './AIChatWidget.css';

const AIChatWidget = ({ user, onLogin }) => {
  const navigate = useNavigate();
  const [isOpen, setIsOpen] = useState(false);


  useEffect(() => {
    const handleOpenChat = () => setIsOpen(true);
    window.addEventListener('open-passwala-ai-chat', handleOpenChat);
    return () => window.removeEventListener('open-passwala-ai-chat', handleOpenChat);
  }, []);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Namaste! 🙏 Welcome to Passwala. I am your AI assistant. You can log in, buy event passes, or book sports venues directly through me! \n\nPlease enter your 10-digit mobile number to begin: 📱",
      sender: 'ai',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);

  // Chat flow state: 'PHONE' -> 'OTP' -> 'LOCATION_PROMPT' -> 'LOGGED_IN'
  const [chatState, setChatState] = useState('PHONE');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [userSession, setUserSession] = useState(null);

  // Sports slot picker state
  const [pendingVenueSlot, setPendingVenueSlot] = useState(null);
  // { venueId, venueName, sport, selectedDate, slots, selectedSlotIds }

  // Event tier picker state
  const [pendingEventTier, setPendingEventTier] = useState(null);
  // { eventId, eventTitle, tiers, selectedTierId, qty }

  // Voice command states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const pendingVoiceInputRef = useRef(null);
  const [voiceSendTrigger, setVoiceSendTrigger] = useState(0);

  const scrollRef = useRef(null);

  // Real database dynamic stats and user profile states removed as they are unused in the UI

  const fetchRealData = useCallback(async () => {
    try {
      // 1. Resolve user ID and fetch profile/wallet
      let userId = user?.id || userSession?.id;
      if (!userId) {
        const savedUser = localStorage.getItem('passwala_user');
        if (savedUser) {
          try {
            const parsed = JSON.parse(savedUser);
            userId = parsed.id;
          } catch (e) {
            console.warn('Failed to parse saved user in chat widget:', e);
          }
        }
      }
      if (userId) {
        const { data: userData, error: userErr } = await supabase
          .from('users')
          .select('displayName, wallet_balance')
          .eq('id', userId)
          .maybeSingle();
        if (!userErr && userData) {
          // User data fetched successfully
        }
      }

      // Stats database queries removed as they are unused
    } catch (err) {
      console.warn("Failed to fetch real data:", err);
    }
  }, [user, userSession]);

  // Trigger data fetch when widget opens (delayed to prevent animation lag), or when session/login state changes
  useEffect(() => {
    if (isOpen) {
      const timer = setTimeout(() => {
        fetchRealData();
      }, 350); // Delay until the 300ms spring animation finishes completely
      return () => clearTimeout(timer);
    }
  }, [isOpen, chatState, userSession, fetchRealData]);

  // Auto-scroll chat window
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping, isOpen]);

  // Sync state with existing localStorage session if available
  useEffect(() => {
    const savedUser = localStorage.getItem('passwala_user');
    if (savedUser) {
      try {
        const parsed = JSON.parse(savedUser);
        setUserSession(parsed);
        setChatState('LOGGED_IN');
        setMessages([
          {
            id: 1,
            text: `Welcome back, ${parsed.displayName || 'Friend'}! 😊 I see you're logged in. What can I book for you today?\n\n🎫 Events  🏏 Sports Venues`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } catch (e) {
        console.warn('Failed to parse user session:', e);
      }
    }
  }, []);

  // Reset chat assistant when user logs out
  useEffect(() => {
    if (!user) {
      setChatState('PHONE');
      setPhoneNumber('');
      setUserSession(null);
      setMessages([
        {
          id: 1,
          text: "Namaste! 🙏 Welcome to Passwala. I am your AI neighborhood assistant. You can log in, book rides, buy event passes, book sports venues, or order groceries directly through me! \n\nPlease enter your 10-digit mobile number to begin: 📱",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ]);
    } else {
      setUserSession(user);
      setChatState('LOGGED_IN');
    }
  }, [user]);

  // Detect Web Speech API support
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (SpeechRecognition) {
      setSpeechSupported(true);
    }
    // Cleanup on unmount
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.abort();
      }
    };
  }, []);

  // Auto-send voice transcript when recognized
  useEffect(() => {
    if (voiceSendTrigger === 0) return;
    const transcript = pendingVoiceInputRef.current;
    if (!transcript || !transcript.trim()) return;
    pendingVoiceInputRef.current = null;

    const userInput = transcript.trim();
    const lower = userInput.toLowerCase();

    // Direct Voice Navigation Router (Instantly navigates without AI chat message overhead)
    if (lower.includes('event') || lower.includes('ticket') || lower.includes('pass') || lower.includes('concert')) {
      setInput('');
      setIsOpen(false);
      navigate('/events');
      return;
    }
    if (lower.includes('grocery') || lower.includes('groceries') || lower.includes('shop') || lower.includes('store') || lower.includes('market')) {
      setInput('');
      setIsOpen(false);
      navigate('/near-shops');
      return;
    }
    if (lower.includes('service') || lower.includes('expert') || lower.includes('plumber') || lower.includes('electrician') || lower.includes('cleaner') || lower.includes('painter') || lower.includes('carpenter')) {
      setInput('');
      setIsOpen(false);
      navigate('/expert-services');
      return;
    }
    if (lower.includes('ride') || lower.includes('cab') || lower.includes('auto') || lower.includes('taxi') || lower.includes('rickshaw')) {
      setInput('');
      setIsOpen(false);
      navigate('/city-ride');
      return;
    }
    if (lower.includes('profile') || lower.includes('setting') || lower.includes('account')) {
      setInput('');
      setIsOpen(false);
      navigate('/profile');
      return;
    }
    if (lower.includes('wallet') || lower.includes('balance') || lower.includes('recharge')) {
      setInput('');
      setIsOpen(false);
      navigate('/wallet');
      return;
    }
    if (lower.includes('community') || lower.includes('neighbor') || lower.includes('neighbour')) {
      setInput('');
      setIsOpen(false);
      navigate('/neighbors');
      return;
    }
    if (lower.includes('history') || lower.includes('past order') || lower.includes('past booking') || lower.includes('my orders') || lower.includes('my bookings')) {
      setInput('');
      setIsOpen(false);
      navigate('/order-history');
      return;
    }

    // Simulate the send with the voice transcript
    const userMsg = {
      id: Date.now(),
      text: userInput,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
    fetch(`${BASE_API}/api/ai/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        messages: [...messages, userMsg],
        user: userSession
      })
    })
      .then(res => res.json())
      .then(data => {
        if (data && data.text) {
          setMessages(prev => [...prev, {
            id: Date.now() + 2,
            text: data.text,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            card: data.card || null
          }]);
        } else {
          throw new Error('No text from AI');
        }
      })
      .catch(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 5,
          text: "I didn't quite catch that. Could you please try again? 🎙️",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      })
      .finally(() => {
        setIsTyping(false);
      });
  }, [voiceSendTrigger, messages, userSession, navigate]);

  const toggleListening = () => {
    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; 
    recognition.interimResults = true;
    recognition.maxAlternatives = 1;
    recognition.continuous = false;

    recognition.onstart = () => {
      setIsListening(true);
    };

    recognition.onresult = (event) => {
      let interimTranscript = '';
      let finalTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcript = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcript;
        } else {
          interimTranscript += transcript;
        }
      }

      if (interimTranscript) {
        setInput(interimTranscript);
      }

      if (finalTranscript) {
        pendingVoiceInputRef.current = finalTranscript.trim();
        setInput(finalTranscript.trim());
        setVoiceSendTrigger(t => t + 1);
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: '🎙️ Microphone access was denied.',
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    };

    recognition.onend = () => {
      setIsListening(false);
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const getAuthToken = async () => {
    try {
      const currentUser = auth.currentUser;
      if (currentUser) {
        return await currentUser.getIdToken();
      }
    } catch (e) {
      console.warn("Failed to get Firebase ID token:", e);
    }
    const uid = userSession?.uid || userSession?.id || 'mock_user_123';
    return `mock_session_token_${uid}`;
  };

  const handlePhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 2 * 1024 * 1024) {
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: "⚠️ Image too large (Max 2MB)",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
      return;
    }
    setIsTyping(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result;
      try {
        const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const token = await getAuthToken();
        const searchId = userSession?.id || userSession?.phoneNumber || userSession?.email || userSession?.uid;
        const res = await fetch(`${BASE_API}/api/users/${encodeURIComponent(searchId)}/photo`, {
          method: 'PUT',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ photoURL: base64String })
        });
        if (!res.ok) throw new Error('Upload failed');
        const data = await res.json();
        const uploadedPhotoUrl = data.photoURL || base64String;

        const updatedUser = { ...userSession, photoURL: uploadedPhotoUrl };
        localStorage.setItem('passwala_user', JSON.stringify(updatedUser));
        setUserSession(updatedUser);
        window.dispatchEvent(new CustomEvent('update-user-external', { detail: updatedUser }));

        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "📸 Profile photo updated successfully!",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } catch (err) {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "❌ Failed to upload photo.",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } finally {
        setIsTyping(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleSend = async () => {
    if (!input.trim()) return;
    const userInput = input.trim();
    const userMsg = {
      id: Date.now(),
      text: userInput,
      sender: 'user',
      time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const lowerInput = userInput.toLowerCase().trim();
    if (lowerInput === 'log out' || lowerInput === 'logout' || lowerInput === 'sign out' || lowerInput === 'signout') {
      setTimeout(() => {
        localStorage.removeItem('passwala_user');
        localStorage.removeItem('passwala_profile_complete');
        window.dispatchEvent(new CustomEvent('logout-external'));

        setChatState('PHONE');
        setPhoneNumber('');
        setUserSession(null);

        setMessages([
          {
            id: Date.now(),
            text: "Namaste! 🙏 You have been successfully logged out.\n\nTo begin a new session, please enter your 10-digit mobile number: 📱",
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
        setIsTyping(false);
      }, 800);
      return;
    }

    if (chatState === 'LOGGED_IN') {
      const cleanInput = lowerInput.replace(/[.,/#!$%^&*;:{}=\-_`~()?]/g, "").trim();

      if (
        cleanInput.includes('track order') ||
        cleanInput.includes('where is my order') ||
        cleanInput.includes('delivery status')
      ) {
        setTimeout(() => {
          setIsOpen(false);
          navigate('/track-orders');
          setIsTyping(false);
        }, 600);
        return;
      }

      if (
        cleanInput.includes('order history') ||
        cleanInput.includes('my orders') ||
        cleanInput.includes('my bookings')
      ) {
        setTimeout(() => {
          setIsOpen(false);
          navigate('/order-history');
          setIsTyping(false);
        }, 600);
        return;
      }

      if (
        cleanInput === 'ride' ||
        cleanInput === 'cab' ||
        cleanInput.includes('book a ride') ||
        cleanInput.includes('city ride')
      ) {
        setTimeout(() => {
          setIsOpen(false);
          navigate('/city-ride');
          setIsTyping(false);
        }, 600);
        return;
      }

      if (
        cleanInput === 'grocery' ||
        cleanInput === 'groceries' ||
        cleanInput.includes('near shops')
      ) {
        setTimeout(() => {
          setIsOpen(false);
          navigate('/near-shops');
          setIsTyping(false);
        }, 600);
        return;
      }

      if (
        cleanInput.includes('book local pro') ||
        cleanInput.includes('expert services') ||
        cleanInput.includes('home services')
      ) {
        setTimeout(() => {
          setIsOpen(false);
          navigate('/expert-services');
          setIsTyping(false);
        }, 600);
        return;
      }
    }

    try {
      if (chatState === 'PHONE') {
        const cleanPhone = userInput.replace(/\D/g, '');
        if (cleanPhone.length !== 10) {
          setTimeout(() => {
            setMessages(prev => [...prev, {
              id: Date.now() + 1,
              text: "⚠️ Please enter a valid 10-digit mobile number.",
              sender: 'ai',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }]);
            setIsTyping(false);
          }, 600);
          return;
        }

        setPhoneNumber(cleanPhone);

        const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const res = await fetch(`${BASE_API}/api/users/send-whatsapp-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: cleanPhone })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          setChatState('OTP');
          let devAlert = '';
          if (data.provider === 'mock' && data.otp) {
            devAlert = `\n\n🧪 [Dev Mode Auto-Fill]: Your OTP is ${data.otp}`;
          }
          setMessages(prev => [...prev, {
            id: Date.now() + 2,
            text: `🔑 I've sent a 6-digit OTP code to +91 ${cleanPhone} via WhatsApp.${devAlert}\n\nPlease enter the code here to complete your login:`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now() + 2,
            text: `❌ Failed to send OTP: ${data.error || 'Please try again.'}`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsTyping(false);

      } else if (chatState === 'OTP') {
        const cleanDigits = userInput.replace(/\D/g, '');
        if (cleanDigits.length !== 6) {
          setMessages(prev => [...prev, {
            id: Date.now() + 1,
            text: "⚠️ OTP must be a 6-digit verification code.",
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          setIsTyping(false);
          return;
        }
        const otpCode = cleanDigits;

        const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const res = await fetch(`${BASE_API}/api/users/verify-whatsapp-otp`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ phone: phoneNumber, otp: otpCode, role: 'BUYER' })
        });
        const data = await res.json();

        if (res.ok && data.success) {
          const userData = {
            id: data.user.id,
            uid: data.user.uid,
            displayName: data.user.displayName || 'Passwala User',
            phoneNumber: `+91${phoneNumber}`,
            email: data.user.email || null,
            photoURL: data.user.photoURL || null,
            role: 'buyer'
          };

          localStorage.setItem('passwala_user', JSON.stringify(userData));
          setUserSession(userData);
          setChatState('LOCATION_PROMPT');

          setMessages(prev => [...prev, {
            id: Date.now() + 2,
            text: `🎉 Identity Verified! Namaste ${userData.displayName}.\n\nTo help you find neighborhood shops and book local rides, please allow location access. Click the button below to share your current location:`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showLocationButtons: true
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now() + 2,
            text: `❌ Invalid OTP: ${data.error || 'Verification failed.'}`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showResendButton: true
          }]);
        }
        setIsTyping(false);

      } else if (chatState === 'LOCATION_PROMPT') {
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          text: "📍 Please use the **Allow Location Access** button above to share your location, or tap **Skip**.",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        if (userInput.length > 2) {
          setTimeout(() => {
            saveFinalizedLocation(userInput, { lat: 23.0225, lng: 72.5714 });
          }, 800);
        } else {
          setIsTyping(false);
        }
      } else {
        const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
        const res = await fetch(`${BASE_API}/api/ai/chat`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            messages: [...messages, userMsg],
            user: userSession
          })
        });
        const data = await res.json();

        if (res.ok && data.text) {
          setMessages(prev => [...prev, {
            id: Date.now() + 2,
            text: data.text,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            card: data.card || null
          }]);
        } else {
          throw new Error('No text response');
        }
        setIsTyping(false);
      }
    } catch (err) {
      console.warn('AI chat error:', err);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 5,
          text: "❌ Network error. Please try again.",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsTyping(false);
      }, 1000);
    }
  };

  const handleResendOtp = async () => {
    setIsTyping(true);
    try {
      const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const res = await fetch(`${BASE_API}/api/users/send-whatsapp-otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ phone: phoneNumber })
      });
      const data = await res.json();

      if (res.ok && data.success) {
        setMessages(prev => {
          const cleaned = prev.map(m => m.showResendButton ? { ...m, showResendButton: false } : m);
          return [
            ...cleaned,
            {
              id: Date.now(),
              text: `🔑 A fresh OTP code has been successfully sent to +91 ${phoneNumber} via WhatsApp.`,
              sender: 'ai',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
        });
      } else {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `❌ Failed to resend OTP.`,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          showResendButton: true
        }]);
      }
    } catch (err) {
      console.warn("Failed to resend OTP:", err);
    } finally {
      setIsTyping(false);
    }
  };

  const handleShareLocation = () => {
    setIsTyping(true);
    if (!navigator || !navigator.geolocation) {
      fallbackToIPLocation();
      return;
    }

    navigator.geolocation.getCurrentPosition(
      async (position) => {
        try {
          const { latitude, longitude } = position.coords;
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          const area = data.address?.suburb || 'My Location';
          const city = data.address?.city || 'Ahmedabad';
          const fullAddress = `${area}, ${city}`;

          saveFinalizedLocation(fullAddress, { lat: latitude, lng: longitude });
        } catch (err) {
          fallbackToIPLocation();
        }
      },
      () => fallbackToIPLocation(),
      { timeout: 8000 }
    );
  };

  const fallbackToIPLocation = async () => {
    try {
      const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const res = await fetch(`${BASE_API}/api/ip-location`);
      const data = await res.json();
      if (res.ok && data.cityName) {
        const fullAddress = `${data.cityName}, Gujarat`;
        saveFinalizedLocation(fullAddress, { lat: parseFloat(data.latitude) || 23.0305, lng: parseFloat(data.longitude) || 72.5075 });
      } else {
        throw new Error();
      }
    } catch (e) {
      saveFinalizedLocation('Ahmedabad', { lat: 23.0305, lng: 72.5075 });
    }
  };

  const saveFinalizedLocation = async (addressName, coords) => {
    localStorage.setItem('passwala_location', addressName);
    localStorage.setItem('passwala_coords', JSON.stringify(coords));
    localStorage.setItem('passwala_profile_complete', 'true');

    const defaultAddr = {
      address_line_1: addressName,
      city: 'Ahmedabad',
      state: 'Gujarat',
      is_default: true
    };
    localStorage.setItem('passwala_user_address', JSON.stringify(defaultAddr));

    if (userSession?.id && supabase) {
      try {
        await supabase.from('addresses').insert([{
          user_id: userSession.id,
          address_line_1: addressName,
          city: 'Ahmedabad',
          is_default: true,
          lat: coords.lat,
          lng: coords.lng
        }]);
      } catch (err) {
        console.warn("Failed to persist address:", err);
      }
    }

    setChatState('LOGGED_IN');
    setIsTyping(false);

    setMessages(prev => {
      const cleared = prev.map(m => m.showLocationButtons ? { ...m, showLocationButtons: false } : m);
      return [
        ...cleared,
        {
          id: Date.now(),
          text: `📍 Location successfully set: "${addressName}". You're all set!`,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    });

    if (onLogin && userSession) {
      onLogin(userSession);
    }

    setTimeout(() => {
      setIsOpen(false);
      navigate('/');
    }, 1500);
  };

  const handleSkipLocation = () => {
    saveFinalizedLocation('Ahmedabad', { lat: 23.0305, lng: 72.5075 });
  };

  const handleCardAction = async (actionType, cardData) => {
    setIsTyping(true);
    try {
      const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      let res;
      let payload = { userId: userSession?.id || userSession?.uid };

      if (actionType === 'BOOK_RIDE') {
        res = await fetch(`${BASE_API}/api/city-rides/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: payload.userId,
            ...cardData
          })
        });
      } else if (actionType === 'BOOK_EVENT') {
        res = await fetch(`${BASE_API}/api/events/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userSession?.id || null,
            ...cardData
          })
        });
      } else if (actionType === 'SHOW_VENUE_SLOTS') {
        const dateStr = cardData.selectedDate || new Date().toISOString().split('T')[0];
        const slotsRes = await fetch(`${BASE_API}/api/ai/sports-slots`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ venueId: cardData.venueId, date: dateStr, sport: cardData.sport || 'all' })
        });
        const slotsData = await slotsRes.json();
        const updatedCardData = { ...cardData, selectedDate: dateStr, slots: slotsData.slots || [] };
        setPendingVenueSlot(updatedCardData);
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `📊 Available slots:`,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          card: { type: 'sports_slot_picker', ...updatedCardData }
        }]);
        setIsTyping(false);
        return;
      } else if (actionType === 'BOOK_SPORT') {
        res = await fetch(`${BASE_API}/api/sports/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            user_id: userSession?.id,
            venue_id: cardData.venueId || cardData.venue_id,
            slot_ids: cardData.slotIds || cardData.slot_ids || [],
            sport_type: cardData.sport || cardData.sport_type,
            user_phone: userSession?.phone || userSession?.phoneNumber || '',
            user_name: userSession?.displayName || userSession?.name || 'AI Chat User',
            user_email: userSession?.email || ''
          })
        });
        if (res.ok) setPendingVenueSlot(null);
      } else if (actionType === 'ORDER_PRODUCT') {
        window.dispatchEvent(new CustomEvent('add-to-cart-external', { detail: cardData }));
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `Added to cart! 🛍️`,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsTyping(false);
        return;
      }

      await res.json();
      setMessages(prev => [...prev, {
        id: Date.now(),
        text: res.ok ? "✅ Booking confirmed!" : "❌ Booking failed.",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "❌ Network error.",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
      {(user || isOpen) && (
        <button
          className="ai-chat-toggle-btn shadow-lg"
          onClick={() => setIsOpen(!isOpen)}
          style={{
            position: 'fixed',
            bottom: '24px',
            right: '24px',
            zIndex: 9999,
            width: '60px',
            height: '60px',
            borderRadius: '50%',
            backgroundColor: '#ff6b00',
            border: 'none',
            color: '#ffffff',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            boxShadow: '0 8px 30px rgba(255, 107, 0, 0.4)',
            transition: 'transform 0.2s ease'
          }}
        >
          {isOpen ? (
            <X size={26} />
          ) : (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <MessageCircle size={26} />
              <Sparkles size={12} style={{ position: 'absolute', top: -4, right: -4, color: '#fef08a' }} />
            </div>
          )}
        </button>
      )}

      <AnimatePresence>
        {isOpen && (
          <motion.div
            className="ai-chat-widget-window glass shadow-2xl"
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0 }}
            transition={{ type: 'spring', damping: 26, stiffness: 210 }}
            style={{ transformOrigin: 'calc(100% - 54px) calc(100% - 54px)' }}
          >
            {/* ── Main Chat Panel ── */}
            <div className="chat-main-panel">
              <div className="chat-main-header">
                <div className="header-title-dropdown">
                  <span>Passwala Shopping Agent</span>
                </div>
                <div className="header-actions-right">
                  <button className="close-chat-btn" onClick={() => setIsOpen(false)}>
                    <X size={20} />
                  </button>
                </div>
              </div>

              {messages.length <= 1 ? (
                /* ── ChatGPT Centered Landing Screen (Start State) ── */
                <div className="chat-landing-container">
                  <div className="chat-landing-content-split">

                    {/* Left Column: AI Command Console */}
                    <div className="chat-landing-left-column">
                      <h1 className="chat-landing-title">Where should we begin?</h1>

                      <div className="chat-input-wrapper-chatgpt">
                        <input
                          type={chatState === 'PHONE' || chatState === 'OTP' ? 'tel' : 'text'}
                          maxLength={chatState === 'PHONE' ? 10 : chatState === 'OTP' ? 6 : undefined}
                          className="chatgpt-style-input"
                          placeholder={
                            chatState === 'PHONE' ? "Enter your mobile number to start..." :
                              chatState === 'OTP' ? "Enter the 6-digit verification code..." :
                                chatState === 'LOCATION_PROMPT' ? "Click below to allow location..." :
                                  isListening ? "Listening..." :
                                    "Ask anything..."
                          }
                          value={input}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (chatState === 'PHONE' || chatState === 'OTP') {
                              val = val.replace(/\D/g, '');
                            }
                            setInput(val);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />

                        <div className="input-actions-right">
                          {speechSupported && chatState === 'LOGGED_IN' && (
                            <button
                              onClick={toggleListening}
                              className={`input-action-btn-circle ${isListening ? 'active' : ''}`}
                              title={isListening ? 'Stop listening' : 'Voice command'}
                            >
                              <Mic size={16} />
                            </button>
                          )}
                          <button
                            disabled={!input.trim()}
                            onClick={handleSend}
                            className="send-msg-btn-filled"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>

                      {/* Shortcut Pills / Verification Actions */}
                      {chatState === 'LOCATION_PROMPT' && (
                        <div style={{ marginTop: '24px', display: 'flex', gap: '12px' }}>
                          <button
                            onClick={handleShareLocation}
                            style={{
                              display: 'flex', alignItems: 'center', gap: '6px',
                              background: '#ff6b00', color: 'white', padding: '12px 24px',
                              borderRadius: '100px', border: 'none', fontWeight: '700',
                              fontSize: '0.9rem', cursor: 'pointer', boxShadow: '0 4px 15px rgba(255,107,0,0.2)'
                            }}
                          >
                            <MapPin size={16} /> Allow Location Access
                          </button>
                          <button
                            onClick={handleSkipLocation}
                            style={{
                              background: '#f4f4f4', color: '#4d4d4d', padding: '12px 24px',
                              borderRadius: '100px', border: '1px solid #e5e5e5',
                              fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer'
                            }}
                          >
                            Skip
                          </button>
                        </div>
                      )}
                    </div>

                  </div>
                </div>
              ) : (
                /* ── Standard Chat Message List View (Active State) ── */
                <>
                  <div className="ai-widget-messages" ref={scrollRef}>
                    <div className="messages-inner-centered">
                      {messages.map((msg) => (
                        <div key={msg.id} className={`widget-msg-row ${msg.sender}`}>
                          {msg.sender === 'ai' ? (
                            <div className="ai-avatar-circle">
                              <Bot size={16} color="white" />
                            </div>
                          ) : (
                            user?.photoURL || userSession?.photoURL ? (
                              <img
                                src={user?.photoURL || userSession?.photoURL}
                                alt="Profile"
                                className="user-avatar-circle-msg"
                                style={{
                                  width: '32px',
                                  height: '32px',
                                  borderRadius: '50%',
                                  objectFit: 'cover',
                                  display: 'block',
                                  border: '1px solid #ff6b00',
                                  padding: 0
                                }}
                              />
                            ) : (
                              <div className="user-avatar-circle-msg">
                                {userSession?.displayName ? userSession.displayName.substring(0, 2).toUpperCase() : 'KD'}
                              </div>
                            )
                          )}
                          <div className="widget-msg-bubble">
                            <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>
                              {msg.text && msg.text.includes('See your booking in Order History ➜') ? (
                                <>
                                  {msg.text.split('See your booking in Order History ➜')[0]}
                                  <span
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate('/order-history');
                                    }}
                                    style={{ color: '#ff6b00', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}
                                  >
                                    See your booking in Order History ➜
                                  </span>
                                  {msg.text.split('See your booking in Order History ➜')[1]}
                                </>
                              ) : msg.text && msg.text.includes("profile's History page") ? (
                                <>
                                  {msg.text.split("profile's History page")[0]}
                                  <span
                                    onClick={() => {
                                      setIsOpen(false);
                                      navigate('/order-history');
                                    }}
                                    style={{ color: '#ff6b00', fontWeight: 'bold', textDecoration: 'underline', cursor: 'pointer' }}
                                  >
                                    profile's History page
                                  </span>
                                  {msg.text.split("profile's History page")[1]}
                                </>
                              ) : msg.text}
                            </p>

                            {msg.showResendButton && (
                              <div style={{ marginTop: '10px' }}>
                                <button
                                  onClick={handleResendOtp}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '6px',
                                    background: 'var(--bg-card)',
                                    color: '#ff6b00',
                                    border: '1px solid #ff6b00',
                                    borderRadius: '8px',
                                    padding: '8px 12px',
                                    fontWeight: '700',
                                    fontSize: '0.78rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                  }}
                                  onMouseOver={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ff6b00';
                                    e.currentTarget.style.color = '#ffffff';
                                  }}
                                  onMouseOut={(e) => {
                                    e.currentTarget.style.backgroundColor = '#ffffff';
                                    e.currentTarget.style.color = '#ff6b00';
                                  }}
                                >
                                  <RefreshCw size={14} /> Resend Verification Code
                                </button>
                              </div>
                            )}

                            {msg.showLocationButtons && (
                              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                <button
                                  onClick={handleShareLocation}
                                  style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    gap: '6px',
                                    background: '#ff6b00',
                                    color: '#ffffff',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '10px 14px',
                                    fontWeight: '700',
                                    fontSize: '0.82rem',
                                    cursor: 'pointer',
                                    boxShadow: '0 4px 12px rgba(255, 107, 0, 0.2)'
                                  }}
                                >
                                  <MapPin size={16} /> Allow Location Access
                                </button>
                                <button
                                  onClick={handleSkipLocation}
                                  style={{
                                    background: 'var(--bg-surface)',
                                    color: 'var(--text-secondary)',
                                    border: '1px solid #e2e8f0',
                                    borderRadius: '10px',
                                    padding: '8px 12px',
                                    fontWeight: '600',
                                    fontSize: '0.78rem',
                                    cursor: 'pointer'
                                  }}
                                >
                                  Skip / Set Default Location
                                </button>
                              </div>
                            )}

                            {msg.card && msg.card.type === 'products_list' ? (
                              <div className="widget-products-list-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                                {msg.card.items.map((item, idx) => (
                                  <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'var(--bg-surface)', border: '1px solid rgba(255, 107, 0, 0.15)', borderRadius: '12px', padding: '10px 14px' }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                                      <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>{item.name}</span>
                                      <span style={{ fontSize: '0.8rem', color: '#ff6b00', fontWeight: '800' }}>₹{item.price}</span>
                                    </div>
                                    <button
                                      onClick={() => handleCardAction('ORDER_PRODUCT', item)}
                                      style={{ background: '#ff6b00', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                      onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e05e00'}
                                      onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff6b00'}
                                    >
                                      + Add
                                    </button>
                                  </div>
                                ))}
                              </div>

                            ) : msg.card && msg.card.type === 'sports_venues_list' ? (
                              /* ── Sports Venues List Card ── */
                              <div className="ai-venues-grid" style={{ marginTop: '12px' }}>
                                {msg.card.items.map((venue, idx) => (
                                  <div key={idx} className="ai-venue-card">
                                    {venue.image && (
                                      <img src={venue.image} alt={venue.name} className="ai-venue-img" onError={(e) => { e.target.style.display = 'none'; }} />
                                    )}
                                    <div className="ai-venue-info">
                                      <div className="ai-venue-name">{venue.name}</div>
                                      <div className="ai-venue-addr">📍 {venue.address}</div>
                                      <div className="ai-venue-sports">
                                        {(venue.sports || []).slice(0, 3).map((s, si) => (
                                          <span key={si} className="ai-sport-badge">{s.emoji} {s.label}</span>
                                        ))}
                                      </div>
                                      <div className="ai-venue-meta">
                                        {venue.rating && <span className="ai-venue-rating">⭐ {venue.rating}</span>}
                                        {venue.minPrice && <span className="ai-venue-price">₹{venue.minPrice}/hr</span>}
                                      </div>
                                    </div>
                                    <button
                                      className="ai-check-slots-btn"
                                      onClick={() => handleCardAction('SHOW_VENUE_SLOTS', {
                                        venueId: venue.venueId,
                                        venueName: venue.name,
                                        sport: venue.detectedSport || 'all'
                                      })}
                                    >
                                      📅 Check Slots
                                    </button>
                                  </div>
                                ))}
                              </div>

                            ) : msg.card && msg.card.type === 'sports_slot_picker' ? (
                              /* ── Sports Slot Picker Card ── */
                              (() => {
                                const slotCard = msg.card;
                                const localState = pendingVenueSlot && pendingVenueSlot.venueId === slotCard.venueId ? pendingVenueSlot : { selectedDate: slotCard.selectedDate, slots: slotCard.slots || [], selectedSlotIds: [], sport: slotCard.sport, venueId: slotCard.venueId, venueName: slotCard.venueName, bookingDuration: 1 };
                                const isLatest = msg.id === messages[messages.length - 1]?.id || messages.slice(-3).some(m => m.id === msg.id && m.card?.type === 'sports_slot_picker');

                                // Consecutive slots combination helper
                                const getCombinedSlots = (targetSlots, duration) => {
                                  if (!duration || duration === 1) return targetSlots;
                                  const result = [];
                                  const sorted = [...targetSlots].sort((a, b) => a.slot_time.localeCompare(b.slot_time));
                                  for (let i = 0; i <= sorted.length - duration; i++) {
                                    let isContiguousAvailable = true;
                                    const group = [];
                                    for (let j = 0; j < duration; j++) {
                                      const currentSlot = sorted[i + j];
                                      if (currentSlot.status !== 'available') {
                                        isContiguousAvailable = false;
                                        break;
                                      }
                                      if (j > 0) {
                                        const prevSlot = group[j - 1];
                                        const prevEnd = prevSlot.slot_end_time.slice(0, 5);
                                        const currStart = currentSlot.slot_time.slice(0, 5);
                                        if (prevEnd !== currStart) {
                                          isContiguousAvailable = false;
                                          break;
                                        }
                                      }
                                      group.push(currentSlot);
                                    }
                                    if (isContiguousAvailable) {
                                      const first = group[0];
                                      const last = group[group.length - 1];
                                      const totalPrice = group.reduce((sum, s) => sum + (s.price || 0), 0);
                                      result.push({
                                        id: `virtual_${first.id}_to_${last.id}`,
                                        slot_time: first.slot_time,
                                        slot_end_time: last.slot_end_time,
                                        price: totalPrice,
                                        status: 'available',
                                        slot_date: first.slot_date,
                                        slots: group
                                      });
                                    }
                                  }
                                  return result;
                                };

                                const displaySlots = getCombinedSlots(localState.slots || [], localState.bookingDuration || 1);

                                // Generate next 7 days
                                const next7 = [];
                                for (let i = 0; i < 7; i++) {
                                  const d = new Date(); d.setDate(d.getDate() + i);
                                  next7.push({ dateStr: d.toISOString().split('T')[0], label: i === 0 ? 'Today' : d.toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric', month: 'short' }) });
                                }
                                const formatT = (t) => { if (!t) return ''; const [h, m] = t.split(':'); let hr = parseInt(h); const ap = hr >= 12 ? 'PM' : 'AM'; hr = hr % 12 || 12; return `${hr}${parseInt(m) ? ':' + m : ''} ${ap}`; };
                                return (
                                  <div className="ai-slot-picker-wrap">
                                    {/* Date Strip */}
                                    <div className="ai-date-strip">
                                      {next7.map(d => (
                                        <button
                                          key={d.dateStr}
                                          className={`ai-date-chip ${localState.selectedDate === d.dateStr ? 'active' : ''}`}
                                          onClick={async () => {
                                            if (!isLatest) return;
                                            setIsTyping(true);
                                            const BASE_API2 = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
                                            const r = await fetch(`${BASE_API2}/api/ai/sports-slots`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ venueId: localState.venueId, date: d.dateStr, sport: localState.sport }) });
                                            const rd = await r.json();
                                            setPendingVenueSlot(prev => ({ ...prev, selectedDate: d.dateStr, slots: rd.slots || [], selectedSlotIds: [], bookingDuration: prev?.bookingDuration || 1 }));
                                            setIsTyping(false);
                                          }}
                                        >{d.label}</button>
                                      ))}
                                    </div>

                                    {/* Duration Selector */}
                                    <div className="ai-duration-selector" style={{ display: 'flex', gap: '8px', padding: '0 16px 8px', overflowX: 'auto', borderBottom: '1px solid #f1f5f9', marginBottom: '10px' }}>
                                      <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', alignSelf: 'center', fontWeight: 600, marginRight: '4px' }}>Duration:</span>
                                      {[1, 2, 3, 4].map(dur => (
                                        <button
                                          key={dur}
                                          className={`ai-duration-chip ${localState.bookingDuration === dur ? 'active' : ''}`}
                                          style={{
                                            padding: '5px 12px',
                                            borderRadius: '20px',
                                            border: '1px solid',
                                            borderColor: localState.bookingDuration === dur ? '#ff6b00' : '#e2e8f0',
                                            backgroundColor: localState.bookingDuration === dur ? '#fffaf0' : '#ffffff',
                                            color: localState.bookingDuration === dur ? '#ff6b00' : '#64748b',
                                            fontSize: '0.78rem',
                                            fontWeight: 700,
                                            cursor: 'pointer',
                                            whiteSpace: 'nowrap',
                                            transition: 'all 0.2s'
                                          }}
                                          onClick={() => {
                                            if (!isLatest) return;
                                            setPendingVenueSlot(prev => {
                                              const currentPrev = prev || { selectedDate: slotCard.selectedDate, slots: slotCard.slots || [], selectedSlotIds: [], sport: slotCard.sport, venueId: slotCard.venueId, venueName: slotCard.venueName };
                                              return { ...currentPrev, bookingDuration: dur, selectedSlotIds: [] };
                                            });
                                          }}
                                        >
                                          {dur} {dur === 1 ? 'Hr' : 'Hrs'}
                                        </button>
                                      ))}
                                    </div>

                                    {/* Slot Grid */}
                                    {displaySlots.length === 0 ? (
                                      <p className="ai-no-slots">❌ No slots available for this duration.</p>
                                    ) : (
                                      <div className="ai-slot-grid">
                                        {displaySlots.map((slot, si) => {
                                          const isSelected = (localState.bookingDuration || 1) === 1
                                            ? (localState.selectedSlotIds || []).includes(slot.id)
                                            : slot.slots && slot.slots.every(s => (localState.selectedSlotIds || []).includes(s.id));
                                          const isBooked = slot.status !== 'available';
                                          return (
                                            <button
                                              key={si}
                                              className={`ai-slot-chip ${isBooked ? 'booked' : isSelected ? 'selected' : 'available'}`}
                                              disabled={isBooked || !isLatest}
                                              onClick={() => {
                                                if (!isLatest || isBooked) return;
                                                if ((localState.bookingDuration || 1) === 1) {
                                                  setPendingVenueSlot(prev => {
                                                    const currentPrev = prev || { selectedDate: slotCard.selectedDate, slots: slotCard.slots || [], selectedSlotIds: [], sport: slotCard.sport, venueId: slotCard.venueId, venueName: slotCard.venueName };
                                                    const ids = currentPrev.selectedSlotIds || [];
                                                    const newIds = ids.includes(slot.id) ? ids.filter(x => x !== slot.id) : [...ids, slot.id];
                                                    return { ...currentPrev, selectedSlotIds: newIds };
                                                  });
                                                } else {
                                                  const subSlotIds = (slot.slots || []).map(s => s.id);
                                                  setPendingVenueSlot(prev => {
                                                    const currentPrev = prev || { selectedDate: slotCard.selectedDate, slots: slotCard.slots || [], selectedSlotIds: [], sport: slotCard.sport, venueId: slotCard.venueId, venueName: slotCard.venueName };
                                                    const ids = currentPrev.selectedSlotIds || [];
                                                    const allSelected = subSlotIds.every(id => ids.includes(id));
                                                    const newIds = allSelected ? ids.filter(id => !subSlotIds.includes(id)) : subSlotIds;
                                                    return { ...currentPrev, selectedSlotIds: newIds };
                                                  });
                                                }
                                              }}
                                            >
                                              <span className="ai-slot-time">{formatT(slot.slot_time)}</span>
                                              <span className="ai-slot-end">-{formatT(slot.slot_end_time)}</span>
                                              <span className="ai-slot-price">₹{slot.price}</span>
                                              {isBooked && <span className="ai-slot-status-label">Booked</span>}
                                              {isSelected && <span className="ai-slot-check">✔</span>}
                                            </button>
                                          );
                                        })}
                                      </div>
                                    )}
                                    {/* Book CTA */}
                                    {isLatest && (localState.selectedSlotIds || []).length > 0 && (
                                      <button
                                        className="ai-book-slots-cta"
                                        onClick={() => {
                                          if (!localState.selectedSlotIds?.length) return;
                                          const sortedSlots = (localState.slots || []).filter(s => (localState.selectedSlotIds || []).includes(s.id)).sort((a, b) => a.slot_time.localeCompare(b.slot_time));
                                          const first = sortedSlots[0]; const last = sortedSlots[sortedSlots.length - 1];
                                          const formatT2 = (t) => { if (!t) return ''; const [h, m] = t.split(':'); let hr = parseInt(h); const ap = hr >= 12 ? 'PM' : 'AM'; hr = hr % 12 || 12; return `${hr}${parseInt(m) ? ':' + m : ''} ${ap}`; };
                                          const timeRange = `${formatT2(first?.slot_time)} – ${formatT2(last?.slot_end_time)}`;
                                          handleCardAction('BOOK_SPORT', { venueId: localState.venueId, venueName: localState.venueName, sport: localState.sport, slotIds: localState.selectedSlotIds, selectedDate: localState.selectedDate, timeRange });
                                        }}
                                      >
                                        ⚡ Book {(localState.selectedSlotIds || []).length} Slot{(localState.selectedSlotIds || []).length > 1 ? 's' : ''} →
                                      </button>
                                    )}
                                  </div>
                                );
                              })()

                            ) : msg.card && msg.card.type === 'events_list' ? (
                              /* ── Events List Card (enhanced) ── */
                              <div className="widget-events-list-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                                {msg.card.items.map((item, idx) => (
                                  <div key={idx} className="ai-event-card">
                                    {item.image && (
                                      <img src={item.image} alt={item.title} className="ai-event-img" onError={(e) => { e.target.style.display = 'none'; }} />
                                    )}
                                    <div className="ai-event-info">
                                      <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '4px' }}>
                                        {item.category && <span className="ai-event-cat-badge">{item.category}</span>}
                                        {item.dateLabel && <span className="ai-event-date-badge">📅 {item.dateLabel}</span>}
                                      </div>
                                      <div className="ai-event-title">{item.title}</div>
                                      <div className="ai-event-venue">📍 {item.venue}</div>
                                      <div className="ai-event-price-row">
                                        <span className="ai-event-price">from ₹{item.price}</span>
                                        <button
                                          className="ai-view-tickets-btn"
                                          onClick={() => handleCardAction('SHOW_EVENT_TIERS', { eventId: item.eventId, eventTitle: item.title })}
                                        >
                                          🎫 View Tickets
                                        </button>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>

                            ) : msg.card && msg.card.type === 'event_tier_picker' ? (
                              /* ── Event Tier Picker Card ── */
                              (() => {
                                const tierCard = msg.card;
                                const localTierState = pendingEventTier && pendingEventTier.eventId === tierCard.eventId ? pendingEventTier : { eventId: tierCard.eventId, eventTitle: tierCard.eventTitle, tiers: tierCard.tiers || [], selectedTierId: tierCard.tiers?.[0]?.id, qty: 1 };
                                const isLatest = msg.id === messages[messages.length - 1]?.id || messages.slice(-3).some(m => m.id === msg.id && m.card?.type === 'event_tier_picker');
                                const selectedTier = (localTierState.tiers || []).find(t => t.id === localTierState.selectedTierId);
                                return (
                                  <div className="ai-tier-picker-wrap">
                                    {(localTierState.tiers || []).map((tier, ti) => (
                                      <div
                                        key={ti}
                                        className={`ai-tier-row ${localTierState.selectedTierId === tier.id ? 'selected' : ''}`}
                                        onClick={() => isLatest && setPendingEventTier(prev => prev ? { ...prev, selectedTierId: tier.id } : prev)}
                                      >
                                        <div className="ai-tier-info">
                                          <span className="ai-tier-name">{tier.name}</span>
                                          {tier.availableSeats != null && <span className="ai-tier-seats">{tier.availableSeats} left</span>}
                                        </div>
                                        <span className="ai-tier-price">₹{tier.price}</span>
                                        {localTierState.selectedTierId === tier.id && <span className="ai-tier-check">✔</span>}
                                      </div>
                                    ))}
                                    {/* Qty Stepper */}
                                    {isLatest && (
                                      <div className="ai-qty-row">
                                        <span className="ai-qty-label">Qty:</span>
                                        <button className="ai-qty-btn" onClick={() => setPendingEventTier(prev => prev ? { ...prev, qty: Math.max(1, (prev.qty || 1) - 1) } : prev)}>-</button>
                                        <span className="ai-qty-val">{localTierState.qty || 1}</span>
                                        <button className="ai-qty-btn" onClick={() => setPendingEventTier(prev => prev ? { ...prev, qty: Math.min(10, (prev.qty || 1) + 1) } : prev)}>+</button>
                                        <button
                                          className="ai-confirm-tier-btn"
                                          disabled={!localTierState.selectedTierId}
                                          onClick={() => {
                                            if (!localTierState.selectedTierId) return;
                                            handleCardAction('BOOK_EVENT', {
                                              eventId: localTierState.eventId,
                                              tierId: localTierState.selectedTierId,
                                              ticketCount: localTierState.qty || 1
                                            });
                                            setPendingEventTier(null);
                                          }}
                                        >
                                          ⚡ Confirm {localTierState.qty || 1} Ticket{(localTierState.qty || 1) > 1 ? 's' : ''} →
                                        </button>
                                      </div>
                                    )}
                                    {selectedTier && (
                                      <div className="ai-tier-total">Total: ₹{(selectedTier.price * (localTierState.qty || 1)).toLocaleString('en-IN')}</div>
                                    )}
                                  </div>
                                );
                              })()

                            ) : msg.card && msg.card.type === 'bookings_list' ? (
                              /* ── Bookings List Card for Cancellation ── */
                              <div className="widget-bookings-list-card" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '12px' }}>
                                {msg.card.items.map((item, idx) => (
                                  <div key={idx} style={{ background: 'var(--bg-surface)', border: '1px solid #e2e8f0', borderRadius: '12px', padding: '12px', display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                    <div style={{ fontWeight: 800, fontSize: '0.9rem', color: '#0f172a' }}>{item.title}</div>
                                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)', lineHeight: '1.4' }}>{item.details}</div>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '4px' }}>
                                      <span style={{ fontSize: '0.85rem', fontWeight: 800, color: '#ff6b00' }}>₹{item.price}</span>
                                      <button
                                        style={{ margin: 0, padding: '6px 14px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 700, background: '#ef4444', color: 'white', border: 'none', cursor: 'pointer', width: 'auto', display: 'inline-flex', alignItems: 'center', justifyContent: 'center' }}
                                        onClick={() => handleCardAction(item.action, item.data)}
                                      >
                                        ❌ Cancel
                                      </button>
                                    </div>
                                  </div>
                                ))}
                              </div>

                            ) : msg.card && (
                              <div className="widget-action-card">
                                <div className="card-header-icon">
                                  {msg.card.type === 'ride' && <Bike size={20} color="#ff6b00" />}
                                  {msg.card.type === 'event' && <Ticket size={20} color="#ff6b00" />}
                                  {msg.card.type === 'service' && <Wrench size={20} color="#ff6b00" />}
                                  {msg.card.type === 'product' && <ShoppingBag size={20} color="#ff6b00" />}
                                  {msg.card.type === 'wallet' && <Wallet size={20} color="#ff6b00" />}
                                  {msg.card.type === 'navigation' && <ArrowRight size={20} color="#ff6b00" />}
                                  {msg.card.type === 'setting_change' && <Check size={20} color="#ff6b00" />}
                                  <span>{msg.card.title}</span>
                                </div>
                                <div className="card-body-details">
                                  {msg.card.price > 0 && <p><strong>Price:</strong> ₹{msg.card.price}</p>}
                                  {msg.card.details && <p className="card-desc">{msg.card.details}</p>}
                                </div>
                                <div className="card-actions-row">
                                  {msg.card.action === 'UPDATE_PHOTO' ? (
                                    <>
                                      <input
                                        type="file"
                                        id="chat-photo-upload"
                                        accept="image/*"
                                        style={{ display: 'none' }}
                                        onChange={handlePhotoUpload}
                                      />
                                      <button
                                        className="card-confirm-btn"
                                        onClick={() => document.getElementById('chat-photo-upload').click()}
                                      >
                                        <Camera size={16} /> Upload Photo
                                      </button>
                                    </>
                                  ) : msg.card.action === 'NAVIGATE' ? (
                                    <button
                                      className="card-confirm-btn"
                                      onClick={() => handleCardAction(msg.card.action, msg.card.data)}
                                    >
                                      <ArrowRight size={16} /> Go Now
                                    </button>
                                  ) : (
                                    <button
                                      className="card-confirm-btn"
                                      onClick={() => handleCardAction(msg.card.action, msg.card.data)}
                                    >
                                      <Check size={16} /> Confirm
                                    </button>
                                  )}
                                </div>
                              </div>
                            )}

                            <span className="widget-msg-time">{msg.time}</span>
                          </div>
                        </div>
                      ))}
                      {isTyping && (
                        <div className="widget-msg-row ai">
                          <div className="ai-avatar-circle">
                            <Bot size={16} color="white" />
                          </div>
                          <div className="widget-msg-bubble typing">
                            <Loader2 size={16} className="animate-spin" />
                            <span>Thinking...</span>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Sleek ChatGPT bottom input bar (Active State) */}
                  <div className="active-chat-input-bar-container">
                    <div className="active-input-inner">
                      <div className="chat-input-wrapper-chatgpt">
                        <input
                          type={chatState === 'PHONE' || chatState === 'OTP' ? 'tel' : 'text'}
                          maxLength={chatState === 'PHONE' ? 10 : chatState === 'OTP' ? 6 : undefined}
                          className="chatgpt-style-input"
                          placeholder={
                            chatState === 'PHONE' ? "Enter your mobile number..." :
                              chatState === 'OTP' ? "Enter the 6-digit OTP..." :
                                chatState === 'LOCATION_PROMPT' ? "Use the buttons above to share location..." :
                                  isListening ? "🎙️ Listening... speak now" :
                                    "Ask AI or tap 🎙️ to speak..."
                          }
                          value={input}
                          onChange={(e) => {
                            let val = e.target.value;
                            if (chatState === 'PHONE' || chatState === 'OTP') {
                              val = val.replace(/\D/g, '');
                            }
                            setInput(val);
                          }}
                          onKeyPress={(e) => e.key === 'Enter' && handleSend()}
                        />

                        <div className="input-actions-right">
                          {speechSupported && chatState === 'LOGGED_IN' && (
                            <button
                              onClick={toggleListening}
                              className={`input-action-btn-circle ${isListening ? 'active' : ''}`}
                              title={isListening ? 'Stop listening' : 'Voice command'}
                            >
                              <Mic size={16} />
                            </button>
                          )}
                          <button
                            disabled={!input.trim()}
                            onClick={handleSend}
                            className="send-msg-btn-filled"
                          >
                            <Send size={16} />
                          </button>
                        </div>
                      </div>
                    </div>
                    <div className="active-input-disclaimer">
                      Passwala Shopping Agent can make mistakes. Consider checking important info.
                    </div>
                  </div>
                </>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;

