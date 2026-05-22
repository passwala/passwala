import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const CartContext = createContext();

export const CartProvider = ({ children, user }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState(null);

  // Load cart from Supabase or localStorage on login/mount
  useEffect(() => {
    const userId = user?.id || user?.uid;
    setError(null);

    // Load local storage fallback first as immediate state
    const localKey = userId ? `passwala_cart_${userId}` : 'passwala_cart_guest';
    const localCart = localStorage.getItem(localKey);
    let parsedLocal = [];
    try {
      if (localCart) parsedLocal = JSON.parse(localCart);
    } catch (e) {
      console.warn('Failed to parse local cart:', e);
    }

    if (userId) {
      const loadCart = async () => {
        if (!supabase) {
          setCartItems(parsedLocal);
          setIsLoaded(true);
          return;
        }
        try {
          const { data, error: sbError } = await supabase
            .from('carts')
            .select('items')
            .eq('user_id', userId)
            .single();

          if (sbError) {
            // PGRST116 means no row found, PGRST205 means table not found in schema cache
            if (sbError.code === 'PGRST116') {
              // User has no saved cart yet, use local cart if available
              if (parsedLocal.length > 0) setCartItems(parsedLocal);
            } else if (sbError.code === 'PGRST205' || sbError.message?.includes('schema cache')) {
              console.warn('carts table not found in Supabase schema cache, falling back to localStorage');
              setCartItems(parsedLocal);
            } else {
              console.warn('Failed to load cart from Supabase:', sbError);
              // For other database/auth errors, we still show the local cart so they can transact
              setCartItems(parsedLocal);
              setError('Failed to sync your cart with cloud, using local backup.');
            }
          } else if (data?.items) {
            setCartItems(data.items);
          } else {
            setCartItems(parsedLocal);
          }
        } catch (err) {
          console.error('Error loading cart:', err);
          setCartItems(parsedLocal);
          setError('Failed to connect to the database, using local backup.');
        } finally {
          setIsLoaded(true);
        }
      };
      loadCart();
    } else {
      setCartItems(parsedLocal);
      setIsLoaded(true);
    }
  }, [user]);

  // Sync cart to Supabase and localStorage on change (debounced to avoid rapid DB writes)
  useEffect(() => {
    const userId = user?.id || user?.uid;
    if (!isLoaded) return;

    // Always update local storage immediately for safety
    const localKey = userId ? `passwala_cart_${userId}` : 'passwala_cart_guest';
    localStorage.setItem(localKey, JSON.stringify(cartItems));

    if (!userId) return;

    const timer = setTimeout(() => {
      const syncCart = async () => {
        if (!supabase) return;
        try {
          if (cartItems.length === 0) {
            const { error: clearErr } = await supabase.from('carts').delete().eq('user_id', userId);
            if (clearErr && clearErr.code !== 'PGRST205' && !clearErr.message?.includes('schema cache')) {
              console.warn('Failed to clear cart in Supabase:', clearErr);
            }
          } else {
            const { error: syncErr } = await supabase.from('carts').upsert({
              user_id: userId,
              items: cartItems,
              updated_at: new Date()
            });
            if (syncErr && syncErr.code !== 'PGRST205' && !syncErr.message?.includes('schema cache')) {
              console.warn('Failed to sync cart to Supabase:', syncErr);
            }
          }
        } catch (err) {
          console.error('Error syncing cart:', err);
        }
      };
      syncCart();
    }, 800);

    return () => clearTimeout(timer);
  }, [cartItems, user, isLoaded]);

  const addToCart = (item) => {
    setCartItems(prev => {
      const existing = prev.find(i => i.id === item.id && i.type === item.type);
      if (existing) {
        return prev.map(i =>
          i.id === item.id && i.type === item.type
            ? { ...i, qty: i.qty + 1 }
            : i
        );
      }
      return [...prev, { ...item, qty: 1 }];
    });
    setCartOpen(true);
  };

  const removeFromCart = (id, type) => {
    setCartItems(prev => prev.filter(i => !(i.id === id && i.type === type)));
  };

  const updateQty = (id, type, delta) => {
    setCartItems(prev =>
      prev
        .map(i => i.id === id && i.type === type ? { ...i, qty: i.qty + delta } : i)
        .filter(i => i.qty > 0)
    );
  };

  const clearCart = () => setCartItems([]);

  const totalItems = cartItems.reduce((s, i) => s + i.qty, 0);
  const totalPrice = cartItems.reduce((s, i) => s + i.price * i.qty, 0);

  return (
    <CartContext.Provider value={{
      cartItems, cartOpen, setCartOpen,
      addToCart, removeFromCart, updateQty, clearCart,
      totalItems, totalPrice, error, setError
    }}>
      {children}
    </CartContext.Provider>
  );
};

// eslint-disable-next-line react-refresh/only-export-components
export const useCart = () => useContext(CartContext);
