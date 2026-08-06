const { createClient } = require('@supabase/supabase-js');
const supabase = require('./supabase');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

async function createMissingProfile(user) {
  if (!SUPABASE_URL || !SERVICE_ROLE_KEY) return { error: 'Service role key is not configured; cannot create missing staff profile.' };
  if (!user?.id || !user?.email) return { error: 'Invalid auth user information; cannot create staff profile.' };

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE_KEY);
  const first_name = (user.user_metadata?.first_name || '').trim() || user.email.split('@')[0] || 'Staff';
  const last_name = (user.user_metadata?.last_name || '').trim() || '';
  const role = (user.user_metadata?.role || 'staff').trim() || 'staff';

  const { data, error } = await admin
    .from('staff_users')
    .insert([{ id: user.id, first_name, last_name, email: user.email, role }])
    .select('id,first_name,last_name,email,role')
    .single();

  if (error) return { error: error.message || error };
  return { profile: data };
}

async function getSessionProfile(req, res) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) {
    res.status(401).json({ error: 'Authorization token is required.' });
    return null;
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    res.status(401).json({ error: userError?.message || 'Invalid auth token.' });
    return null;
  }

  const { data: profile, error: profileError } = await supabase
    .from('staff_users')
    .select('id,first_name,last_name,email,role')
    .eq('id', userData.user.id)
    .limit(1)
    .single();

  if (profileError) {
    // If the staff profile does not exist, attempt to create it from auth metadata.
    if (profileError.code === 'PGRST116' || profileError.details?.includes('Result set contains no rows')) {
      // fall through to missing profile handling below
    } else {
      res.status(500).json({ error: profileError.message });
      return null;
    }
  }

  if (!profile) {
    const result = await createMissingProfile(userData.user);
    if (result.error) {
      res.status(500).json({ error: result.error });
      return null;
    }
    return result.profile;
  }

  return profile;
}

module.exports = async (req, res) => {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const profile = await getSessionProfile(req, res);
  if (!profile) return;

  res.status(200).json(profile);
};
