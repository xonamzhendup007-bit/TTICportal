// Replace these values with your Supabase project URL and public anon key.
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

if (!window.supabase || typeof window.supabase.createClient !== 'function') {
  throw new Error('Supabase JS load failed. Make sure @supabase/supabase-js is included before this file.');
}

window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
