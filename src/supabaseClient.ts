import { createClient } from '@supabase/supabase-js';

// Ambil ini dari Dashboard Supabase > Settings > API
const supabaseUrl = 'https://wwdnqsjcsptucrnlmnpn.supabase.co'; 
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Ind3ZG5xc2pjc3B0dWNybmxtbnBuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3Njc0ODYwMDMsImV4cCI6MjA4MzA2MjAwM30.-mPaNBiomgMSGvsFYxL5crJLZdUYZRXLwDxPVIWg54E';

export const supabase = createClient(supabaseUrl, supabaseKey);