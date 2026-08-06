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
    .select('id,first_name,last_name,email,role')
    .eq('id', userData.user.id)
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

  if (profile.role !== 'principal') {
    return res.status(403).json({ error: 'Only principals may approve leave requests.' });
  }

  const { leave_id, decision } = req.body;
  if (!leave_id || !decision || !['Approved', 'Rejected'].includes(decision)) {
    return res.status(400).json({ error: 'Missing or invalid decision payload.' });
  }

  const { error } = await supabase
    .from('leave_applications')
    .update({ status: decision, reviewed_by: profile.id })
    .eq('leave_id', leave_id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ message: `Leave ${decision}` });
};
