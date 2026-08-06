const supabase = require('./supabase');

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.split(' ')[1] : null;
  if (!token) {
    return res.status(401).json({ error: 'Authorization token is required.' });
  }

  const { data: userData, error: userError } = await supabase.auth.getUser(token);
  if (userError || !userData?.user) {
    return res.status(401).json({ error: userError?.message || 'Invalid auth token.' });
  }

  const user = userData.user;
  const { first_name, last_name, email, role } = req.body;
  const normalizedEmail = email?.toString().trim().toLowerCase();

  if (!first_name || !last_name || !normalizedEmail || !role) {
    return res.status(400).json({ error: 'Missing required registration fields.' });
  }

  if (normalizedEmail !== user.email) {
    return res.status(400).json({ error: 'Registration email must match authenticated user email.' });
  }

  const { data: existing, error: existingError } = await supabase
    .from('staff_users')
    .select('id')
    .eq('email', normalizedEmail)
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
    .insert([{ id: user.id, first_name, last_name, email: normalizedEmail, role }])
    .select('*')
    .single();

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  return res.status(201).json(data);
};
