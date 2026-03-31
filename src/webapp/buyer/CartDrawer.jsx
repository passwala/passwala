import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, CheckCircle, Sparkles } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'react-hot-toast';
import { useTranslation } from '../LanguageContext';
import { supabase } from '../../supabase';
import './CartDrawer.css';

const CartDrawer = () => {
  const { t } = useTranslation();
  const { cartItems, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, totalItems, totalPrice } = useCart();
  const { addNotification } = useNotifications();

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;
    
    // Get current user from storage or context (Assuming App.jsx handles auth)
    // For demo, I'll check some identifier or session
    const userJson = localStorage.getItem('passwala_user');
    const userObj = userJson ? JSON.parse(userJson) : null;
    const userId = userObj?.uid || 'guest-user';

    const itemNames = cartItems.map(i => i.name).join(', ');
    const total = totalPrice;

    try {
      const { data, error } = await supabase
        .from('orders')
        .insert([{
          user_id: userId,
          items: cartItems,
          total_price: total,
          status: 'PREPARING',
          eta: '25-30 mins',
          shop_id: cartItems[0]?.shop_id || 'general-vendor',
          delivery_agent_name: 'Assigning...',
          location: 'Shivam Residency, Satellite'
        }]);

      if (error) throw error;

      toast.success(`Order placed! ₹${total.toLocaleString()} • Delivering to Shivam Residency`, { icon: '🎉', duration: 4000 });
      addNotification({
        icon: '📦',
        title: 'Order Placed Successfully!',
        body: `₹${total.toLocaleString()} • ${itemNames} • Your neighbor-verified delivery is starting.`,
        color: '#22c55e',
      });
      clearCart();
      setCartOpen(false);
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Could not save your order. Check database connection.');
    }
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
            <h3>{t('items')}</h3>
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
              <p>{t('cart_empty')}</p>
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

              {/* NEW: Delivery & Order Options */}
              <div className="cart-options-v2">
                <h5>🛒 Order Options</h5>
                <div className="options-grid-v2">
                  <div className="option-pill-v2" onClick={() => toast.success('Scheduled for tomorrow 7AM!')}>
                     <div className="option-icon">⏰</div>
                     <div className="option-text">
                        <strong>Schedule Morning</strong>
                        <span>Get it at 7 AM</span>
                     </div>
                  </div>
                  <div className="option-pill-v2" onClick={() => toast('Floor Group Order active! Extra 5% off')}>
                     <div className="option-icon">🏢</div>
                     <div className="option-text">
                        <strong>Group Order</strong>
                        <span>Join floor society</span>
                     </div>
                  </div>
                </div>
              </div>

              {/* Smart Basket Section */}
              <div className="smart-basket-section">
                <h4><ShoppingBag size={16} color="#ff7622" /> Smart Basket Picks</h4>
                <div className="smart-picks-list">
                  {cartItems.some(i => i.type === 'essential') && (
                    <div className="smart-pick-item" onClick={() => toast.success('Added suggested Fresh Curd!')}>
                      <div className="pick-info">
                        <strong>Fresh Curd (500g)</strong>
                        <span>Matches your groceries</span>
                      </div>
                      <button className="pick-add-btn"><Plus size={14} /></button>
                    </div>
                  )}
                  {cartItems.some(i => i.type === 'service') && (
                    <div className="smart-pick-item" onClick={() => toast.success('Added House Insurance check!')}>
                      <div className="pick-info">
                        <strong>Safety Checkup</strong>
                        <span>Recommended with services</span>
                      </div>
                      <button className="pick-add-btn"><Plus size={14} /></button>
                    </div>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        {/* Footer */}
        {cartItems.length > 0 && (
          <div className="cart-footer">
            <div className="cart-total">
              <div className="total-label">
                <span>{t('total')} ({totalItems} items)</span>
                {totalPrice > 1000 && <span className="savings-badge">{t('savings')} ₹150 with Neighbor Discount</span>}
              </div>
              <strong>₹{totalPrice.toLocaleString()}</strong>
            </div>
            <button className="cart-checkout-btn" onClick={handleCheckout}>
              <CheckCircle size={18} /> {t('checkout')}
            </button>
          </div>
        )}
      </div>
    </>
  );
};

export default CartDrawer;
