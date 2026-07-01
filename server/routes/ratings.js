import express from 'express';
import fs from 'fs/promises';
import path from 'path';
import crypto from 'crypto';
import { fileURLToPath } from 'url';
import { userAuth } from './users.js';
import supabase from '../supabase.js';

const router = express.Router();
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const RATINGS_FILE = path.join(__dirname, '..', 'data', 'ratings.json');

// Helper to load ratings from JSON file
async function loadRatings() {
  try {
    await fs.mkdir(path.dirname(RATINGS_FILE), { recursive: true });
    const content = await fs.readFile(RATINGS_FILE, 'utf-8');
    return JSON.parse(content);
  } catch (err) {
    return [];
  }
}

// Helper to save ratings to JSON file
async function saveRatings(ratings) {
  await fs.mkdir(path.dirname(RATINGS_FILE), { recursive: true });
  await fs.writeFile(RATINGS_FILE, JSON.stringify(ratings, null, 2), 'utf-8');
}

/**
 * POST /api/ratings/rate
 * Submit a rating for a sports venue booking or event booking.
 */
router.post('/rate', userAuth, async (req, res) => {
  const { bookingId, rating, comment, businessType, vendorId } = req.body;

  if (!bookingId || !rating || !businessType || !vendorId) {
    return res.status(400).json({ error: 'Missing required fields: bookingId, rating, businessType, vendorId' });
  }

  const ratingNum = parseInt(rating);
  if (isNaN(ratingNum) || ratingNum < 1 || ratingNum > 5) {
    return res.status(400).json({ error: 'Rating must be between 1 and 5.' });
  }

  try {
    // Resolve DB user ID from Firebase UID
    let dbUserId = null;
    let dbUserName = 'Passwala User';
    if (req.user?.uid) {
      const { data: dbUser } = await supabase
        .from('users').select('id, full_name').eq('uid', req.user.uid).maybeSingle();
      dbUserId = dbUser?.id || null;
      dbUserName = dbUser?.full_name || dbUserName;
    }
    if (!dbUserId) {
      return res.status(401).json({ error: 'Could not resolve your account. Please log in again.' });
    }

    const ratings = await loadRatings();
    const existing = ratings.find(r => r.booking_id === bookingId && r.user_id === dbUserId);
    if (existing) {
      return res.status(409).json({ error: 'You have already rated this booking.' });
    }

    const newRating = {
      id: crypto.randomUUID?.() || Math.random().toString(36).substring(2),
      booking_id: bookingId,
      user_id: dbUserId,
      user_name: dbUserName,
      vendor_id: vendorId,
      business_type: businessType,
      rating: ratingNum,
      comment: comment?.trim() || null,
      created_at: new Date().toISOString()
    };

    ratings.push(newRating);
    await saveRatings(ratings);

    // Update the average rating of the sports venue in Supabase!
    if (businessType === 'sports') {
      const venueRatings = ratings.filter(r => r.vendor_id === vendorId && r.business_type === 'sports');
      const avgRating = venueRatings.reduce((sum, r) => sum + r.rating, 0) / venueRatings.length;
      await supabase
        .from('sports_venues')
        .update({ 
          rating: parseFloat(avgRating.toFixed(2)),
          rating_count: venueRatings.length
        })
        .eq('id', vendorId);
    }

    res.status(201).json({ success: true, message: 'Rating submitted successfully!', rating: newRating });
  } catch (err) {
    console.error('Rating error:', err);
    res.status(500).json({ error: 'Failed to submit rating.' });
  }
});

/**
 * GET /api/ratings/rated
 * Get all rated booking IDs for the current user.
 */
router.get('/rated', userAuth, async (req, res) => {
  try {
    let dbUserId = null;
    if (req.user?.uid) {
      const { data: dbUser } = await supabase
        .from('users').select('id').eq('uid', req.user.uid).maybeSingle();
      dbUserId = dbUser?.id || null;
    }
    if (!dbUserId) {
      return res.status(401).json({ error: 'Unauthorized' });
    }

    const ratings = await loadRatings();
    const ratedIds = ratings.filter(r => r.user_id === dbUserId).map(r => r.booking_id);

    // Also fetch database-rated order IDs from order_ratings to merge them
    const { data: dbRatings } = await supabase
      .from('order_ratings')
      .select('order_id')
      .eq('user_id', dbUserId);

    if (dbRatings) {
      dbRatings.forEach(r => {
        if (r.order_id) ratedIds.push(r.order_id);
      });
    }

    res.json({ success: true, ratedIds });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/ratings/vendor/:storeId
 * Fetch all ratings for a given vendor (can be shop, service, event, sports).
 */
router.get('/vendor/:storeId', async (req, res) => {
  const { storeId } = req.params;
  const { businessType } = req.query;

  try {
    const ratings = await loadRatings();
    
    // Filter ratings from file
    const fileRatings = ratings
      .filter(r => r.vendor_id === storeId && r.business_type === businessType)
      .map(r => ({
        user: r.user_name || 'Passwala User',
        rating: r.rating || 5,
        comment: r.comment || 'Excellent experience!',
        date: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
        avatar: (r.user_name || 'P').charAt(0)
      }));

    // If it is a shop or service, we also load from order_ratings table
    let dbReviews = [];
    if (businessType === 'shop' || businessType === 'service') {
      const { data } = await supabase
        .from('order_ratings')
        .select('rating, comment, created_at, order_id, users(full_name)')
        .eq('store_id', storeId)
        .order('created_at', { ascending: false });

      if (data) {
        dbReviews = data.map(r => ({
          user: r.users?.full_name || 'Passwala User',
          rating: r.rating || 5,
          comment: r.comment || `Great service! (Order #${r.order_id ? String(r.order_id).substring(0, 6).toUpperCase() : ''})`,
          date: new Date(r.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' }),
          avatar: (r.users?.full_name || 'P').charAt(0)
        }));
      }
    }

    // Merge both
    const allReviews = [...fileRatings, ...dbReviews];

    res.json({ success: true, reviews: allReviews });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
