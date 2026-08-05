const fs = require('fs');

const url = process.env.SUPABASE_URL || '';
const anon = process.env.SUPABASE_ANON_KEY || '';

if (!url || !anon) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  console.error('This script should run during build with those env vars set (e.g., Vercel Environment Variables).');
  // Write a file that forces the app into dev-mode but logs helpful instructions.
  const devContent = `// Auto-generated supabase-client (dev mode)
window.__SUPABASE_CONFIGURED__ = false;
console.error('Supabase configuration missing at build. Set SUPABASE_URL and SUPABASE_ANON_KEY');
window.supabase = null;
`;
  fs.writeFileSync('supabase-client.js', devContent, 'utf8');
  process.exit(0);
}

const content = `// Auto-generated supabase-client.js
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
          window.supabase = window.supabase.createClient('${url}', '${anon}');
          clearInterval(id);
        }
        if (tries.count > 20) { clearInterval(id); console.error('Supabase library not found.'); }
      }, 250);
    } else {
      window.supabase = window.supabase.createClient('${url}', '${anon}');
    }
  } catch (e) {
    console.error('Failed to initialize Supabase client at runtime', e);
    window.__SUPABASE_CONFIGURED__ = false;
    window.supabase = null;
  }
})();
`;

fs.writeFileSync('supabase-client.js', content, 'utf8');
console.log('Generated supabase-client.js');
