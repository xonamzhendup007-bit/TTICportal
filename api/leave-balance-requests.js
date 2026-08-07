const supabase = require('./supabase');

// Leave year constants
const LEAVE_YEAR_START_MONTH = 7; // July
const LEAVE_YEAR_END_MONTH = 6;   // June

// Base allowances per leave type
const LEAVE_ALLOWANCES = {
  annual: 21,
  casual: 10,
  paternity: 10,
  bereavement: 21,
  medical: 30
};

/**
 * Calculate the previous leave year bounds.
 * Leave year: 1 July to 30 June.
 */
function getPreviousLeaveYear(referenceDate = new Date()) {
  const month = referenceDate.getUTCMonth() + 1; // 1-12
  const year = referenceDate.getUTCFullYear();

  const currentLeaveYearStartYear = month >= LEAVE_YEAR_START_MONTH ? year : year - 1;
  const previousLeaveYearStartYear = currentLeaveYearStartYear - 1;

  const start = new Date(Date.UTC(previousLeaveYearStartYear, LEAVE_YEAR_START_MONTH - 1, 1)); // 1 July
  const end = new Date(Date.UTC(previousLeaveYearStartYear + 1, LEAVE_YEAR_END_MONTH, 30));    // 30 June

  return { start, end };
}

function formatDate(date) {
  return date.toISOString().split('T')[0];
}

function parseDate(dateString) {
  if (!dateString) return null;
  const [year, month, day] = dateString.split('-').map(Number);
  return new Date(Date.UTC(year, month - 1, day));
}

function getOverlapDays(start, end, rangeStart, rangeEnd) {
  const overlapStart = start > rangeStart ? start : rangeStart;
  const overlapEnd = end < rangeEnd ? end : rangeEnd;
  if (!overlapStart || !overlapEnd || overlapStart > overlapEnd) return 0;
  const msPerDay = 24 * 60 * 60 * 1000;
  return Math.floor((overlapEnd - overlapStart) / msPerDay) + 1;
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
    res.status(500).json({ error: profileError.message });
    return null;
  }

  if (!profile) {
    res.status(404).json({ error: 'Staff profile not found.' });
    return null;
  }

  return profile;
}

/**
 * Calculate unused leave for a staff member for a given leave type
 * within the previous leave year.
 * unused = allowance - taken (approved leave in that year)
 *
 * NOTE: yearStart/yearEnd here are already "YYYY-MM-DD" strings
 * (produced by formatDate() before this function is called), so
 * they must be parsed directly — do NOT call formatDate() on them.
 */
async function calculateUnusedLeave(userId, leaveType, yearStart, yearEnd) {
  const allowance = LEAVE_ALLOWANCES[leaveType];
  if (!allowance) return 0;

  const { data: applications, error } = await supabase
    .from('leave_applications')
    .select('start_date,end_date,status')
    .eq('user_id', userId)
    .eq('leave_type', leaveType)
    .in('status', ['Approved', 'Pending']);

  if (error) {
    throw new Error(error.message);
  }

  const rangeStart = parseDate(yearStart);
  const rangeEnd = parseDate(yearEnd);

  let taken = 0;
  (applications || []).forEach(app => {
    const leaveStart = parseDate(app.start_date);
    const leaveEnd = parseDate(app.end_date);
    if (!leaveStart || !leaveEnd) return;
    taken += getOverlapDays(leaveStart, leaveEnd, rangeStart, rangeEnd);
  });

  return Math.max(allowance - taken, 0);
}

