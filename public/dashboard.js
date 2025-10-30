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
    
    // Find and activate the corresponding nav button
    const navButtons = document.querySelectorAll('.nav-btn');
    navButtons.forEach(btn => {
        if (btn.textContent.toLowerCase().includes(section.replace('-', ' '))) {
            btn.classList.add('active');
        }
    });
    
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
    const hours = Array.from({length: 16}, (_, i) => i + 8); // 8 AM to 11 PM (23:00-00:00)
    
    let html = '<div class="grid-header time-header">Time</div>';
    days.forEach(day => {
        html += `<div class="grid-header">${day}</div>`;
    });
    
    hours.forEach(hour => {
        html += `<div class="time-header">${hour}:00-${hour+1}:00</div>`;
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

// My Schedule for employees - now uses unified calendar view
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
            <div id="calendar-container">
                <div class="schedule-grid calendar-grid" id="calendar-grid">
                    <!-- Calendar will be populated by JavaScript -->
                </div>
            </div>
        </div>
    `;
    
    await loadCalendarView(true); // true = personal view
}

// Legacy function - now redirects to calendar view
async function loadMySchedule() {
    await loadCalendarView(true);
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

async function showShiftAssignment() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-section">
            <h2>Assign Shifts</h2>
            <div class="week-navigation">
                <button class="nav-week-btn" onclick="changeWeek(-1)">◀</button>
                <h3 id="current-week-display">Week of ${formatDate(currentWeekStart)}</h3>
                <button class="nav-week-btn" onclick="changeWeek(1)">▶</button>
            </div>
            <p><strong>Instructions:</strong> Click on green time slots to assign shifts. Each employee shows their available hours, and you can approve specific time ranges.</p>
            <div class="assignment-legend">
                <span class="legend-item available">🟢 Available</span>
                <span class="legend-item assigned">🟡 Assigned</span>
                <span class="legend-item unavailable">⚫ Unavailable</span>
            </div>
            <div id="assignment-grid-container">
                <div class="schedule-grid hourly-grid" id="assignment-grid">
                    <!-- Grid will be populated by JavaScript -->
                </div>
            </div>
            <div style="margin-top: 1rem;">
                <button class="btn-success" onclick="finalizeWeeklySchedule()">Finalize Weekly Schedule</button>
                <button class="btn-warning" onclick="clearWeeklyAssignments()">Clear All Assignments</button>
                <span id="assignment-status" style="margin-left: 1rem;"></span>
            </div>
        </div>
    `;
    
    await loadHourlyAssignmentGrid();
}

async function showScheduleMonitor() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-section">
            <h2>Monitor Schedules</h2>
            <div class="week-navigation">
                <button class="nav-week-btn" onclick="changeWeek(-1)">◀</button>
                <h3 id="current-week-display">Week of ${formatDate(currentWeekStart)}</h3>
                <button class="nav-week-btn" onclick="changeWeek(1)">▶</button>
            </div>
            <div id="schedule-status-container">
                <div class="stat-card">
                    <div class="stat-value" id="week-status-display">Loading...</div>
                    <div class="stat-label">Week Status</div>
                </div>
            </div>
            <div id="calendar-container">
                <div class="schedule-grid calendar-grid" id="calendar-grid">
                    <!-- Calendar will be populated by JavaScript -->
                </div>
            </div>
        </div>
    `;
    
    await loadCalendarView(false); // false = manager view (all employees)
}

// Legacy function - now redirects to calendar view
async function loadScheduleMonitor() {
    await loadCalendarView(false);
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
    console.log(`Attempting to change week. Current: ${currentWeekStart}, Direction: ${direction}`);
    
    // Create a new date object to avoid mutation issues
    const currentDate = new Date(currentWeekStart + 'T00:00:00');
    console.log(`Parsed current date: ${currentDate.toISOString()}`);
    
    // Add/subtract 7 days
    currentDate.setDate(currentDate.getDate() + (direction * 7));
    console.log(`After adding ${direction * 7} days: ${currentDate.toISOString()}`);
    
    // Get the Monday of that week
    const newWeekStart = getWeekStartDate(currentDate);
    console.log(`New week start calculated: ${newWeekStart}`);
    
    // Limit future navigation to 8 weeks ahead
    const today = new Date();
    const maxFutureDate = new Date(today);
    maxFutureDate.setDate(today.getDate() + (8 * 7)); // 8 weeks ahead
    
    const minPastDate = new Date(today);
    minPastDate.setDate(today.getDate() - (52 * 7)); // 1 year back
    
    const targetDate = new Date(newWeekStart + 'T00:00:00');
    
    if (targetDate > maxFutureDate) {
        console.log('Navigation blocked: Too far in the future');
        alert('Cannot navigate more than 8 weeks into the future');
        return;
    }
    
    if (targetDate < minPastDate) {
        console.log('Navigation blocked: Too far in the past');
        alert('Cannot navigate more than 1 year into the past');
        return;
    }
    
    // Update the global variable
    currentWeekStart = newWeekStart;
    console.log(`Week successfully changed to: ${currentWeekStart}`);
    
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
            loadCalendarView(true);
        } else if (sectionName.includes('assign')) {
            loadHourlyAssignmentGrid();
        } else if (sectionName.includes('monitor')) {
            loadCalendarView(false);
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

// Load employee options for shift assignment
async function loadEmployeeOptions() {
    try {
        const response = await fetch('/api/users');
        const users = await response.json();
        const employees = users.filter(u => u.role === 'employee');
        
        const select = document.getElementById('employee-select');
        if (select) {
            employees.forEach(emp => {
                const option = document.createElement('option');
                option.value = emp.id;
                option.textContent = `${emp.username} (${emp.department})`;
                select.appendChild(option);
            });
        }
    } catch (error) {
        console.error('Error loading employees:', error);
    }
}

// Load hourly assignment grid
async function loadHourlyAssignmentGrid() {
    try {
        const grid = document.getElementById('assignment-grid');
        if (!grid) return;
        
        const days = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
        const hours = Array.from({length: 16}, (_, i) => i + 8); // 8 AM to 11 PM
        
        // Get all availability and existing shifts for this week
        const [availabilityRes, shiftsRes, usersRes] = await Promise.all([
            fetch(`/api/all-availability/${currentWeekStart}`),
            fetch(`/api/shifts/${currentWeekStart}`),
            fetch('/api/users')
        ]);
        
        const availability = await availabilityRes.json();
        const shifts = await shiftsRes.json();
        const users = await usersRes.json();
        const employees = users.filter(u => u.role === 'employee');
        
        // Build grid header
        let html = '<div class="grid-header time-header">Employee</div>';
        days.forEach(day => {
            html += `<div class="grid-header day-header" colspan="16">${day}</div>`;
        });
        
        // Add time headers for each day
        html += '<div class="grid-header time-header">Time</div>';
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            hours.forEach(hour => {
                html += `<div class="time-slot-header">${hour}:00</div>`;
            });
        }
        
        // Build grid body with employee rows
        employees.forEach(employee => {
            // Employee name cell
            html += `<div class="employee-label">${employee.username}</div>`;
            
            // Time slots for each day
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                // Get availability for this employee/day
                const dayAvailability = availability.filter(a => 
                    a.user_id === employee.id && a.day_of_week === dayIndex
                );
                
                // Get existing shifts for this employee/day  
                const dayShifts = shifts.filter(s => 
                    s.user_id === employee.id && s.day_of_week === dayIndex
                );
                
                // For each hour slot
                hours.forEach(hour => {
                    let cellClass = 'grid-cell time-slot';
                    let cellContent = '';
                    let isAvailable = false;
                    let isAssigned = false;
                    
                    // Check if this hour is within any availability window
                    dayAvailability.forEach(avail => {
                        if (hour >= avail.hour_start && hour < avail.hour_end) {
                            isAvailable = true;
                        }
                    });
                    
                    // Check if this hour is assigned (we'll assume shifts are 8-hour blocks for now)
                    dayShifts.forEach(shift => {
                        // For simplicity, we'll show assigned status if there's any shift for this day
                        if (parseFloat(shift.hours_assigned || 0) > 0) {
                            isAssigned = true;
                        }
                    });
                    
                    if (isAssigned) {
                        cellClass += ' assigned';
                        cellContent = '✓';
                    } else if (isAvailable) {
                        cellClass += ' available';
                        cellContent = '';
                    } else {
                        cellClass += ' unavailable';
                        cellContent = '';
                    }
                    
                    html += `<div class="${cellClass}" 
                            data-employee="${employee.id}" 
                            data-day="${dayIndex}" 
                            data-hour="${hour}"
                            data-username="${employee.username}"
                            onclick="toggleHourAssignment(${employee.id}, ${dayIndex}, ${hour}, '${employee.username}')"
                            title="${employee.username} - ${days[dayIndex]} ${hour}:00">${cellContent}</div>`;
                });
            }
        });
        
        grid.innerHTML = html;
    } catch (error) {
        console.error('Error loading hourly assignment grid:', error);
    }
}

// Toggle hourly assignment
async function toggleHourAssignment(employeeId, dayOfWeek, hour, username) {
    const statusElement = document.getElementById('assignment-status');
    const cell = event.target;
    
    // Check if this hour is available
    if (cell.classList.contains('unavailable')) {
        statusElement.textContent = `❌ ${username} is not available at ${hour}:00`;
        statusElement.style.color = 'red';
        setTimeout(() => statusElement.textContent = '', 3000);
        return;
    }
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    const isCurrentlyAssigned = cell.classList.contains('assigned');
    
    try {
        statusElement.textContent = isCurrentlyAssigned ? 'Removing assignment...' : 'Assigning hour...';
        statusElement.style.color = 'blue';
        
        if (isCurrentlyAssigned) {
            // Remove assignment (assign 0 hours)
            const response = await fetch('/api/assign-shift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: employeeId,
                    weekStartDate: currentWeekStart,
                    dayOfWeek: dayOfWeek,
                    hoursAssigned: 0
                })
            });
            
            if (response.ok) {
                statusElement.textContent = `✅ Removed assignment for ${username} on ${days[dayOfWeek]}`;
                statusElement.style.color = 'green';
                cell.classList.remove('assigned');
                cell.classList.add('available');
                cell.textContent = '';
            }
        } else {
            // Add assignment (1 hour)
            const response = await fetch('/api/assign-shift', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    userId: employeeId,
                    weekStartDate: currentWeekStart,
                    dayOfWeek: dayOfWeek,
                    hoursAssigned: 1 // For now, assign 1 hour per click
                })
            });
            
            if (response.ok) {
                statusElement.textContent = `✅ Assigned ${hour}:00-${hour+1}:00 to ${username} on ${days[dayOfWeek]}`;
                statusElement.style.color = 'green';
                cell.classList.remove('available');
                cell.classList.add('assigned');
                cell.textContent = '✓';
            }
        }
    } catch (error) {
        statusElement.textContent = '❌ Network error';
        statusElement.style.color = 'red';
        console.error('Error toggling assignment:', error);
    }
    
    // Clear status after 5 seconds
    setTimeout(() => {
        statusElement.textContent = '';
    }, 5000);
}

// Legacy function for backward compatibility
async function assignShiftToEmployee(employeeId, dayOfWeek, username) {
    // This function is kept for any legacy calls but redirects to hourly assignment
    const statusElement = document.getElementById('assignment-status');
    statusElement.textContent = 'Please use the hourly grid to assign specific time slots';
    statusElement.style.color = 'orange';
    setTimeout(() => statusElement.textContent = '', 3000);
}

// Finalize weekly schedule
async function finalizeWeeklySchedule() {
    const statusElement = document.getElementById('assignment-status');
    
    try {
        statusElement.textContent = 'Finalizing schedule...';
        statusElement.style.color = 'blue';
        
        const response = await fetch('/api/finalize-week', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                weekStartDate: currentWeekStart
            })
        });
        
        if (response.ok) {
            statusElement.textContent = '✅ Weekly schedule finalized!';
            statusElement.style.color = 'green';
        } else {
            const error = await response.json();
            statusElement.textContent = `❌ Error: ${error.error}`;
            statusElement.style.color = 'red';
        }
    } catch (error) {
        statusElement.textContent = '❌ Network error finalizing schedule';
        statusElement.style.color = 'red';
        console.error('Error finalizing schedule:', error);
    }
}

// Clear weekly assignments
async function clearWeeklyAssignments() {
    if (!confirm('Are you sure you want to clear all shift assignments for this week?')) {
        return;
    }
    
    const statusElement = document.getElementById('assignment-status');
    statusElement.textContent = 'Clearing assignments...';
    statusElement.style.color = 'blue';
    
    try {
        // This would need a new API endpoint, but for now we'll reload
        statusElement.textContent = '⚠️ Clear function needs implementation';
        statusElement.style.color = 'orange';
        
        // TODO: Implement clear assignments API endpoint
    } catch (error) {
        statusElement.textContent = '❌ Error clearing assignments';
        statusElement.style.color = 'red';
        console.error('Error clearing assignments:', error);
    }
}

// Unified Calendar View
async function loadCalendarView(isPersonalView = false) {
    try {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;
        
        // Update week status if it's the monitor view
        if (!isPersonalView) {
            const statusResponse = await fetch(`/api/week-status/${currentWeekStart}`);
            const weekStatus = await statusResponse.json();
            const statusDisplay = document.getElementById('week-status-display');
            if (statusDisplay) {
                statusDisplay.textContent = weekStatus.status === 'finalized' ? 'Finalized' : 'Draft';
            }
        }
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const hours = Array.from({length: 16}, (_, i) => i + 8); // 8 AM to 11 PM
        
        // Get data
        const [shiftsRes, usersRes] = await Promise.all([
            fetch(`/api/shifts/${currentWeekStart}`),
            fetch('/api/users')
        ]);
        
        const shifts = await shiftsRes.json();
        const users = await usersRes.json();
        let employees;
        
        if (isPersonalView) {
            // Personal view - only current user
            employees = users.filter(u => u.id === currentUser.id);
        } else {
            // Manager view - all employees
            employees = users.filter(u => u.role === 'employee');
        }
        
        // Build calendar header
        let html = '<div class="grid-header time-header">Employee</div>';
        days.forEach(day => {
            html += `<div class="grid-header day-header" style="grid-column: span 16;">${day}</div>`;
        });
        
        // Time slot headers
        html += '<div class="grid-header time-header">Time</div>';
        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            hours.forEach(hour => {
                html += `<div class="time-slot-header">${hour}:00</div>`;
            });
        }
        
        // Employee rows
        employees.forEach(employee => {
            html += `<div class="employee-label">${employee.username}</div>`;
            
            for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
                // Get shifts for this employee/day
                const dayShifts = shifts.filter(s => 
                    s.user_id === employee.id && s.day_of_week === dayIndex
                );
                
                hours.forEach(hour => {
                    let cellClass = 'grid-cell time-slot calendar-cell';
                    let cellContent = '';
                    
                    // Check if this hour has an assigned shift
                    const hasShift = dayShifts.some(shift => {
                        // For now, if there's any shift on this day, show it assigned
                        return parseFloat(shift.hours_assigned || 0) > 0;
                    });
                    
                    if (hasShift) {
                        cellClass += ' assigned';
                        cellContent = '●';
                    } else {
                        cellClass += ' empty';
                        cellContent = '';
                    }
                    
                    html += `<div class="${cellClass}" 
                            title="${employee.username} - ${days[dayIndex]} ${hour}:00">${cellContent}</div>`;
                });
            }
        });
        
        grid.innerHTML = html;
        
        // Show total hours summary below calendar
        if (!isPersonalView) {
            showWeeklySummary(shifts, employees);
        }
        
    } catch (error) {
        console.error('Error loading calendar view:', error);
    }
}

// Show weekly summary table
function showWeeklySummary(shifts, employees) {
    const summaryContainer = document.getElementById('schedule-summary-content');
    if (!summaryContainer) return;
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Group shifts by employee
    const shiftsByEmployee = {};
    shifts.forEach(shift => {
        if (!shiftsByEmployee[shift.user_id]) {
            shiftsByEmployee[shift.user_id] = {
                username: shift.username,
                shifts: [],
                totalHours: 0
            };
        }
        shiftsByEmployee[shift.user_id].shifts.push(shift);
        shiftsByEmployee[shift.user_id].totalHours += parseFloat(shift.hours_assigned || 0);
    });
    
    let html = `
        <table class="data-table">
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Mon</th><th>Tue</th><th>Wed</th><th>Thu</th><th>Fri</th><th>Sat</th><th>Sun</th>
                    <th>Total</th>
                </tr>
            </thead>
            <tbody>
    `;
    
    employees.forEach(employee => {
        const employeeData = shiftsByEmployee[employee.id];
        html += `<tr><td><strong>${employee.username}</strong></td>`;
        
        for (let day = 0; day < 7; day++) {
            let dayHours = 0;
            if (employeeData) {
                const dayShift = employeeData.shifts.find(s => s.day_of_week === day);
                dayHours = dayShift ? parseFloat(dayShift.hours_assigned) : 0;
            }
            html += `<td>${dayHours > 0 ? dayHours + 'h' : '-'}</td>`;
        }
        
        const totalHours = employeeData ? employeeData.totalHours : 0;
        html += `<td><strong>${totalHours}h</strong></td></tr>`;
    });
    
    html += '</tbody></table>';
    
    // Add summary container if it doesn't exist
    let summaryDiv = document.getElementById('schedule-summary');
    if (!summaryDiv) {
        const container = document.querySelector('.content-section');
        summaryDiv = document.createElement('div');
        summaryDiv.id = 'schedule-summary';
        summaryDiv.innerHTML = '<h3>Weekly Hours Summary</h3><div id="schedule-summary-content"></div>';
        container.appendChild(summaryDiv);
    }
    
    document.getElementById('schedule-summary-content').innerHTML = html;
}