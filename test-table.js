const { createClient } = require('@supabase/supabase-js');

const url = process.env.SUPABASE_URL;
const anon = process.env.SUPABASE_ANON_KEY;

if (!url || !anon) {
  console.error('Missing SUPABASE_URL or SUPABASE_ANON_KEY environment variables.');
  process.exit(1);
}

const supabase = createClient(url, anon);

(async () => {
  try {
    const { data, error } = await supabase.from('staff_users').select('user_id,full_name,official_email').limit(1);
    if (error) {
      console.error('Query error:', error.message || error);
      process.exit(2);
    }
    console.log('Query result:', data);
  } catch (e) {
    console.error('Unexpected error:', e);
    process.exit(3);
  }
})();
