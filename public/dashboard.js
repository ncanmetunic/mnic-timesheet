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
            <div class="nav-btn" onclick="showSection('this-weeks-schedule')">📅 This Week's Schedule</div>
            <div class="nav-btn" onclick="showSection('monthly-reports')">📈 Monthly Reports</div>
        `;
    } else {
        navigation.innerHTML = `
            <div class="nav-btn active" onclick="showSection('overview')">📊 Overview</div>
            <div class="nav-btn" onclick="showSection('submit-availability')">✋ Submit Availability</div>
            <div class="nav-btn" onclick="showSection('this-weeks-schedule')">📅 This Week's Schedule</div>
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
        case 'this-weeks-schedule':
            showThisWeeksSchedule();
            break;
        case 'availability-review':
            showAvailabilityReview();
            break;
        case 'assign-shifts':
            showShiftAssignment();
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
            html += `<div class="grid-cell availability-cell" 
                    data-day="${day}" 
                    data-hour="${hour}" 
                    onclick="toggleAvailability(${day}, ${hour})"
                    onmousedown="startDragSelection(event, ${day}, ${hour})"
                    onmouseover="handleDragSelection(event, ${day}, ${hour})"
                    onmouseup="endDragSelection(event)"></div>`;
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
    // Don't trigger toggle if we're in the middle of a drag operation
    if (isDragging) return;
    
    const cell = event.target;
    if (cell.classList.contains('selected')) {
        cell.classList.remove('selected');
        cell.textContent = '';
    } else {
        cell.classList.add('selected');
        cell.textContent = '✓';
    }
}

// Drag selection variables
let isDragging = false;
let dragStartDay = null;
let dragStartHour = null;
let dragEndDay = null;
let dragEndHour = null;
let dragSelectionMode = null; // 'select' or 'deselect'

// Smart click vs drag detection
let mouseDownTime = 0;
let dragTimeout = null;
let hasMoved = false;
let currentMouseTarget = null;

// Start potential drag selection
function startDragSelection(event, day, hour) {
    event.preventDefault();
    
    mouseDownTime = Date.now();
    hasMoved = false;
    currentMouseTarget = event.target;
    dragStartDay = day;
    dragStartHour = hour;
    
    // Determine selection mode based on current cell state
    dragSelectionMode = currentMouseTarget.classList.contains('selected') ? 'deselect' : 'select';
    
    // Set timeout to detect if this is a click or drag
    dragTimeout = setTimeout(() => {
        if (!hasMoved) {
            // This is a long press, start drag mode
            actuallyStartDragMode(day, hour);
        }
    }, 150);
    
    console.log(`Mouse down at day ${day}, hour ${hour}, mode: ${dragSelectionMode}`);
}

// Actually start drag mode after timeout
function actuallyStartDragMode(day, hour) {
    isDragging = true;
    dragEndDay = day;
    dragEndHour = hour;
    
    // Apply initial selection
    if (dragSelectionMode === 'select') {
        currentMouseTarget.classList.add('selected', 'drag-preview');
        currentMouseTarget.textContent = '✓';
    } else {
        currentMouseTarget.classList.remove('selected');
        currentMouseTarget.classList.add('drag-preview');
        currentMouseTarget.textContent = '';
    }
    
    console.log(`Started drag mode: ${dragSelectionMode} at day ${day}, hour ${hour}`);
}

