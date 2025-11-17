// Global state
let currentUser = null;
let allEmployees = [];
let currentReportType = 'employee-schedule';

// Initialize on page load
document.addEventListener('DOMContentLoaded', async () => {
    await loadCurrentUser();
    await loadEmployees();
    initializeReportTypeSelector();
    setDefaultDates();
});

// Load current user info
async function loadCurrentUser() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) {
            window.location.href = '/login';
            return;
        }
        currentUser = await response.json();

        // Check if user is manager
        if (currentUser.role !== 'manager') {
            alert('Access denied. Only managers can access reports.');
            window.location.href = '/dashboard';
            return;
        }

        document.getElementById('username').textContent = currentUser.username;
        document.getElementById('role-badge').textContent = currentUser.role.toUpperCase();
    } catch (error) {
        console.error('Error loading user:', error);
        window.location.href = '/login';
    }
}

// Load all employees
async function loadEmployees() {
    try {
        const response = await fetch(`/api/users/department/${currentUser.department}`);
        if (response.ok) {
            allEmployees = await response.json();
            populateEmployeeSelectors();
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Populate employee select dropdowns
function populateEmployeeSelectors() {
    const scheduleSelect = document.getElementById('schedule-employee-select');
    const comparisonSelect = document.getElementById('comparison-employee-select');

    const options = allEmployees
        .filter(emp => emp.role === 'employee')
        .map(emp => `<option value="${emp.id}">${emp.username}</option>`)
        .join('');

    scheduleSelect.innerHTML = `<option value="">-- Select Employee --</option>${options}`;
    comparisonSelect.innerHTML = `<option value="">-- Select Employee --</option>${options}`;
}

// Initialize report type selector
function initializeReportTypeSelector() {
    const buttons = document.querySelectorAll('.report-type-btn');
    buttons.forEach(btn => {
        btn.addEventListener('click', () => {
            buttons.forEach(b => b.classList.remove('active'));
            btn.classList.add('active');

            const reportType = btn.dataset.report;
            currentReportType = reportType;

            // Hide all filter sections
            document.querySelectorAll('.report-filters').forEach(f => f.classList.remove('active'));

            // Show selected filter section
            document.getElementById(`${reportType}-filters`).classList.add('active');

            // Clear report content
            showEmptyState();
        });
    });
}

// Set default dates to current week
function setDefaultDates() {
    const today = new Date();
    const monday = getMonday(today);

    document.getElementById('schedule-week-start').valueAsDate = monday;
    document.getElementById('comparison-week-start').valueAsDate = monday;
    document.getElementById('hours-start-date').valueAsDate = monday;

    const sunday = new Date(monday);
    sunday.setDate(sunday.getDate() + 6);
    document.getElementById('hours-end-date').valueAsDate = sunday;
}

// Get Monday of current week
function getMonday(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1);
    return new Date(d.setDate(diff));
}

// Show empty state
function showEmptyState() {
    const content = document.getElementById('report-content');
    content.innerHTML = `
        <div class="empty-state">
            <svg fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z"></path>
            </svg>
            <h3>No Report Generated</h3>
            <p>Select a report type and click "Generate Report" to view data.</p>
        </div>
    `;
}

// Format date for display
function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
    });
}

// Generate Employee Schedule Report
async function generateEmployeeSchedule() {
    const employeeId = document.getElementById('schedule-employee-select').value;
    const weekStart = document.getElementById('schedule-week-start').value;

    if (!employeeId || !weekStart) {
        alert('Please select an employee and week');
        return;
    }

    try {
        const response = await fetch(`/api/reports/employee-schedule/${employeeId}/${weekStart}`);
        if (!response.ok) throw new Error('Failed to load schedule');

        const data = await response.json();
        displayEmployeeSchedule(data);

        // Update print header
        document.getElementById('print-report-title').textContent =
            `Employee Schedule: ${data.employeeName} - Week of ${formatDate(weekStart)}`;
        document.getElementById('print-date').textContent = new Date().toLocaleString();
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report. Please try again.');
    }
}

