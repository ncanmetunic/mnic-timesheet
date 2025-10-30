// METUnic Shift Scheduler - Dashboard JavaScript
let currentUser = null;
let currentWeekStart = getWeekStartDate(new Date());

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async () => {
    try {
        await loadUserInfo();
        renderNavigation();
        showSection('overview');
    } catch (error) {
        console.error('Dashboard initialization error:', error);
        window.location.href = '/login';
    }
});

// Load current user information
async function loadUserInfo() {
    try {
        const response = await fetch('/api/user');
        if (!response.ok) throw new Error('Failed to load user info');
        
        currentUser = await response.json();
        
        document.getElementById('username').textContent = currentUser.username;
        document.getElementById('department').textContent = currentUser.department;
        
        const roleBadge = document.getElementById('role-badge');
        roleBadge.textContent = currentUser.role;
        roleBadge.className = `role-badge role-${currentUser.role}`;
    } catch (error) {
        throw error;
    }
}

// Render navigation based on user role
function renderNavigation() {
    const navigation = document.getElementById('navigation');
    
    if (currentUser.role === 'manager') {
        navigation.innerHTML = `
            <div class="nav-btn active" onclick="showSection('overview')">📊 Overview</div>
            <div class="nav-btn" onclick="showSection('availability-review')">👥 Review Availability</div>
            <div class="nav-btn" onclick="showSection('assign-shifts')">📋 Assign Shifts</div>
            <div class="nav-btn" onclick="showSection('schedule-monitor')">📅 Monitor Schedules</div>
            <div class="nav-btn" onclick="showSection('monthly-reports')">📈 Monthly Reports</div>
        `;
    } else {
        navigation.innerHTML = `
            <div class="nav-btn active" onclick="showSection('overview')">📊 Overview</div>
            <div class="nav-btn" onclick="showSection('submit-availability')">✋ Submit Availability</div>
            <div class="nav-btn" onclick="showSection('my-schedule')">📅 My Schedule</div>
        `;
    }
}

// Show specific section
function showSection(section) {
    // Update navigation
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event.target.classList.add('active');
    
    const mainContent = document.getElementById('main-content');
    
    switch(section) {
        case 'overview':
            showOverview();
            break;
        case 'submit-availability':
            showAvailabilitySubmission();
            break;
        case 'my-schedule':
            showMySchedule();
            break;
        case 'availability-review':
            showAvailabilityReview();
            break;
        case 'assign-shifts':
            showShiftAssignment();
            break;
        case 'schedule-monitor':
            showScheduleMonitor();
            break;
        case 'monthly-reports':
            showMonthlyReports();
            break;
    }
}

// Overview section
async function showOverview() {
    const mainContent = document.getElementById('main-content');
    
    if (currentUser.role === 'manager') {
        mainContent.innerHTML = `
            <div class="content-section">
                <h2>Manager Overview</h2>
                <div class="stats-container">
                    <div class="stat-card">
                        <div class="stat-value" id="total-employees">-</div>
                        <div class="stat-label">Total Employees</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="week-status">-</div>
                        <div class="stat-label">Current Week Status</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="pending-assignments">-</div>
                        <div class="stat-label">Pending Assignments</div>
                    </div>
                </div>
                <p>Use the navigation above to manage employee availability, assign shifts, and monitor schedules.</p>
            </div>
        `;
        await loadManagerStats();
    } else {
        mainContent.innerHTML = `
            <div class="content-section">
                <h2>Employee Overview</h2>
                <div class="stats-container">
                    <div class="stat-card">
                        <div class="stat-value" id="week-hours">-</div>
                        <div class="stat-label">This Week's Hours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value" id="availability-status">-</div>
                        <div class="stat-label">Availability Status</div>
                    </div>
                </div>
                <p>Submit your availability for upcoming weeks and view your assigned shifts.</p>
                <p><strong>Remember:</strong> Maximum 30 hours per week allowed.</p>
            </div>
        `;
        await loadEmployeeStats();
    }
}

// Load manager statistics
async function loadManagerStats() {
    try {
        const usersResponse = await fetch('/api/users');
        const users = await usersResponse.json();
        const employees = users.filter(u => u.role === 'employee');
        
        document.getElementById('total-employees').textContent = employees.length;
        
        const weekStatusResponse = await fetch(`/api/week-status/${currentWeekStart}`);
        const weekStatus = await weekStatusResponse.json();
        document.getElementById('week-status').textContent = weekStatus.status || 'Draft';
        
        document.getElementById('pending-assignments').textContent = '0'; // Would need more logic
    } catch (error) {
        console.error('Error loading manager stats:', error);
    }
}