// Handle drag selection
function handleDragSelection(event, day, hour) {
    // If we're moving and haven't started drag mode yet, start it now
    if (!isDragging && !hasMoved && dragTimeout) {
        hasMoved = true;
        clearTimeout(dragTimeout);
        actuallyStartDragMode(dragStartDay, dragStartHour);
    }
    
    if (!isDragging) return;
    
    dragEndDay = day;
    dragEndHour = hour;
    
    // Clear previous preview
    document.querySelectorAll('.drag-preview').forEach(cell => {
        cell.classList.remove('drag-preview');
    });
    
    // Calculate selection rectangle
    const minDay = Math.min(dragStartDay, dragEndDay);
    const maxDay = Math.max(dragStartDay, dragEndDay);
    const minHour = Math.min(dragStartHour, dragEndHour);
    const maxHour = Math.max(dragStartHour, dragEndHour);
    
    // Apply preview to all cells in rectangle
    for (let d = minDay; d <= maxDay; d++) {
        for (let h = minHour; h <= maxHour; h++) {
            const cell = document.querySelector(`[data-day="${d}"][data-hour="${h}"].availability-cell`);
            if (cell) {
                cell.classList.add('drag-preview');
                if (dragSelectionMode === 'select') {
                    cell.classList.add('selected');
                    cell.textContent = '✓';
                } else {
                    cell.classList.remove('selected');
                    cell.textContent = '';
                }
            }
        }
    }
}

// End drag selection
function endDragSelection(event) {
    const isClick = !isDragging && !hasMoved && (Date.now() - mouseDownTime < 150);
    
    // Clear timeout if it's still running
    if (dragTimeout) {
        clearTimeout(dragTimeout);
        dragTimeout = null;
    }
    
    if (isClick) {
        // Handle as a simple click
        console.log(`Handling as click: ${dragSelectionMode} at day ${dragStartDay}, hour ${dragStartHour}`);
        
        if (dragSelectionMode === 'select') {
            currentMouseTarget.classList.add('selected');
            currentMouseTarget.textContent = '✓';
        } else {
            currentMouseTarget.classList.remove('selected');
            currentMouseTarget.textContent = '';
        }
    } else if (isDragging) {
        // Handle as drag completion
        console.log(`Ended drag selection: ${dragSelectionMode} from day ${dragStartDay}, hour ${dragStartHour} to day ${dragEndDay}, hour ${dragEndHour}`);
        
        // Remove preview classes
        document.querySelectorAll('.drag-preview').forEach(cell => {
            cell.classList.remove('drag-preview');
        });
    }
    
    // Reset all state
    isDragging = false;
    dragStartDay = null;
    dragStartHour = null;
    dragEndDay = null;
    dragEndHour = null;
    dragSelectionMode = null;
    mouseDownTime = 0;
    hasMoved = false;
    currentMouseTarget = null;
}

// Prevent text selection during drag
document.addEventListener('selectstart', function(e) {
    if (isDragging) {
        e.preventDefault();
    }
});

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
// Legacy function - redirects to unified schedule view
async function showMySchedule() {
    await showThisWeeksSchedule();
}

