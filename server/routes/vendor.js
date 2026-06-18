import express from 'express';
import supabase from '../supabase.js';
import { adminAuth } from './admin.js';

const router = express.Router();

router.use(adminAuth); // Secure all vendor endpoints

// GET /api/vendor/apps — Get all vendor applications
router.get('/apps', async (req, res) => {
  try {
    const { data, error } = await supabase
      .from('vendors')
      .select('*')
      .order('created_at', { ascending: false });
    if (error) throw error;
    res.json({ success: true, data });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/vendor/approve/:id
 * BUG B1 FIX: Was incorrectly trying to insert into 'products' or 'services'
 * with wrong field names (title, category, rating, image) that don't exist.
 * Correct flow: set is_verified=true on vendors + create a store record for shop vendors.
 */
router.post('/approve/:id', async (req, res) => {
  const { id } = req.params;  // vendor UUID

  try {
    // 1. Fetch vendor to know their category
    const { data: vendor, error: fetchErr } = await supabase
      .from('vendors')
      .select('*')
      .eq('id', id)
      .single();

    if (fetchErr || !vendor) {
      return res.status(404).json({ error: 'Vendor not found' });
    }

    // 2. Mark vendor as verified
    const { error: updateError } = await supabase
      .from('vendors')
      .update({ is_verified: true })
      .eq('id', id);

    if (updateError) throw updateError;

    // 3. If shop vendor — create a store record if one doesn't exist
    if (vendor.category && vendor.category.toLowerCase().includes('shop')) {
      const { data: existingStore } = await supabase
        .from('stores')
        .select('id')
        .eq('vendor_id', id)
        .maybeSingle();

      if (!existingStore) {
        const { error: storeError } = await supabase
          .from('stores')
          .insert([{
            vendor_id: id,
            name: vendor.business_name || vendor.name || 'New Store',
            address: vendor.address || '',
            lat: vendor.lat || null,
            lng: vendor.lng || null,
            is_open: true,
          }]);

        if (storeError) {
          console.warn('[vendor/approve] Store creation failed:', storeError.message);
        }
      }
    }

    // 4. Update the user role to VENDOR if still BUYER
    if (vendor.user_id) {
      await supabase
        .from('users')
        .update({ role: 'VENDOR' })
        .eq('id', vendor.user_id)
        .eq('role', 'BUYER'); // only upgrade if still BUYER
    }

    res.json({ success: true, message: 'Vendor approved successfully.' });
  } catch (error) {
    console.error('[vendor/approve] Error:', error);
    res.status(500).json({ error: error.message });
  }
});

/**
 * POST /api/vendor/reject/:id
 * Reject a vendor application.
 */
router.post('/reject/:id', async (req, res) => {
  const { id } = req.params;
  try {
    const { error } = await supabase
      .from('vendors')
      .update({ is_verified: false })
      .eq('id', id);
    if (error) throw error;
    res.json({ success: true, message: 'Vendor rejected.' });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

export default router;
