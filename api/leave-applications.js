const supabase = require('./supabase');

module.exports = async (req, res) => {
  if (req.method === 'GET') {
    const { data, error } = await supabase
      .from('leave_applications')
      .select('*')
      .order('applied_at', { ascending: false });

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(200).json(data || []);
  }

  if (req.method === 'POST') {
    const {
      staff_name,
      staff_email,
      leave_type,
      reason,
      start_date,
      end_date,
      total_days,
      document_url,
      status,
      applied_at
    } = req.body;

    if (!staff_name || !staff_email || !leave_type || !start_date || !end_date || !status) {
      return res.status(400).json({ error: 'Missing required leave application fields.' });
    }

    const normalizedEmail = staff_email.toString().trim().toLowerCase();
    if (!normalizedEmail.endsWith('@ttic.edu.gov.bt')) {
      return res.status(403).json({ error: 'Staff email must use @ttic.edu.gov.bt.' });
    }

    const { data: userData, error: userError } = await supabase
      .from('staff_users')
      .select('user_id')
      .eq('official_email', normalizedEmail)
      .limit(1)
      .single();

    if (userError) {
      return res.status(500).json({ error: userError.message });
    }

    if (!userData) {
      return res.status(404).json({ error: 'Staff user not found in the database.' });
    }

    const { data, error } = await supabase
      .from('leave_applications')
      .insert([
        {
          user_id: userData.user_id,
          leave_type,
          start_date,
          end_date,
          reason,
          document_url: document_url || null,
          status,
          applied_at: applied_at || new Date().toISOString()
        }
      ])
      .select('*')
      .single();

    if (error) {
      return res.status(500).json({ error: error.message });
    }

    return res.status(201).json(data);
  }

  res.setHeader('Allow', ['GET', 'POST']);
  return res.status(405).json({ error: 'Method not allowed' });
};
