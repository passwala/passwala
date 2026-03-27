import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase } from '../supabase';

const CartContext = createContext();

export const CartProvider = ({ children, user }) => {
  const [cartItems, setCartItems] = useState([]);
  const [cartOpen, setCartOpen] = useState(false);

  // Load cart from Supabase on login
  useEffect(() => {
    if (user?.uid) {
      const loadCart = async () => {
        const { data, error } = await supabase
          .from('carts')
          .select('items')
          .eq('user_id', user.uid)
          .single();
        if (data?.items) setCartItems(data.items);
      };
      loadCart();
    } else {
      setCartItems([]);
    }
  }, [user]);

  // Sync cart to Supabase on change
  useEffect(() => {
    if (user?.uid && cartItems.length > 0) {
      const syncCart = async () => {
        await supabase.from('carts').upsert({
          user_id: user.uid,
          items: cartItems,
          updated_at: new Date()
        });
      };
      syncCart();
    }
  }, [cartItems, user]);

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
      totalItems, totalPrice
    }}>
      {children}
    </CartContext.Provider>
  );
};

export const useCart = () => useContext(CartContext);
