// ==========================
// Leave Records Database
// ==========================

const leaveRecords = [

    {
        name: "Tashi Dorji",
        annualLeave: 30,
        leaveTaken: 3,
        leaveBalance: 27,
        reason: "Family Emergency",
        status: "Approved"
    },

    {
        name: "Karma Wangmo",
        annualLeave: 30,
        leaveTaken: 1,
        leaveBalance: 29,
        reason: "Medical Checkup",
        status: "Approved"
    }

];

const LEAVE_APPLICATIONS_KEY = 'ttic_leave_applications';
const LEAVE_ALLOWANCES = {
    annual: 21,
    casual: 10,
    paternity: 10,
    bereavement: 21,
    medical: 30
};
const LEAVE_YEAR_START_MONTH = 7; // July

function getLeaveYearBounds(referenceDate = new Date()) {
    const year = referenceDate.getUTCMonth() + 1 >= LEAVE_YEAR_START_MONTH
        ? referenceDate.getUTCFullYear()
        : referenceDate.getUTCFullYear() - 1;
    const start = new Date(Date.UTC(year, LEAVE_YEAR_START_MONTH - 1, 1));
    const end = new Date(Date.UTC(year + 1, LEAVE_YEAR_START_MONTH - 1, 1));
    end.setUTCDate(end.getUTCDate() - 1);
    return { start, end };
}

function getOverlapDays(start, end, rangeStart, rangeEnd) {
    const overlapStart = start > rangeStart ? start : rangeStart;
    const overlapEnd = end < rangeEnd ? end : rangeEnd;
    if (!overlapStart || !overlapEnd || overlapStart > overlapEnd) return 0;
    const msPerDay = 24 * 60 * 60 * 1000;
    return Math.floor((overlapEnd - overlapStart) / msPerDay) + 1;
}

function getLeaveApplications() {
    try {
        return JSON.parse(localStorage.getItem(LEAVE_APPLICATIONS_KEY)) || [];
    } catch {
        return [];
    }
}

function saveLeaveApplications(applications) {
    localStorage.setItem(LEAVE_APPLICATIONS_KEY, JSON.stringify(applications));
}

function formatLeaveDate(dateString) {
    const date = parseDateFromIso(dateString);
    return date
        ? new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric', timeZone: 'UTC' }).format(date)
        : '';
}

function formatLeaveType(leaveType) {
    return leaveType ? `${leaveType.charAt(0).toUpperCase()}${leaveType.slice(1)} Leave` : 'Leave';
}

function getLeaveBalance(staffName, leaveType) {
    const allowance = LEAVE_ALLOWANCES[leaveType];
    if (!allowance) return null;

    const leaveYear = getLeaveYearBounds();
    const applications = getLeaveApplications().filter(application =>
        application.staffName === staffName
        && application.leaveType === leaveType
        && application.status !== 'Rejected'
    );
    const taken = applications.reduce((total, application) => {
        const leaveStart = parseDateFromIso(application.fromDate);
        const leaveEnd = parseDateFromIso(application.toDate);
        if (!leaveStart || !leaveEnd) return total;
        return total + getOverlapDays(leaveStart, leaveEnd, leaveYear.start, leaveYear.end);
    }, 0);
    return { allowance, taken, balance: Math.max(allowance - taken, 0), applications: applications.length };
}

function renderLeaveBalance() {
    const currentUser = typeof Auth !== 'undefined' ? Auth.current() : null;
    if (!currentUser || currentUser.role !== 'staff') return;

    for (const leaveType of ['annual', 'casual', 'paternity', 'bereavement', 'medical']) {
        const balance = getLeaveBalance(currentUser.name, leaveType);
        const balanceElement = document.getElementById(`${leaveType}LeaveBalance`);
        const applicationsElement = document.getElementById(`${leaveType}LeaveApplications`);
        if (balanceElement) balanceElement.textContent = `${balance.taken} taken · ${balance.balance} days left`;
        if (applicationsElement) applicationsElement.textContent = `${balance.applications} application${balance.applications === 1 ? '' : 's'}`;
    }
}

function getStaffNamesForOverview() {
    const staffNames = new Set(getLeaveApplications().map(application => application.staffName).filter(Boolean));
    if (typeof getUsers === 'function') {
        getUsers()
            .filter(user => user.role === 'staff')
            .forEach(user => staffNames.add(user.name));
    }
    return [...staffNames].sort((first, second) => first.localeCompare(second));
}

