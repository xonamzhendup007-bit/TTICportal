const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { email, qr_token } = req.body;
  if (!email || !email.endsWith('@ttic.edu.gov.bt')) {
    return res.status(403).json({ error: 'Unauthorized Email Domain' });
  }

  const { error } = await supabase
    .from('attendance')
    .insert([{ staff_email: email, time: new Date().toISOString(), qr_token }]);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ success: true });
};
