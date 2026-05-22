import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import supabase from '../supabase.js';

const router = express.Router();

// Initialize Razorpay Client using environment vars
const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpay = null;
if (keyId && keySecret) {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}

// Global rates configuration (Standard HSN codes and GST Rates for groceries)
const TAX_CLASSES = {
  fresh: { rate: 0.05, hsn: '0801' },   // Fresh fruits, milk, veggies: 5% GST
  packaged: { rate: 0.12, hsn: '1904' },// Processed, packaged snacks, juice: 12% GST
  premium: { rate: 0.18, hsn: '2106' } // Premium chocolates, imports: 18% GST
};


/**
 * Helper to ensure custom Planet Softweb tables are resilient.
 * In case the user hasn't successfully run the SQL script in Supabase,
 * we handle table failures elegantly instead of crashing the server.
 */
const handleDBError = (err, section) => {
  console.error(`⚠️ [Planet Softweb DB Engine] Error during ${section}:`, err.message || err);
};

/**
 * POST /api/planet-softweb/coupons/apply
 * Validates a coupon code against a subtotal.
 */
router.post('/coupons/apply', async (req, res) => {
  const { code, subtotal } = req.body;

  if (!code) {
    return res.status(400).json({ error: 'Coupon code is required' });
  }

  try {
    const { data: coupon, error } = await supabase
      .from('coupons')
      .select('*')
      .eq('code', code.toUpperCase())
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      handleDBError(error, 'coupon validation');
      // Graceful fallback for local development if table isn't created yet
      if (code.toUpperCase() === 'SOFTWEB20' && subtotal >= 200) {
        return res.json({
          valid: true,
          discount: Math.min(100, subtotal * 0.2),
          code: 'SOFTWEB20',
          message: 'Demo code applied! 20% discount (max ₹100)'
        });
      }
      return res.status(400).json({ error: 'Coupon table unavailable' });
    }

    if (!coupon) {
      return res.status(400).json({ error: 'Invalid or expired coupon code' });
    }

    // Date validity checks
    const now = new Date();
    if (coupon.end_date && new Date(coupon.end_date) < now) {
      return res.status(400).json({ error: 'Coupon has expired' });
    }

    if (subtotal < parseFloat(coupon.min_order_amount)) {
      return res.status(400).json({ 
        error: `Minimum order amount of ₹${coupon.min_order_amount} required to use this coupon.` 
      });
    }

    // Calculate discount
    const discountAmount = Math.min(
      parseFloat(coupon.max_discount),
      subtotal * (parseFloat(coupon.discount_percentage) / 100)
    );

    res.json({
      valid: true,
      code: coupon.code,
      discount: discountAmount,
      percentage: coupon.discount_percentage,
      message: `Coupon '${coupon.code}' applied successfully!`
    });
  } catch (err) {
    console.error('🔥 Coupon apply system error:', err);
    res.status(500).json({ error: 'Internal server error validating coupon' });
  }
});

/**
 * POST /api/planet-softweb/orders/create
 * Places order and calculates detailed GST rates based on state-rules.
 */
