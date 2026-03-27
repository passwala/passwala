import React, { useState, useEffect } from 'react'
import Navbar from './components/Navbar'
import Hero from './components/Hero'
import AIRecommendations from './components/AIRecommendations'
import QuickServices from './components/QuickServices'
import Services from './components/Services'
import Essentials from './components/Essentials'
import NearbyDeals from './components/NearbyDeals'
import Community from './components/Community'
import VendorCTA from './components/VendorCTA'
import SplashScreen from './components/SplashScreen'
import Auth from './components/Auth'
import AdminPanel from './components/AdminPanel'
import Footer from './components/Footer'
import { Toaster, toast } from 'react-hot-toast'
import { MessageCircle, Home, Hammer, ShoppingCart, Users, User } from 'lucide-react'
import './App.css'

import { auth } from './firebase'
import { onAuthStateChanged, signOut } from 'firebase/auth'
import AIAssistant from './components/AIAssistant'
import ProfileModal from './components/ProfileModal'
import { CartProvider } from './context/CartContext'
import CartDrawer from './components/CartDrawer'
import { NotificationProvider } from './context/NotificationContext'
import { SearchProvider } from './context/SearchContext'

function App() {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);
  const [showProfile, setShowProfile] = useState(false);
  const [isAIOpen, setIsAIOpen] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const splashTimer = setTimeout(() => setLoading(false), 2000);
    
    // Listen for auth state changes
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
    });

    return () => {
      clearTimeout(splashTimer);
      unsubscribe();
    };
  }, []);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      toast.success('Signed Out Successfully.');
    } catch (_error) {
      toast.error('Sign Out failed.');
    }
  };

  const handleAdminLogin = () => {
    setIsAdmin(true);
  };

  const handleAdminLogout = () => {
    setIsAdmin(false);
  };

  return (
    <SearchProvider>
    <NotificationProvider>
    <CartProvider user={user}>
    <div className="app-container">
      <Toaster position="bottom-right" />
      {loading ? (
        <SplashScreen />
      ) : isAdmin ? (
        <AdminPanel onLogout={handleAdminLogout} />
      ) : !user ? (
        <Auth onLogin={() => {}} onAdminLogin={handleAdminLogin} />
      ) : (
        <div className="app">
          <Navbar 
            isAuthenticated={!!user}
            user={user}
            onLogout={handleLogout}
            onOpenProfile={() => setShowProfile(true)}
            onOpenAI={() => setIsAIOpen(true)}
          />
          <main>
            <Hero />
            <AIRecommendations />
            <QuickServices />
            <Services />
            <Essentials />
            <NearbyDeals />
            <Community />
            <VendorCTA />
            <AIAssistant isOpen={isAIOpen} onClose={() => setIsAIOpen(false)} onOpen={() => setIsAIOpen(true)} />
            <Footer />
          </main>
          {showProfile && (
            <ProfileModal
              user={user}
              onClose={() => setShowProfile(false)}
              onLogout={handleLogout}
            />
          )}
          <CartDrawer />
        </div>
      )}
    </div>
    </CartProvider>
    </NotificationProvider>
    </SearchProvider>
  )
}

export default App
