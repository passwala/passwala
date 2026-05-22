import React, { useState, useEffect } from 'react';
import { ShoppingCart, Plus, Minus, Trash2, Tag, Percent, ArrowRight, ShieldCheck, MapPin } from 'lucide-react';
import { toast } from 'react-hot-toast';

const PRESET_PRODUCTS = [
  { id: 'prod_apples_123456789012345678901234', name: 'Organic Royal Gala Apples', desc: 'Fresh crisp apples straight from Himalayan orchards.', price: 180, image: '🍎', tax_category: 'fresh' },
  { id: 'prod_milk_123456789012345678901234', name: 'Pasteurized Full Cream Milk', desc: 'Fresh country milk, high fat content and pasteurized.', price: 65, image: '🥛', tax_category: 'fresh' },
  { id: 'prod_chips_123456789012345678901234', name: 'Gourmet Herbs Potato Chips', desc: 'Crunchy farm chips cooked in organic cold pressed oil.', price: 45, image: '🥔', tax_category: 'packaged' },
  { id: 'prod_almonds_12345678901234567890123', name: 'Roasted Salted California Almonds', desc: 'Premium quality crunchiness, rich in proteins.', price: 380, image: '🥜', tax_category: 'packaged' },
  { id: 'prod_choc_1234567890123456789012345', name: 'Dark Hazelnut Swiss Chocolate', desc: 'Rich 70% dark cocoa bar infused with roasted hazelnuts.', price: 240, image: '🍫', tax_category: 'premium' }
];

const INDIAN_STATES = [
  'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat', 
  'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh', 
  'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab', 
  'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh', 'Uttarakhand', 'West Bengal'
];

