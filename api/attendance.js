const supabase = require('./supabase');

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
    .select('id:user_id,first_name,last_name,email,role')
    .eq('email', userData.user.email)
    .limit(1)
    .single();

  if (profileError) {
    res.status(500).json({ error: profileError.message });
    return null;
  }

  if (!profile) {
    res.status(404).json({ error: 'Staff profile not found.' });
    return null;
  }

  return profile;
}

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const profile = await getSessionProfile(req, res);
  if (!profile) return;

  const { qr_token } = req.body;
  const { error } = await supabase
    .from('attendance_records')
    .insert([{ user_id: profile.user_id, scan_time: new Date().toISOString(), location_id: qr_token || null }]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ success: true });
};