function renderLeaveBalanceOverview() {
    const overviewBody = document.getElementById('leaveBalanceOverviewBody');
    if (!overviewBody) return;

    const staffNames = getStaffNamesForOverview();
    overviewBody.replaceChildren();
    if (staffNames.length === 0) {
        const row = overviewBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 7;
        cell.className = 'text-center text-muted py-4';
        cell.textContent = 'No staff leave records are available.';
        return;
    }

    staffNames.forEach(staffName => {
        const annual = getLeaveBalance(staffName, 'annual');
        const casual = getLeaveBalance(staffName, 'casual');
        const paternity = getLeaveBalance(staffName, 'paternity');
        const bereavement = getLeaveBalance(staffName, 'bereavement');
        const medical = getLeaveBalance(staffName, 'medical');
        const applications = getLeaveApplications().filter(application => application.staffName === staffName).length;
        const row = overviewBody.insertRow();
        const nameCell = row.insertCell();
        const name = document.createElement('strong');
        name.textContent = staffName;
        nameCell.appendChild(name);
        row.insertCell().textContent = `${annual.taken} taken / ${annual.balance} left`;
        row.insertCell().textContent = `${casual.taken} taken / ${casual.balance} left`;
        row.insertCell().textContent = `${paternity.taken} taken / ${paternity.balance} left`;
        row.insertCell().textContent = `${bereavement.taken} taken / ${bereavement.balance} left`;
        row.insertCell().textContent = `${medical.taken} taken / ${medical.balance} left`;
        row.insertCell().textContent = `${applications} application${applications === 1 ? '' : 's'}`;
    });
}

function renderLeaveRequests() {
    const requestsBody = document.getElementById('leaveRequestsBody');
    if (!requestsBody) return;

    const applications = getLeaveApplications().filter(application => application.status === 'Pending');
    requestsBody.replaceChildren();

    if (applications.length === 0) {
        const row = requestsBody.insertRow();
        const cell = row.insertCell();
        cell.colSpan = 8;
        cell.className = 'text-center text-muted py-4';
        cell.textContent = 'No leave applications are awaiting a decision.';
        return;
    }

    applications.forEach(application => {
        const row = requestsBody.insertRow();
        const staffNameCell = row.insertCell();
        const staffName = document.createElement('strong');
        staffName.textContent = application.staffName;
        staffNameCell.appendChild(staffName);
        row.insertCell().textContent = formatLeaveType(application.leaveType);
        row.insertCell().textContent = `${formatLeaveDate(application.fromDate)} - ${formatLeaveDate(application.toDate)} (${application.totalDays} day${application.totalDays === 1 ? '' : 's'})`;
        const balance = getLeaveBalance(application.staffName, application.leaveType);
        row.insertCell().textContent = balance
            ? `${balance.taken} taken / ${balance.balance} left`
            : 'Not tracked';
        row.insertCell().textContent = application.purpose;
        row.insertCell().textContent = application.attachmentName || 'No attachment';

        const statusCell = row.insertCell();
        const badge = document.createElement('span');
        badge.className = application.status === 'Approved'
            ? 'badge bg-success'
            : application.status === 'Rejected'
                ? 'badge bg-danger'
                : 'badge bg-warning text-dark';
        badge.textContent = application.status;
        statusCell.appendChild(badge);

        const actionCell = row.insertCell();
        if (application.status === 'Pending') {
            for (const [status, buttonClass, label] of [
                ['Approved', 'btn-success', 'Approve'],
                ['Rejected', 'btn-danger', 'Reject']
            ]) {
                const button = document.createElement('button');
                button.type = 'button';
                button.className = `btn btn-sm ${buttonClass}${status === 'Approved' ? ' me-1' : ''}`;
                button.textContent = label;
                button.addEventListener('click', () => updateLeaveStatus(application.id, status));
                actionCell.appendChild(button);
            }
        } else {
            actionCell.textContent = 'Decision recorded';
        }
    });
}

function updateLeaveStatus(applicationId, status) {
    const applications = getLeaveApplications();
    const application = applications.find(item => item.id === applicationId);
    if (!application || application.status !== 'Pending') return;

    application.status = status;
    application.decidedAt = new Date().toISOString();
    saveLeaveApplications(applications);
    renderLeaveRequests();
    renderLeaveBalance();
    renderLeaveBalanceOverview();
}

