import React, { useState, useRef, useEffect } from 'react';
import { Send, X, MessageSquare, Bot, User, Loader2, Phone, ShieldCheck, ShoppingBag, Wrench, Ticket, Bike, Check, MapPin, RefreshCw, Camera, Wallet, ArrowRight, Mic, MicOff } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AnimatePresence, motion } from 'framer-motion';
import { supabase } from '../../supabase';
import { useTranslation } from '../LanguageContext';
import { auth } from '../../firebase';
import { useCart } from '../../context/CartContext';
import './AIChatWidget.css';

const AIChatWidget = ({ user, onLogin }) => {
  const { changeLanguage } = useTranslation();
  const navigate = useNavigate();
  const { clearCart } = useCart();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([
    {
      id: 1,
      text: "Namaste! 🙏 Welcome to Passwala. I am your AI neighborhood assistant. You can log in, book rides, order groceries, or book local home services directly through me! \n\nPlease enter your 10-digit mobile number to begin: 📱",
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

  // Voice command states
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const recognitionRef = useRef(null);
  const pendingVoiceInputRef = useRef(null);
  const [voiceSendTrigger, setVoiceSendTrigger] = useState(0);
  
  const scrollRef = useRef(null);

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
            text: `Welcome back, ${parsed.displayName || 'Friend'}! 😊 I see you're logged in. What can I book for you today? (Rides 🛵, Services 🛠️, Event Passes 🎫, or Groceries 🛍️)`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }
        ]);
      } catch (e) {
        // ignore
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
          text: "Namaste! 🙏 Welcome to Passwala. I am your AI neighborhood assistant. You can log in, book rides, order groceries, or book local home services directly through me! \n\nPlease enter your 10-digit mobile number to begin: 📱",
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

    // Simulate the send with the voice transcript
    const userInput = transcript.trim();
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [voiceSendTrigger]);

  const toggleListening = () => {
    if (isListening) {
      // Stop listening
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) return;

    const recognition = new SpeechRecognition();
    recognition.lang = 'en-IN'; // Indian English for better accuracy
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

      // Show interim results in input as preview
      if (interimTranscript) {
        setInput(interimTranscript);
      }

      // When final result arrives, store in ref and trigger send
      if (finalTranscript) {
        pendingVoiceInputRef.current = finalTranscript.trim();
        setInput(finalTranscript.trim());
        setVoiceSendTrigger(t => t + 1); // trigger the send effect
      }
    };

    recognition.onerror = (event) => {
      console.warn('Speech recognition error:', event.error);
      setIsListening(false);
      if (event.error === 'not-allowed') {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: '🎙️ Microphone access was denied. Please allow microphone permission in your browser settings.',
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else if (event.error === 'no-speech') {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: '🎙️ No speech detected. Please try again.',
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
          text: "❌ Failed to upload photo. Please try again.",
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
            displayName: data.user.displayName || data.user.full_name || 'Passwala User',
            phoneNumber: `+91${phoneNumber}`,
            email: data.user.email || null,
            photoURL: data.user.photoURL || data.user.photo_url || null,
            authProvider: 'phone',
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
            text: `❌ Invalid OTP: ${data.error || 'Verification failed. Please check the code and try again.'}`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
            showResendButton: true
          }]);
        }
        setIsTyping(false);

      } else if (chatState === 'LOCATION_PROMPT') {
        // User typed during location prompt — guide them to use the buttons
        setMessages(prev => [...prev, {
          id: Date.now() + 2,
          text: "📍 Please use the **Allow Location Access** button above to share your location, or tap **Skip** to use the default. You can also type your city name (e.g. \"Ahmedabad\") and I'll set it for you!",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);

        // If they typed a city name, use it as their location
        if (userInput.length > 2 && /^[a-zA-Z\s,]+$/.test(userInput)) {
          setTimeout(() => {
            saveFinalizedLocation(userInput, { lat: 23.0225, lng: 72.5714 });
          }, 800);
        } else {
          setIsTyping(false);
        }
      } else {
        // Logged-in conversational assistant route

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
          throw new Error('No text response from AI route');
        }
        setIsTyping(false);
      }
    } catch (err) {
      console.warn('⚠️ AI chat processing failed:', err);
      setTimeout(() => {
        setMessages(prev => [...prev, {
          id: Date.now() + 5,
          text: "I didn't quite catch that. Would you like me to book a Ride 🛵, buy Event Passes 🎫, book Home Services 🛠️, or order Groceries 🛍️?",
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
        let devAlert = '';
        if (data.provider === 'mock' && data.otp) {
          devAlert = `\n\n🧪 [Dev Mode Auto-Fill]: Your OTP is ${data.otp}`;
        }
        setMessages(prev => {
          const cleaned = prev.map(m => m.showResendButton ? { ...m, showResendButton: false } : m);
          return [
            ...cleaned,
            {
              id: Date.now(),
              text: `🔑 A fresh 6-digit OTP code has been successfully sent to +91 ${phoneNumber} via WhatsApp.${devAlert}\n\nPlease enter the new code below:`,
              sender: 'ai',
              time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
            }
          ];
        });
      } else {
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `❌ Failed to resend OTP: ${data.error || 'Please try again.'}`,
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
          const area = data.address?.suburb || data.address?.neighbourhood || data.address?.city || data.address?.town || 'Ahmedabad Location';
          const city = data.address?.city || data.address?.town || data.address?.state_district || 'Ahmedabad';
          const fullAddress = `${area}, ${city}`;

          saveFinalizedLocation(fullAddress, { lat: latitude, lng: longitude });
        } catch (err) {
          console.warn("OSM reverse geocoding failed, trying fallback:", err);
          fallbackToIPLocation();
        }
      },
      (error) => {
        console.warn("Geolocation access denied:", error);
        fallbackToIPLocation();
      },
      { timeout: 8000 }
    );
  };

  const fallbackToIPLocation = async () => {
    try {
      const BASE_API = import.meta.env.VITE_API_URL || (window.location.protocol === 'https:' ? '' : `http://${window.location.hostname}:3004`);
      const res = await fetch(`${BASE_API}/api/ip-location`);
      const data = await res.json();
      if (res.ok && data.cityName) {
        const fullAddress = `${data.cityName}, ${data.regionName || 'Gujarat'}`;
        saveFinalizedLocation(fullAddress, { lat: parseFloat(data.latitude) || 23.0305, lng: parseFloat(data.longitude) || 72.5075 });
      } else {
        throw new Error('IP lookup failed');
      }
    } catch (e) {
      saveFinalizedLocation('Satellite, Ahmedabad', { lat: 23.0305, lng: 72.5075 });
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
      pincode: '380015',
      society: addressName.split(',')[0],
      house_no: 'Home',
      floor: 'Ground',
      is_default: true
    };
    localStorage.setItem('passwala_user_address', JSON.stringify(defaultAddr));

    if (userSession?.id && supabase) {
      try {
        await supabase.from('addresses').insert([{
          user_id: userSession.id,
          address_line_1: addressName,
          city: 'Ahmedabad',
          state: 'Gujarat',
          pincode: '380015',
          is_default: true,
          lat: coords.lat,
          lng: coords.lng
        }]);
      } catch (err) {
        console.warn("Failed to persist address to DB:", err);
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
          text: `📍 Location successfully allowed & saved:\n"${addressName}"\n\nYou're all set! What would you like to book or order today?`,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }
      ];
    });

    if (onLogin && userSession) {
      onLogin(userSession);
    }
  };

  const handleSkipLocation = () => {
    saveFinalizedLocation('Satellite, Ahmedabad', { lat: 23.0305, lng: 72.5075 });
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
            vehicleId: cardData.vehicleId || 'any_mock_vehicle',
            pickupLat: cardData.pickupLat || 23.0305,
            pickupLng: cardData.pickupLng || 72.5075,
            dropLat: cardData.dropLat || 23.0372,
            dropLng: cardData.dropLng || 72.5273,
            seatCount: 1,
            totalPrice: cardData.price || 40,
            pickupArea: cardData.pickupArea || 'Satellite',
            dropArea: cardData.dropArea || 'Vastrapur'
          })
        });
      } else if (actionType === 'CANCEL_RIDE') {
        res = await fetch(`${BASE_API}/api/city-rides/cancel`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            bookingId: cardData.bookingId,
            userId: cardData.userId
          })
        });
      } else if (actionType === 'BOOK_EVENT') {
        // Build a rich user identity payload so backend can resolve user ID via any available identifier
        const rawPhone = userSession?.phoneNumber?.replace(/\D/g, '').slice(-10) || '';

        // Guard: ensure tierId exists before attempting booking
        if (!cardData.tierId) {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: "⚠️ This event has no ticket tiers configured yet. Please book directly from the Events page.",
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
          setIsTyping(false);
          return;
        }

        res = await fetch(`${BASE_API}/api/events/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: userSession?.id || null,
            userUid: userSession?.uid || null,
            userPhone: rawPhone || null,
            userEmail: userSession?.email || null,
            eventId: cardData.eventId,
            tierId: cardData.tierId,
            ticketCount: cardData.ticketCount || 1
          })
        });
      } else if (actionType === 'BOOK_SERVICE') {
        const token = await getAuthToken();
        res = await fetch(`${BASE_API}/api/orders/book-service`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            serviceId: cardData.serviceId,
            providerId: cardData.providerId,
            price: cardData.price,
            userId: userSession?.id || userSession?.uid || null
          })
        });
      } else if (actionType === 'UPDATE_NAME') {
        const token = await getAuthToken();
        const searchId = userSession?.id || userSession?.phoneNumber || userSession?.email || userSession?.uid;
        res = await fetch(`${BASE_API}/api/users/${encodeURIComponent(searchId)}/name`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ displayName: cardData.name })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const updatedUser = { ...userSession, displayName: cardData.name };
          localStorage.setItem('passwala_user', JSON.stringify(updatedUser));
          setUserSession(updatedUser);
          window.dispatchEvent(new CustomEvent('update-user-external', { detail: updatedUser }));
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `👤 Display name successfully updated to **${cardData.name}**!`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `❌ Failed to update name: ${data.error || 'Please try again.'}`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsTyping(false);
        return;
      } else if (actionType === 'UPDATE_EMAIL') {
        const token = await getAuthToken();
        const searchId = userSession?.id || userSession?.phoneNumber || userSession?.email || userSession?.uid;
        res = await fetch(`${BASE_API}/api/users/${encodeURIComponent(searchId)}/email`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ email: cardData.email })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const updatedUser = { ...userSession, email: cardData.email };
          localStorage.setItem('passwala_user', JSON.stringify(updatedUser));
          setUserSession(updatedUser);
          window.dispatchEvent(new CustomEvent('update-user-external', { detail: updatedUser }));
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `📧 Email successfully updated to **${cardData.email}**!`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `❌ Failed to update email: ${data.error || 'Please try again.'}`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsTyping(false);
        return;
      } else if (actionType === 'UPDATE_PHONE') {
        const token = await getAuthToken();
        const searchId = userSession?.id || userSession?.phoneNumber || userSession?.email || userSession?.uid;
        res = await fetch(`${BASE_API}/api/users/${encodeURIComponent(searchId)}/phone`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ phone: cardData.phone })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const updatedUser = { ...userSession, phoneNumber: `+91${cardData.phone}` };
          localStorage.setItem('passwala_user', JSON.stringify(updatedUser));
          setUserSession(updatedUser);
          window.dispatchEvent(new CustomEvent('update-user-external', { detail: updatedUser }));
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `📱 Phone number successfully updated to **+91 ${cardData.phone}**!`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `❌ Failed to update phone number: ${data.error || 'Please try again.'}`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsTyping(false);
        return;
      } else if (actionType === 'UPDATE_ADDRESS') {
        const token = await getAuthToken();
        const searchId = userSession?.id || userSession?.phoneNumber || userSession?.email || userSession?.uid;
        res = await fetch(`${BASE_API}/api/users/${encodeURIComponent(searchId)}/address`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ address: cardData.address })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          localStorage.setItem('passwala_location', cardData.address);
          const defaultAddr = {
            address_line_1: cardData.address,
            city: 'Ahmedabad',
            state: 'Gujarat',
            pincode: '380015',
            society: cardData.address.split(',')[0],
            house_no: 'Home',
            floor: 'Ground',
            is_default: true
          };
          localStorage.setItem('passwala_user_address', JSON.stringify(defaultAddr));
          window.dispatchEvent(new CustomEvent('update-location-external', {
            detail: {
              locationName: cardData.address,
              address: defaultAddr
            }
          }));
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `📍 Default address successfully updated to **"${cardData.address}"**!`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `❌ Failed to update address: ${data.error || 'Please try again.'}`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsTyping(false);
        return;
      } else if (actionType === 'RECHARGE_WALLET') {
        const token = await getAuthToken();
        const searchId = userSession?.id || userSession?.phoneNumber || userSession?.email || userSession?.uid;
        res = await fetch(`${BASE_API}/api/users/${encodeURIComponent(searchId)}/wallet`, {
          method: 'PUT',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ amount: cardData.amount, action: 'RECHARGE' })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          const updatedUser = { ...userSession, wallet_balance: data.balance };
          localStorage.setItem('passwala_user', JSON.stringify(updatedUser));
          setUserSession(updatedUser);
          window.dispatchEvent(new CustomEvent('update-user-external', { detail: updatedUser }));
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `💰 Recharge successful! Your new Passwala Wallet balance is **₹${data.balance.toFixed(2)}**!`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `❌ Recharge failed: ${data.error || 'Please try again.'}`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsTyping(false);
        return;
      } else if (actionType === 'LOGOUT') {
        window.dispatchEvent(new CustomEvent('logout-external'));
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "👋 You have been logged out successfully! Have a great day.",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsTyping(false);
        return;
      } else if (actionType === 'TOGGLE_THEME') {
        window.dispatchEvent(new CustomEvent('toggle-theme-external'));
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: "🎨 Theme settings updated successfully!",
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsTyping(false);
        return;
      } else if (actionType === 'CHANGE_LANGUAGE') {
        if (cardData.lang) {
          changeLanguage(cardData.lang);
        }
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `🌐 Language updated to ${cardData.langName || 'selected preference'}!`,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
        setIsTyping(false);
        return;
      } else if (actionType === 'ORDER_PRODUCT') {
        window.dispatchEvent(new CustomEvent('add-to-cart-external', {
          detail: {
            id: cardData.productId,
            name: cardData.name,
            price: cardData.price,
            image: cardData.image || null,
            type: 'product',
            qty: cardData.quantity || 1,
            store_id: cardData.storeId
          }
        }));
        
        setMessages(prev => [...prev, {
          id: Date.now(),
          text: `Added ${cardData.name} (Qty: ${cardData.quantity || 1}) to your cart! 🛍️ Would you like to confirm and place this order directly from the assistant?`,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
          card: {
            type: 'product',
            title: `Place Order`,
            price: cardData.price * (cardData.quantity || 1),
            details: `Confirm purchase of ${cardData.name} (Qty: ${cardData.quantity || 1})`,
            action: 'PLACE_ORDER',
            data: {
              items: [{
                productId: cardData.productId,
                price: cardData.price,
                quantity: cardData.quantity || 1,
                store_id: cardData.storeId
              }],
              totalPrice: cardData.price * (cardData.quantity || 1)
            }
          }
        }]);
        setIsTyping(false);
        return;
      } else if (actionType === 'PLACE_ORDER') {
        const token = await getAuthToken();
        res = await fetch(`${BASE_API}/api/orders/place`, {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({
            items: cardData.items,
            totalPrice: cardData.totalPrice,
            userId: userSession?.id || userSession?.uid || null
          })
        });
        const data = await res.json();
        if (res.ok && data.success) {
          clearCart();
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `🎉 Order placed successfully! Order Reference: #${data.order.id.substring(0,8).toUpperCase()}. Your neighborhood delivery agent has been notified.`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        } else {
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `❌ Order failed: ${data.error || 'Please try placing from the cart drawer.'}`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsTyping(false);
        return;
      } else if (actionType === 'NAVIGATE') {
        if (cardData && cardData.path) {
          navigate(cardData.path);
          setMessages(prev => [...prev, {
            id: Date.now(),
            text: `Redirecting you to the ${cardData.pageName || 'requested'} page... 🚀`,
            sender: 'ai',
            time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
          }]);
        }
        setIsTyping(false);
        return;
      }

      const data = await res.json();
      if (res.ok && (data.success || data.booking || data.order)) {
        const textMsg = actionType === 'CANCEL_RIDE'
          ? "✅ Ride booking cancelled successfully. Your ticket has been voided."
          : `✅ Booking confirmed successfully! Pass ID/Reference: ${data.booking?.qr_code_hash || data.order?.id || 'PW-CONFIRMED'}. You can track it in your profile's History page.`;

        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: textMsg,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      } else {
        setMessages(prev => [...prev, {
          id: Date.now() + 1,
          text: `❌ Booking failed: ${data.error || 'Internal system error. Please try conventional booking.'}`,
          sender: 'ai',
          time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
        }]);
      }
    } catch (e) {
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        text: "❌ Network error booking your request. Please try again.",
        sender: 'ai',
        time: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }]);
    } finally {
      setIsTyping(false);
    }
  };

  return (
    <>
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
        {isOpen ? <X size={26} /> : <MessageSquare size={26} />}
      </button>

      <AnimatePresence>
        {isOpen && (
          <motion.div 
            className="ai-chat-widget-window glass shadow-2xl"
            initial={{ opacity: 0, y: 50, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.9 }}
            transition={{ duration: 0.2 }}
          >
            <div className="ai-widget-header">
              <div className="header-brand">
                <div className="brand-logo-glow">
                  <Bot size={22} color="white" />
                </div>
                <div>
                  <h3>Passwala AI Assistant</h3>
                  <span className="online-badge">Online • Smart Concierge</span>
                </div>
              </div>
              <button className="close-widget" onClick={() => setIsOpen(false)}>
                <X size={20} />
              </button>
            </div>

            <div className="ai-widget-messages" ref={scrollRef}>
              {messages.map((msg) => (
                <div key={msg.id} className={`widget-msg-row ${msg.sender}`}>
                  {msg.sender === 'ai' && (
                    <div className="ai-avatar-circle">
                      <Bot size={14} color="white" />
                    </div>
                  )}
                  <div className="widget-msg-bubble">
                    <p style={{ whiteSpace: 'pre-wrap', margin: 0 }}>{msg.text}</p>
                    
                    {msg.showResendButton && (
                      <div style={{ marginTop: '10px' }}>
                        <button 
                          onClick={handleResendOtp}
                          style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            background: '#ffffff',
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
                            background: '#f1f5f9',
                            color: '#475569',
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
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid rgba(255, 107, 0, 0.15)', borderRadius: '12px', padding: '10px 14px' }}>
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
                    ) : msg.card && msg.card.type === 'events_list' ? (
                      <div className="widget-events-list-card" style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginTop: '12px' }}>
                        {msg.card.items.map((item, idx) => (
                          <div key={idx} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', border: '1px solid rgba(255, 107, 0, 0.15)', borderRadius: '12px', padding: '10px 14px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', textAlign: 'left' }}>
                              <span style={{ fontWeight: '700', fontSize: '0.85rem', color: '#0f172a' }}>{item.title}</span>
                              <span style={{ fontSize: '0.72rem', color: '#64748b' }}>{item.venue}</span>
                              <span style={{ fontSize: '0.8rem', color: '#ff6b00', fontWeight: '800', marginTop: '2px' }}>₹{item.price}</span>
                            </div>
                            <button 
                              onClick={() => handleCardAction('BOOK_EVENT', item)}
                              style={{ background: '#ff6b00', border: 'none', color: 'white', padding: '6px 12px', borderRadius: '8px', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', transition: 'background-color 0.2s' }}
                              onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#e05e00'}
                              onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#ff6b00'}
                            >
                              Book
                            </button>
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
                    <Bot size={14} color="white" />
                  </div>
                  <div className="widget-msg-bubble typing">
                    <Loader2 size={16} className="animate-spin" />
                    <span>Thinking...</span>
                  </div>
                </div>
              )}
            </div>

            <div className="ai-widget-input-bar">
              <input 
                type={chatState === 'PHONE' || chatState === 'OTP' ? 'tel' : 'text'}
                maxLength={chatState === 'PHONE' ? 10 : chatState === 'OTP' ? 6 : undefined}
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
              {speechSupported && chatState === 'LOGGED_IN' && (
                <button
                  onClick={toggleListening}
                  className={`mic-widget-btn${isListening ? ' listening' : ''}`}
                  title={isListening ? 'Stop listening' : 'Speak a command'}
                  style={{
                    background: isListening ? '#ef4444' : 'transparent',
                    color: isListening ? '#ffffff' : '#94a3b8',
                    border: isListening ? 'none' : '1px solid #e2e8f0',
                    borderRadius: '50%',
                    width: '36px',
                    height: '36px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    marginRight: '4px',
                    flexShrink: 0,
                    transition: 'all 0.2s ease',
                    boxShadow: isListening ? '0 0 0 4px rgba(239, 68, 68, 0.2)' : 'none',
                    animation: isListening ? 'mic-pulse 1.2s ease-in-out infinite' : 'none'
                  }}
                >
                  {isListening ? <MicOff size={16} /> : <Mic size={16} />}
                </button>
              )}
              <button disabled={!input.trim()} onClick={handleSend} className="send-widget-msg">
                <Send size={18} />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default AIChatWidget;
