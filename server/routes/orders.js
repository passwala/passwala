import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import supabase from '../supabase.js';
import { sendNotification } from '../utils/notifications.js';
import { userAuth } from './users.js';

const router = express.Router();

// Initialize Razorpay Client (uses environment credentials or falls back to mock keys)
const keyId = process.env.RAZORPAY_KEY_ID || '';
const keySecret = process.env.RAZORPAY_KEY_SECRET || '';

let razorpay = null;
if (keyId && keySecret) {
  razorpay = new Razorpay({
    key_id: keyId,
    key_secret: keySecret
  });
}


/**
 * POST /api/orders/payment/create
 * Creates a Razorpay payment order.
 */
router.post('/payment/create', userAuth, async (req, res) => {
  const { amount, orderId } = req.body;

  if (!amount || !orderId) {
    return res.status(400).json({ error: 'amount and orderId are required' });
  }

  try {
    // If Razorpay keys are missing or set to dummy values, run in simulated mode
    if (!razorpay || keyId.startsWith('rzp_test_mock')) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Razorpay payment gateway credentials are not configured.');
      }
      console.log(`[Razorpay Simulator] Creating mock payment order for DB Order: ${orderId}`);
      const mockOrder = {
        id: `order_mock_${Math.random().toString(36).substring(2, 10)}`,
        amount: Math.round(amount * 100),
        currency: 'INR',
        receipt: orderId,
        status: 'created',
        is_mock: true,
        key_id: 'rzp_test_mockkeyid_123456'
      };
      return res.json(mockOrder);
    }

    const options = {
      amount: Math.round(amount * 100), // in paise
      currency: 'INR',
      receipt: orderId
    };

    console.log(`[Razorpay Real] Launching transaction on Razorpay API for ${amount} INR`);
    const order = await razorpay.orders.create(options);
    
    // Inject the public key so frontend doesn't need to read env directly
    res.json({
      ...order,
      key_id: keyId
    });
  } catch (err) {
    console.error('🔥 Razorpay Order Creation Failure:', err);
    res.status(500).json({ error: 'Payment gateway initialization failed' });
  }
});

/**
 * POST /api/orders/payment/verify
 * Verifies Razorpay payment signature and updates order status.
 */
