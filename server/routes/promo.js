import express from 'express';
import supabase from '../supabase.js';
import { apiLimiter } from '../utils/rateLimiter.js';

const router = express.Router();

// ── POST /api/promo/validate ─────────────────────────────────────────────────
// Validates a promo code and returns the discount amount.
// Does NOT decrement used_count here — that happens when the order is confirmed.
// Rate-limited to prevent brute-force code enumeration.
router.post('/validate', apiLimiter, async (req, res) => {
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

    // Check usage limit
    if (promo.max_uses !== null && promo.used_count >= promo.max_uses) {
      return res.status(400).json({ error: 'This promo code has reached its usage limit.' });
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
// Called after a successful order placement to increment used_count.
// This is fire-and-forget from the client — failure here won't block the order.
router.post('/redeem', apiLimiter, async (req, res) => {
  try {
    const { code } = req.body;
    if (!code) return res.status(400).json({ error: 'Code required.' });

    const normalizedCode = code.trim().toUpperCase();

    const { error } = await supabase.rpc('increment_promo_usage', { p_code: normalizedCode });

    if (error) {
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

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error('[promo/redeem] Error:', err);
    res.status(500).json({ error: 'Failed to record promo redemption.' });
  }
});

export default router;
