/* eslint-disable no-unused-vars, react-refresh/only-export-components */
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
      ai_expert: 'Chat with AI Expert',
      
      // Profile Page Translations
      appearance: 'Appearance',
      dark_mode: 'Dark Mode',
      switch_theme: 'Switch theme style',
      account_activity: 'Account & Activity',
      order_history: 'Order History',
      view_past_bookings: 'View your past bookings',
      passwala_wallet: 'Passwala Wallet',
      manage_credits: 'Manage your credits',
      delivery_address: 'Delivery Address',
      manage_locations: 'Manage your locations',
      data_safety_deletion: 'Data Safety & Deletion',
      manage_data_rights: 'Manage your data rights',
      privacy_security: 'Privacy & Security',
      manage_security: 'Manage your security',
      help_support: 'Help & Support',
      support_24_7: '24/7 support available',
      settings: 'Settings',
      app_preferences: 'App preferences',
      logout_session: 'Logout of your session',
      delete_account_permanently: 'Delete Account Permanently',
      
      // Hub Translations
      verified_pros: 'Verified local pros',
      best_stores: 'Best neighborhood stores',
      city_rides: 'City Rides',
      city_rides_sub: 'Ahmedabad transit',
      event_tickets: 'Event Tickets',
      event_tickets_sub: 'Ahmedabad events',
      join_floor_chat: 'JOIN FLOOR CHAT',
      book_pro: 'BOOK PRO',
      book_now_caps: 'BOOK NOW',
      
      // Near Shops / Experts Translations
      search_shops_items: 'Search shops, items...',
      search_experts_services: 'Search experts, services...',
      all: 'All',
      general_store: 'General Store',
      grocery: 'Grocery',
      vegetables: 'Vegetables',
      dairy: 'Dairy',
      bakery: 'Bakery',
      plumbing: 'Plumbing',
      electrical: 'Electrical',
      ac_service: 'AC Service',
      cleaning: 'Cleaning',
      carpentry: 'Carpentry',
      you_are_here: 'You are here',
      view_services: 'View Services',
      view_catalog: 'View Catalog',
      book_expert: 'Book Expert'
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
      ai_expert: 'एआई विशेषज्ञ से चैट करें',
      
      // Profile Page Translations
      appearance: 'दिखावट',
      dark_mode: 'डार्क मोड',
      switch_theme: 'थीम शैली बदलें',
      account_activity: 'खाता और गतिविधि',
      order_history: 'ऑर्डर इतिहास',
      view_past_bookings: 'अपनी पुरानी बुकिंग देखें',
      passwala_wallet: 'पासवाला वॉलेट',
      manage_credits: 'अपने क्रेडिट प्रबंधित करें',
      delivery_address: 'डिलिवरी का पता',
      manage_locations: 'अपने स्थान प्रबंधित करें',
      data_safety_deletion: 'डेटा सुरक्षा और हटाना',
      manage_data_rights: 'अपने डेटा अधिकारों को प्रबंधित करें',
      privacy_security: 'गोपनीयता और सुरक्षा',
      manage_security: 'अपनी सुरक्षा प्रबंधित करें',
      help_support: 'सहायता और समर्थन',
      support_24_7: '24/7 सहायता उपलब्ध',
      settings: 'सेटिंग्स',
      app_preferences: 'ऐप प्राथमिकताएं',
      logout_session: 'अपने सत्र से लॉगआउट करें',
      delete_account_permanently: 'स्थायी रूप से खाता हटाएं',
      
      // Hub Translations
      verified_pros: 'सत्यापित स्थानीय पेशेवर',
      best_stores: 'सर्वश्रेष्ठ स्थानीय दुकानें',
      city_rides: 'शहर की सवारी',
      city_rides_sub: 'अहमदाबाद परिवहन',
      event_tickets: 'इवेंट टिकट',
      event_tickets_sub: 'अहमदाबाद के कार्यक्रम',
      join_floor_chat: 'चैट में शामिल हों',
      book_pro: 'प्रो बुक करें',
      book_now_caps: 'अभी बुक करें',
      
      // Near Shops / Experts Translations
      search_shops_items: 'दुकानें, सामान खोजें...',
      search_experts_services: 'विशेषज्ञ, सेवाएँ खोजें...',
      all: 'सभी',
      general_store: 'जनरल स्टोर',
      grocery: 'किराना',
      vegetables: 'सब्जियां',
      dairy: 'डेयरी',
      bakery: 'बेकरी',
      plumbing: 'प्लंबिंग',
      electrical: 'इलेक्ट्रिकल',
      ac_service: 'एसी सर्विस',
      cleaning: 'सफाई',
      carpentry: 'बढ़ईगीरी',
      you_are_here: 'आप यहाँ हैं',
      view_services: 'सेवाएँ देखें',
      view_catalog: 'कैटलॉग देखें',
      book_expert: 'विशेषज्ञ बुक करें'
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
      ai_expert: 'AI નિષ્ણાત સાથે ચેટ કરો',
      
      // Profile Page Translations
      appearance: 'દેખાવ',
      dark_mode: 'ડાર્ક મોડ',
      switch_theme: 'થીમ શૈલી બદલો',
      account_activity: 'ખાતું અને પ્રવૃત્તિ',
      order_history: 'ઓર્ડર ઇતિહાસ',
      view_past_bookings: 'તમારી ભૂતકાળની બુકિંગ જુઓ',
      passwala_wallet: 'પાસવાલા વોલેટ',
      manage_credits: 'તમારા ક્રેડિટ મેનેજ કરો',
      delivery_address: 'ડિલિવરી સરનામું',
      manage_locations: 'તમારા સ્થાનો મેનેજ કરો',
      data_safety_deletion: 'ડેટા સુરક્ષા અને કાઢી નાખવું',
      manage_data_rights: 'તમારા ડેટા અધિકારો મેનેજ કરો',
      privacy_security: 'ગોપનીયતા અને સુરક્ષા',
      manage_security: 'તમારી સુરક્ષા મેનેજ કરો',
      help_support: 'મદદ અને સપોર્ટ',
      support_24_7: '24/7 સપોર્ટ ઉપલબ્ધ',
      settings: 'સેટિંગ્સ',
      app_preferences: 'એપ્લિકેશન પસંદગીઓ',
      logout_session: 'તમારા સત્રમાંથી લોગઆઉટ કરો',
      delete_account_permanently: 'કાયમ માટે ખાતું કાઢી નાખો',
      
      // Hub Translations
      verified_pros: 'પ્રમાણિત સ્થાનિક વ્યાવસાયિકો',
      best_stores: 'શ્રેષ્ઠ પડોશી દુકાનો',
      city_rides: 'શહેરની સવારી',
      city_rides_sub: 'અમદાવાદ ટ્રાન્ઝિટ',
      event_tickets: 'ઇવેન્ટ ટિકિટ',
      event_tickets_sub: 'અમદાવાદ કાર્યક્રમો',
      join_floor_chat: 'ચેટમાં જોડાઓ',
      book_pro: 'પ્રો બુક કરો',
      book_now_caps: 'અત્યારે બુક કરો',
      
      // Near Shops / Experts Translations
      search_shops_items: 'દુકાનો, વસ્તુઓ શોધો...',
      search_experts_services: 'નિષ્ણાતો, સેવાઓ શોધો...',
      all: 'બધા',
      general_store: 'જનરલ સ્ટોર',
      grocery: 'કરિયાણું',
      vegetables: 'શાકભાજી',
      dairy: 'ડેરી',
      bakery: 'બેકરી',
      plumbing: 'પ્લમ્બિંગ',
      electrical: 'ઇલેક્ટ્રિકલ',
      ac_service: 'એસી સર્વિસ',
      cleaning: 'સફાઈ',
      carpentry: 'સુથારી કામ',
      you_are_here: 'તમે અહીં છો',
      view_services: 'સેવાઓ જુઓ',
      view_catalog: 'કેટલોગ જુઓ',
      book_expert: 'નિષ્ણાત બુક કરો'
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
      ai_expert: 'AI तज्ज्ञांशी चॅट करा',
      
      // Profile Page Translations
      appearance: 'देखावा',
      dark_mode: 'डार्क मोड',
      switch_theme: 'थीम शैली बदला',
      account_activity: 'खाते आणि क्रियाकलाप',
      order_history: 'ऑर्डर इतिहास',
      view_past_bookings: 'तुमचे मागील बुकिंग पहा',
      passwala_wallet: 'पासवाला वॉलेट',
      manage_credits: 'तुमचे क्रेडिट व्यवस्थापित करा',
      delivery_address: 'वितरणाचा पत्ता',
      manage_locations: 'तुमची ठिकाणे व्यवस्थापित करा',
      data_safety_deletion: 'डेटा सुरक्षा आणि हटवणे',
      manage_data_rights: 'तुमचे डेटा अधिकार व्यवस्थापित करा',
      privacy_security: 'गोपनीयता आणि सुरक्षा',
      manage_security: 'तुमची सुरक्षा व्यवस्थापित करा',
      help_support: 'मदत आणि समर्थन',
      support_24_7: '24/7 समर्थन उपलब्ध',
      settings: 'सेटिंग्ज',
      app_preferences: 'अॅप प्राधान्ये',
      logout_session: 'तुमच्या सत्रातून लॉगआउट करा',
      delete_account_permanently: 'खाते कायमचे हटवा',
      
      // Hub Translations
      verified_pros: 'प्रमाणित स्थानिक व्यावसायिक',
      best_stores: 'सर्वोत्तम शेजारची दुकाने',
      city_rides: 'शहर सवारी',
      city_rides_sub: 'अहमदाबाद ट्रान्झिट',
      event_tickets: 'इव्हेंट तिकिटे',
      event_tickets_sub: 'अहमदाबाद कार्यक्रम',
      join_floor_chat: 'चॅटमध्ये सामील व्हा',
      book_pro: 'प्रो बुक करा',
      book_now_caps: 'आता बुक करा',
      
      // Near Shops / Experts Translations
      search_shops_items: 'दुकाने, वस्तू शोधा...',
      search_experts_services: 'तज्ज्ञ, सेवा शोधा...',
      all: 'सर्व',
      general_store: 'जनरल स्टोअर',
      grocery: 'किराणा',
      vegetables: 'भाज्या',
      dairy: 'डेअरी',
      bakery: 'बेकरी',
      plumbing: 'प्लंबिंग',
      electrical: 'इलेक्ट्रिकल',
      ac_service: 'एसी सर्व्हिस',
      cleaning: 'सफाई',
      carpentry: 'सुतारकाम',
      you_are_here: 'तुम्ही इथे आहात',
      view_services: 'सेवा पहा',
      view_catalog: 'कॅटलॉग पहा',
      book_expert: 'तज्ज्ञ बुक करा'
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
      ai_expert: 'AI நிபுணருடன் அரட்டையடிக்கவும்',
      
      // Profile Page Translations
      appearance: 'தோற்றம்',
      dark_mode: 'இருண்ட பயன்முறை',
      switch_theme: 'தீம் பாணியை மாற்றவும்',
      account_activity: 'கணக்கு & செயல்பாடு',
      order_history: 'ஆர்டர் வரலாறு',
      view_past_bookings: 'உங்கள் கடந்தகால முன்பதிவுகளைப் பார்க்கவும்',
      passwala_wallet: 'பாஸ்வாலா வாலட்',
      manage_credits: 'உங்கள் வரம்புகளை நிர்வகிக்கவும்',
      delivery_address: 'டெலிவரி முகவரி',
      manage_locations: 'உங்கள் இருப்பிடங்களை நிர்வகிக்கவும்',
      data_safety_deletion: 'தரவு பாதுகாப்பு & நீக்கம்',
      manage_data_rights: 'உங்கள் தரவு உரிமைகளை நிர்வகிக்கவும்',
      privacy_security: 'தனியுரிமை & பாதுகாப்பு',
      manage_security: 'உங்கள் பாதுகாப்பை நிர்வகிக்கவும்',
      help_support: 'உதவி & ஆதரவு',
      support_24_7: '24/7 ஆதரவு கிடைக்கும்',
      settings: 'அமைப்புகள்',
      app_preferences: 'பயன்பாட்டு விருப்பத்தேர்வுகள்',
      logout_session: 'உங்கள் அமர்விலிருந்து வெளியேறவும்',
      delete_account_permanently: 'கணக்கை நிரந்தரமாக நீக்கு',
      
      // Hub Translations
      verified_pros: 'சரிபார்க்கப்பட்ட உள்ளூர் வல்லுநர்கள்',
      best_stores: 'சிறந்த அண்டை கடைகள்',
      city_rides: 'நகர சவாரிகள்',
      city_rides_sub: 'அகமதாபாத் போக்குவரத்து',
      event_tickets: 'நிகழ்ச்சி டிக்கெட்டுகள்',
      event_tickets_sub: 'அகமதாபாத் நிகழ்வுகள்',
      join_floor_chat: 'அரட்டையில் இணையுங்கள்',
      book_pro: 'நிபுணரை பதிவு செய்',
      order_now: 'இப்போது ஆர்டர் செய்',
      book_ticket: 'டிக்கெட் முன்பதிவு செய்',
      book_now_caps: 'இப்போது முன்பதிவு செய்',
      
      // Near Shops / Experts Translations
      search_shops_items: 'கடைகள், பொருட்களைத் தேடுங்கள்...',
      search_experts_services: 'நிபுணர்கள், சேவைகளைத் தேடுங்கள்...',
      all: 'அனைத்தும்',
      general_store: 'பொது அங்காடி',
      grocery: 'மளிகை',
      vegetables: 'காய்கறிகள்',
      dairy: 'பால் பண்ணை',
      bakery: 'பேக்கரி',
      plumbing: 'குழாய் வேலை',
      electrical: 'மின்சாரம்',
      ac_service: 'ஏசி சேவை',
      cleaning: 'சுத்தம் செய்தல்',
      carpentry: 'தச்சு வேலை',
      you_are_here: 'நீங்கள் இங்கே இருக்கிறீர்கள்',
      view_services: 'சேவைகளைப் பார்க்கவும்',
      view_catalog: 'பட்டியலைப் பார்க்கவும்',
      book_expert: 'நிபுணரை பதிவு செய்'
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