router.post('/payment/verify', userAuth, async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderId) {
    return res.status(400).json({ error: 'Missing payment verification details' });
  }

  // 1. Input Format Validations
  // Razorpay payment ID format check
  const paymentIdRegex = /^(pay_[a-zA-Z0-9_]+|pay_mock_[a-zA-Z0-9_]+|mock_[a-zA-Z0-9_]+)$/;
  if (!paymentIdRegex.test(razorpay_payment_id)) {
    return res.status(400).json({ error: 'Invalid Razorpay payment ID format' });
  }

  // Razorpay order ID format check
  const razorpayOrderIdRegex = /^(order_[a-zA-Z0-9]+|order_mock_[a-zA-Z0-9]+|mock_[a-zA-Z0-9]+)$/;
  if (!razorpayOrderIdRegex.test(razorpay_order_id)) {
    return res.status(400).json({ error: 'Invalid Razorpay order ID format' });
  }

  // Parse and check UUID formats for order IDs
  const orderIds = (typeof orderId === 'string' 
    ? (orderId.includes(',') ? orderId.split(',') : [orderId]) 
    : (Array.isArray(orderId) ? orderId : [orderId]))
    .map(id => typeof id === 'string' ? id.trim() : id)
    .filter(id => id && id.length > 0);

  const uuidRegex = /^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{4}-[0-9a-fA-F]{12}$/;
  for (const id of orderIds) {
    if (!uuidRegex.test(id)) {
      return res.status(400).json({ error: `Invalid order ID format: ${id}` });
    }
  }

  try {
    // 2. Ownership Verification
    let dbUserId = null;
    if (req.user && req.user.uid) {
      const { data: dbUser, error: dbUserErr } = await supabase
        .from('users')
        .select('id')
        .eq('uid', req.user.uid)
        .maybeSingle();

      if (dbUserErr) {
        console.error('❌ Failed to fetch user from DB:', dbUserErr.message);
        return res.status(500).json({ error: 'Database verification failed' });
      }
      if (dbUser) {
        dbUserId = dbUser.id;
      }
    }

    if (!dbUserId && !req.isAdmin) {
      return res.status(401).json({ error: 'Unauthorized: No matching database user profile' });
    }

    // Fetch target orders to verify ownership
    const { data: ordersToCheck, error: fetchOrdersErr } = await supabase
      .from('orders')
      .select('id, user_id')
      .in('id', orderIds);

    if (fetchOrdersErr) {
      console.error('❌ Failed to verify order ownership:', fetchOrdersErr.message);
      return res.status(500).json({ error: 'Order verification failed' });
    }

    if (!ordersToCheck || ordersToCheck.length === 0) {
      return res.status(404).json({ error: 'Orders not found' });
    }

    if (!req.isAdmin) {
      const isOwnerOfAll = ordersToCheck.every(o => o.user_id === dbUserId);
      if (!isOwnerOfAll) {
        return res.status(403).json({ error: 'Forbidden: You do not own these orders' });
      }
    }

    let isVerified = false;

    // Verify signature
    if (!razorpay || keyId.startsWith('rzp_test_mock')) {
      if (process.env.NODE_ENV === 'production') {
        throw new Error('Mock payment signatures are not allowed in production.');
      }
      // Mock validation
      console.log(`[Razorpay Simulator] Verifying payment for mock order ID: ${razorpay_order_id}`);
      isVerified = (razorpay_signature === 'mock_signature' || razorpay_signature.startsWith('mock_'));
    } else {
      // Cryptographic Hmac validation
      const text = `${razorpay_order_id}|${razorpay_payment_id}`;
      const generated_signature = crypto
        .createHmac('sha256', keySecret)
        .update(text)
        .digest('hex');

      isVerified = (generated_signature === razorpay_signature);
    }

    console.log(`[Payment Verification] Validation Result: ${isVerified ? 'VERIFIED' : 'FAILED'}`);

    const finalPaymentStatus = isVerified ? 'PAID' : 'FAILED';
    const finalOrderStatus = isVerified ? 'PLACED' : 'CANCELLED';

    // 3. Update the orders table in Supabase
    let order = null;
    let orderErr = null;
    const updatePayload = {
      payment_status: finalPaymentStatus,
      status: finalOrderStatus,
      razorpay_order_id,
      razorpay_payment_id,
      updated_at: new Date().toISOString()
    };

    try {
      const { data, error } = await supabase
        .from('orders')
        .update(updatePayload)
        .in('id', orderIds)
        .select();
      
      order = data && data.length > 0 ? data[0] : null;
      orderErr = error;
    } catch (err) {
      orderErr = err;
    }

    if (orderErr) {
      const errStr = orderErr.message || String(orderErr);
      if (errStr.includes('payment_status') || errStr.includes('razorpay_')) {
        console.warn("⚠️ Database orders table is missing custom payment columns. Retrying update with status only.");
        const fallbackPayload = {
          status: finalOrderStatus,
          updated_at: new Date().toISOString()
        };

        const { data, error } = await supabase
          .from('orders')
          .update(fallbackPayload)
          .in('id', orderIds)
          .select();
        
        order = data && data.length > 0 ? data[0] : null;
        orderErr = error;
      }
    }

    if (orderErr) {
      console.error('❌ Failed to update order status in Supabase:', orderErr.message);
      return res.status(500).json({ error: 'Database update failed' });
    }

    // 2. Also update associated service_bookings if any
    try {
      const { data: updatedOrders } = await supabase
        .from('orders')
        .select('id, user_id, store_id')
        .in('id', orderIds);

      if (updatedOrders && updatedOrders.length > 0) {
        for (const ord of updatedOrders) {
          // Fetch order items to get the specific service_id
          const { data: orderItems } = await supabase
            .from('order_items')
            .select('product_id')
            .eq('order_id', ord.id);

          if (orderItems && orderItems.length > 0) {
            for (const item of orderItems) {
              await supabase
                .from('service_bookings')
                .update({ status: finalOrderStatus })
                .eq('user_id', ord.user_id)
                .eq('provider_id', ord.store_id)
                .eq('service_id', item.product_id)
                .eq('status', 'PENDING');
            }
          }
        }
      }
    } catch (bookingErr) {
      console.warn('⚠️ Service bookings status update failed (non-critical):', bookingErr.message || bookingErr);
    }

    // Note: Stock decrement is automatically handled by the database trigger (trigger_decrement_stock) on order_items insert.


    res.json({
      success: isVerified,
      payment_status: finalPaymentStatus,
      order
    });
  } catch (err) {
    console.error('🔥 Payment Verification Server Error:', err);
    res.status(500).json({ error: 'Server validation failed' });
  }
});

