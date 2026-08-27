import express from 'express';
import { sendWhatsAppOTP } from '../utils/whatsapp.js';

const router = express.Router();

// In-memory OTP store: { phone: { otp, expiresAt, attempts } }
const otpStore = new Map();

function generateOTP() {
  return Math.floor(100000 + Math.random() * 900000).toString(); // 6-digit
}

// POST /api/auth/send-otp
router.post('/send-otp', async (req, res) => {
  try {
    const { phone } = req.body;
    if (!phone) return res.status(400).json({ success: false, error: 'Phone number is required' });

    const clean = phone.replace(/\D/g, '');
    if (clean.length < 10) return res.status(400).json({ success: false, error: 'Invalid phone number' });

    // Rate limit: max 1 OTP per 60 seconds per number
    const existing = otpStore.get(clean);
    if (existing && Date.now() < existing.expiresAt - 4 * 60 * 1000) {
      return res.status(429).json({ success: false, error: 'Please wait before requesting a new OTP' });
    }

    const otp = generateOTP();
    otpStore.set(clean, { otp, expiresAt: Date.now() + 5 * 60 * 1000, attempts: 0 });

    const result = await sendWhatsAppOTP(clean, otp);
    console.log(`📲 OTP sent to ${clean} via ${result.provider}`);

    // In mock mode (dev), return otp for convenience
    const responsePayload = { success: true, provider: result.provider };
    if (result.provider === 'mock') responsePayload.otp = result.otp; // dev only
    return res.json(responsePayload);

  } catch (err) {
    console.error('Send OTP error:', err.message);
    return res.status(500).json({ success: false, error: err.message || 'Failed to send OTP' });
  }
});

// POST /api/auth/verify-otp
router.post('/verify-otp', async (req, res) => {
  try {
    const { phone, otp } = req.body;
    if (!phone || !otp) return res.status(400).json({ success: false, error: 'Phone and OTP are required' });

    const clean = phone.replace(/\D/g, '');
    const record = otpStore.get(clean);

    if (!record) return res.status(400).json({ success: false, error: 'No OTP found. Please request a new one.' });
    if (Date.now() > record.expiresAt) {
      otpStore.delete(clean);
      return res.status(400).json({ success: false, error: 'OTP expired. Please request a new one.' });
    }

    record.attempts = (record.attempts || 0) + 1;
    if (record.attempts > 5) {
      otpStore.delete(clean);
      return res.status(429).json({ success: false, error: 'Too many attempts. Please request a new OTP.' });
    }

    if (record.otp !== otp.trim()) {
      return res.status(400).json({ success: false, error: 'Incorrect OTP. Please try again.' });
    }

    // OTP verified — clear it
    otpStore.delete(clean);
    return res.json({ success: true, phone: clean });

  } catch (err) {
    console.error('Verify OTP error:', err.message);
    return res.status(500).json({ success: false, error: 'Verification failed' });
  }
});

export default router;
