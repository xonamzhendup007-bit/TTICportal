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
  const profile = await getSessionProfile(req, res);
  if (!profile) return;

  if (req.method === 'GET') {
    const query = supabase
      .from('leave_applications')
      .select('leave_id,user_id,leave_type,start_date,end_date,reason,document_url,status,reviewed_by,applied_at')
      .order('applied_at', { ascending: false });

    if (profile.role !== 'principal') {
      query.eq('user_id', profile.id);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const apps = data || [];
    if (apps.length === 0) return res.status(200).json([]);

    const userIds = [...new Set(apps.map(a => a.user_id).filter(Boolean))];
    const { data: users, error: usersError } = await supabase
      .from('staff_users')
      .select('id,first_name,last_name,email,role')
      .in('id', userIds);

    if (usersError) {
      return res.status(500).json({ error: usersError.message });
    }

    const usersById = Object.fromEntries((users || []).map(u => [u.id, u]));
    const mapped = apps.map(app => ({
      ...app,
      staff_users: usersById[app.user_id] || null
    }));

    return res.status(200).json(mapped);
  }

  if (req.method === 'POST') {
    const { leave_type, reason, start_date, end_date, document_url } = req.body;
    if (!leave_type || !start_date || !end_date || !reason) {
      return res.status(400).json({ error: 'Missing required leave application fields.' });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('leave_applications')
      .insert([
        {
          user_id: profile.id,
          leave_type,
          start_date,
          end_date,
          reason,
          document_url: document_url || null,
          status: 'Pending',
          applied_at: new Date().toISOString()
        }
      ])
      .select('leave_id,user_id,leave_type,start_date,end_date,reason,document_url,status,reviewed_by,applied_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    const app = inserted;
    const { data: userRow, error: userErr } = await supabase
      .from('staff_users')
      .select('id,first_name,last_name,email,role')
      .eq('id', app.user_id)
      .limit(1)
      .single();

    if (userErr) {
      return res.status(500).json({ error: userErr.message });
    }

    return res.status(201).json({ ...app, staff_users: userRow || null });
  }
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
};
