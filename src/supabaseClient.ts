import { createClient } from '@supabase/supabase-js';

// Ambil ini dari Dashboard Supabase > Settings > API
const supabaseUrl = 'https://wwdnqsjcsptucrnlmnpn.supabase.co'; 
const supabaseKey = 'sb_secret_zTD5cNbeiuexxPQKSUNi2w_mYrcD2YX';

export const supabase = createClient(supabaseUrl, supabaseKey);