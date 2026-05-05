import React from 'react';
import { X, Plus, Minus, Trash2, ShoppingBag, CheckCircle, Sparkles, MapPin } from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useNotifications } from '../../context/NotificationContext';
import { toast } from 'react-hot-toast';
import { useTranslation } from '../LanguageContext';
import { supabase } from '../../supabase';
import './CartDrawer.css';

import { useNavigate } from 'react-router-dom';

const SUPPORTED_SOCIETIES = [
  'hive pg hostel', 
  'shivam residency', 
  'shivalik enclave', 
  'paldi',
  'satellite',
  'vastrapur'
];

const CartDrawer = ({ location, isProfileComplete, userAddress }) => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { cartItems, cartOpen, setCartOpen, removeFromCart, updateQty, clearCart, totalItems, totalPrice } = useCart();
  const { addNotification } = useNotifications();
  const [showConfirm, setShowConfirm] = React.useState(false);
  const [supportedAreas, setSupportedAreas] = React.useState([]);

  React.useEffect(() => {
    const fetchAreas = async () => {
      try {
        const { data, error } = await supabase
          .from('service_areas')
          .select('area_name')
          .eq('is_active', true);
        
        if (!error && data) {
          setSupportedAreas(data.map(a => a.area_name.toLowerCase()));
        }
      } catch (err) {
        console.warn("Could not fetch service areas, using defaults");
      }
    };
    fetchAreas();
  }, []);

  const handleCheckout = async () => {
    if (cartItems.length === 0) return;

    if (!isProfileComplete || !userAddress) {
      toast.error("Please add your delivery address to continue");
      setCartOpen(false);
      navigate('/complete-profile');
      return;
    }
    
    setShowConfirm(true);
  };

  const isSupportedArea = React.useMemo(() => {
    if (!userAddress?.society) return true; // Don't block if we don't know yet
    
    // Use dynamic list if available, otherwise fallback to defaults
    const activeList = supportedAreas.length > 0 
      ? supportedAreas 
      : SUPPORTED_SOCIETIES.map(s => s.toLowerCase());

    return activeList.some(s => 
      userAddress.society.toLowerCase().includes(s)
    );
  }, [userAddress, supportedAreas]);

  const finalPlaceOrder = async () => {
    const userJson = localStorage.getItem('passwala_user');
    const userObj = userJson ? JSON.parse(userJson) : null;
    let userId = userObj?.id || userObj?.uid;
    const isUUID = userId && userId.length === 36;
    if (!isUUID) userId = null;

    let storeId = cartItems[0]?.store_id || cartItems[0]?.shop_id;
    if (storeId && storeId.length !== 36) storeId = null;

    const itemNames = cartItems.map(i => i.name).join(', ');
    const total = totalPrice;

    try {
      const orderPayload = {
        total_amount: total,
        subtotal: total,
        status: 'PLACED',
        delivery_fee: 0
      };
      if (userId) orderPayload.user_id = userId;
      if (storeId) orderPayload.store_id = storeId;
      if (userAddress?.id) orderPayload.address_id = userAddress.id;

      const { data: newOrder, error } = await supabase
        .from('orders')
        .insert([orderPayload])
        .select()
        .single();

      if (error) {
        throw error;
      }

      if (newOrder) {
        const orderItems = cartItems.map(item => ({
          order_id: newOrder.id,
          product_id: (typeof item.id === 'string' && item.id.length === 36) ? item.id : null,
          quantity: item.qty || 1,
          price_at_purchase: item.price
        }));
        const { error: itemError } = await supabase.from('order_items').insert(orderItems);
        if (itemError) console.warn("Order items save error:", itemError);
      }

      const deliveryLoc = location ? location.split(',')[0] : 'Your Location';
      toast.success(`Order placed! ₹${total.toLocaleString()} • Delivering to ${deliveryLoc}`, { icon: '🎉', duration: 4000 });
      addNotification({
        icon: '📦',
        title: 'Order Placed Successfully!',
        body: `₹${total.toLocaleString()} • ${itemNames} • Your neighbor-verified delivery is starting at ${deliveryLoc}.`,
        color: '#22c55e',
      });
      clearCart();
      setCartOpen(false);
      setShowConfirm(false);
      navigate('/track-orders');
    } catch (err) {
      console.error('Checkout error:', err);
      toast.error('Could not connect to Passwala servers. Please check your internet and try again.', {
        icon: '📡',
        duration: 5000
      });
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

              {/* Clear & Add More */}
              <div style={{ display: 'flex', gap: '10px', marginTop: '15px' }}>
                <button className="cart-clear-btn" style={{ flex: 1 }} onClick={clearCart}>Clear all</button>
                <button 
                  className="cart-add-more-btn" 
                  style={{ 
                    flex: 1, 
                    background: 'rgba(255,118,34,0.1)', 
                    color: 'var(--primary)', 
                    border: '1px solid var(--primary)',
                    borderRadius: '10px',
                    padding: '8px',
                    fontSize: '0.85rem',
                    fontWeight: 700,
                    cursor: 'pointer'
                  }}
                  onClick={() => setCartOpen(false)}
                >
                  + Add More
                </button>
              </div>

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

            
            {isProfileComplete && userAddress && (
              <div className="delivery-address-v3">
                <div className="addr-dot-v3"></div>
                <div className="addr-content-v3" style={{ flex: 1 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <span className="addr-title-v3">Delivering to</span>
                    <button 
                      onClick={() => { setCartOpen(false); navigate('/complete-profile'); }}
                      className="addr-change-btn-link"
                    >
                      Change
                    </button>
                  </div>
                  <p className="addr-text-v3">
                    {userAddress.house_no || 'Home'}, {userAddress.floor ? `Floor ${userAddress.floor}` : 'Ground'}, {userAddress.society || 'Neighborhood'}
                    <span className="addr-sub-v3"> • {location || 'Detecting...'}</span>
                  </p>
                </div>
              </div>
            )}

            {!isSupportedArea && isProfileComplete && (
              <div className="coming-soon-alert">
                <Sparkles size={16} color="#ef4444" />
                <p>Coming soon to <strong>{userAddress.society}</strong>. We are currently serving only selected neighborhoods.</p>
              </div>
            )}

            <div className="cart-total">
              <div className="total-label">
                <span>{t('total')} ({totalItems} items)</span>
                {totalPrice > 1000 && <span className="savings-badge">{t('savings')} ₹150 with Neighbor Discount</span>}
              </div>
              <strong>₹{totalPrice.toLocaleString()}</strong>
            </div>
            <button 
              className={`cart-checkout-btn ${(!isProfileComplete || !userAddress || !isSupportedArea) ? 'needs-address' : ''}`} 
              onClick={handleCheckout}
              disabled={!isSupportedArea && isProfileComplete}
            >
              {!isSupportedArea && isProfileComplete ? (
                <>COMING SOON</>
              ) : (isProfileComplete && userAddress) ? (
                <><CheckCircle size={18} /> Place Order</>
              ) : (
                <>Add Delivery Address</>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Final Confirmation Overlay */}
      {showConfirm && isProfileComplete && userAddress && (
        <div className="order-confirm-overlay-v4">
          <div className="order-confirm-modal-v4">
             <div className="confirm-icon-v4">
                <CheckCircle size={40} color="#ff7622" />
             </div>
             <h2>Confirm Delivery</h2>
             <p className="confirm-desc-v4">Your neighborhood order will be delivered to:</p>
             
             <div className="confirm-address-card-v4">
                <MapPin size={20} color="#ff7622" />
                <div className="confirm-addr-text-v4">
                   <strong>{userAddress.house_no}, Floor {userAddress.floor}</strong>
                   <span>{userAddress.society}</span>
                </div>
             </div>

             <div className="confirm-actions-v4">
                <button 
                  className="confirm-cancel-v4" 
                  onClick={() => { setShowConfirm(false); setCartOpen(false); navigate('/complete-profile'); }}
                >
                  Change Address
                </button>
                <button className="confirm-proceed-v4" onClick={finalPlaceOrder}>
                   Confirm & Deliver
                </button>
             </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CartDrawer;
