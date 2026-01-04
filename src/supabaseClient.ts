

import { createClient } from '@supabase/supabase-js'
const supabaseUrl = 'https://wwdnqsjcsptucrnlmnpn.supabase.co'
const supabaseKey = process.env.sb_publishable_M4z-ILfRkeRrqZn_sFabmA_mLdxoY_q
export const supabase = createClient(supabaseUrl, supabaseKey)