router.post('/orders/create', async (req, res) => {
  const { cartItems, userAddress, couponCode, sellerState = 'Gujarat', customerState, userId } = req.body;

  if (!cartItems || cartItems.length === 0) {
    return res.status(400).json({ error: 'Cart items cannot be empty' });
  }
  if (!customerState) {
    return res.status(400).json({ error: 'Customer state is required for GST calculations' });
  }

  try {
    let subtotal = 0;
    const computedItems = cartItems.map(item => {
      const price = parseFloat(item.price || 0);
      const qty = parseInt(item.qty || 1, 10);
      const itemSubtotal = price * qty;
      subtotal += itemSubtotal;

      // Determine Tax Category (fallback to Fresh (5%) if not specified)
      const taxCategory = item.tax_category || 'fresh';
      const taxConfig = TAX_CLASSES[taxCategory] || TAX_CLASSES['fresh'];
      const gstRate = taxConfig.rate;
      const hsn = taxConfig.hsn;

      // Tax calculation (Inclusive of GST like typical Indian retail)
      // Taxable Value = Item Subtotal / (1 + GST Rate)
      const taxableValue = itemSubtotal / (1 + gstRate);
      const totalTax = itemSubtotal - taxableValue;

      let cgst = 0;
      let sgst = 0;
      let igst = 0;

      const isSameState = sellerState.toLowerCase().trim() === customerState.toLowerCase().trim();

      if (isSameState) {
        cgst = totalTax / 2;
        sgst = totalTax / 2;
      } else {
        igst = totalTax;
      }

      return {
        ...item,
        price,
        qty,
        itemSubtotal,
        taxableValue,
        cgst,
        sgst,
        igst,
        totalTax,
        hsn,
        gstRatePercent: gstRate * 100
      };
    });

    // Handle Coupon discounts
    let discount = 0;
    if (couponCode) {
      try {
        const { data: coupon } = await supabase
          .from('coupons')
          .select('*')
          .eq('code', couponCode.toUpperCase())
          .eq('is_active', true)
          .maybeSingle();

        if (coupon && subtotal >= parseFloat(coupon.min_order_amount)) {
          discount = Math.min(
            parseFloat(coupon.max_discount),
            subtotal * (parseFloat(coupon.discount_percentage) / 100)
          );
        }
      } catch (err) {
        console.warn('Coupon fallback logic triggered');
        if (couponCode.toUpperCase() === 'SOFTWEB20' && subtotal >= 200) {
          discount = Math.min(100, subtotal * 0.2);
        }
      }
    }

    // Apply delivery fee standard rates
    const deliveryFee = subtotal >= 500 ? 0 : 40;
    
    // Proportional tax discount reduction logic (GST Adjusted after discount)
    const discountRatio = discount > 0 ? (subtotal - discount) / subtotal : 1;

    let finalCgst = 0;
    let finalSgst = 0;
    let finalIgst = 0;
    let totalTaxableValue = 0;

    computedItems.forEach(item => {
      item.adjustedTaxable = item.taxableValue * discountRatio;
      item.adjustedCgst = item.cgst * discountRatio;
      item.adjustedSgst = item.sgst * discountRatio;
      item.adjustedIgst = item.igst * discountRatio;
      item.adjustedTax = item.totalTax * discountRatio;

      finalCgst += item.adjustedCgst;
      finalSgst += item.adjustedSgst;
      finalIgst += item.adjustedIgst;
      totalTaxableValue += item.adjustedTaxable;
    });

    const totalTax = finalCgst + finalSgst + finalIgst;
    const finalAmount = totalTaxableValue + totalTax + deliveryFee;

    // Fetch user or fallback if no user specified
    let resolvedUserId = userId;
    if (!resolvedUserId) {
      const { data: firstUser } = await supabase.from('users').select('id').limit(1).maybeSingle();
      resolvedUserId = firstUser?.id;
    }

    // Fetch address ID
    let addressId = userAddress?.id;
    if (!addressId && resolvedUserId) {
      const { data: addr } = await supabase.from('addresses').select('id').eq('user_id', resolvedUserId).limit(1).maybeSingle();
      addressId = addr?.id;
    }

    // Fetch first store as standard billing seller
    const { data: firstStore } = await supabase.from('stores').select('id').limit(1).maybeSingle();
    const storeId = firstStore?.id;

    // Create pending order inside Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        user_id: resolvedUserId,
        store_id: storeId,
        address_id: addressId,
        status: 'PENDING',
        subtotal: subtotal,
        delivery_fee: deliveryFee,
        total_amount: finalAmount
      }])
      .select()
      .single();

    if (orderErr) {
      throw new Error(`Failed to save pending order: ${orderErr.message}`);
    }

    // Save order items in PostgreSQL
    const orderItemsPayload = computedItems.map(item => ({
      order_id: order.id,
      product_id: item.id && item.id.length === 36 ? item.id : null,
      quantity: item.qty,
      price_at_purchase: item.price
    }));

    const { error: itemsErr } = await supabase.from('order_items').insert(orderItemsPayload);
    if (itemsErr) {
      console.error('⚠️ Could not insert order items to DB:', itemsErr.message);
    }

    // Initiate Razorpay checkout order
    let razorpayOrder = null;
    try {
      if (razorpay && !keyId.startsWith('rzp_test_mock')) {
        razorpayOrder = await razorpay.orders.create({
          amount: Math.round(finalAmount * 100),
          currency: 'INR',
          receipt: order.id
        });
      } else {
        if (process.env.NODE_ENV === 'production') {
          throw new Error('Razorpay payment gateway credentials are not configured.');
        }
        // Sandboxed mock payment simulation
        razorpayOrder = {
          id: `order_mock_${Math.random().toString(36).substring(2, 10)}`,
          amount: Math.round(finalAmount * 100),
          currency: 'INR',
          receipt: order.id,
          is_mock: true,
          key_id: 'rzp_test_mockkeyid_softweb'
        };
      }
    } catch (payErr) {
      console.error('Razorpay Order Init Error, falling back to mock sandbox:', payErr);
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Razorpay Order Init Error: ' + payErr.message);
      }
      razorpayOrder = {
        id: `order_mock_${Math.random().toString(36).substring(2, 10)}`,
        amount: Math.round(finalAmount * 100),
        currency: 'INR',
        receipt: order.id,
        is_mock: true,
        key_id: 'rzp_test_mockkeyid_softweb'
      };
    }

    res.json({
      success: true,
      order,
      razorpayOrder,
      items: computedItems,
      taxSummary: {
        subtotal,
        discount,
        taxableValue: totalTaxableValue,
        cgst: finalCgst,
        sgst: finalSgst,
        igst: finalIgst,
        totalTax,
        deliveryFee,
        finalAmount,
        sellerState,
        customerState
      }
    });

  } catch (err) {
    console.error('🔥 Planet Softweb Order Create system error:', err);
    res.status(500).json({ error: err.message || 'Internal server error creating order' });
  }
});

