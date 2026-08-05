// Replace these values with your Supabase project URL and public anon key.
const SUPABASE_URL = 'https://YOUR_PROJECT_ID.supabase.co';
const SUPABASE_ANON_KEY = 'YOUR_ANON_PUBLIC_KEY';

// Quick runtime checks to help developers debug "Failed to fetch" errors.
const _isPlaceholderUrl = SUPABASE_URL.includes('YOUR_PROJECT_ID') || SUPABASE_URL.includes('YOUR_PROJECT_ID');
const _isPlaceholderKey = SUPABASE_ANON_KEY.includes('YOUR_ANON_PUBLIC_KEY') || !SUPABASE_ANON_KEY || SUPABASE_ANON_KEY.trim() === '';

if (typeof window === 'undefined') {
  // Not running in a browser context — nothing to do.
  module.exports = null;
} else {
  if (!window.supabase || typeof window.supabase.createClient !== 'function') {
    console.error('Supabase JS library not loaded. Ensure the CDN script is included before supabase-client.js');
    window.__SUPABASE_CONFIGURED__ = false;
    window.supabase = null;
  } else if (_isPlaceholderUrl || _isPlaceholderKey) {
    console.error('Supabase client not configured. Set SUPABASE_URL and SUPABASE_ANON_KEY in supabase-client.js');
    window.__SUPABASE_CONFIGURED__ = false;
    window.supabase = null;
  } else {
    try {
      window.supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
      window.__SUPABASE_CONFIGURED__ = true;
    } catch (e) {
      console.error('Failed to initialize Supabase client:', e);
      window.__SUPABASE_CONFIGURED__ = false;
      window.supabase = null;
    }
  }
}
