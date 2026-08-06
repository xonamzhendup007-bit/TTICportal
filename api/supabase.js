const { createClient } = require('@supabase/supabase-js');

// Server-side Supabase client. Expects environment variables to be set in
// your hosting environment (`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`).
const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_ANON_KEY
);

module.exports = supabase;
