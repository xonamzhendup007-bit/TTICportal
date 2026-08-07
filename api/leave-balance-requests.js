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

  // ── GET: list leave balance requests ──────────────────────
  if (req.method === 'GET') {
    const query = supabase
      .from('leave_balance_requests')
      .select('id,user_id,leave_type,requested_days,year_start,year_end,reason,status,reviewed_by,applied_at,decided_at')
      .order('applied_at', { ascending: false });

    if (profile.role !== 'principal') {
      query.eq('user_id', profile.id);
    }

    const { data, error } = await query;
    if (error) {
      return res.status(500).json({ error: error.message });
    }

    const requests = data || [];
    if (requests.length === 0) return res.status(200).json([]);

    const userIds = [...new Set(requests.map(r => r.user_id).filter(Boolean))];
    const { data: users, error: usersError } = await supabase
      .from('staff_users')
      .select('id,first_name,last_name,email,role')
      .in('id', userIds);

    if (usersError) {
      return res.status(500).json({ error: usersError.message });
    }

    const usersById = Object.fromEntries((users || []).map(u => [u.id, u]));
    const mapped = requests.map(req => ({
      ...req,
      staff_users: usersById[req.user_id] || null
    }));

    return res.status(200).json(mapped);
  }

  // ── POST: staff submits a leave balance request ───────────
  if (req.method === 'POST') {
    const { leave_type, requested_days, year_start, year_end, reason } = req.body;

    if (!leave_type || !requested_days || !year_start || !year_end) {
      return res.status(400).json({ error: 'Missing required fields: leave_type, requested_days, year_start, year_end.' });
    }

    const days = parseInt(requested_days, 10);
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'requested_days must be a positive number.' });
    }

    // Validate leave type against known allowances
    const validTypes = ['annual', 'casual', 'paternity', 'bereavement', 'medical'];
    if (!validTypes.includes(leave_type)) {
      return res.status(400).json({ error: 'Invalid leave type.' });
    }

    // Validate year range: must be within the past one year
    const start = new Date(year_start);
    const end = new Date(year_end);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) {
      return res.status(400).json({ error: 'Invalid year range.' });
    }

    const oneYearAgo = new Date();
    oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);
    if (start < oneYearAgo) {
      return res.status(400).json({ error: 'Year range cannot be older than the past one year.' });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('leave_balance_requests')
      .insert([
        {
          user_id: profile.id,
          leave_type,
          requested_days: days,
          year_start: year_start,
          year_end: year_end,
          reason: reason || null,
          status: 'Pending',
          applied_at: new Date().toISOString()
        }
      ])
      .select('id,user_id,leave_type,requested_days,year_start,year_end,reason,status,reviewed_by,applied_at,decided_at')
      .single();

    if (insertError) {
      return res.status(500).json({ error: insertError.message });
    }

    const { data: userRow, error: userErr } = await supabase
      .from('staff_users')
      .select('id,first_name,last_name,email,role')
      .eq('id', inserted.user_id)
      .limit(1)
      .single();

    if (userErr) {
      return res.status(500).json({ error: userErr.message });
    }

    return res.status(201).json({ ...inserted, staff_users: userRow || null });
  }

  // ── PUT: principal approves/rejects a balance request ─────
  if (req.method === 'PUT') {
    if (profile.role !== 'principal') {
      return res.status(403).json({ error: 'Only principals may approve leave balance requests.' });
    }

    const { id, decision } = req.body;
    if (!id || !decision || !['Approved', 'Rejected'].includes(decision)) {
      return res.status(400).json({ error: 'Missing or invalid decision payload.' });
    }

    const { data: existing, error: fetchError } = await supabase
      .from('leave_balance_requests')
      .select('id,status')
      .eq('id', id)
      .limit(1)
      .single();

    if (fetchError) {
      return res.status(500).json({ error: fetchError.message });
    }

    if (!existing) {
      return res.status(404).json({ error: 'Leave balance request not found.' });
    }

    if (existing.status !== 'Pending') {
      return res.status(400).json({ error: 'This request has already been decided.' });
    }

    const { error: updateError } = await supabase
      .from('leave_balance_requests')
      .update({
        status: decision,
        reviewed_by: profile.id,
        decided_at: new Date().toISOString()
      })
      .eq('id', id);

    if (updateError) {
      return res.status(500).json({ error: updateError.message });
    }

    return res.status(200).json({ message: `Leave balance request ${decision}` });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: 'Method not allowed' });
};