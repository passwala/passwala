import express from 'express';
import supabase from '../supabase.js';
import { userAuth } from './users.js';

const router = express.Router();

// Register a new rider (secured with userAuth)
router.post('/register', userAuth, async (req, res) => {
  const { user_id, vehicle_no, license_no, id_proof } = req.body;

  // Security check: Ensure users can only register themselves, unless they are admin
  if (!req.isAdmin) {
    const { data: dbUser } = await supabase
      .from('users')
      .select('uid')
      .eq('id', user_id)
      .maybeSingle();

    if (!dbUser || dbUser.uid !== req.user.uid) {
      return res.status(403).json({ success: false, error: 'Forbidden: You cannot register a rider profile for another user.' });
    }
  }

  try {
    // 1. Check if rider exists by user_id
    const { data: existingRider } = await supabase
      .from('riders')
      .select('*')
      .eq('user_id', user_id)
      .maybeSingle();

    const riderData = {
      user_id,
      vehicle_no: vehicle_no || 'Pending',
      license_no: license_no || 'Pending',
      id_proof: id_proof || 'Pending',
      is_active: false,
      is_verified: false
    };

    let resultData, resultError;

    if (existingRider) {
      // Update existing
      const { data, error } = await supabase
        .from('riders')
        .update(riderData)
        .eq('id', existingRider.id)
        .select()
        .single();
      resultData = data;
      resultError = error;
    } else {
      // Create new
      const { data, error } = await supabase
        .from('riders')
        .insert([riderData])
        .select()
        .single();
      resultData = data;
      resultError = error;
    }

    if (resultError) {
      console.error('❌ Supabase Rider Save Error:', resultError.message);
      return res.status(500).json({ success: false, error: resultError.message });
    }

    res.status(200).json({ success: true, rider: resultData });
  } catch (error) {
    console.error('🔥 Server Error during rider save:', error);
    res.status(500).json({ success: false, error: error.message });
  }
});

export default router;
