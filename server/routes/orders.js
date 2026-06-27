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
        id: `order_mock_${crypto.randomBytes(4).toString('hex')}`,
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
 * POST /api/orders/payment/gokwik/create
 * Initiates a GoKwik checkout session.
 */
router.post('/payment/gokwik/create', userAuth, async (req, res) => {
  const { amount, orderId } = req.body;

  if (!amount || !orderId) {
    return res.status(400).json({ error: 'amount and orderId are required' });
  }

  const gokwikUrl = process.env.GOKWIK_API_URL || 'https://sandbox.gokwik.co';
  const merchantId = process.env.GOKWIK_MERCHANT_ID || '';
  const appId = process.env.GOKWIK_APP_ID || '';
  const appSecret = process.env.GOKWIK_APP_SECRET || '';

  const isMock = !merchantId || !appId || !appSecret || merchantId.startsWith('YOUR_');

  try {
    if (isMock) {
      console.log(`[GoKwik Simulator] Creating mock payment session for Order: ${orderId}`);
      const mockToken = `gkwk_token_${crypto.randomBytes(8).toString('hex')}`;
      return res.json({
        success: true,
        is_mock: true,
        checkout_url: `http://localhost:3001/#/gokwik-checkout?token=${mockToken}&amount=${amount}&orderId=${orderId}`,
        order_id: `gkwk_order_${crypto.randomBytes(4).toString('hex')}`
      });
    }

    console.log(`[GoKwik Real] Initiating checkout session on GoKwik API`);
    const response = await fetch(`${gokwikUrl}/v2/checkout/init`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'appid': appId,
        'appsecret': appSecret
      },
      body: JSON.stringify({
        merchant_id: merchantId,
        order_id: orderId,
        amount: amount,
        currency: 'INR',
        redirect_url: `${req.protocol}://${req.get('host')}/track-orders`
      })
    });

    if (!response.ok) {
      throw new Error(`GoKwik gateway returned status ${response.status}`);
    }

    const data = await response.json();
    res.json({
      success: true,
      is_mock: false,
      checkout_url: data.checkout_url || data.url,
      order_id: data.order_id
    });
  } catch (err) {
    console.error('🔥 GoKwik Order Creation Failure:', err);
    res.status(500).json({ error: 'GoKwik gateway initialization failed' });
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

    if (finalOrderStatus === 'PLACED') {
      // NOTE: Stock decrement is handled atomically by the database trigger
      // 'trigger_decrement_stock' which fires AFTER INSERT on order_items.
      // DO NOT manually decrement stock here — that would cause a double-deduction
      // (DB trigger already ran when order_items were inserted in the checkout flow).
      // If the trigger is not deployed, run: database/create_stock_triggers.sql

      // 2. Setup delivery tracking records
      try {
        for (const id of orderIds) {
          const { data: existing } = await supabase
            .from('delivery_tracking')
            .select('id')
            .eq('order_id', id)
            .maybeSingle();

          if (!existing) {
            await supabase
              .from('delivery_tracking')
              .insert([{
                order_id: id,
                status: 'PENDING',
                updated_at: new Date().toISOString()
              }]);
          }
        }
      } catch (trackErr) {
        console.warn("⚠️ Failed to auto-create delivery tracking records:", trackErr.message || trackErr);
      }
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
 * Fix #3: Auth guard added — unauthenticated callers could previously spam push
 * notifications to all vendors and riders with any orderId/storeId pair.
 */
router.post('/notify-new-order', userAuth, async (req, res) => {
  const { orderId, storeId } = req.body;

  if (!orderId || !storeId) {
    return res.status(400).json({ error: 'orderId and storeId are required' });
  }

  try {
    console.log(`[Notification Engine] Processing notifications for Order #${orderId.substring(0,8)}`);

    try {
      const { data: existing } = await supabase
        .from('delivery_tracking')
        .select('id')
        .eq('order_id', orderId)
        .maybeSingle();

      if (!existing) {
        await supabase
          .from('delivery_tracking')
          .insert([{
            order_id: orderId,
            status: 'PENDING',
            updated_at: new Date().toISOString()
          }]);
      }
    } catch (trackErr) {
      console.warn("⚠️ Failed to auto-create tracking in notify-new-order:", trackErr.message || trackErr);
    }

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
 * Fix #2: Added userAuth + ownership check — previously any caller knowing a UUID
 * could read full order history (addresses, items, prices) with no authentication.
 */
router.get('/user-history/:userId', userAuth, async (req, res) => {
  const { userId } = req.params;

  // Fix #9: Proper UUID regex (length=36 alone accepted "aaa-bbb-ccc-ddd-eee" etc.)
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
  if (!userId || !uuidRegex.test(userId)) {
    return res.status(400).json({ error: 'A valid UUID is required' });
  }

  // Fix #2: Ownership check — verify the authenticated user owns this userId
  if (!req.isAdmin && req.user?.uid) {
    try {
      const { data: dbUser } = await supabase
        .from('users').select('id').eq('uid', req.user.uid).maybeSingle();
      if (!dbUser || dbUser.id !== userId) {
        return res.status(403).json({ error: 'Forbidden: You cannot access another user\'s orders' });
      }
    } catch (ownerErr) {
      console.error('Ownership check failed:', ownerErr.message);
      return res.status(500).json({ error: 'Authorization check failed' });
    }
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
      console.error(`Error fetching order history for user ${userId}:`, error.message);
      return res.status(500).json({ error: error.message });
    }

    res.json(dbOrders || []);
  } catch (err) {
    console.error('Server Error in user-history endpoint:', err);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

/**
 * POST /api/orders/rate
 * Submit a 1-5 star rating for a delivered order.
 * Requires auth. Validates ownership. Prevents duplicate ratings.
 */
router.post('/rate', userAuth, async (req, res) => {
  const { orderId, rating, comment } = req.body;

  if (!orderId || !rating) {
    return res.status(400).json({ error: 'orderId and rating are required.' });
  }
  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  try {
    // Resolve DB user ID from Firebase UID
    let dbUserId = null;
    if (req.user?.uid) {
      const { data: dbUser } = await supabase
        .from('users').select('id').eq('uid', req.user.uid).maybeSingle();
      dbUserId = dbUser?.id || null;
    }
    if (!dbUserId) {
      return res.status(401).json({ error: 'Could not resolve your account. Please log in again.' });
    }

    // Verify the order exists and belongs to this user
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .select('id, user_id, store_id, status')
      .eq('id', orderId)
      .maybeSingle();

    if (orderErr || !order) {
      return res.status(404).json({ error: 'Order not found.' });
    }
    if (order.user_id !== dbUserId) {
      return res.status(403).json({ error: 'You can only rate your own orders.' });
    }
    if (!['DELIVERED', 'COMPLETED'].includes(order.status)) {
      return res.status(400).json({ error: 'You can only rate delivered orders.' });
    }

    // Check if already rated
    const { data: existing } = await supabase
      .from('order_ratings')
      .select('id')
      .eq('order_id', orderId)
      .eq('user_id', dbUserId)
      .maybeSingle();

    if (existing) {
      return res.status(409).json({ error: 'You have already rated this order.' });
    }

    // Insert rating
    const { error: insertErr } = await supabase.from('order_ratings').insert([{
      order_id: orderId,
      user_id: dbUserId,
      store_id: order.store_id || null,
      rating: ratingNum,
      comment: comment?.trim() || null
    }]);

    if (insertErr) throw insertErr;

    res.status(201).json({ success: true, message: 'Rating submitted. Thank you!' });
  } catch (err) {
    console.error('❌ Rating submit error:', err.message);
    res.status(500).json({ error: 'Failed to submit rating. Please try again.' });
  }
});

/**
 * POST /api/orders/book-service
 * Creates and confirms a service booking order directly from AI assistant
 */
router.post('/book-service', userAuth, async (req, res) => {
  try {
    const { serviceId, providerId, price, userId: bodyUserId } = req.body;

    if (!serviceId || !providerId) {
      return res.status(400).json({ error: 'serviceId and providerId are required' });
    }

    // Resolve database user ID — try multiple lookup strategies
    const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    let dbUserId = null;

    // Strategy 1: firebase uid column
    if (!dbUserId && req.user?.uid) {
      const { data: dbUser } = await supabase.from('users').select('id').eq('uid', req.user.uid).maybeSingle();
      dbUserId = dbUser?.id;
    }
    // Strategy 2: req.user.uid is a DB UUID (phone-OTP mock token)
    if (!dbUserId && req.user?.uid && isUuid(req.user.uid)) {
      const { data: dbUser } = await supabase.from('users').select('id').eq('id', req.user.uid).maybeSingle();
      dbUserId = dbUser?.id;
    }
    // Strategy 3: explicit userId from body
    if (!dbUserId && bodyUserId) {
      if (isUuid(bodyUserId)) {
        const { data: dbUser } = await supabase.from('users').select('id').eq('id', bodyUserId).maybeSingle();
        dbUserId = dbUser?.id;
      } else {
        const { data: dbUser } = await supabase.from('users').select('id').eq('uid', bodyUserId).maybeSingle();
        dbUserId = dbUser?.id;
      }
    }

    if (!dbUserId) {
      return res.status(401).json({ error: 'Unauthorized user profile' });
    }

    // Ensure service provider is auto-registered as a store
    const { data: serviceProv } = await supabase
      .from('service_providers')
      .select('id, business_name, user_id, phone, address')
      .eq('id', providerId)
      .maybeSingle();

    if (serviceProv) {
      let vendorId = null;
      if (serviceProv.user_id) {
        const { data: existingVendor } = await supabase
          .from('vendors')
          .select('id')
          .eq('user_id', serviceProv.user_id)
          .maybeSingle();

        if (existingVendor) {
          vendorId = existingVendor.id;
        } else {
          const { data: newVendor } = await supabase
            .from('vendors')
            .insert([{
              user_id: serviceProv.user_id,
              phone: serviceProv.phone || `temp_${Date.now()}`,
              name: serviceProv.business_name || 'Service Provider',
              business_name: serviceProv.business_name || 'Service Provider',
              is_verified: true,
              profile_completed: true
            }])
            .select('id')
            .single();
          if (newVendor) vendorId = newVendor.id;
        }
      }

      if (vendorId) {
        await supabase.from('stores').upsert({
          id: providerId,
          vendor_id: vendorId,
          name: serviceProv.business_name || 'Service Provider',
          address: serviceProv.address || 'Service Area',
          lat: 23.0225,
          lng: 72.5714,
          is_open: true
        });
      }
    }

    // Fetch user address
    const { data: userAddr } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();

    const addressId = userAddr?.id || null;

    // Create the order
    const total = parseFloat((price * 1.05).toFixed(2));
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        user_id: dbUserId,
        store_id: providerId,
        address_id: addressId,
        subtotal: price,
        total_amount: total,
        payment_method: 'ONLINE',
        payment_status: 'PAID',
        status: 'PLACED'
      }])
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Create order item
    const { error: itemErr } = await supabase
      .from('order_items')
      .insert([{
        order_id: order.id,
        product_id: serviceId,
        quantity: 1,
        price_at_purchase: price
      }]);

    if (itemErr) throw itemErr;

    // Create service booking
    const { error: bookingErr } = await supabase
      .from('service_bookings')
      .insert([{
        user_id: dbUserId,
        provider_id: providerId,
        service_id: serviceId,
        status: 'PLACED'
      }]);

    if (bookingErr) throw bookingErr;

    // Auto-create delivery tracking for service if needed
    try {
      await supabase
        .from('delivery_tracking')
        .insert([{
          order_id: order.id,
          status: 'PENDING',
          updated_at: new Date().toISOString()
        }]);
    } catch (_) { /* ignore delivery tracking error */ }

    res.json({ success: true, order });
  } catch (err) {
    console.error('Service direct booking failed:', err);
    res.status(500).json({ error: 'Failed to book service' });
  }
});

/**
 * POST /api/orders/place
 * Places an order for products directly from the AI chat assistant or client
 */
router.post('/place', userAuth, async (req, res) => {
  try {
    const { items, totalPrice, userId: bodyUserId } = req.body;

    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ error: 'items array is required' });
    }

    // Resolve database user ID — try multiple lookup strategies
    let dbUserId = null;

    // Strategy 1: look up by firebase uid column
    if (!dbUserId && req.user?.uid) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('uid', req.user.uid)
        .maybeSingle();
      dbUserId = dbUser?.id;
    }

    // Strategy 2: req.user.uid might already be the DB UUID (phone-OTP mock token)
    const isUuid = (val) => /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(val);
    if (!dbUserId && req.user?.uid && isUuid(req.user.uid)) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('id', req.user.uid)
        .maybeSingle();
      dbUserId = dbUser?.id;
    }

    // Strategy 3: use explicit userId from body (trusted — already behind userAuth)
    if (!dbUserId && bodyUserId) {
      if (isUuid(bodyUserId)) {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('id', bodyUserId)
          .maybeSingle();
        dbUserId = dbUser?.id;
      } else {
        const { data: dbUser } = await supabase
          .from('users')
          .select('id')
          .eq('uid', bodyUserId)
          .maybeSingle();
        dbUserId = dbUser?.id;
      }
    }

    if (!dbUserId) {
      return res.status(401).json({ error: 'Unauthorized user profile' });
    }

    // Resolve store ID
    let storeId = items[0]?.store_id || items[0]?.shop_id;
    if (!storeId) {
      // Fallback to any active store
      const { data: anyStore } = await supabase.from('stores').select('id').limit(1).maybeSingle();
      storeId = anyStore?.id;
    }

    // Resolve address
    const { data: userAddr } = await supabase
      .from('addresses')
      .select('id')
      .eq('user_id', dbUserId)
      .eq('is_default', true)
      .limit(1)
      .maybeSingle();

    const addressId = userAddr?.id || null;

    // Create the order
    const total = parseFloat((totalPrice * 1.05).toFixed(2));
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .insert([{
        user_id: dbUserId,
        store_id: storeId,
        address_id: addressId,
        subtotal: totalPrice,
        total_amount: total,
        status: 'PLACED'
      }])
      .select()
      .single();

    if (orderErr) throw orderErr;

    // Create order items
    const orderItems = items.map(item => ({
      order_id: order.id,
      product_id: item.productId || item.id,
      quantity: item.quantity || item.qty || 1,
      price_at_purchase: item.price
    }));

    const { error: itemsErr } = await supabase
      .from('order_items')
      .insert(orderItems);

    if (itemsErr) throw itemsErr;

    // Setup delivery tracking
    try {
      await supabase
        .from('delivery_tracking')
        .insert([{
          order_id: order.id,
          status: 'PENDING',
          updated_at: new Date().toISOString()
        }]);
    } catch (_) { /* ignore delivery tracking error */ }

    res.json({ success: true, order });
  } catch (err) {
    console.error('Direct order placement failed:', err);
    res.status(500).json({ error: 'Failed to place order' });
  }
});

export default router;
