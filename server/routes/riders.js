import express from 'express';
import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
dotenv.config({ path: path.join(__dirname, '../../.env') });

const router = express.Router();

const supabaseUrl = process.env.VITE_SUPABASE_URL;
const supabaseKey = process.env.VITE_SUPABASE_SERVICE_ROLE_KEY || process.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.warn('⚠️ Supabase credentials missing tightly in riders route. Registration may fail.');
}

const supabase = createClient(supabaseUrl, supabaseKey);

// Register a new rider
router.post('/register', async (req, res) => {
  const { user_id, vehicle_no, license_no, id_proof } = req.body;

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