function getReportApplications() {
    const fromDate = document.getElementById('reportFromDate')?.value;
    const toDate = document.getElementById('reportToDate')?.value;
    const rangeStart = fromDate ? parseDateFromIso(fromDate) : null;
    const rangeEnd = toDate ? parseDateFromIso(toDate) : null;

    if (rangeStart && rangeEnd && rangeStart > rangeEnd) {
        alert('The report To Date must be the same as or after the From Date.');
        return null;
    }

    return getLeaveApplications().filter(application => {
        const leaveStart = parseDateFromIso(application.fromDate);
        const leaveEnd = parseDateFromIso(application.toDate);
        if (!leaveStart || !leaveEnd) return false;

        // Include any leave period that overlaps the selected report period.
        return (!rangeStart || leaveEnd >= rangeStart)
            && (!rangeEnd || leaveStart <= rangeEnd);
    });
}

function getLeaveReportRows(applications) {
    return applications.map(application => ({
        'Staff Name': application.staffName,
        'Leave Type': application.leaveType,
        'From Date': formatLeaveDate(application.fromDate),
        'To Date': formatLeaveDate(application.toDate),
        'Total Days': application.totalDays,
        Purpose: application.purpose,
        Attachment: application.attachmentName || 'No attachment',
        Status: application.status,
        'Submitted At': application.submittedAt ? new Date(application.submittedAt).toLocaleString() : '',
        'Decided At': application.decidedAt ? new Date(application.decidedAt).toLocaleString() : ''
    }));
}
// --- Section Switching Logic ---
function showSection(sectionId) {
    document.querySelectorAll('.section').forEach(sec => sec.classList.add('hidden'));
    const target = document.getElementById(sectionId);
    if (target) target.classList.remove('hidden');
}

// --- QR Scanner Implementation ---
// The leave portal does not always include the attendance-scanner UI.  Only
// initialize it when its container is present, so it cannot block other page
// features (such as the leave-date calculation).
const readerElement = document.getElementById('reader');
if (readerElement && typeof Html5Qrcode !== 'undefined') {
    const html5QrCode = new Html5Qrcode('reader');
    const qrConfig = { fps: 10, qrbox: { width: 250, height: 250 } };

    const onScanSuccess = (decodedText) => {
        html5QrCode.stop();
        readerElement.classList.add('hidden');
        document.getElementById('scan-success')?.classList.remove('hidden');

        const attendanceData = {
            qr_token: decodedText,
            timestamp: new Date().toISOString(),
            location: 'TTIC_Main_Campus'
        };

        console.log('Attendance Data Captured:', attendanceData);
    };

    html5QrCode.start({ facingMode: 'environment' }, qrConfig, onScanSuccess)
        .catch(error => console.warn('QR scanner could not start:', error));
}

// --- Leave Form Handling ---
window.addEventListener('DOMContentLoaded', () => {
    const leaveForm = document.getElementById('leaveForm');
    const leaveTypeEl = document.getElementById('leaveType');
    const fromDateEl = document.getElementById('fromDate');
    const toDateEl = document.getElementById('toDate');
    const leaveBalanceToggle = document.getElementById('leaveBalanceToggle');

    if (leaveForm) {
        leaveForm.addEventListener('submit', async (e) => {
            e.preventDefault();

            const form = e.target;
            const formData = new FormData(form);
            const leaveType = formData.get('leave_type') || leaveTypeEl?.value;
            const fromDate = fromDateEl?.value;
            const toDate = toDateEl?.value;
            const user = typeof Auth !== 'undefined' ? Auth.current() : null;

            if (!fromDate || !toDate) {
                alert('Please select both From and To dates.');
                return;
            }

            const start = new Date(fromDate);
            const end = new Date(toDate);
            const msPerDay = 24 * 60 * 60 * 1000;
            const diffDays = Math.floor((end - start) / msPerDay) + 1;

            if (isNaN(diffDays) || diffDays <= 0) {
                alert('Please ensure the To Date is the same or after the From Date.');
                return;
            }

            // Business rule: Casual Leave cannot exceed 10 days
            const allowance = LEAVE_ALLOWANCES[leaveType];
            if (allowance && diffDays > allowance) {
                alert(`${formatLeaveType(leaveType)} cannot exceed ${allowance} days. Please reduce the date range or choose a different leave type.`);
                return;
            }

            // All validations passed — submit (client-side placeholder)
            const leaveBalance = getLeaveBalance(user?.name || 'Staff member', leaveType);
            if (leaveBalance && diffDays > leaveBalance.balance) {
                alert(`You have only ${leaveBalance.balance} ${leaveType} leave day${leaveBalance.balance === 1 ? '' : 's'} remaining.`);
                return;
            }

            const applications = getLeaveApplications();
            applications.unshift({
                id: `${Date.now()}-${Math.random().toString(36).slice(2)}`,
                staffName: user?.name || 'Staff member',
                leaveType,
                purpose: formData.get('purpose')?.trim() || '',
                fromDate,
                toDate,
                totalDays: diffDays,
                attachmentName: document.getElementById('leaveAttachment')?.files[0]?.name || '',
                status: 'Pending',
                submittedAt: new Date().toISOString()
            });
            saveLeaveApplications(applications);
            renderLeaveRequests();
            renderLeaveBalance();
            renderLeaveBalanceOverview();
            alert('Application submitted! The Principal will review your attached documents.');
            form.reset();
        });
    }

    const updateLeaveInfo = () => {
        computeLeaveDays();
        checkLeaveLimits();
    };

    if (leaveTypeEl) {
        leaveTypeEl.addEventListener('input', updateLeaveInfo);
        leaveTypeEl.addEventListener('change', updateLeaveInfo);
    }
    if (fromDateEl) {
        fromDateEl.addEventListener('input', updateLeaveInfo);
        fromDateEl.addEventListener('change', updateLeaveInfo);
    }
    if (toDateEl) {
        toDateEl.addEventListener('input', updateLeaveInfo);
        toDateEl.addEventListener('change', updateLeaveInfo);
    }
    if (leaveBalanceToggle) {
        leaveBalanceToggle.addEventListener('click', () => {
            document.getElementById('leaveBalancePanel')?.classList.toggle('hidden');
            renderLeaveBalance();
        });
    }

    updateLeaveInfo();
    renderLeaveRequests();
    renderLeaveBalance();
    renderLeaveBalanceOverview();
});