// Display employee schedule
function displayEmployeeSchedule(data) {
    const content = document.getElementById('report-content');

    const totalHours = data.schedule.reduce((sum, day) => sum + (day.totalHours || 0), 0);

    let html = `
        <h2>📅 Employee Schedule Report</h2>
        <div class="summary-stats">
            <div class="stat-card">
                <h4>Employee</h4>
                <div class="value">${data.employeeName}</div>
            </div>
            <div class="stat-card">
                <h4>Week Of</h4>
                <div class="value">${formatDate(data.weekStart)}</div>
            </div>
            <div class="stat-card">
                <h4>Total Hours</h4>
                <div class="value">${totalHours.toFixed(1)}h</div>
            </div>
            <div class="stat-card">
                <h4>Status</h4>
                <div class="value" style="color: ${totalHours <= 30 ? '#4caf50' : '#f44336'}">
                    ${totalHours <= 30 ? '✓ Within Limit' : '⚠ Over Limit'}
                </div>
            </div>
        </div>

        <table class="report-table">
            <thead>
                <tr>
                    <th>Day</th>
                    <th>Date</th>
                    <th>Assigned Hours</th>
                    <th>Total Hours</th>
                </tr>
            </thead>
            <tbody>
    `;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    data.schedule.forEach((day, index) => {
        const hours = day.hours && day.hours.length > 0
            ? day.hours.join(', ') + ':00'
            : 'No assignment';

        html += `
            <tr>
                <td><strong>${days[index]}</strong></td>
                <td>${formatDate(day.date)}</td>
                <td>${hours}</td>
                <td>${day.totalHours ? day.totalHours.toFixed(1) + 'h' : '-'}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    content.innerHTML = html;
}

// Generate Hours Summary Report
async function generateHoursSummary() {
    const startDate = document.getElementById('hours-start-date').value;
    const endDate = document.getElementById('hours-end-date').value;

    if (!startDate || !endDate) {
        alert('Please select start and end dates');
        return;
    }

    if (new Date(startDate) > new Date(endDate)) {
        alert('Start date must be before end date');
        return;
    }

    try {
        const response = await fetch(`/api/reports/hours-summary/${startDate}/${endDate}`);
        if (!response.ok) throw new Error('Failed to load hours summary');

        const data = await response.json();
        displayHoursSummary(data);

        // Update print header
        document.getElementById('print-report-title').textContent =
            `Hours Summary: ${formatDate(startDate)} to ${formatDate(endDate)}`;
        document.getElementById('print-date').textContent = new Date().toLocaleString();
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report. Please try again.');
    }
}

// Display hours summary
function displayHoursSummary(data) {
    const content = document.getElementById('report-content');

    const totalHours = data.employees.reduce((sum, emp) => sum + emp.totalHours, 0);
    const avgHours = data.employees.length > 0 ? totalHours / data.employees.length : 0;
    const overLimitCount = data.employees.filter(emp => emp.maxWeeklyHours > 30).length;

    let html = `
        <h2>⏰ Hours Summary Report</h2>
        <div class="summary-stats">
            <div class="stat-card">
                <h4>Date Range</h4>
                <div class="value" style="font-size: 14px;">${formatDate(data.startDate)} - ${formatDate(data.endDate)}</div>
            </div>
            <div class="stat-card">
                <h4>Total Employees</h4>
                <div class="value">${data.employees.length}</div>
            </div>
            <div class="stat-card">
                <h4>Total Hours</h4>
                <div class="value">${totalHours.toFixed(1)}h</div>
            </div>
            <div class="stat-card">
                <h4>Avg Hours/Employee</h4>
                <div class="value">${avgHours.toFixed(1)}h</div>
            </div>
        </div>

        ${overLimitCount > 0 ? `
            <div class="stat-card" style="background: #fff3cd; border-left-color: #f44336; margin-bottom: 20px;">
                <h4>⚠ Warning</h4>
                <div style="color: #856404; font-size: 14px;">
                    ${overLimitCount} employee(s) exceeded 30 hours in at least one week
                </div>
            </div>
        ` : ''}

        <table class="report-table">
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Total Hours</th>
                    <th>Weeks Worked</th>
                    <th>Avg Hours/Week</th>
                    <th>Max Weekly Hours</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    data.employees.forEach(emp => {
        const avgWeekly = emp.weeksWorked > 0 ? emp.totalHours / emp.weeksWorked : 0;
        const status = emp.maxWeeklyHours <= 30 ? '✓ OK' : '⚠ Over Limit';
        const statusColor = emp.maxWeeklyHours <= 30 ? '#4caf50' : '#f44336';

        html += `
            <tr>
                <td><strong>${emp.username}</strong></td>
                <td>${emp.totalHours.toFixed(1)}h</td>
                <td>${emp.weeksWorked}</td>
                <td>${avgWeekly.toFixed(1)}h</td>
                <td style="font-weight: bold; color: ${emp.maxWeeklyHours > 30 ? '#f44336' : '#333'}">
                    ${emp.maxWeeklyHours.toFixed(1)}h
                </td>
                <td style="color: ${statusColor}; font-weight: bold;">${status}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>
    `;

    content.innerHTML = html;
}

// Generate Availability vs Assignment Comparison
async function generateAvailabilityComparison() {
    const employeeId = document.getElementById('comparison-employee-select').value;
    const weekStart = document.getElementById('comparison-week-start').value;

    if (!employeeId || !weekStart) {
        alert('Please select an employee and week');
        return;
    }

    try {
        const response = await fetch(`/api/reports/availability-comparison/${employeeId}/${weekStart}`);
        if (!response.ok) throw new Error('Failed to load comparison data');

        const data = await response.json();
        displayAvailabilityComparison(data);

        // Update print header
        document.getElementById('print-report-title').textContent =
            `Availability vs Assignment: ${data.employeeName} - Week of ${formatDate(weekStart)}`;
        document.getElementById('print-date').textContent = new Date().toLocaleString();
    } catch (error) {
        console.error('Error generating report:', error);
        alert('Failed to generate report. Please try again.');
    }
}

// Display availability comparison
function displayAvailabilityComparison(data) {
    const content = document.getElementById('report-content');

    const availableHours = data.comparison.reduce((sum, day) => sum + day.availableHours, 0);
    const assignedHours = data.comparison.reduce((sum, day) => sum + day.assignedHours, 0);
    const utilizationRate = availableHours > 0 ? (assignedHours / availableHours * 100) : 0;

    let html = `
        <h2>🔄 Availability vs Assignment Comparison</h2>
        <div class="summary-stats">
            <div class="stat-card">
                <h4>Employee</h4>
                <div class="value">${data.employeeName}</div>
            </div>
            <div class="stat-card">
                <h4>Available Hours</h4>
                <div class="value">${availableHours}h</div>
            </div>
            <div class="stat-card">
                <h4>Assigned Hours</h4>
                <div class="value">${assignedHours}h</div>
            </div>
            <div class="stat-card">
                <h4>Utilization Rate</h4>
                <div class="value">${utilizationRate.toFixed(0)}%</div>
            </div>
        </div>

        <table class="report-table">
            <thead>
                <tr>
                    <th>Day</th>
                    <th>Date</th>
                    <th>Available Hours</th>
                    <th>Assigned Hours</th>
                    <th>Unassigned</th>
                    <th>Status</th>
                </tr>
            </thead>
            <tbody>
    `;

    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    data.comparison.forEach((day, index) => {
        const unassigned = day.availableHours - day.assignedHours;
        const status = unassigned === 0 ? 'Fully Utilized' :
                      unassigned > 0 ? 'Underutilized' :
                      'Over-assigned';
        const statusColor = unassigned === 0 ? '#4caf50' :
                           unassigned > 0 ? '#ff9800' :
                           '#f44336';

        html += `
            <tr>
                <td><strong>${days[index]}</strong></td>
                <td>${formatDate(day.date)}</td>
                <td>${day.availableHours}h (${day.availableSlots.join(', ')})</td>
                <td>${day.assignedHours}h (${day.assignedSlots.join(', ')})</td>
                <td>${unassigned}h</td>
                <td style="color: ${statusColor}; font-weight: bold;">${status}</td>
            </tr>
        `;
    });

    html += `
            </tbody>
        </table>

        <div style="margin-top: 30px; padding: 15px; background: #f9f9f9; border-radius: 8px;">
            <h3 style="margin-bottom: 10px;">Legend:</h3>
            <p><strong style="color: #4caf50;">Fully Utilized:</strong> All available hours are assigned</p>
            <p><strong style="color: #ff9800;">Underutilized:</strong> Employee has more available hours than assigned</p>
            <p><strong style="color: #f44336;">Over-assigned:</strong> Employee was assigned hours when not available (requires attention)</p>
        </div>
    `;

    content.innerHTML = html;
}

// Download report as PDF
function downloadPDF() {
    const reportContent = document.getElementById('report-content');

    // Check if report has been generated
    if (reportContent.querySelector('.empty-state')) {
        alert('Please generate a report first before downloading');
        return;
    }

    // Set print title
    const reportTitles = {
        'employee-schedule': 'Employee Schedule Report',
        'hours-summary': 'Hours Summary Report',
        'availability-comparison': 'Availability vs Assignment Report'
    };

    document.getElementById('print-report-title').textContent = reportTitles[currentReportType];
    document.getElementById('print-date').textContent = new Date().toLocaleString();

    // Trigger browser print dialog
    window.print();
}
