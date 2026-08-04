const express = require('express');
const app = express();
const { createClient } = require('@supabase/supabase-js'); // Database tool

// Database Connection
const supabase = createClient('YOUR_URL', 'YOUR_KEY');

// API: Handle QR Attendance
app.post('/api/attendance', async (req, res) => {
    const { email, qr_token } = req.body;

    // Security Check: Only allow official domain
    if (!email.endsWith('@ttic.edu.gov.bt')) {
        return res.status(403).send("Unauthorized Email Domain");
    }

    const { data, error } = await supabase
        .from('attendance')
        .insert([{ staff_email: email, time: new Date() }]);

    res.json({ success: true });
});

// API: Principal Approval Logic
app.post('/api/approve-leave', async (req, res) => {
    const { leave_id, decision, principal_key } = req.body;

    // Verify this is actually the Principal
    if (principal_key !== process.env.PRINCIPAL_SECRET) {
        return res.status(401).send("Unauthorized Access");
    }

    const { data, error } = await supabase
        .from('leave_applications')
        .update({ status: decision }) // decision = 'Approved' or 'Rejected'
        .eq('id', leave_id);

    res.json({ message: `Leave ${decision}` });
});
// Security Configuration
const authOptions = {
  providers: [
    GoogleProvider({
      clientId: process.env.GOOGLE_CLIENT_ID,
      clientSecret: process.env.GOOGLE_CLIENT_SECRET
    })
  ],
  callbacks: {
    async signIn({ user }) {
      // STRICT RULE: Only allow official @ttic.edu.gov.bt emails
      return user.email.endsWith("@ttic.edu.gov.bt");
    }
  }
}