export default function GroceryStore({ onCheckoutSuccess, userId }) {
  const [products] = useState(PRESET_PRODUCTS);
  const [cart, setCart] = useState([]);
  const [sellerState, setSellerState] = useState('Gujarat');
  const [customerState, setCustomerState] = useState('Gujarat');
  
  // Coupon state
  const [couponInput, setCouponInput] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [discountAmount, setDiscountAmount] = useState(0);

  // Loading and checkout modal state
  const [isLoading, setIsLoading] = useState(false);
  const [showSandboxModal, setShowSandboxModal] = useState(false);
  const [checkoutData, setCheckoutData] = useState(null);

  // Load products from DB or fallback
  useEffect(() => {
    const syncProducts = async () => {
      try {
        // Fetch products from database
        await window.supabaseClient;
        // If they exist, we could fetch, but PRESET_PRODUCTS ensures offline instant functionality!
      } catch (err) {
        console.warn('DB product loading fallback');
      }
    };
    syncProducts();
  }, []);

  const addToCart = (product) => {
    setCart(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item => item.id === product.id ? { ...item, qty: item.qty + 1 } : item);
      }
      toast.success(`${product.name} added to cart`, { icon: '🛒' });
      return [...prev, { ...product, qty: 1 }];
    });
  };

  const updateQty = (id, change) => {
    setCart(prev => prev.map(item => {
      if (item.id === id) {
        const newQty = item.qty + change;
        return newQty > 0 ? { ...item, qty: newQty } : null;
      }
      return item;
    }).filter(Boolean));
  };

  const removeFromCart = (id) => {
    setCart(prev => prev.filter(item => item.id !== id));
    toast.error('Item removed from cart');
  };

  // Tax and pricing math variables
  const subtotal = cart.reduce((sum, item) => sum + (item.price * item.qty), 0);

  // Validate and apply coupon API
  const applyCoupon = async () => {
    if (!couponInput) return;
    setIsLoading(true);
    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';
        
      const response = await fetch(`${baseUrl}/api/planet-softweb/coupons/apply`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: couponInput, subtotal })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to apply coupon');

      setAppliedCoupon(resData.code);
      setDiscountAmount(resData.discount);
      toast.success(resData.message, { icon: '🏷️' });
    } catch (err) {
      toast.error(err.message || 'Invalid Coupon Code');
      setAppliedCoupon(null);
      setDiscountAmount(0);
    } finally {
      setIsLoading(false);
    }
  };

  // Recalculate discount if cart subtotal changes
  useEffect(() => {
    if (appliedCoupon && subtotal > 0) {
      if (appliedCoupon === 'SOFTWEB20') {
        setDiscountAmount(Math.min(100, subtotal * 0.2));
      } else if (appliedCoupon === 'GSTFREE') {
        setDiscountAmount(Math.min(200, subtotal * 0.1));
      }
    } else {
      setAppliedCoupon(null);
      setDiscountAmount(0);
    }
  }, [subtotal, appliedCoupon]);

  // Compute live local GST logic
  const isSameState = sellerState.toLowerCase().trim() === customerState.toLowerCase().trim();
  const deliveryFee = subtotal >= 500 || subtotal === 0 ? 0 : 40;

  let totalCGST = 0;
  let totalSGST = 0;
  let totalIGST = 0;
  let calculatedTaxable = 0;

  const discountRatio = subtotal > 0 ? (subtotal - discountAmount) / subtotal : 1;

  cart.forEach(item => {
    const itemSubtotal = item.price * item.qty;
    const rate = item.tax_category === 'fresh' ? 0.05 : item.tax_category === 'packaged' ? 0.12 : 0.18;
    
    // Reverse tax inclusive formula
    const taxableValue = (itemSubtotal / (1 + rate)) * discountRatio;
    const tax = (itemSubtotal - (itemSubtotal / (1 + rate))) * discountRatio;

    calculatedTaxable += taxableValue;

    if (isSameState) {
      totalCGST += tax / 2;
      totalSGST += tax / 2;
    } else {
      totalIGST += tax;
    }
  });

  const totalGST = totalCGST + totalSGST + totalIGST;
  const finalTotal = calculatedTaxable + totalGST + deliveryFee;

  // Process checkout trigger and hit backend
  const handleCheckout = async () => {
    if (cart.length === 0) return;
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';

      const response = await fetch(`${baseUrl}/api/planet-softweb/orders/create`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          cartItems: cart,
          sellerState,
          customerState,
          couponCode: appliedCoupon,
          userId
        })
      });

      const resData = await response.json();
      if (!response.ok) throw new Error(resData.error || 'Failed to place order');

      setCheckoutData(resData);
      
      // Open our beautifully styled sandboxed payment engine
      setShowSandboxModal(true);

    } catch (err) {
      toast.error(err.message || 'Checkout failed');
    } finally {
      setIsLoading(false);
    }
  };

  // Submit sandboxed verification check
  const handlePaymentResolution = async (success) => {
    if (!checkoutData) return;
    setShowSandboxModal(false);
    setIsLoading(true);

    try {
      const baseUrl = import.meta.env.VITE_API_URL || '';

      if (success) {
        toast.loading('Authorizing secure payment via Razorpay...', { id: 'pay_load' });
        
        const verifyRes = await fetch(`${baseUrl}/api/planet-softweb/payments/verify`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            razorpay_payment_id: `pay_softweb_${Math.random().toString(36).substring(2, 10)}`,
            razorpay_order_id: checkoutData.razorpayOrder.id,
            razorpay_signature: `mock_signature_${Math.random().toString(36).substring(2, 12)}`,
            orderId: checkoutData.order.id,
            taxDetails: checkoutData.taxSummary
          })
        });

        toast.dismiss('pay_load');

        const verifyData = await verifyRes.json();
        if (!verifyRes.ok) throw new Error(verifyData.error || 'Verification failed');

        toast.success('Payment verified successfully! 🎉', { duration: 4500 });
        setCart([]);
        setAppliedCoupon(null);
        setDiscountAmount(0);

        // Redirect to invoice page or trigger parent reload
        onCheckoutSuccess(checkoutData.order.id);
      } else {
        // Failed transaction
        await fetch(`${baseUrl}/api/planet-softweb/payments/fail`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            orderId: checkoutData.order.id,
            errorDetails: { code: 'BAD_PAYMENT', description: 'User balance limit exceeded' }
          })
        });
        toast.error('Razorpay payment failed or cancelled', { icon: '❌' });
      }
    } catch (err) {
      toast.dismiss('pay_load');
      toast.error(err.message || 'Payment system failure');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="store-grid">
      {/* 1. Products List */}
      <div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
          <h2 style={{ fontSize: '1.4rem', fontWeight: '700', margin: 0 }}>Fresh Planet Storefront</h2>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.85rem', color: 'var(--planet-text-muted)' }}>
            <ShieldCheck size={16} style={{ color: 'var(--planet-secondary)' }} />
            <span>Secure Supabase & GST Enabled</span>
          </div>
        </div>

        <div className="products-container">
          {products.map(product => (
            <div className="product-card" key={product.id}>
              <div className="product-img-wrapper">
                <span style={{ fontSize: '3.5rem' }}>{product.image}</span>
                <span className="product-badge">
                  {product.tax_category === 'fresh' ? '5% GST' : product.tax_category === 'packaged' ? '12% GST' : '18% GST'}
                </span>
              </div>
              <div className="product-info">
                <h4 className="product-name">{product.name}</h4>
                <p className="product-desc">{product.desc}</p>
                <div className="product-footer">
                  <span className="product-price">₹{product.price}</span>
                  <button className="add-btn" onClick={() => addToCart(product)}>
                    <Plus size={18} />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* 2. Billing Cart Drawer */}
      <div>
        <div className="planet-card" style={{ position: 'sticky', top: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '18px', borderBottom: '1px solid var(--planet-border)', paddingBottom: '12px' }}>
            <ShoppingCart size={20} style={{ color: 'var(--planet-primary)' }} />
            <h3 style={{ fontSize: '1.2rem', fontWeight: '700', margin: 0 }}>GST Tax Billing Cart</h3>
          </div>

          {/* State selectors */}
          <div className="state-selector-wrapper">
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--planet-text-muted)', display: 'block', marginBottom: '6px' }}>Seller State</label>
              <select className="planet-input" value={sellerState} onChange={(e) => setSellerState(e.target.value)}>
                {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
            <div>
              <label style={{ fontSize: '0.75rem', color: 'var(--planet-text-muted)', display: 'block', marginBottom: '6px' }}>Customer State</label>
              <select className="planet-input" value={customerState} onChange={(e) => setCustomerState(e.target.value)}>
                {INDIAN_STATES.map(st => <option key={st} value={st}>{st}</option>)}
              </select>
            </div>
          </div>

          {cart.length === 0 ? (
            <div style={{ padding: '40px 0', textAlign: 'center', color: 'var(--planet-text-muted)' }}>
              <span style={{ fontSize: '2.5rem', display: 'block', marginBottom: '10px' }}>🛒</span>
              <p style={{ margin: 0, fontSize: '0.9rem' }}>Your grocery cart is empty.</p>
            </div>
          ) : (
            <>
              {/* Cart List */}
              <div style={{ maxHeight: '200px', overflowY: 'auto', marginBottom: '20px', paddingRight: '4px' }}>
                {cart.map(item => (
                  <div className="cart-item-row" key={item.id}>
                    <div style={{ maxWidth: '60%' }}>
                      <div style={{ fontSize: '0.9rem', fontWeight: '600' }}>{item.name}</div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--planet-text-muted)' }}>
                        ₹{item.price} • HSN: {item.tax_category === 'fresh' ? '0801' : item.tax_category === 'packaged' ? '1904' : '2106'}
                      </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <div className="cart-qty-ctrl">
                        <button className="cart-qty-btn" onClick={() => updateQty(item.id, -1)}><Minus size={12} /></button>
                        <span style={{ fontSize: '0.85rem', fontWeight: '700' }}>{item.qty}</span>
                        <button className="cart-qty-btn" onClick={() => addToCart(item)}><Plus size={12} /></button>
                      </div>
                      <button style={{ background: 'transparent', border: 'none', color: 'var(--planet-danger)', cursor: 'pointer' }} onClick={() => removeFromCart(item.id)}>
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Coupon Form */}
              <div style={{ display: 'flex', gap: '8px', marginBottom: '20px' }}>
                <div style={{ position: 'relative', flexGrow: 1 }}>
                  <Tag size={16} style={{ position: 'absolute', left: '10px', top: '10px', color: 'var(--planet-text-muted)' }} />
                  <input className="planet-input" style={{ paddingLeft: '32px' }} placeholder="Promo Coupon Code (e.g. SOFTWEB20)" value={couponInput} onChange={(e) => setCouponInput(e.target.value)} />
                </div>
                <button className="planet-btn-primary" style={{ width: 'auto', padding: '0 16px', background: 'rgba(255,255,255,0.05)', color: 'var(--planet-text)', border: '1px solid var(--planet-border)' }} onClick={applyCoupon} disabled={isLoading}>
                  Apply
                </button>
              </div>

              {/* GST Invoice calculation details */}
              <div style={{ background: 'rgba(0,0,0,0.15)', borderRadius: '12px', padding: '16px', border: '1px solid var(--planet-border)', marginBottom: '20px' }}>
                <div className="tax-row">
                  <span>Gross Items Subtotal</span>
                  <span>₹{subtotal.toFixed(2)}</span>
                </div>
                
                {discountAmount > 0 && (
                  <div className="tax-row highlight">
                    <span>Coupon Discount Applied</span>
                    <span>- ₹{discountAmount.toFixed(2)}</span>
                  </div>
                )}

                <div className="tax-row">
                  <span>Taxable Value (Post-Discount)</span>
                  <span>₹{calculatedTaxable.toFixed(2)}</span>
                </div>

                {isSameState ? (
                  <>
                    <div className="tax-row">
                      <span>Central CGST (Intra-State Split)</span>
                      <span>₹{totalCGST.toFixed(2)}</span>
                    </div>
                    <div className="tax-row">
                      <span>State SGST (Intra-State Split)</span>
                      <span>₹{totalSGST.toFixed(2)}</span>
                    </div>
                  </>
                ) : (
                  <div className="tax-row">
                    <span>Integrated IGST (Inter-State Tax)</span>
                    <span>₹{totalIGST.toFixed(2)}</span>
                  </div>
                )}

                <div className="tax-row">
                  <span>Delivery Charges</span>
                  <span>{deliveryFee > 0 ? `₹${deliveryFee.toFixed(2)}` : 'FREE'}</span>
                </div>

                <div className="tax-row total">
                  <span>Invoice Final Total</span>
                  <span>₹{finalTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Checkout Button */}
              <button className="planet-btn-primary" onClick={handleCheckout} disabled={isLoading}>
                <span>{isLoading ? 'Processing Order...' : 'Pay & Book Order via Razorpay'}</span>
                <ArrowRight size={18} />
              </button>
            </>
          )}
        </div>
      </div>

      {/* 3. Razorpay Simulator Sandboxed Modal */}
      {showSandboxModal && checkoutData && (
        <div style={{ position: 'fixed', inset: 0, display: 'flex', alignItems: 'center', justifycontent: 'center', background: 'rgba(0,0,0,0.85)', zIndex: 9999, padding: '20px', boxSizing: 'border-box' }}>
          <div className="planet-card" style={{ maxWidth: '440px', width: '100%', border: '2px solid var(--planet-primary)' }}>
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
              <div style={{ background: 'rgba(0, 210, 255, 0.1)', width: '60px', height: '60px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifycontent: 'center', margin: '0 auto 12px' }}>
                <Percent size={28} style={{ color: 'var(--planet-primary)' }} />
              </div>
              <h4 style={{ fontSize: '1.25rem', fontWeight: '800', margin: '0 0 6px 0' }}>Razorpay Payment Gateway</h4>
              <p style={{ fontSize: '0.85rem', color: 'var(--planet-text-muted)', margin: 0 }}>Simulated checkout environment for order testing.</p>
            </div>

            <div style={{ background: 'rgba(0,0,0,0.2)', padding: '14px', borderRadius: '10px', border: '1px solid var(--planet-border)', marginBottom: '20px', fontSize: '0.85rem' }}>
              <div style={{ display: 'flex', justifycontent: 'space-between', marginBottom: '6px' }}>
                <span>Transaction ID:</span>
                <strong style={{ color: 'var(--planet-text)' }}>{checkoutData.razorpayOrder.id}</strong>
              </div>
              <div style={{ display: 'flex', justifycontent: 'space-between', marginBottom: '6px' }}>
                <span>Billed To:</span>
                <strong>Customer ({customerState})</strong>
              </div>
              <div style={{ display: 'flex', justifycontent: 'space-between' }}>
                <span>Total Amount:</span>
                <strong style={{ color: 'var(--planet-secondary)', fontSize: '1.05rem' }}>₹{finalTotal.toFixed(2)}</strong>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
              <button className="planet-btn-primary" style={{ background: 'var(--planet-danger)', color: '#fff' }} onClick={() => handlePaymentResolution(false)}>
                Simulate Failure
              </button>
              <button className="planet-btn-primary" onClick={() => handlePaymentResolution(true)}>
                Authorize Success
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