module.exports = async (req, res) => {
  const profile = await getSessionProfile(req, res);
  if (!profile) return;

  // ── GET: list leave balance requests ──────────────────────
  if (req.method === 'GET') {
    const query = supabase
      .from('leave_balance_requests')
      .select('id,user_id,leave_type,year_start,year_end,unused_days,requested_days,approved_days,leave_balance,reason,status,reviewed_by,approved_by,applied_at,decided_at,approval_date')
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

  // ── POST: staff submits a carry-forward balance request ───
  if (req.method === 'POST') {
    const { leave_type, requested_days, reason } = req.body;

    if (!leave_type || !requested_days) {
      return res.status(400).json({ error: 'Missing required fields: leave_type and requested_days.' });
    }

    const days = parseInt(requested_days, 10);
    if (isNaN(days) || days <= 0) {
      return res.status(400).json({ error: 'requested_days must be a positive number.' });
    }

    // Validate leave type against known allowances
    const validTypes = Object.keys(LEAVE_ALLOWANCES);
    if (!validTypes.includes(leave_type)) {
      return res.status(400).json({ error: 'Invalid leave type.' });
    }

    // Auto-calculate the previous leave year — never accept user-supplied dates
    const prevYear = getPreviousLeaveYear();
    const yearStart = formatDate(prevYear.start);
    const yearEnd = formatDate(prevYear.end);

    // Calculate unused leave from the previous leave year
    let unusedDays;
    try {
      unusedDays = await calculateUnusedLeave(profile.id, leave_type, yearStart, yearEnd);
    } catch (err) {
      return res.status(500).json({ error: err.message });
    }

    if (unusedDays <= 0) {
      return res.status(400).json({ error: 'No unused leave available from the previous leave year to carry forward.' });
    }

    // User cannot request more days than the unused leave available
    if (days > unusedDays) {
      return res.status(400).json({ error: `Requested days (${days}) cannot exceed unused leave available (${unusedDays} days).` });
    }

    const { data: inserted, error: insertError } = await supabase
      .from('leave_balance_requests')
      .insert([
        {
          user_id: profile.id,
          leave_type,
          year_start: yearStart,
          year_end: yearEnd,
          unused_days: unusedDays,
          requested_days: days,
          approved_days: 0,
          leave_balance: 0, // Pending → leave balance stays 0
          reason: reason || null,
          status: 'Pending',
          applied_at: new Date().toISOString()
        }
      ])
      .select('id,user_id,leave_type,year_start,year_end,unused_days,requested_days,approved_days,leave_balance,reason,status,reviewed_by,approved_by,applied_at,decided_at,approval_date')
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
      .select('id,status,requested_days,leave_balance')
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

    const now = new Date().toISOString();

    if (decision === 'Approved') {
      // ── APPROVED: update leave balance immediately ─────────
      const { data: updated, error: updateError } = await supabase
        .from('leave_balance_requests')
        .update({
          status: 'Approved',
          reviewed_by: profile.id,
          approved_by: profile.id,
          decided_at: now,
          approval_date: now,
          approved_days: existing.requested_days,
          leave_balance: existing.requested_days // Only Approved adds to leave balance
        })
        .eq('id', id)
        .select('id,status,approved_days,leave_balance,approval_date,approved_by')
        .single();

      if (updateError) {
        return res.status(500).json({ error: updateError.message });
      }

      return res.status(200).json({
        message: 'Leave balance request Approved',
        approved_days: updated.approved_days,
        leave_balance: updated.leave_balance,
        approval_date: updated.approval_date,
        approved_by: updated.approved_by
      });
    }

    // ── REJECTED: only update status, leave balance stays 0 ──
    const { error: rejectError } = await supabase
      .from('leave_balance_requests')
      .update({
        status: 'Rejected',
        reviewed_by: profile.id,
        decided_at: now,
        approved_days: 0,
        leave_balance: 0 // ← Rejected: leave balance remains 0
      })
      .eq('id', id);

    if (rejectError) {
      return res.status(500).json({ error: rejectError.message });
    }

    return res.status(200).json({ message: 'Leave balance request Rejected' });
  }

  res.setHeader('Allow', ['GET', 'POST', 'PUT']);
  return res.status(405).json({ error: 'Method not allowed' });
};
