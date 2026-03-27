import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, CheckCircle } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNotifications } from '../context/NotificationContext';
import { toast } from 'react-hot-toast';
import './CartDrawer.css';

const CartDrawer = () => {
  const { cartItems, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, totalItems, totalPrice } = useCart();
  const { addNotification } = useNotifications();

  const handleCheckout = () => {
    if (cartItems.length === 0) return;
    const itemNames = cartItems.map(i => i.name).join(', ');
    const total = totalPrice;
    toast.success(`Order placed! ₹${total.toLocaleString()} • Delivering to Shivam Residency`, { icon: '🎉', duration: 4000 });
    addNotification({
      icon: '📦',
      title: 'Order Placed Successfully!',
      body: `₹${total.toLocaleString()} • ${itemNames} • Delivering to Shivam Residency, Satellite.`,
      color: '#22c55e',
    });
    clearCart();
    setCartOpen(false);
  };

  return (
    <>
      {/* Backdrop */}
      {cartOpen && <div className="cart-overlay" onClick={() => setCartOpen(false)} />}

      {/* Drawer */}
      <div className={`cart-drawer ${cartOpen ? 'cart-drawer--open' : ''}`}>
        {/* Header */}
        <div className="cart-header">
          <div className="cart-title">
            <ShoppingBag size={20} />
            <h3>My Cart</h3>
            {totalItems > 0 && <span className="cart-count-chip">{totalItems}</span>}
          </div>
          <button className="cart-close" onClick={() => setCartOpen(false)}>
            <X size={20} />
          </button>
        </div>

        {/* Items */}
        <div className="cart-body">
          {cartItems.length === 0 ? (
            <div className="cart-empty">
              <ShoppingBag size={48} strokeWidth={1} />
              <p>Your cart is empty</p>
              <span>Add services or essentials to get started</span>
            </div>
          ) : (
            <>
              {cartItems.map(item => (
                <div key={`${item.type}-${item.id}`} className="cart-item">
                  <div className="cart-item-info">
                    <span className="cart-item-type">{item.type === 'service' ? '🔧 Service' : '🛍️ Essential'}</span>
                    <strong className="cart-item-name">{item.name}</strong>
                    <span className="cart-item-meta">{item.provider || item.store}</span>
                  </div>
                  <div className="cart-item-right">
                    <span className="cart-item-price">₹{(item.price * item.qty).toLocaleString()}</span>
                    <div className="cart-qty-controls">
                      <button onClick={() => updateQty(item.id, item.type, -1)}><Minus size={13} /></button>
                      <span>{item.qty}</span>
                      <button onClick={() => updateQty(item.id, item.type, +1)}><Plus size={13} /></button>
                    </div>
                    <button className="cart-remove" onClick={() => removeFromCart(item.id, item.type)}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                </div>
              ))}

              {/* Clear */}
              <button className="cart-clear-btn" onClick={clearCart}>Clear all</button>
            </>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <span>Total ({totalItems} items)</span>
              <strong>₹{totalPrice.toLocaleString()}</strong>
            </div>
            <button className="cart-checkout-btn" onClick={handleCheckout}>
              <CheckCircle size={18} /> Place Order
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
