const { createClient } = require('@supabase/supabase-js');

const supabase = createClient(process.env.SUPABASE_URL, process.env.SUPABASE_KEY);

module.exports = async (req, res) => {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { leave_id, decision, principal_key } = req.body;
  if (principal_key !== process.env.PRINCIPAL_SECRET) {
    return res.status(401).json({ error: 'Unauthorized Access' });
  }

  const { error } = await supabase
    .from('leave_applications')
    .update({ status: decision })
    .eq('leave_id', leave_id);

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  res.status(200).json({ message: `Leave ${decision}` });
};
