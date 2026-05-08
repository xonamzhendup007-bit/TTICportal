-- 1. STAFF DIRECTORY 
-- Stores official emails and determines if the user is Staff or Principal
CREATE TABLE staff_users (
    user_id SERIAL PRIMARY KEY,
    full_name VARCHAR(100) NOT NULL,
    official_email VARCHAR(150) UNIQUE NOT NULL, -- Must end in @ttic.edu.gov.bt
    role VARCHAR(20) DEFAULT 'staff', -- Roles: 'staff' or 'principal'
    department VARCHAR(100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. ATTENDANCE LOGS
-- Stores every QR scan event
CREATE TABLE attendance_records (
    record_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES staff_users(user_id) ON DELETE CASCADE,
    scan_time TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(20) DEFAULT 'Present', -- e.g., Present, Late
    location_id VARCHAR(50) -- Matches the QR code content (e.g., 'MAIN_GATE')
);

-- 3. LEAVE APPLICATIONS
-- Stores leave requests and file links for the Principal to review
CREATE TABLE leave_applications (
    leave_id SERIAL PRIMARY KEY,
    user_id INT REFERENCES staff_users(user_id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL, -- e.g., Casual, Medical, Earned
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    reason TEXT,
    document_url TEXT, -- Link to the PDF/Image proof uploaded by staff
    status VARCHAR(20) DEFAULT 'Pending', -- Pending, Approved, Rejected
    reviewed_by INT REFERENCES staff_users(user_id), -- The Principal's User ID
    applied_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
SELECT 
    s.full_name, 
    l.leave_type, 
    l.start_date, 
    l.end_date, 
    l.document_url, 
    l.status 
FROM leave_applications l
JOIN staff_users s ON l.user_id = s.user_id
WHERE l.status = 'Pending'
ORDER BY l.applied_at DESC;
UPDATE leave_applications 
SET status = 'Approved', 
    reviewed_by = 1 -- Principal's ID
WHERE leave_id = 101;