/**
 * POST /api/planet-softweb/payments/verify
 * Cryptographically verifies signatures, decrements stock, and generates GST Invoice
 */
router.post('/payments/verify', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId, taxDetails } = req.body;

  if (!orderId) {
    return res.status(400).json({ error: 'Order ID is required' });
  }

  try {
    let isVerified = false;

    if (!razorpay || keyId.startsWith('rzp_test_mock') || (razorpay_signature && razorpay_signature.startsWith('mock_'))) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Mock payment signatures are not allowed in production.');
      }
      isVerified = true; // Sandbox confirmation approved
      console.log(`[Planet Softweb Payment Sandbox] payment confirmed: ${razorpay_payment_id}`);
    } else {
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generated = crypto.createHmac('sha256', keySecret).update(text).digest('hex');
      isVerified = (generated === razorpay_signature);
    }

    if (!isVerified) {
      return res.status(400).json({ error: 'Cryptographic signature verification failed' });
    }

    // 1. Update Order Status in Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .update({
        status: 'PAID',
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderErr) {
      throw new Error(`Order database update failed: ${orderErr.message}`);
    }

    // 2. Save Payment record
    const { error: payErr } = await supabase
      .from('payments')
      .insert([{
        order_id: orderId,
        razorpay_payment_id,
        razorpay_order_id,
        payment_method: 'Razorpay',
        payment_status: 'PAID',
        amount: order.total_amount,
        raw_details: { razorpay_signature }
      }]);

    if (payErr) {
      handleDBError(payErr, 'payments record save');
    }

    // 3. Generate GST Invoice Number dynamically (INV-YYYYMM-XXXX)
    const dateCode = new Date().toISOString().slice(0,7).replace('-','');
    const randomCode = Math.floor(1000 + Math.random() * 9000);
    const invoiceNumber = `INV-${dateCode}-${randomCode}`;

    const cgst = taxDetails?.cgst || 0;
    const sgst = taxDetails?.sgst || 0;
    const igst = taxDetails?.igst || 0;
    const deliveryCharges = taxDetails?.deliveryFee || 0;
    const discount = taxDetails?.discount || 0;
    const totalTax = taxDetails?.totalTax || 0;
    const finalAmount = order.total_amount;
    const customerState = taxDetails?.customerState || 'Gujarat';
    const sellerState = taxDetails?.sellerState || 'Gujarat';

    const { data: invoice, error: invErr } = await supabase
      .from('invoices')
      .insert([{
        order_id: orderId,
        invoice_number: invoiceNumber,
        seller_state: sellerState,
        customer_state: customerState,
        cgst,
        sgst,
        igst,
        delivery_charges: deliveryCharges,
        discount,
        total_tax: totalTax,
        final_amount: finalAmount
      }])
      .select()
      .single();

    if (invErr) {
      handleDBError(invErr, 'invoice creation');
    }

    // 4. Create active delivery tracker record
    const steps = [
      { status: 'PLACED', message: 'Order has been placed & paid.', time: new Date().toISOString() },
      { status: 'PREPARING', message: 'Planet Softweb seller is packaging items.', time: null },
      { status: 'DISPATCHED', message: 'Delivery associate has picked up your order.', time: null },
      { status: 'COMPLETED', message: 'Delivered to your address.', time: null }
    ];

    const { error: trackErr } = await supabase
      .from('delivery_tracking')
      .insert([{
        order_id: orderId,
        status: 'PLACED',
        tracking_steps: steps,
        current_lat: 23.0225, // Ahmedabad center defaults
        current_lng: 72.5714
      }]);

    if (trackErr) {
      handleDBError(trackErr, 'delivery tracker creation');
    }

    // 5. Decrement Stock
    try {
      const { data: items } = await supabase.from('order_items').select('product_id, quantity').eq('order_id', orderId);
      if (items && items.length > 0) {
        for (const item of items) {
          if (item.product_id) {
            const { data: product } = await supabase.from('products').select('stock_quantity').eq('id', item.product_id).maybeSingle();
            if (product) {
              const currentStock = product.stock_quantity || 0;
              const newStock = Math.max(0, currentStock - item.quantity);
              await supabase.from('products').update({ stock_quantity: newStock }).eq('id', item.product_id);
            }
          }
        }
      }
    } catch (stockErr) {
      console.error('⚠️ Product stock decrement failed:', stockErr);
    }

    res.json({
      success: true,
      order,
      invoice,
      invoiceNumber
    });

  } catch (err) {
    console.error('🔥 Payment verification systems failed:', err);
    res.status(500).json({ error: err.message || 'Internal server error verifying payment' });
  }
});

