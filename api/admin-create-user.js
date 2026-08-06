const { createClient } = require('@supabase/supabase-js');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL) {
  throw new Error('SUPABASE_URL must be set for server endpoints.');
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  if (!SERVICE_ROLE) {
    return res.status(403).json({ error: 'Service role key not configured on server.' });
  }

  const { email, password, first_name, last_name, role } = req.body || {};
  if (!email || !password || !first_name || !last_name) {
    return res.status(400).json({ error: 'Missing required fields: email, password, first_name, last_name.' });
  }

  const admin = createClient(SUPABASE_URL, SERVICE_ROLE);

  // Create the auth user and mark email as confirmed so they can sign in immediately
  try {
    const { data: createData, error: createError } = await admin.auth.admin.createUser({
      email: email.toString().trim().toLowerCase(),
      password,
      email_confirm: true,
      user_metadata: { first_name, last_name, role }
    });

    if (createError) {
      return res.status(500).json({ error: createError.message || createError });
    }

    const user = createData?.user || createData;
    if (!user || !user.id) {
      return res.status(500).json({ error: 'Failed to create user.' });
    }

    // Create corresponding staff profile row using service role
    const { data: profileData, error: profileError } = await admin
      .from('staff_users')
      .insert([{
        id: user.id,
        first_name,
        last_name,
        email: user.email,
        role: role || 'staff'
      }])
      .select('*')
      .single();

    if (profileError) {
      return res.status(500).json({ error: profileError.message || profileError });
    }

    return res.status(201).json({ user: { id: user.id, email: user.email }, profile: profileData });
  } catch (err) {
    return res.status(500).json({ error: err.message || String(err) });
  }
};
