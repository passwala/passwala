import express from 'express';
import supabase from '../supabase.js';
import { userAuth } from './users.js';
import { apiLimiter } from '../utils/rateLimiter.js';

const router = express.Router();

// ── POST /api/promo/validate ─────────────────────────────────────────────────
// Validates a promo code and returns the discount amount.
// Does NOT decrement used_count here — that happens when the order is confirmed.
// Rate-limited + auth required to prevent brute-force code enumeration.
router.post('/validate', apiLimiter, userAuth, async (req, res) => {
  try {
    const { code, cartTotal } = req.body;

    if (!code || typeof code !== 'string') {
      return res.status(400).json({ error: 'Promo code is required.' });
    }
    if (!cartTotal || cartTotal <= 0) {
      return res.status(400).json({ error: 'Invalid cart total.' });
    }

    const normalizedCode = code.trim().toUpperCase();

    const { data: promo, error } = await supabase
      .from('promo_codes')
      .select('*')
      .eq('code', normalizedCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.error('[promo/validate] DB error:', error);
      return res.status(500).json({ error: 'Failed to validate code. Try again.' });
    }

    if (!promo) {
      return res.status(404).json({ error: 'Invalid or expired promo code.' });
    }

    // Check expiry
    if (promo.expires_at && new Date(promo.expires_at) < new Date()) {
      return res.status(400).json({ error: 'This promo code has expired.' });
    }

    // Check global usage limit
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      return res.status(400).json({ error: 'This promo code has reached its usage limit.' });
    }

    // ── Per-user redemption check ────────────────────────────────────────────
    // Resolve the authenticated user's DB UUID
    if (req.user?.uid) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('uid', req.user.uid)
        .maybeSingle();

      if (dbUser?.id) {
        const { count } = await supabase
          .from('promo_redemptions')
          .select('id', { count: 'exact', head: true })
          .eq('promo_code', normalizedCode)
          .eq('user_id', dbUser.id);

        const perUserLimit = promo.per_user_limit ?? 1; // default: 1 use per user
        if (count >= perUserLimit) {
          return res.status(400).json({ error: 'You have already used this promo code.' });
        }
      }
    }

    // Check minimum order value
    if (cartTotal < promo.min_order) {
      return res.status(400).json({
        error: `Minimum order of ₹${promo.min_order.toFixed(0)} required for this code.`,
        min_order: promo.min_order
      });
    }

    // Calculate discount
    let discountAmount = 0;
    if (promo.type === 'flat') {
      discountAmount = Math.min(promo.value, cartTotal); // never exceed cart total
    } else if (promo.type === 'percent') {
      discountAmount = (cartTotal * promo.value) / 100;
      if (promo.max_discount && discountAmount > promo.max_discount) {
        discountAmount = promo.max_discount;
      }
    }

    discountAmount = parseFloat(discountAmount.toFixed(2));

    return res.status(200).json({
      valid: true,
      code: promo.code,
      type: promo.type,
      value: promo.value,
      discount: discountAmount,
      message: promo.type === 'flat'
        ? `✅ ₹${discountAmount.toFixed(0)} off applied!`
        : `✅ ${promo.value}% off — saving ₹${discountAmount.toFixed(0)}!`
    });

  } catch (err) {
    console.error('[promo/validate] Unhandled error:', err);
    res.status(500).json({ error: 'Server error while validating promo code.' });
  }
});

// ── POST /api/promo/redeem ────────────────────────────────────────────────────
// Called after a successful order placement to increment used_count
// and record this user's redemption to prevent re-use.
router.post('/redeem', apiLimiter, userAuth, async (req, res) => {
  try {
    const { code, orderId } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required.' });

    const normalizedCode = code.trim().toUpperCase();

    // BUG B9 FIX: Validate orderId is a valid UUID before using as FK
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
    const safeOrderId = (orderId && uuidRegex.test(String(orderId).trim()))
      ? String(orderId).trim()
      : null;

    // Resolve DB user ID from Firebase UID
    let dbUserId = null;
    if (req.user?.uid) {
      const { data: dbUser } = await supabase
        .from('users')
        .select('id')
        .eq('uid', req.user.uid)
        .maybeSingle();
      dbUserId = dbUser?.id || null;
    }

    // 1. Increment global used_count via RPC (with fallback)
    const { error: rpcError } = await supabase.rpc('increment_promo_usage', { p_code: normalizedCode });

    if (rpcError) {
      // Fallback: manual increment if RPC doesn't exist yet
      const { data: promo } = await supabase
        .from('promo_codes')
        .select('id, used_count')
        .eq('code', normalizedCode)
        .maybeSingle();

      if (promo) {
        await supabase
          .from('promo_codes')
          .update({ used_count: (promo.used_count || 0) + 1 })
          .eq('id', promo.id);
      }
    }

    // 2. Record per-user redemption to prevent reuse
    if (dbUserId) {
      await supabase.from('promo_redemptions').insert([{
        user_id: dbUserId,
        promo_code: normalizedCode,
        order_id: safeOrderId,  // BUG B9: uses validated UUID only
        redeemed_at: new Date().toISOString()
      }]).select(); // ignore duplicate errors (if already inserted)
    }

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[promo/redeem] Error:', err);
    res.status(500).json({ error: 'Failed to record promo redemption.' });
  }
});

export default router;