function parseDateFromIso(dateString) {
    if (!dateString) return null;
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(Date.UTC(year, month - 1, day));
}

function computeLeaveDays() {
    const fromDate = document.getElementById('fromDate')?.value;
    const toDate = document.getElementById('toDate')?.value;
    const leaveDaysInput = document.getElementById('leaveDays');
    const leaveAlert = document.getElementById('leaveAlert');

    if (!leaveDaysInput) return;
    if (leaveAlert) {
        leaveAlert.classList.add('d-none');
        leaveAlert.textContent = '';
    }

    if (!fromDate || !toDate) {
        leaveDaysInput.value = '';
        return;
    }

    const start = parseDateFromIso(fromDate);
    const end = parseDateFromIso(toDate);
    if (!start || !end) {
        leaveDaysInput.value = '';
        return;
    }

    const msPerDay = 24 * 60 * 60 * 1000;
    const diffDays = Math.round((end - start) / msPerDay) + 1;

    if (isNaN(diffDays) || diffDays <= 0) {
        leaveDaysInput.value = '';
        return;
    }

    leaveDaysInput.value = diffDays;
    return diffDays;
}

function checkLeaveLimits() {
    const leaveType = document.getElementById('leaveType')?.value;
    const diffDays = parseInt(document.getElementById('leaveDays')?.value || '0', 10);
    const leaveAlert = document.getElementById('leaveAlert');

    if (!leaveAlert) return true;

    const allowance = LEAVE_ALLOWANCES[leaveType];
    if (allowance && diffDays > allowance) {
        leaveAlert.textContent = `Leave exceeds allowed ${formatLeaveType(leaveType)} (${allowance} days).`;
        leaveAlert.classList.remove('d-none');
        return false;
    }

    leaveAlert.classList.add('d-none');
    leaveAlert.textContent = '';
    return true;
}



// ==========================
// Download Excel Report
// ==========================

function downloadExcelReport() {
    const applications = getReportApplications();
    if (!applications) return;

    const reportRows = getLeaveReportRows(applications);
    const worksheet = XLSX.utils.json_to_sheet(reportRows);

    const workbook =
        XLSX.utils.book_new();

    XLSX.utils.book_append_sheet(
        workbook,
        worksheet,
        "Leave Records"
    );

    XLSX.writeFile(
        workbook,
        "TTIC_Leave_Records.xlsx"
    );
}
// ==========================
// Download PDF Report
// ==========================

function downloadPDFReport() {
    const applications = getReportApplications();
    if (!applications) return;

    const { jsPDF } = window.jspdf;

    const doc = new jsPDF();

    doc.setFontSize(16);

    doc.text(
        "TTIC Staff Leave Records",
        14,
        15
    );

    doc.autoTable({

        head: [["Staff Name", "Leave Type", "From", "To", "Days", "Purpose", "Status"]],

        body: applications.map(application => [
            application.staffName,
            application.leaveType,
            formatLeaveDate(application.fromDate),
            formatLeaveDate(application.toDate),
            application.totalDays,
            application.purpose,
            application.status
        ]),

        startY: 25

    });

    doc.save(
        "TTIC_Leave_Records.pdf"
    );

}
