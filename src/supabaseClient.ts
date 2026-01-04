import { createClient } from '@supabase/supabase-js';

// Ambil ini dari Dashboard Supabase > Settings > API
const supabaseUrl = 'https://wwdnqsjcsptucrnlmnpn.supabase.co'; 
const supabaseKey = 'sb_publishable_M4z-ILfRkeRrqZn_sFabmA_mLdxoY_q';

export const supabase = createClient(supabaseUrl, supabaseKey);