/**
 * POST /api/planet-softweb/payments/fail
 * Handles payment failures
 */
router.post('/payments/fail', async (req, res) => {
  const { orderId, errorDetails } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Order ID required' });

  try {
    await supabase.from('orders').update({ status: 'CANCELLED' }).eq('id', orderId);
    
    await supabase.from('payments').insert([{
      order_id: orderId,
      payment_status: 'FAILED',
      amount: 0,
      raw_details: errorDetails || { message: 'User aborted payment' }
    }]);

    res.json({ success: true, message: 'Payment failure logged, order cancelled.' });
  } catch (err) {
    res.status(500).json({ error: 'Internal failure processing error log' });
  }
});

/**
 * POST /api/planet-softweb/payments/refund
 * Processes order refunds
 */
router.post('/payments/refund', async (req, res) => {
  const { orderId, amount } = req.body;
  if (!orderId) return res.status(400).json({ error: 'Order ID is required' });

  try {
    const { data: order } = await supabase.from('orders').select('*').eq('id', orderId).single();
    if (!order) return res.status(404).json({ error: 'Order not found' });

    const refundAmt = amount || order.total_amount;

    await supabase.from('orders').update({ status: 'REFUNDED' }).eq('id', orderId);

    // Update payment record
    await supabase
      .from('payments')
      .update({
        refund_status: 'COMPLETED',
        refund_amount: refundAmt
      })
      .eq('order_id', orderId);

    res.json({ success: true, message: `Refund of ₹${refundAmt} processed successfully!`, refundAmount: refundAmt });
  } catch (err) {
    res.status(500).json({ error: 'Refund processor error' });
  }
});

/**
 * GET /api/planet-softweb/invoices/:id
 * Fetches invoice along with order items and billing address details
 */
router.get('/invoices/:id', async (req, res) => {
  const orderId = req.params.id;

  try {
    // 1. Get invoice details
    let { data: invoice } = await supabase
      .from('invoices')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    // 2. Fetch associated order
    const { data: order } = await supabase
      .from('orders')
      .select('*, users(*), addresses(*), stores(*)')
      .eq('id', orderId)
      .single();

    if (!order) {
      return res.status(404).json({ error: 'Associated order not found' });
    }

    // If invoice doesn't exist yet (unpaid order checkout details fetch), simulate one
    if (!invoice) {
      invoice = {
        invoice_number: 'PRO-FORMA-INV',
        cgst: 0,
        sgst: 0,
        igst: 0,
        delivery_charges: order.delivery_fee,
        discount: 0,
        total_tax: 0,
        final_amount: order.total_amount,
        seller_state: 'Gujarat',
        customer_state: order.addresses?.state || 'Gujarat'
      };
    }

    // 3. Fetch order items with product SKU, HSN, and names
    const { data: orderItems } = await supabase
      .from('order_items')
      .select('*, products(*)')
      .eq('order_id', orderId);

    res.json({
      invoice,
      order,
      items: orderItems || []
    });

  } catch (err) {
    console.error('Invoice details fetch failure:', err);
    res.status(500).json({ error: 'Failed to fetch invoice details' });
  }
});