// Load employee statistics
async function loadEmployeeStats() {
    try {
        const hoursResponse = await fetch(`/api/weekly-hours/${currentWeekStart}`);
        const hoursData = await hoursResponse.json();
        document.getElementById('week-hours').textContent = hoursData.totalHours || 0;
        
        const availabilityResponse = await fetch(`/api/availability/${currentWeekStart}`);
        const availability = await availabilityResponse.json();
        document.getElementById('availability-status').textContent = 
            availability.length > 0 ? 'Submitted' : 'Pending';
    } catch (error) {
        console.error('Error loading employee stats:', error);
    }
}

// Availability submission for employees
function showAvailabilitySubmission() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-section">
            <h2>Submit Your Availability</h2>
            <div class="week-navigation">
                <button class="nav-week-btn" onclick="changeWeek(-1)">◀</button>
                <h3 id="current-week-display">Week of ${formatDate(currentWeekStart)}</h3>
                <button class="nav-week-btn" onclick="changeWeek(1)">▶</button>
            </div>
            <p>Click on time slots when you are <strong>available</strong> to work. Maximum 30 hours per week.</p>
            <div class="schedule-grid" id="availability-grid">
                <!-- Grid will be populated by JavaScript -->
            </div>
            <div style="margin-top: 1rem;">
                <button class="btn-success" onclick="saveAvailability()">Save Availability</button>
                <span id="save-status" style="margin-left: 1rem;"></span>
            </div>
        </div>
    `;
    
    loadAvailabilityGrid();
}

// Load availability grid
async function loadAvailabilityGrid() {
    const grid = document.getElementById('availability-grid');
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const hours = Array.from({length: 12}, (_, i) => i + 8); // 8 AM to 7 PM
    
    let html = '<div class="grid-header time-header">Time</div>';
    days.forEach(day => {
        html += `<div class="grid-header">${day}</div>`;
    });
    
    hours.forEach(hour => {
        html += `<div class="grid-cell time-header">${hour}:00-${hour+1}:00</div>`;
        for (let day = 0; day < 7; day++) {
            html += `<div class="grid-cell" data-day="${day}" data-hour="${hour}" onclick="toggleAvailability(${day}, ${hour})"></div>`;
        }
    });
    
    grid.innerHTML = html;
    
    // Load existing availability
    try {
        const response = await fetch(`/api/availability/${currentWeekStart}`);
        const availability = await response.json();
        
        availability.forEach(slot => {
            for (let hour = slot.hour_start; hour < slot.hour_end; hour++) {
                const cell = document.querySelector(`[data-day="${slot.day_of_week}"][data-hour="${hour}"]`);
                if (cell) {
                    cell.classList.add('selected');
                    cell.textContent = '✓';
                }
            }
        });
    } catch (error) {
        console.error('Error loading availability:', error);
    }
}

// Toggle availability cell
function toggleAvailability(day, hour) {
    const cell = event.target;
    if (cell.classList.contains('selected')) {
        cell.classList.remove('selected');
        cell.textContent = '';
    } else {
        cell.classList.add('selected');
        cell.textContent = '✓';
    }
}

// Save availability
async function saveAvailability() {
    const statusElement = document.getElementById('save-status');
    statusElement.textContent = 'Saving...';
    
    const selectedCells = document.querySelectorAll('.grid-cell.selected');
    const availability = {};
    
    // Group by day
    selectedCells.forEach(cell => {
        const day = parseInt(cell.dataset.day);
        const hour = parseInt(cell.dataset.hour);
        
        if (!availability[day]) availability[day] = [];
        availability[day].push(hour);
    });
    
    try {
        // Save each day's availability
        for (const [day, hours] of Object.entries(availability)) {
            if (hours.length > 0) {
                const sortedHours = hours.sort((a, b) => a - b);
                const hourStart = Math.min(...sortedHours);
                const hourEnd = Math.max(...sortedHours) + 1;
                
                await fetch('/api/availability', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        weekStartDate: currentWeekStart,
                        dayOfWeek: parseInt(day),
                        hourStart,
                        hourEnd,
                        status: 'available'
                    })
                });
            }
        }
        
        statusElement.textContent = '✅ Saved successfully!';
        setTimeout(() => statusElement.textContent = '', 3000);
    } catch (error) {
        statusElement.textContent = '❌ Error saving availability';
        console.error('Error saving availability:', error);
    }
}

// My Schedule for employees
async function showMySchedule() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-section">
            <h2>My Schedule</h2>
            <div class="week-navigation">
                <button class="nav-week-btn" onclick="changeWeek(-1)">◀</button>
                <h3 id="current-week-display">Week of ${formatDate(currentWeekStart)}</h3>
                <button class="nav-week-btn" onclick="changeWeek(1)">▶</button>
            </div>
            <div id="schedule-content">Loading...</div>
        </div>
    `;
    
    await loadMySchedule();
}

