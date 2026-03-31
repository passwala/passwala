import React, { createContext, useContext, useState, useEffect } from 'react';

const LanguageContext = createContext();

export const languages = {
  en: {
    name: 'English',
    dir: 'ltr',
    translations: {
      welcome: 'Welcome to Passwala',
      tagline: 'Your Trusted Neighborhood Hub',
      near_shops: 'Near Shops',
      expert_services: 'Local Experts',
      community: 'Community',
      essentials: 'Daily Essentials',
      search_placeholder: 'Search for shops or services...',
      add_to_cart: 'Add to Cart',
      book_now: 'Book Now',
      checkout: 'Checkout',
      cart_empty: 'Your cart is empty',
      savings: 'You saved',
      vendor_mode: 'Switch to Vendor Mode',
      profile: 'Profile',
      logout: 'Sign Out',
      location: 'Current Location',
      change_location: 'Change Location',
      trust_badge: 'Trusted by {n} neighbors',
      new_order: 'New Order',
      total: 'Total',
      items: 'Items',
      ai_expert: 'Chat with AI Expert'
    }
  },
  hi: {
    name: 'हिंदी',
    dir: 'ltr',
    translations: {
      welcome: 'पासवाला में आपका स्वागत है',
      tagline: 'आपका भरोसेमंद पड़ोसी केंद्र',
      near_shops: 'पास की दुकानें',
      expert_services: 'स्थानीय विशेषज्ञ',
      community: 'समुदाय',
      essentials: 'दैनिक आवश्यकताएं',
      search_placeholder: 'दुकानें या सेवाएँ खोजें...',
      add_to_cart: 'कार्ट में जोड़ें',
      book_now: 'अभी बुक करें',
      checkout: 'चेकआउट',
      cart_empty: 'आपकी कार्ट खाली है',
      savings: 'आपने बचाए',
      vendor_mode: 'विक्रेता मोड पर स्विच करें',
      profile: 'प्रोफ़ाइल',
      logout: 'साइन आउट',
      location: 'वर्तमान स्थान',
      change_location: 'स्थान बदलें',
      trust_badge: '{n} पड़ोसियों का भरोसा',
      new_order: 'नया ऑर्डर',
      total: 'कुल',
      items: 'वस्तुएं',
      ai_expert: 'एआई विशेषज्ञ से चैट करें'
    }
  },
  gu: {
    name: 'ગુજરાતી',
    dir: 'ltr',
    translations: {
      welcome: 'પાસવાલામાં તમારું સ્વાગત છે',
      tagline: 'તમારા વિશ્વાસુ પડોશી હબ',
      near_shops: 'નજીકની દુકાનો',
      expert_services: 'સ્થાનિક નિષ્ણાતો',
      community: 'સમુદાય',
      essentials: 'દૈનિક જરૂરિયાતો',
      search_placeholder: 'દુકાનો કે સેવાઓ શોધો...',
      add_to_cart: 'કાર્ટમાં ઉમેરો',
      book_now: 'અત્યારે બુક કરો',
      checkout: 'ચેકઆઉટ',
      cart_empty: 'તમારી કાર્ટ ખાલી છે',
      savings: 'તમે બચાવ્યા',
      vendor_mode: 'વેન્ડર મોડ પર સ્વિચ કરો',
      profile: 'પ્રોફાઇલ',
      logout: 'સાઇન આઉટ',
      location: 'વર્તમાન સ્થાન',
      change_location: 'સ્થાન બદલો',
      trust_badge: '{n} પડોશીઓ દ્વારા વિશ્વાસ',
      new_order: 'નવો ઓર્ડર',
      total: 'કુલ',
      items: 'વસ્તુઓ',
      ai_expert: 'AI નિષ્ણાત સાથે ચેટ કરો'
    }
  },
  mr: {
    name: 'मराठी',
    dir: 'ltr',
    translations: {
      welcome: 'पासवाला मध्ये आपले स्वागत आहे',
      tagline: 'तुमचे विश्वसनीय शेजारी केंद्र',
      near_shops: 'जवळपासची दुकाने',
      expert_services: 'स्थानिक तज्ज्ञ',
      community: 'समुदाय',
      essentials: 'दैनंदिन गरजा',
      search_placeholder: 'दुकाने किंवा सेवा शोधा...',
      add_to_cart: 'कार्टमध्ये जोडा',
      book_now: 'आता बुक करा',
      checkout: 'चेकआउट',
      cart_empty: 'तुमची कार्ट रिकामी आहे',
      savings: 'तुम्ही वाचवले',
      vendor_mode: 'विक्रेता मोडवर स्विच करा',
      profile: 'प्रोफाइल',
      logout: 'साइन आउट',
      location: 'वर्तमान स्थान',
      change_location: 'स्थान बदला',
      trust_badge: '{n} शेजार्‍यांचा विश्वास',
      new_order: 'नवीन ऑर्डर',
      total: 'एकूण',
      items: 'वस्तू',
      ai_expert: 'AI तज्ज्ञांशी चॅट करा'
    }
  },
  ta: {
    name: 'தமிழ்',
    dir: 'ltr',
    translations: {
      welcome: 'பாஸ்வாலாவிற்கு வரவேற்கிறோம்',
      tagline: 'உங்கள் நம்பகமான அண்டை மையம்',
      near_shops: 'அருகிலுள்ள கடைகள்',
      expert_services: 'உள்ளூர் நிபுணர்கள்',
      community: 'சமூகம்',
      essentials: 'தினசரி தேவைகள்',
      search_placeholder: 'கடைகள் அல்லது சேவைகளைத் தேடுங்கள்...',
      add_to_cart: 'கார்ட்டில் சேர்',
      book_now: 'இப்போது முன்பதிவு செய்',
      checkout: 'செக் அவுட்',
      cart_empty: 'உங்கள் கார்ட் காலியாக உள்ளது',
      savings: 'நீங்கள் சேமித்தது',
      vendor_mode: 'விற்பனையாளர் பயன்முறைக்கு மாறவும்',
      profile: 'சுயவிவரம்',
      logout: 'வெளியேறு',
      location: 'தற்போதைய இடம்',
      change_location: 'இருப்பிடத்தை மாற்றவும்',
      trust_badge: '{n} அண்டை வீட்டார்களால் நம்பப்படுகிறது',
      new_order: 'புதிய ஆர்டர்',
      total: 'மொத்தம்',
      items: 'பொருட்கள்',
      ai_expert: 'AI நிபுணருடன் அரட்டையடிக்கவும்'
    }
  }
};

export const LanguageProvider = ({ children }) => {
  const [currentLanguage, setCurrentLanguage] = useState(() => {
    return localStorage.getItem('passwala_lang') || 'en';
  });

  const t = (key) => {
    return languages[currentLanguage].translations[key] || languages.en.translations[key] || key;
  };

  const changeLanguage = (lang) => {
    if (languages[lang]) {
      setCurrentLanguage(lang);
      localStorage.setItem('passwala_lang', lang);
    }
  };

  return (
    <LanguageContext.Provider value={{ currentLanguage, changeLanguage, t, languages }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const useTranslation = () => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useTranslation must be used within a LanguageProvider');
  }
  return context;
};
