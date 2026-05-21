import express from 'express';
import crypto from 'crypto';
import Razorpay from 'razorpay';
import supabase from '../supabase.js';
import { sendNotification } from '../utils/notifications.js';
import { apiLimiter } from '../utils/rateLimiter.js';

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

// Apply API general rate limit on orders routes
router.use(apiLimiter);

/**
 * POST /api/orders/payment/create
 * Creates a Razorpay payment order.
 */
router.post('/payment/create', async (req, res) => {
  const { amount, orderId } = req.body;

  if (!amount || !orderId) {
    return res.status(400).json({ error: 'amount and orderId are required' });
  }

  try {
    // If Razorpay keys are missing or set to dummy values, run in simulated mode
    if (!razorpay || keyId.startsWith('rzp_test_mock')) {
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
router.post('/payment/verify', async (req, res) => {
  const { razorpay_payment_id, razorpay_order_id, razorpay_signature, orderId } = req.body;

  if (!razorpay_payment_id || !razorpay_order_id || !razorpay_signature || !orderId) {
    return res.status(400).json({ error: 'Missing payment verification details' });
  }

  try {
    let isVerified = false;

    // Verify signature
    if (!razorpay || keyId.startsWith('rzp_test_mock')) {
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

    // 1. Update the orders table in Supabase
    const { data: order, error: orderErr } = await supabase
      .from('orders')
      .update({
        payment_status: finalPaymentStatus,
        status: finalOrderStatus,
        razorpay_order_id,
        razorpay_payment_id,
        updated_at: new Date().toISOString()
      })
      .eq('id', orderId)
      .select()
      .single();

    if (orderErr) {
      console.error('❌ Failed to update order status in Supabase:', orderErr.message);
      return res.status(500).json({ error: 'Database update failed' });
    }

    // 2. Also update associated service_bookings if any
    const { error: bookingErr } = await supabase
      .from('service_bookings')
      .update({
        status: finalOrderStatus
      })
      .eq('id', orderId); // booking shares order ID or is related, handle safely

    if (bookingErr) {
      console.warn('⚠️ Service bookings status update failed (non-critical):', bookingErr.message);
    }

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

    // 1. Notify Vendor
    const { data: store, error: storeErr } = await supabase
      .from('stores')
      .select('name, vendors(user_id)')
      .eq('id', storeId)
      .maybeSingle();

    if (storeErr) {
      console.error('❌ Error fetching store vendor:', storeErr.message);
    }

    const vendorUserId = store?.vendors?.user_id;
    if (vendorUserId) {
      console.log(`[Notification Engine] Notifying Store Owner/Vendor: User ID ${vendorUserId}`);
      await sendNotification(
        vendorUserId,
        'New Order Received! 🛍️',
        `A customer has placed a new order #${orderId.substring(0, 8)} at your store "${store.name}". Please prepare the items.`,
        { orderId, type: 'new_order' }
      );
    } else {
      console.log(`⚠️ Store "${store?.name || storeId}" has no associated vendor user ID, skipping vendor push.`);
    }

    // 2. Notify Active Riders
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
        if (rider.user_id && rider.user_id !== vendorUserId) { // Avoid notifying if rider is also store owner
          await sendNotification(
            rider.user_id,
            'New Delivery Job! 🛵',
            `A new order #${orderId.substring(0, 8)} is ready for pick-up at "${store?.name || 'Local Store'}". Earn extra on delivery!`,
            { orderId, type: 'rider_job' }
          );
        }
      }
    } else {
      console.log('ℹ️ No active, verified riders currently online in Ahmedabad to receive push.');
    }

    res.json({ success: true, message: 'Notifications dispatched successfully' });
  } catch (err) {
    console.error('🔥 Notification Dispatch Server Error:', err);
    res.status(500).json({ error: 'Server failed to dispatch notifications' });
  }
});

export default router;
