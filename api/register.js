const supabase = require('./supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { full_name, official_email, role } = req.body;
  const email = official_email?.toString().trim().toLowerCase();

  if (!full_name || !email || !role) {
    return res.status(400).json({ error: 'Missing required registration fields.' });
  }

  if (!email.endsWith('@ttic.edu.gov.bt')) {
    return res.status(403).json({ error: 'Staff email must use @ttic.edu.gov.bt.' });
  }

  const { data: existing, error: existingError } = await supabase
    .from('staff_users')
    .select('user_id')
    .eq('official_email', email)
    .limit(1)
    .single();

  if (existingError && existingError.code !== 'PGRST116') {
    return res.status(500).json({ error: existingError.message });
  }

  if (existing) {
    return res.status(409).json({ error: 'A staff profile with this email already exists.' });
  }

  const { data, error } = await supabase
    .from('staff_users')
    .insert([{ full_name, official_email: email, role }])
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(data);
};
