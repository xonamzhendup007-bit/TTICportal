const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const anonKey = process.env.SUPABASE_ANON_KEY;

if (!url) {
  throw new Error('SUPABASE_URL environment variable is required for server-side Supabase client.');
}

if (!serviceRoleKey && !anonKey) {
  throw new Error('SUPABASE_SERVICE_ROLE_KEY or SUPABASE_ANON_KEY must be set for server-side Supabase client.');
}

if (!serviceRoleKey) {
  console.warn('Warning: SUPABASE_SERVICE_ROLE_KEY is not set. Falling back to anon key for server-side requests. RLS may deny some operations.');
}

const supabase = createClient(url, serviceRoleKey || anonKey);

module.exports = supabase;