// Legacy function - now redirects to calendar view  
async function loadMySchedule() {
    await loadCalendarView();
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
            <div class="calendar-container" id="assignment-grid">
                <!-- Grid will be populated by JavaScript -->
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

async function showThisWeeksSchedule() {
    const mainContent = document.getElementById('main-content');
    mainContent.innerHTML = `
        <div class="content-section">
            <h2>This Week's Schedule</h2>
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
            <div class="calendar-container" id="calendar-grid">
                <!-- Calendar will be populated by JavaScript -->
            </div>
        </div>
    `;
    
    await loadCalendarView();
}

// Legacy function - now redirects to calendar view
async function loadScheduleMonitor() {
    await loadCalendarView();
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
    
    // Limit future navigation to 12 weeks ahead (more generous for testing)
    const today = new Date();
    const maxFutureDate = new Date(today);
    maxFutureDate.setDate(today.getDate() + (12 * 7)); // 12 weeks ahead
    
    const minPastDate = new Date(today);
    minPastDate.setDate(today.getDate() - (52 * 7)); // 1 year back
    
    const targetDate = new Date(newWeekStart + 'T00:00:00');
    
    console.log(`Navigation check - Today: ${today.toISOString()}`);
    console.log(`Max future allowed: ${maxFutureDate.toISOString()}`);
    console.log(`Target date: ${targetDate.toISOString()}`);
    console.log(`Is target > max? ${targetDate > maxFutureDate}`);
    
    if (targetDate > maxFutureDate) {
        console.log('Navigation blocked: Too far in the future');
        alert(`Cannot navigate more than 12 weeks into the future. Target: ${formatDate(newWeekStart)}, Max: ${formatDate(maxFutureDate.toISOString().split('T')[0])}`);
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
            loadCalendarView();
        } else if (sectionName.includes('assign')) {
            loadHourlyAssignmentGrid();
        } else if (sectionName.includes('monitor')) {
            loadCalendarView();
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
        const [availabilityRes, hourlyAssignmentsRes, usersRes] = await Promise.all([
            fetch(`/api/all-availability/${currentWeekStart}`),
            fetch(`/api/hourly-assignments/${currentWeekStart}`),
            fetch('/api/users')
        ]);
        
        const availability = await availabilityRes.json();
        const hourlyAssignments = await hourlyAssignmentsRes.json();
        const users = await usersRes.json();
        const employees = users.filter(u => u.role === 'employee');
        
        // Build vertical assignment layout - one section per day
        let html = '';
        const fullDayNames = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        
        fullDayNames.forEach((dayName, dayIndex) => {
            html += `<div class="day-schedule">`;
            html += `<div class="day-schedule-header">${dayName}</div>`;
            html += `<div class="day-grid">`;
            
            // Employee name header
            html += `<div class="employee-name-cell">Employee</div>`;
            
            // Time headers for this day
            hours.forEach(hour => {
                html += `<div class="day-time-header">${hour}:00</div>`;
            });
            
            // Employee rows for this day
            employees.forEach(employee => {
                html += `<div class="employee-name-cell">${employee.username}</div>`;
                
                // Get availability and assignments for this employee/day
                const dayAvailability = availability.filter(a => 
                    a.user_id === employee.id && a.day_of_week === dayIndex
                );
                const dayAssignments = hourlyAssignments.filter(ha => 
                    ha.user_id === employee.id && ha.day_of_week === dayIndex
                );
                
                // Hour cells for this employee/day
                hours.forEach(hour => {
                    let cellClass = 'grid-cell time-slot assignment-drag-cell';
                    let cellContent = '';
                    let isAvailable = false;
                    let isAssigned = false;
                    
                    // Check if this hour is within any availability window
                    dayAvailability.forEach(avail => {
                        if (hour >= avail.hour_start && hour < avail.hour_end) {
                            isAvailable = true;
                        }
                    });
                    
                    // Check if this specific hour is assigned
                    const hourAssignment = dayAssignments.find(ha => ha.hour === hour);
                    if (hourAssignment) {
                        isAssigned = true;
                    }
                    
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
                            onmousedown="startAssignmentDrag(event, ${employee.id}, ${dayIndex}, ${hour}, '${employee.username}')"
                            onmouseover="handleAssignmentDrag(event, ${employee.id}, ${dayIndex}, ${hour})"
                            onmouseup="endAssignmentDrag(event)"
                            title="${employee.username} - ${dayName} ${hour}:00">${cellContent}</div>`;
                });
            });
            
            html += `</div>`; // Close day-grid
            html += `</div>`; // Close day-schedule
        });
        
        grid.innerHTML = html;
    } catch (error) {
        console.error('Error loading hourly assignment grid:', error);
    }
}

// Assignment drag selection variables
let isAssignmentDragging = false;
let assignmentDragEmployee = null;
let assignmentDragStartDay = null;
let assignmentDragStartHour = null;
let assignmentDragEndDay = null;
let assignmentDragEndHour = null;
let assignmentDragMode = null; // 'assign' or 'unassign'

// Assignment click vs drag detection
let assignmentMouseDownTime = 0;
let assignmentDragTimeout = null;
let assignmentHasMoved = false;
let assignmentCurrentTarget = null;

// Start assignment drag
function startAssignmentDrag(event, employeeId, dayOfWeek, hour, username) {
    event.preventDefault();
    
    // Check if this hour is unavailable
    const cell = event.target;
    if (cell.classList.contains('unavailable')) {
        return; // Don't start drag on unavailable cells
    }
    
    // Smart click vs drag detection
    assignmentMouseDownTime = Date.now();
    assignmentHasMoved = false;
    assignmentCurrentTarget = event.target;
    
    // Store drag parameters for potential drag operation
    assignmentDragEmployee = employeeId;
    assignmentDragStartDay = dayOfWeek;
    assignmentDragStartHour = hour;
    assignmentDragEndDay = dayOfWeek;
    assignmentDragEndHour = hour;
    assignmentDragMode = cell.classList.contains('assigned') ? 'unassign' : 'assign';
    
    // Set timeout to detect if this is a click or drag
    assignmentDragTimeout = setTimeout(() => {
        if (!assignmentHasMoved) {
            actuallyStartAssignmentDragMode(employeeId, dayOfWeek, hour);
        }
    }, 150);
    
    console.log(`Assignment mouse down: employee ${employeeId} at day ${dayOfWeek}, hour ${hour}`);
}

// Handle assignment drag
function handleAssignmentDrag(event, employeeId, dayOfWeek, hour) {
    // Detect mouse movement for click vs drag differentiation
    if (assignmentMouseDownTime > 0 && !assignmentHasMoved) {
        assignmentHasMoved = true;
        if (assignmentDragTimeout) {
            clearTimeout(assignmentDragTimeout);
            assignmentDragTimeout = null;
        }
        // Start drag mode immediately since mouse moved
        actuallyStartAssignmentDragMode(assignmentDragEmployee, assignmentDragStartDay, assignmentDragStartHour);
    }
    
    if (!isAssignmentDragging || employeeId !== assignmentDragEmployee) return;
    
    assignmentDragEndDay = dayOfWeek;
    assignmentDragEndHour = hour;
    
    // Clear previous preview
    document.querySelectorAll('.assignment-drag-preview').forEach(cell => {
        cell.classList.remove('assignment-drag-preview');
    });
    
    // Only allow drag within same day for assignments (to keep it simple)
    if (dayOfWeek === assignmentDragStartDay) {
        const minHour = Math.min(assignmentDragStartHour, assignmentDragEndHour);
        const maxHour = Math.max(assignmentDragStartHour, assignmentDragEndHour);
        
        // Apply preview to all hours in range for this employee/day
        for (let h = minHour; h <= maxHour; h++) {
            const cell = document.querySelector(`[data-employee="${employeeId}"][data-day="${dayOfWeek}"][data-hour="${h}"].assignment-drag-cell`);
            if (cell && !cell.classList.contains('unavailable')) {
                cell.classList.add('assignment-drag-preview');
            }
        }
    }
}

// Actually start assignment drag mode (called after timeout or mouse movement)
function actuallyStartAssignmentDragMode(employeeId, dayOfWeek, hour) {
    console.log(`Actually starting assignment drag: mode ${assignmentDragMode} for employee ${employeeId} at day ${dayOfWeek}, hour ${hour}`);
    isAssignmentDragging = true;
}

// End assignment drag
async function endAssignmentDrag(event) {
    // Handle click vs drag detection
    const timeDiff = Date.now() - assignmentMouseDownTime;
    const isQuickClick = timeDiff < 200 && !assignmentHasMoved;
    
    // Clear timeout if it exists
    if (assignmentDragTimeout) {
        clearTimeout(assignmentDragTimeout);
        assignmentDragTimeout = null;
    }
    
    // If this was a quick click, trigger single click
    if (isQuickClick && assignmentCurrentTarget) {
        console.log('Detected assignment click - triggering toggle');
        const employeeId = parseInt(assignmentCurrentTarget.dataset.employee);
        const dayOfWeek = parseInt(assignmentCurrentTarget.dataset.day);
        const hour = parseInt(assignmentCurrentTarget.dataset.hour);
        const username = assignmentCurrentTarget.dataset.username;
        
        // Reset click detection variables
        assignmentMouseDownTime = 0;
        assignmentHasMoved = false;
        assignmentCurrentTarget = null;
        
        // Call the toggle function directly
        await toggleHourAssignment(employeeId, dayOfWeek, hour, username);
        return;
    }
    
    if (!isAssignmentDragging) return;
    
    console.log(`Ended assignment drag: ${assignmentDragMode} for employee ${assignmentDragEmployee} from hour ${assignmentDragStartHour} to ${assignmentDragEndHour}`);
    
    // Only process if drag ended on same day
    if (assignmentDragEndDay === assignmentDragStartDay) {
        const minHour = Math.min(assignmentDragStartHour, assignmentDragEndHour);
        const maxHour = Math.max(assignmentDragStartHour, assignmentDragEndHour);
        const hoursCount = maxHour - minHour + 1;
        
        // Calculate new total hours for this day
        const allCellsForDay = document.querySelectorAll(
            `[data-employee="${assignmentDragEmployee}"][data-day="${assignmentDragStartDay}"].time-slot`
        );
        
        let currentAssignedHours = 0;
        allCellsForDay.forEach(dayCell => {
            if (dayCell.classList.contains('assigned') && !dayCell.classList.contains('assignment-drag-preview')) {
                currentAssignedHours += 1;
            }
        });
        
        let newTotalHours;
        if (assignmentDragMode === 'assign') {
            newTotalHours = currentAssignedHours + hoursCount;
        } else {
            newTotalHours = Math.max(0, currentAssignedHours - hoursCount);
        }
        
        // Make API calls for each hour in the drag range
        try {
            const apiEndpoint = assignmentDragMode === 'assign' ? '/api/assign-hour' : '/api/unassign-hour';
            const promises = [];
            
            // Create API call for each hour in the range
            for (let h = minHour; h <= maxHour; h++) {
                const promise = fetch(apiEndpoint, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        userId: assignmentDragEmployee,
                        weekStartDate: currentWeekStart,
                        dayOfWeek: assignmentDragStartDay,
                        hour: h
                    })
                });
                promises.push(promise);
            }
            
            // Wait for all API calls to complete
            const responses = await Promise.all(promises);
            const allSuccessful = responses.every(response => response.ok);
            
            if (allSuccessful) {
                // Update visual state
                const previewCells = document.querySelectorAll('.assignment-drag-preview');
                previewCells.forEach(cell => {
                    if (assignmentDragMode === 'assign') {
                        cell.classList.add('assigned');
                        cell.classList.remove('available');
                        cell.textContent = '✓';
                    } else {
                        cell.classList.remove('assigned');
                        cell.classList.add('available');
                        cell.textContent = '';
                    }
                });
                
                const statusElement = document.getElementById('assignment-status');
                if (statusElement) {
                    statusElement.textContent = `✅ ${assignmentDragMode === 'assign' ? 'Assigned' : 'Removed'} ${hoursCount} hour(s)`;
                    statusElement.style.color = 'green';
                    setTimeout(() => statusElement.textContent = '', 3000);
                }
            }
        } catch (error) {
            console.error('Error updating assignment:', error);
        }
    }
    
    // Clean up
    document.querySelectorAll('.assignment-drag-preview').forEach(cell => {
        cell.classList.remove('assignment-drag-preview');
    });
    
    // Reset state
    isAssignmentDragging = false;
    assignmentDragEmployee = null;
    assignmentDragStartDay = null;
    assignmentDragStartHour = null;
    assignmentDragEndDay = null;
    assignmentDragEndHour = null;
    assignmentDragMode = null;
    
    // Reset click detection variables
    assignmentMouseDownTime = 0;
    assignmentHasMoved = false;
    assignmentCurrentTarget = null;
}

// Toggle hourly assignment - fixed to track individual hours
async function toggleHourAssignment(employeeId, dayOfWeek, hour, username) {
    // Don't trigger toggle if we're in the middle of a drag operation
    if (isAssignmentDragging) return;
    
    const statusElement = document.getElementById('assignment-status');
    
    // Get the cell either from event.target or find it by data attributes
    let cell = null;
    if (typeof event !== 'undefined' && event.target) {
        cell = event.target;
    } else {
        // Find the cell by data attributes when called from click detection
        cell = document.querySelector(`[data-employee="${employeeId}"][data-day="${dayOfWeek}"][data-hour="${hour}"].assignment-drag-cell`);
    }
    
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
        statusElement.textContent = isCurrentlyAssigned ? 'Removing hour...' : 'Assigning hour...';
        statusElement.style.color = 'blue';
        
        // Get all assigned hours for this employee/day to calculate new total
        const allCellsForDay = document.querySelectorAll(
            `[data-employee="${employeeId}"][data-day="${dayOfWeek}"].time-slot`
        );
        
        let assignedHours = 0;
        allCellsForDay.forEach(dayCell => {
            if (dayCell.classList.contains('assigned') && dayCell !== cell) {
                assignedHours += 1; // Count existing assigned hours (excluding current cell)
            }
        });
        
        // Toggle this specific hour
        if (isCurrentlyAssigned) {
            // Remove this hour (decrease total by 1)
            assignedHours = Math.max(0, assignedHours); // Don't include current cell since we're removing it
        } else {
            // Add this hour (increase total by 1) 
            assignedHours += 1; // Add the hour we're assigning
        }
        
        console.log(`Toggling ${username} ${days[dayOfWeek]} ${hour}:00 - ${isCurrentlyAssigned ? 'unassigning' : 'assigning'}`);
        
        // Use new hourly assignment API
        const apiEndpoint = isCurrentlyAssigned ? '/api/unassign-hour' : '/api/assign-hour';
        const response = await fetch(apiEndpoint, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId: employeeId,
                weekStartDate: currentWeekStart,
                dayOfWeek: dayOfWeek,
                hour: hour
            })
        });
        
        if (response.ok) {
            // Update the visual state of just this cell
            if (isCurrentlyAssigned) {
                statusElement.textContent = `✅ Removed ${hour}:00 from ${username} on ${days[dayOfWeek]}`;
                cell.classList.remove('assigned');
                cell.classList.add('available');
                cell.textContent = '';
            } else {
                statusElement.textContent = `✅ Assigned ${hour}:00 to ${username} on ${days[dayOfWeek]}`;
                cell.classList.remove('available');
                cell.classList.add('assigned');
                cell.textContent = '✓';
            }
            statusElement.style.color = 'green';
        } else {
            const error = await response.json();
            statusElement.textContent = `❌ Error: ${error.error}`;
            statusElement.style.color = 'red';
        }
    } catch (error) {
        statusElement.textContent = '❌ Network error';
        statusElement.style.color = 'red';
        console.error('Error toggling assignment:', error);
    }
    
    // Clear status after 3 seconds
    setTimeout(() => {
        statusElement.textContent = '';
    }, 3000);
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
async function loadCalendarView() {
    try {
        const grid = document.getElementById('calendar-grid');
        if (!grid) return;
        
        // Update week status (useful for both managers and employees)
        const statusResponse = await fetch(`/api/week-status/${currentWeekStart}`);
        const weekStatus = await statusResponse.json();
        const statusDisplay = document.getElementById('week-status-display');
        if (statusDisplay) {
            statusDisplay.textContent = weekStatus.status === 'finalized' ? 'Finalized' : 'Draft';
        }
        
        const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
        const hours = Array.from({length: 16}, (_, i) => i + 8); // 8 AM to 11 PM
        
        // Get data with error handling
        const [hourlyAssignmentsRes, usersRes, availabilityRes] = await Promise.all([
            fetch(`/api/hourly-assignments/${currentWeekStart}`),
            fetch('/api/users'),
            fetch(`/api/all-availability/${currentWeekStart}`)
        ]);
        
        // Check for API errors
        if (!hourlyAssignmentsRes.ok) {
            console.error('Failed to fetch hourly assignments:', hourlyAssignmentsRes.status);
            throw new Error(`Failed to fetch hourly assignments: ${hourlyAssignmentsRes.status}`);
        }
        if (!usersRes.ok) {
            console.error('Failed to fetch users:', usersRes.status);
            throw new Error(`Failed to fetch users: ${usersRes.status}`);
        }
        if (!availabilityRes.ok) {
            console.error('Failed to fetch availability:', availabilityRes.status);
            throw new Error(`Failed to fetch availability: ${availabilityRes.status}`);
        }
        
        const hourlyAssignments = await hourlyAssignmentsRes.json();
        const users = await usersRes.json();
        const availability = await availabilityRes.json();
        
        console.log('Successfully loaded data:', {
            assignments: hourlyAssignments.length,
            users: users.length,
            availability: availability.length
        });
        
        // Show all employees for both manager and employee views
        const employees = users.filter(u => u.role === 'employee');
        
        // Build vertical calendar layout - one section per day
        let html = '';
        
        days.forEach((dayName, dayIndex) => {
            html += `<div class="day-schedule">`;
            html += `<div class="day-schedule-header">${dayName}</div>`;
            html += `<div class="day-grid">`;
            
            // Employee name header
            html += `<div class="employee-name-cell">Employee</div>`;
            
            // Time headers for this day
            hours.forEach(hour => {
                html += `<div class="day-time-header">${hour}:00</div>`;
            });
            
            // Employee rows for this day
            employees.forEach(employee => {
                html += `<div class="employee-name-cell">${employee.username}</div>`;
                
                // Get assignments for this employee/day
                const dayAssignments = hourlyAssignments.filter(ha => 
                    ha.user_id === employee.id && ha.day_of_week === dayIndex
                );
                
                // Hour cells for this employee/day
                hours.forEach(hour => {
                    let cellClass = 'calendar-cell';
                    let cellContent = '';
                    
                    // Check if this specific hour is assigned
                    const hourAssignment = dayAssignments.find(ha => ha.hour === hour);
                    if (hourAssignment) {
                        cellClass += ' assigned';
                        cellContent = '●';
                    } else {
                        cellClass += ' empty';
                        cellContent = '';
                    }
                    
                    html += `<div class="${cellClass}" 
                            title="${employee.username} - ${dayName} ${hour}:00">${cellContent}</div>`;
                });
            });
            
            html += `</div>`; // Close day-grid
            html += `</div>`; // Close day-schedule
        });
        
        grid.innerHTML = html;
        
        // Show total hours summary below calendar (useful for both managers and employees)
        showWeeklySummary(hourlyAssignments, employees);
        
    } catch (error) {
        console.error('Error loading calendar view:', error);
    }
}

// Show weekly summary table
function showWeeklySummary(hourlyAssignments, employees) {
    const summaryContainer = document.getElementById('schedule-summary-content');
    if (!summaryContainer) return;
    
    const days = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    
    // Count hours by employee and day
    const assignmentsByEmployee = {};
    employees.forEach(employee => {
        assignmentsByEmployee[employee.id] = {
            username: employee.username,
            dailyHours: new Array(7).fill(0), // Initialize 7 days with 0 hours
            totalHours: 0
        };
    });
    
    // Count hourly assignments
    hourlyAssignments.forEach(assignment => {
        if (assignmentsByEmployee[assignment.user_id]) {
            assignmentsByEmployee[assignment.user_id].dailyHours[assignment.day_of_week]++;
            assignmentsByEmployee[assignment.user_id].totalHours++;
        }
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
        const employeeData = assignmentsByEmployee[employee.id];
        html += `<tr><td><strong>${employee.username}</strong></td>`;
        
        for (let day = 0; day < 7; day++) {
            const dayHours = employeeData ? employeeData.dailyHours[day] : 0;
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