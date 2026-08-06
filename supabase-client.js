// Auto-generated supabase-client.js
// Generated at build-time from SUPABASE_URL and SUPABASE_ANON_KEY env vars
window.__SUPABASE_CONFIGURED__ = true;
(function(){
  try {
    if (!window.supabase || typeof window.supabase.createClient !== 'function') {
      console.warn('Supabase library not loaded yet; waiting to create client.');
      // create a small poller to create the client once library is loaded
      const tries = { count: 0 };
      const id = setInterval(() => {
        tries.count++;
        if (window.supabase && typeof window.supabase.createClient === 'function') {
          window.supabase = window.supabase.createClient('https://fodirjdugwpobnbfweem.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZGlyamR1Z3dwb2JuYmZ3ZWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjQ2NjYsImV4cCI6MjA5Nzk0MDY2Nn0.cQuCBn24HzAAUJ9HrSILEqXresKp_aS7MkfAM9ebU1M');
          clearInterval(id);
        }
        if (tries.count > 20) { clearInterval(id); console.error('Supabase library not found.'); }
      }, 250);
    } else {
      window.supabase = window.supabase.createClient('https://fodirjdugwpobnbfweem.supabase.co', 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZvZGlyamR1Z3dwb2JuYmZ3ZWVtIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODIzNjQ2NjYsImV4cCI6MjA5Nzk0MDY2Nn0.cQuCBn24HzAAUJ9HrSILEqXresKp_aS7MkfAM9ebU1M');
    }
  } catch (e) {
    console.error('Failed to initialize Supabase client at runtime', e);
    window.__SUPABASE_CONFIGURED__ = false;
    window.supabase = null;
  }
})();
