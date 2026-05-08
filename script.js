// --- Section Switching Logic ---
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
}

// --- QR Scanner Implementation ---
const html5QrCode = new Html5Qrcode("reader");
const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };

const onScanSuccess = (decodedText, decodedResult) => {
    // 1. Stop scanning after success
    html5QrCode.stop();
    document.getElementById('reader').classList.add('hidden');
    document.getElementById('scan-success').classList.remove('hidden');

    // 2. Prepare data for the server
    const attendanceData = {
        qr_token: decodedText,
        timestamp: new Date().toISOString(),
        location: "TTIC_Main_Campus"
    };

    console.log("Attendance Data Captured:", attendanceData);
    // In a live app, use: fetch('/api/attendance', { method: 'POST', body: JSON.stringify(attendanceData) })
};

// Start the scanner when the page loads
html5QrCode.start({ facingMode: "environment" }, qrConfig, onScanSuccess);

// --- Leave Form Handling ---
document.getElementById('leaveForm').addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(e.target);
    // Logic to send data to the Principal's record
    alert("Application submitted! The Principal will review your attached documents.");
    e.target.reset();
});
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