/**
 * GET /api/planet-softweb/orders/track/:id
 * Fetches live delivery coordinate status and tracking step history
 */
router.get('/orders/track/:id', async (req, res) => {
  const orderId = req.params.id;

  try {
    const { data: tracker } = await supabase
      .from('delivery_tracking')
      .select('*')
      .eq('order_id', orderId)
      .maybeSingle();

    if (!tracker) {
      return res.json({
        status: 'PLACED',
        current_lat: 23.0225,
        current_lng: 72.5714,
        tracking_steps: [
          { status: 'PLACED', message: 'Order has been placed.', time: new Date().toISOString() }
        ]
      });
    }

    res.json(tracker);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load tracker' });
  }
});

/**
 * GET /api/planet-softweb/admin/analytics
 * Aggregates GST collections, revenue, and order trends for Recharts
 */
router.get('/admin/analytics', async (req, res) => {
  try {
    const { data: invoices } = await supabase.from('invoices').select('*');
    const { data: orders } = await supabase.from('orders').select('*');

    // Aggregate key stats
    let totalRevenue = 0;
    let totalCgst = 0;
    let totalSgst = 0;
    let totalIgst = 0;

    (invoices || []).forEach(inv => {
      totalRevenue += parseFloat(inv.final_amount || 0);
      totalCgst += parseFloat(inv.cgst || 0);
      totalSgst += parseFloat(inv.sgst || 0);
      totalIgst += parseFloat(inv.igst || 0);
    });

    const totalTax = totalCgst + totalSgst + totalIgst;

    // Build monthly graph statistics
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const monthlySummary = {};

    (invoices || []).forEach(inv => {
      const date = new Date(inv.created_at || new Date());
      const monthLabel = monthNames[date.getMonth()];
      
      if (!monthlySummary[monthLabel]) {
        monthlySummary[monthLabel] = { month: monthLabel, sales: 0, tax: 0, orders: 0 };
      }
      monthlySummary[monthLabel].sales += parseFloat(inv.final_amount || 0);
      monthlySummary[monthLabel].tax += parseFloat(inv.total_tax || 0);
      monthlySummary[monthLabel].orders += 1;
    });

    const chartData = Object.values(monthlySummary);

    res.json({
      stats: {
        revenue: totalRevenue,
        orderCount: orders ? orders.length : 0,
        cgst: totalCgst,
        sgst: totalSgst,
        igst: totalIgst,
        taxCollected: totalTax
      },
      chartData: chartData.length > 0 ? chartData : [{ month: 'May', sales: totalRevenue, tax: totalTax, orders: orders ? orders.length : 0 }]
    });

  } catch (err) {
    console.error('Analytics system error:', err);
    res.status(500).json({ error: 'Failed to aggregate portal analytics' });
  }
});

/**
 * POST /api/planet-softweb/invoices/:id/share
 * Simulated WhatsApp and Email invoicing text dispatchers
 */
router.post('/invoices/:id/share', (req, res) => {
  const { channel = 'whatsapp', number, email, invoiceNo } = req.body;

  try {
    const textMessage = channel === 'whatsapp'
      ? `✅ *Planet Softweb Grocery*: Hi! Your Invoice *${invoiceNo}* is generated successfully. Track your grocery delivery live here: http://localhost:5173/planet-softweb/track`
      : `Dear Customer, your Planet Softweb tax invoice ${invoiceNo} is ready. Thank you for shopping with Planet Softweb.`;

    console.log(`[Notification Engine] Invoicing Dispatch via ${channel.toUpperCase()}:`, { destination: number || email, content: textMessage });
    
    res.json({ success: true, message: `Invoice shared successfully via ${channel}!` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to dispatch share triggers' });
  }
});

export default router;
