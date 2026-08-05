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
    .select('user_id,full_name,official_email,role')
    .eq('official_email', userData.user.email)
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
  const profile = await getSessionProfile(req, res);
  if (!profile) return;

  if (req.method === 'GET') {
    const query = supabase
      .from('leave_applications')
      .select('leave_id,user_id,leave_type,start_date,end_date,reason,document_url,status,reviewed_by,applied_at,staff_users(full_name,official_email,role)')
      .order('applied_at', { ascending: false });

    if (profile.role !== 'principal') {
      query.eq('user_id', profile.user_id);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const { leave_type, reason, start_date, end_date, document_url } = req.body;
    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ error: 'Missing required leave application fields.' });
    }

    const { data, error } = await supabase
      .from('leave_applications')
      .insert([
        {
          user_id: profile.user_id,
          leave_type,
          start_date,
          end_date,
          reason,
          document_url: document_url || null,
          status: 'Pending',
          applied_at: new Date().toISOString()
        }
      ])
      .select('leave_id,user_id,leave_type,start_date,end_date,reason,document_url,status,reviewed_by,applied_at,staff_users(full_name,official_email,role)')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
};
