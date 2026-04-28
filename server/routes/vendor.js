import express from 'express';
import supabase from '../supabase.js';

const router = express.Router();

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

// POST /api/vendor/approve/:id — Approve a vendor (using service role to bypass RLS)
router.post('/approve/:id', async (req, res) => {
  const { id } = req.params;
  const { appData } = req.body;

  try {
    const isShop = appData.category === 'shop';
    const targetTable = isShop ? 'products' : 'services';

    // 1. Insert into target table
    const { error: insertError } = await supabase
      .from(targetTable)
      .insert([{
        title: appData.business_name,
        price: appData.plan === 'Pro' ? 1999 : appData.plan === 'Growth' ? 999 : 499,
        category: isShop ? 'grocery' : 'home',
        ...(isShop ? {} : { rating: 5.0, image: '/default_service.png' })
      }]);
    
    if (insertError) throw insertError;

    // 2. Update status to approved
    const { error: updateError } = await supabase
      .from('vendors')
      .update({ status: 'approved' })
      .eq('id', id);

    if (updateError) throw updateError;

    res.json({ success: true, message: 'Vendor approved successfully via secure server' });
  } catch (error) {
    console.error('Approval Server Error:', error);
    res.status(500).json({ error: error.message });
  }
});

export default router;