/**
 * POST /api/orders/notify-new-order
 * Fetches vendor and active rider tokens and triggers push/in-app notifications.
 */
router.post('/notify-new-order', async (req, res) => {
  const { orderId, storeId } = req.body;

  if (!orderId || !storeId) {
    return res.status(400).json({ error: 'orderId and storeId are required' });
  }

  try {
    console.log(`[Notification Engine] Processing notifications for Order #${orderId.substring(0,8)}`);

    // 1. Notify Vendor / Service Provider
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('name, vendors(user_id)')
      .eq('id', storeId)
      .maybeSingle();

    if (storeErr) {
      console.error('❌ Error fetching store vendor:', storeErr.message);
    }

    let providerUserId = store?.vendors?.user_id;
    let isServiceBooking = false;

    if (!providerUserId) {
      // Check if it exists in service_providers
      const { data: prov, error: provErr } = await supabase
        .from('service_providers')
        .select('user_id')
        .eq('id', storeId)
        .maybeSingle();

      if (provErr) {
        console.error('❌ Error fetching service provider user:', provErr.message);
      }

      if (prov) {
        providerUserId = prov.user_id;
        isServiceBooking = true;
      }
    }

    if (providerUserId) {
      console.log(`[Notification Engine] Notifying Provider/Vendor: User ID ${providerUserId}`);
      const title = isServiceBooking ? 'New Booking Received! 🛠️' : 'New Order Received! 🛍️';
      const msg = isServiceBooking 
        ? `A customer has booked a new service #${orderId.substring(0, 8)} with you. Please review details.`
        : `A customer has placed a new order #${orderId.substring(0, 8)} at your store "${store?.name || 'Local Store'}". Please prepare the items.`;

      await sendNotification(
        providerUserId,
        title,
        msg,
        { orderId, type: 'new_order' }
      );
    } else {
      console.log(`⚠️ Store "${store?.name || storeId}" has no associated user ID, skipping push.`);
    }

    // 2. Notify Active Riders (Only if it's not a service booking)
    if (!isServiceBooking) {
      const { data: activeRiders, error: ridersErr } = await supabase
        .from('riders')
        .select('user_id')
        .eq('is_active', true)
        .eq('is_verified', true);

      if (ridersErr) {
        console.error('❌ Error fetching active riders:', ridersErr.message);
      }

      if (activeRiders && activeRiders.length > 0) {
        console.log(`[Notification Engine] Notifying ${activeRiders.length} Active, Verified Riders`);
        for (const rider of activeRiders) {
          if (rider.user_id && rider.user_id !== providerUserId) { // Avoid notifying if rider is also store owner
            await sendNotification(
              rider.user_id,
              'New Delivery Job! 🛵',
              `A new order #${orderId.substring(0, 8)} is ready for pick-up at "${store?.name || 'Local Store'}". Earn extra on delivery!`,
              { orderId, type: 'rider_job' }
            );
          }
        }
      } else {
        console.log('ℹ️ No active, verified riders currently online to receive push.');
      }
    } else {
      console.log('ℹ️ Service booking detected. Skipping rider notifications.');
    }

    res.json({ success: true, message: 'Notifications dispatched successfully' });
  } catch (err) {
    console.error('🔥 Notification Dispatch Server Error:', err);
    res.status(500).json({ error: 'Server failed to dispatch notifications' });
  }
});

/**
 * GET /api/orders/user-history/:userId
 * Securely fetches order history with order items for a specific user using service role
 */
router.get('/user-history/:userId', async (req, res) => {
  const { userId } = req.params;

  if (!userId || userId.length !== 36) {
    return res.status(400).json({ error: 'A valid 36-character user UUID is required' });
  }

  try {
    const { data: dbOrders, error } = await supabase
      .from('orders')
      .select(`
        *, 
        addresses(*),
        stores(name),
        order_items(
          id,
          quantity,
          price_at_purchase,
          products(name)
        )
      `)
      .eq('user_id', userId)
      .neq('status', 'PENDING')
      .order('created_at', { ascending: false });

    if (error) {
      console.error(`❌ Error fetching order history for user ${userId}:`, error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json(dbOrders || []);
  } catch (err) {
    console.error('🔥 Server Error in user-history endpoint:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