// Load employee's schedule
async function loadMySchedule() {
    try {
        const response = await fetch(`/api/shifts/${currentWeekStart}`);
        const shifts = await response.json();
        
        const scheduleContent = document.getElementById('schedule-content');
        
        if (shifts.length === 0) {
            scheduleContent.innerHTML = '<p>No shifts assigned for this week yet.</p>';
            return;
        }
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        let html = '<table class="data-table"><thead><tr><th>Day</th><th>Hours Assigned</th></tr></thead><tbody>';
        
        let totalHours = 0;
        days.forEach((day, index) => {
            const dayShift = shifts.find(s => s.day_of_week === index);
            const hours = dayShift ? dayShift.hours_assigned : 0;
            totalHours += hours;
            
            html += `<tr><td>${day}</td><td>${hours} hours</td></tr>`;
        });
        
        html += `</tbody><tfoot><tr><th>Total</th><th>${totalHours} hours</th></tr></tfoot></table>`;
        scheduleContent.innerHTML = html;
    } catch (error) {
        console.error('Error loading schedule:', error);
        document.getElementById('schedule-content').innerHTML = '<p>Error loading schedule.</p>';
    }
}

// Manager functions would go here (availability review, shift assignment, etc.)
// For brevity, I'll add the basic structure

function showAvailabilityReview() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-section">
            <h2>Review Employee Availability</h2>
            <div class="week-navigation">
                <button class="nav-week-btn" onclick="changeWeek(-1)">◀</button>
                <h3 id="current-week-display">Week of ${formatDate(currentWeekStart)}</h3>
                <button class="nav-week-btn" onclick="changeWeek(1)">▶</button>
            </div>
            <div id="availability-review-content">Loading availability...</div>
        </div>
    `;
    
    loadAvailabilityReview();
}

async function loadAvailabilityReview() {
    try {
        const response = await fetch(`/api/all-availability/${currentWeekStart}`);
        const availability = await response.json();
        
        const content = document.getElementById('availability-review-content');
        
        if (availability.length === 0) {
            content.innerHTML = '<p>No availability submitted for this week yet.</p>';
            return;
        }
        
        // Group by employee
        const byEmployee = {};
        availability.forEach(slot => {
            if (!byEmployee[slot.username]) {
                byEmployee[slot.username] = [];
            }
            byEmployee[slot.username].push(slot);
        });
        
        let html = '';
        Object.entries(byEmployee).forEach(([username, slots]) => {
            html += `<h3>${username}</h3>`;
            html += '<table class="data-table"><thead><tr><th>Day</th><th>Time</th><th>Status</th></tr></thead><tbody>';
            
            slots.forEach(slot => {
                const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
                html += `<tr>
                    <td>${days[slot.day_of_week]}</td>
                    <td>${slot.hour_start}:00 - ${slot.hour_end}:00</td>
                    <td>${slot.status}</td>
                </tr>`;
            });
            
            html += '</tbody></table><br>';
        });
        
        content.innerHTML = html;
    } catch (error) {
        console.error('Error loading availability review:', error);
    }
}

function showShiftAssignment() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-section">
            <h2>Assign Shifts</h2>
            <p>Shift assignment interface will be implemented here.</p>
        </div>
    `;
}

function showScheduleMonitor() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-section">
            <h2>Monitor Schedules</h2>
            <p>Schedule monitoring interface will be implemented here.</p>
        </div>
    `;
}

function showMonthlyReports() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-section">
            <h2>Monthly Reports</h2>
            <p>Monthly reporting interface will be implemented here.</p>
        </div>
    `;
}

// Utility functions
function getWeekStartDate(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

function changeWeek(direction) {
    const currentDate = new Date(currentWeekStart);
    currentDate.setDate(currentDate.getDate() + (direction * 7));
    currentWeekStart = getWeekStartDate(currentDate);
    
    // Update week display
    const weekDisplay = document.getElementById('current-week-display');
    if (weekDisplay) {
        weekDisplay.textContent = `Week of ${formatDate(currentWeekStart)}`;
    }
    
    // Reload current section data
    const activeSection = document.querySelector('.nav-btn.active');
    if (activeSection) {
        const sectionName = activeSection.textContent.toLowerCase();
        if (sectionName.includes('availability')) {
            if (currentUser.role === 'employee') {
                loadAvailabilityGrid();
            } else {
                loadAvailabilityReview();
            }
        } else if (sectionName.includes('schedule')) {
            loadMySchedule();
        }
    }
}

function formatDate(dateString) {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'short', 
        day: 'numeric' 
    });
}