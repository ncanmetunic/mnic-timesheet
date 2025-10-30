// Global variables
let currentUser = null;
let currentCalendarDate = new Date();
let monthlyTimesheets = {};

// Initialize dashboard
document.addEventListener('DOMContentLoaded', async function() {
    try {
        await loadUserInfo();
        setupNavigation();
        showTimesheetSection();
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

// Setup navigation based on user role
function setupNavigation() {
    const navigation = document.getElementById('navigation');
    let navItems = [];
    
    if (currentUser.role === 'admin') {
        navItems = [
            { id: 'timesheets', label: '📋 Manage Timesheets', icon: '' },
            { id: 'admin-planning', label: '📅 Weekly Planning', icon: '' },
            { id: 'users', label: '👥 User Management', icon: '' }
        ];
    } else {
        navItems = [
            { id: 'timesheet', label: '📝 My Timesheet', icon: '' },
            { id: 'planning', label: '📅 Weekly Planning', icon: '' },
            { id: 'reports', label: '📊 My Reports', icon: '' }
        ];
    }
    
    navigation.innerHTML = navItems.map(item => 
        `<button class="nav-btn" onclick="showSection('${item.id}')">${item.label}</button>`
    ).join('');
}

// Show different sections based on navigation
function showSection(sectionId) {
    // Update active navigation
    document.querySelectorAll('.nav-btn').forEach(btn => btn.classList.remove('active'));
    event?.target?.classList.add('active');
    
    switch(sectionId) {
        case 'timesheet':
            showTimesheetSection();
            break;
        case 'planning':
            showWeeklyPlanningSection();
            break;
        case 'reports':
            showReportsSection();
            break;
        case 'timesheets':
            showManageTimesheetsSection();
            break;
        case 'admin-planning':
            showAdminWeeklyPlanningSection();
            break;
        case 'users':
            showUserManagementSection();
            break;
        default:
            showTimesheetSection();
    }
}

// Employee Timesheet Section
function showTimesheetSection() {
    const content = `
        <div class="content-section">
            <h2>📝 My Timesheet</h2>
            
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-value" id="weekly-hours">0</div>
                    <div class="stat-label">Hours This Week</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="remaining-hours">30</div>
                    <div class="stat-label">Remaining Hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="monthly-hours">0</div>
                    <div class="stat-label">Hours This Month</div>
                </div>
            </div>
            
            <!-- Calendar Navigation -->
            <div class="calendar-navigation">
                <button type="button" id="prev-month" class="nav-calendar-btn">‹</button>
                <h3 id="calendar-month-year"></h3>
                <button type="button" id="next-month" class="nav-calendar-btn">›</button>
            </div>
            
            <!-- Calendar Grid -->
            <div class="calendar-container">
                <div class="calendar-grid" id="calendar-grid">
                    <!-- Calendar will be generated here -->
                </div>
            </div>
            
            <!-- Timesheet Entry Form -->
            <div class="timesheet-form-container" id="timesheet-form-container" style="display: none;">
                <h3>Time Entry for <span id="selected-date"></span></h3>
                <form id="timesheet-form">
                    <input type="hidden" id="work-date" name="date" required>
                    <div class="form-row">
                        <div class="form-group">
                            <label for="start-time">Start Time:</label>
                            <select id="start-time" name="startTime" required>
                                <option value="">Select start time</option>
                                <option value="09:00">09:00</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="12:00">12:00</option>
                                <option value="13:00">13:00</option>
                                <option value="14:00">14:00</option>
                                <option value="15:00">15:00</option>
                                <option value="16:00">16:00</option>
                                <option value="17:00">17:00</option>
                                <option value="18:00">18:00</option>
                                <option value="19:00">19:00</option>
                                <option value="20:00">20:00</option>
                                <option value="21:00">21:00</option>
                                <option value="22:00">22:00</option>
                                <option value="23:00">23:00</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="end-time">End Time:</label>
                            <select id="end-time" name="endTime" required>
                                <option value="">Select end time</option>
                                <option value="10:00">10:00</option>
                                <option value="11:00">11:00</option>
                                <option value="12:00">12:00</option>
                                <option value="13:00">13:00</option>
                                <option value="14:00">14:00</option>
                                <option value="15:00">15:00</option>
                                <option value="16:00">16:00</option>
                                <option value="17:00">17:00</option>
                                <option value="18:00">18:00</option>
                                <option value="19:00">19:00</option>
                                <option value="20:00">20:00</option>
                                <option value="21:00">21:00</option>
                                <option value="22:00">22:00</option>
                                <option value="23:00">23:00</option>
                                <option value="00:00">00:00 (Midnight)</option>
                            </select>
                        </div>
                        <div class="form-group">
                            <label for="calculated-hours">Total Hours:</label>
                            <div id="calculated-hours" class="calculated-hours">0 hours</div>
                        </div>
                    </div>
                    <div class="form-actions">
                        <button type="submit" class="btn-primary">Save Entry</button>
                        <button type="button" class="btn-secondary" onclick="closeTimesheetForm()">Cancel</button>
                    </div>
                </form>
                
                <div id="timesheet-message" style="margin-top: 1rem;"></div>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    // Setup calendar
    currentCalendarDate = new Date();
    setupCalendar();
    
    // Setup event listeners
    document.getElementById('timesheet-form').addEventListener('submit', handleTimesheetSubmit);
    document.getElementById('start-time').addEventListener('change', calculateHours);
    document.getElementById('end-time').addEventListener('change', calculateHours);
    document.getElementById('prev-month').addEventListener('click', () => changeMonth(-1));
    document.getElementById('next-month').addEventListener('click', () => changeMonth(1));
    
    // Load data
    loadWeeklyHours();
    loadMonthlyHours();
}

// Calendar Functions
function setupCalendar() {
    updateCalendarHeader();
    generateCalendar();
    loadCalendarData();
}

function updateCalendarHeader() {
    const monthYear = document.getElementById('calendar-month-year');
    const monthNames = ['January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'];
    monthYear.textContent = `${monthNames[currentCalendarDate.getMonth()]} ${currentCalendarDate.getFullYear()}`;
}

function changeMonth(direction) {
    currentCalendarDate.setMonth(currentCalendarDate.getMonth() + direction);
    setupCalendar();
}

function generateCalendar() {
    const calendarGrid = document.getElementById('calendar-grid');
    const year = currentCalendarDate.getFullYear();
    const month = currentCalendarDate.getMonth();
    
    // Create calendar HTML
    let calendarHTML = '<div class="calendar-header">';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        calendarHTML += `<div class="calendar-day-header">${day}</div>`;
    });
    calendarHTML += '</div>';
    
    // Get first day of month and number of days
    const firstDay = new Date(year, month, 1).getDay();
    const daysInMonth = new Date(year, month + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Generate calendar days
    calendarHTML += '<div class="calendar-body">';
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="calendar-day empty"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const timesheet = monthlyTimesheets[dateStr];
        
        let dayClass = 'calendar-day';
        if (isToday) dayClass += ' today';
        if (timesheet) dayClass += ' has-entry';
        
        calendarHTML += `
            <div class="${dayClass}" data-date="${dateStr}" onclick="selectDate('${dateStr}')">
                <span class="day-number">${day}</span>
                ${timesheet ? `<div class="entry-indicator">${timesheet.total_hours.toFixed(1)}h</div>` : ''}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    calendarGrid.innerHTML = calendarHTML;
}

async function loadCalendarData() {
    try {
        const year = currentCalendarDate.getFullYear();
        const month = currentCalendarDate.getMonth() + 1;
        const response = await fetch(`/api/monthly-timesheet/${year}/${month}`);
        if (response.ok) {
            const timesheets = await response.json();
            monthlyTimesheets = {};
            timesheets.forEach(entry => {
                monthlyTimesheets[entry.date] = entry;
            });
            generateCalendar(); // Regenerate with data
        }
    } catch (error) {
        console.error('Error loading calendar data:', error);
    }
}

function selectDate(dateStr) {
    const selectedDate = new Date(dateStr + 'T00:00:00');
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    if (selectedDate < today) {
        alert('Cannot edit past entries');
        return;
    }
    
    document.getElementById('work-date').value = dateStr;
    document.getElementById('selected-date').textContent = selectedDate.toLocaleDateString();
    document.getElementById('timesheet-form-container').style.display = 'block';
    
    // Load existing entry if it exists
    const timesheet = monthlyTimesheets[dateStr];
    if (timesheet) {
        document.getElementById('start-time').value = timesheet.start_time;
        document.getElementById('end-time').value = timesheet.end_time;
        calculateHours();
        document.getElementById('timesheet-message').innerHTML = 
            `<div class="message" style="background: #f0f8ff; color: #667eea; border: 1px solid #667eea;">
                📝 Editing existing entry for ${selectedDate.toLocaleDateString()}. Make changes and click Save to update.
            </div>`;
    } else {
        document.getElementById('start-time').value = '';
        document.getElementById('end-time').value = '';
        calculateHours();
        document.getElementById('timesheet-message').innerHTML = '';
    }
    
    // Scroll to form
    document.getElementById('timesheet-form-container').scrollIntoView({ behavior: 'smooth' });
}

function closeTimesheetForm() {
    document.getElementById('timesheet-form-container').style.display = 'none';
}

async function loadMonthlyHours() {
    try {
        const now = new Date();
        const response = await fetch(`/api/monthly-timesheet/${now.getFullYear()}/${now.getMonth() + 1}`);
        if (response.ok) {
            const entries = await response.json();
            const totalHours = entries.reduce((sum, entry) => sum + entry.total_hours, 0);
            document.getElementById('monthly-hours').textContent = totalHours.toFixed(1);
        }
    } catch (error) {
        console.error('Error loading monthly hours:', error);
    }
}

// Weekly Planning Section
function showWeeklyPlanningSection() {
    const content = `
        <div class="content-section">
            <h2>📅 Weekly Planning</h2>
            
            <div class="stats-container">
                <div class="stat-card">
                    <div class="stat-value" id="current-week-hours">0</div>
                    <div class="stat-label">Current Week Hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="planned-hours">0</div>
                    <div class="stat-label">Planned Hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="week-remaining">30</div>
                    <div class="stat-label">Remaining Capacity</div>
                </div>
            </div>
            
            <!-- Week Navigation -->
            <div class="week-navigation">
                <button type="button" id="prev-week" class="nav-calendar-btn">‹</button>
                <h3 id="week-range"></h3>
                <button type="button" id="next-week" class="nav-calendar-btn">›</button>
            </div>
            
            <!-- Weekly Schedule Grid -->
            <div class="weekly-schedule">
                <div class="schedule-header">
                    <div class="time-column">Time</div>
                    <div class="day-column">Monday</div>
                    <div class="day-column">Tuesday</div>
                    <div class="day-column">Wednesday</div>
                    <div class="day-column">Thursday</div>
                    <div class="day-column">Friday</div>
                    <div class="day-column">Saturday</div>
                    <div class="day-column">Sunday</div>
                </div>
                <div class="schedule-body" id="schedule-body">
                    <!-- Schedule grid will be generated here -->
                </div>
            </div>
            
            <!-- Weekly Summary -->
            <div class="weekly-summary">
                <h3>This Week's Entries</h3>
                <table class="data-table" id="weekly-entries">
                    <thead>
                        <tr>
                            <th>Day</th>
                            <th>Date</th>
                            <th>Start</th>
                            <th>End</th>
                            <th>Hours</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody id="weekly-entries-body">
                        <tr><td colspan="6">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    // Initialize weekly planning
    currentWeekDate = new Date();
    setupWeeklyPlanning();
    
    // Setup event listeners
    document.getElementById('prev-week').addEventListener('click', () => changeWeek(-1));
    document.getElementById('next-week').addEventListener('click', () => changeWeek(1));
}

// Weekly Planning Functions
let currentWeekDate = new Date();

function setupWeeklyPlanning() {
    updateWeekHeader();
    generateWeeklySchedule();
    loadWeeklyData();
}

function updateWeekHeader() {
    const weekRange = document.getElementById('week-range');
    const startOfWeek = getStartOfWeek(currentWeekDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const options = { month: 'short', day: 'numeric' };
    const start = startOfWeek.toLocaleDateString('en-US', options);
    const end = endOfWeek.toLocaleDateString('en-US', options);
    const year = startOfWeek.getFullYear();
    
    weekRange.textContent = `${start} - ${end}, ${year}`;
}

function changeWeek(direction) {
    currentWeekDate.setDate(currentWeekDate.getDate() + (direction * 7));
    setupWeeklyPlanning();
}

function getStartOfWeek(date) {
    const start = new Date(date);
    const day = start.getDay();
    const diff = start.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    start.setDate(diff);
    start.setHours(0, 0, 0, 0);
    return start;
}

function generateWeeklySchedule() {
    const scheduleBody = document.getElementById('schedule-body');
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    const startOfWeek = getStartOfWeek(currentWeekDate);
    
    let scheduleHTML = '';
    hours.forEach(hour => {
        scheduleHTML += `<div class="schedule-row">`;
        scheduleHTML += `<div class="time-cell">${hour}</div>`;
        
        for (let day = 0; day < 7; day++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + day);
            const dateStr = date.toISOString().split('T')[0];
            
            scheduleHTML += `<div class="schedule-cell" data-date="${dateStr}" data-hour="${hour}"></div>`;
        }
        scheduleHTML += `</div>`;
    });
    
    scheduleBody.innerHTML = scheduleHTML;
}

async function loadWeeklyData() {
    try {
        const startOfWeek = getStartOfWeek(currentWeekDate);
        const weekStartStr = startOfWeek.toISOString().split('T')[0];
        
        // Load weekly hours
        const response = await fetch(`/api/weekly-hours/${weekStartStr}`);
        if (response.ok) {
            const data = await response.json();
            const weeklyHours = data.totalHours || 0;
            document.getElementById('current-week-hours').textContent = weeklyHours.toFixed(1);
            document.getElementById('week-remaining').textContent = Math.max(0, 30 - weeklyHours).toFixed(1);
        }
        
        // Load weekly entries
        loadWeeklyEntries();
        
    } catch (error) {
        console.error('Error loading weekly data:', error);
    }
}

async function loadWeeklyEntries() {
    try {
        const startOfWeek = getStartOfWeek(currentWeekDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const year = startOfWeek.getFullYear();
        const month = startOfWeek.getMonth() + 1;
        
        const response = await fetch(`/api/monthly-timesheet/${year}/${month}`);
        if (response.ok) {
            const allEntries = await response.json();
            
            // Filter entries for current week
            const weekEntries = allEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= startOfWeek && entryDate <= endOfWeek;
            });
            
            const tbody = document.getElementById('weekly-entries-body');
            const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
            
            if (weekEntries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">No entries for this week</td></tr>';
            } else {
                tbody.innerHTML = weekEntries.map(entry => {
                    const entryDate = new Date(entry.date);
                    const dayName = dayNames[entryDate.getDay()];
                    return `
                        <tr>
                            <td>${dayName}</td>
                            <td>${entry.date}</td>
                            <td>${entry.start_time}</td>
                            <td>${entry.end_time}</td>
                            <td>${entry.total_hours.toFixed(1)}h</td>
                            <td><span class="status-${entry.status}">${entry.status}</span></td>
                        </tr>
                    `;
                }).join('');
            }
            
            // Update schedule grid with entries
            updateScheduleGrid(weekEntries);
        }
    } catch (error) {
        console.error('Error loading weekly entries:', error);
    }
}

function updateScheduleGrid(entries) {
    // Clear existing entries
    document.querySelectorAll('.schedule-cell').forEach(cell => {
        cell.className = 'schedule-cell';
        cell.title = '';
    });
    
    // Mark cells with entries
    entries.forEach(entry => {
        const startHour = parseInt(entry.start_time.split(':')[0]);
        const endHour = parseInt(entry.end_time.split(':')[0]);
        
        for (let hour = startHour; hour < endHour; hour++) {
            const hourStr = String(hour).padStart(2, '0') + ':00';
            const cell = document.querySelector(`[data-date="${entry.date}"][data-hour="${hourStr}"]`);
            if (cell) {
                cell.classList.add('occupied');
                cell.title = `${entry.start_time} - ${entry.end_time} (${entry.total_hours.toFixed(1)}h)`;
            }
        }
    });
}

// Handle timesheet form submission
async function handleTimesheetSubmit(event) {
    event.preventDefault();
    
    const formData = new FormData(event.target);
    const data = Object.fromEntries(formData.entries());
    const messageDiv = document.getElementById('timesheet-message');
    
    if (!data.date || !data.startTime || !data.endTime) {
        messageDiv.innerHTML = `<div class="message error">Please fill in all fields</div>`;
        return;
    }
    
    const calculatedHoursDiv = document.getElementById('calculated-hours');
    if (calculatedHoursDiv.textContent.includes('⚠️')) {
        messageDiv.innerHTML = `<div class="message error">Please fix the time selection errors before saving</div>`;
        return;
    }
    
    try {
        const response = await fetch('/api/timesheet', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(data)
        });
        
        const result = await response.json();
        
        if (response.ok) {
            messageDiv.innerHTML = `<div class="message success">✅ Timesheet saved successfully! Total hours: ${result.totalHours.toFixed(1)}</div>`;
            loadWeeklyHours();
            loadMonthlyHours();
            loadCalendarData();
            calculateHours();
        } else {
            messageDiv.innerHTML = `<div class="message error">❌ ${result.error}</div>`;
        }
    } catch (error) {
        messageDiv.innerHTML = `<div class="message error">❌ Error saving timesheet: ${error.message}</div>`;
    }
}

// Calculate hours when time dropdowns change
function calculateHours() {
    const startTime = document.getElementById('start-time').value;
    const endTime = document.getElementById('end-time').value;
    const calculatedHoursDiv = document.getElementById('calculated-hours');
    
    if (startTime && endTime) {
        const start = new Date(`2000-01-01T${startTime}`);
        const end = new Date(`2000-01-01T${endTime}`);
        
        if (end <= start && endTime === '00:00') {
            end.setDate(end.getDate() + 1);
        } else if (end <= start) {
            calculatedHoursDiv.textContent = '⚠️ End time must be after start time';
            calculatedHoursDiv.style.color = '#e74c3c';
            return;
        }
        
        const hours = (end - start) / (1000 * 60 * 60);
        
        if (hours > 15) {
            calculatedHoursDiv.textContent = '⚠️ Cannot work more than 15 hours per day';
            calculatedHoursDiv.style.color = '#e74c3c';
        } else if (hours <= 0) {
            calculatedHoursDiv.textContent = '⚠️ Invalid time range';
            calculatedHoursDiv.style.color = '#e74c3c';
        } else {
            calculatedHoursDiv.textContent = `${hours.toFixed(1)} hours`;
            calculatedHoursDiv.style.color = '#667eea';
        }
    } else {
        calculatedHoursDiv.textContent = '0 hours';
        calculatedHoursDiv.style.color = '#666';
    }
}

// Handle date change to load existing entry
async function handleDateChange(event) {
    const date = event.target.value;
    const messageDiv = document.getElementById('timesheet-message');
    
    messageDiv.innerHTML = '';
    
    try {
        const response = await fetch(`/api/timesheet/${date}`);
        if (response.ok) {
            const entry = await response.json();
            if (entry) {
                document.getElementById('start-time').value = entry.start_time;
                document.getElementById('end-time').value = entry.end_time;
                calculateHours();
                messageDiv.innerHTML = `<div class="message" style="background: #f0f8ff; color: #667eea; border: 1px solid #667eea;">
                    📝 Editing existing entry for ${date}. Make changes and click Save to update.
                </div>`;
            } else {
                document.getElementById('start-time').value = '';
                document.getElementById('end-time').value = '';
                calculateHours();
            }
        }
    } catch (error) {
        console.error('Error loading entry for date:', error);
    }
}

// Load weekly hours
async function loadWeeklyHours() {
    try {
        const today = new Date();
        const weekStart = new Date(today);
        weekStart.setDate(today.getDate() - today.getDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const response = await fetch(`/api/weekly-hours/${weekStartStr}`);
        if (response.ok) {
            const data = await response.json();
            const weeklyHours = data.totalHours || 0;
            document.getElementById('weekly-hours').textContent = weeklyHours.toFixed(1);
            document.getElementById('remaining-hours').textContent = Math.max(0, 30 - weeklyHours).toFixed(1);
        }
    } catch (error) {
        console.error('Error loading weekly hours:', error);
    }
}

// Load recent entries
async function loadRecentEntries() {
    try {
        const now = new Date();
        const response = await fetch(`/api/monthly-timesheet/${now.getFullYear()}/${now.getMonth() + 1}`);
        if (response.ok) {
            const entries = await response.json();
            const tbody = document.getElementById('recent-entries-body');
            
            if (entries.length === 0) {
                tbody.innerHTML = '<tr><td colspan="5">No entries found</td></tr>';
            } else {
                tbody.innerHTML = entries.slice(-10).reverse().map(entry => `
                    <tr>
                        <td>${entry.date}</td>
                        <td>${entry.start_time}</td>
                        <td>${entry.end_time}</td>
                        <td>${entry.total_hours.toFixed(2)}</td>
                        <td><span class="status-${entry.status}">${entry.status}</span></td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading recent entries:', error);
    }
}

// Employee Reports Section
function showReportsSection() {
    const content = `
        <div class="content-section">
            <h2>📊 My Reports</h2>
            
            <div class="form-row">
                <div class="form-group">
                    <label for="report-year">Year:</label>
                    <select id="report-year"></select>
                </div>
                <div class="form-group">
                    <label for="report-month">Month:</label>
                    <select id="report-month"></select>
                </div>
                <div class="form-group">
                    <button type="button" class="btn-primary" onclick="generateReport()">Generate Report</button>
                </div>
            </div>
            
            <div id="report-results"></div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    // Populate selectors
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('report-year');
    const monthSelect = document.getElementById('report-month');
    
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        if (index === new Date().getMonth()) option.selected = true;
        monthSelect.appendChild(option);
    });
}

// Generate calendar for reports
function generateReportCalendar(year, month, entries) {
    const monthIndex = month - 1; // JavaScript months are 0-indexed
    const firstDay = new Date(year, monthIndex, 1).getDay();
    const daysInMonth = new Date(year, monthIndex + 1, 0).getDate();
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    // Create entries lookup for quick access
    const entriesMap = {};
    entries.forEach(entry => {
        entriesMap[entry.date] = entry;
    });
    
    let calendarHTML = '<div class="report-calendar-header">';
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    dayNames.forEach(day => {
        calendarHTML += `<div class="report-day-header">${day}</div>`;
    });
    calendarHTML += '</div>';
    
    calendarHTML += '<div class="report-calendar-body">';
    
    // Empty cells for days before month starts
    for (let i = 0; i < firstDay; i++) {
        calendarHTML += '<div class="report-day empty"></div>';
    }
    
    // Days of the month
    for (let day = 1; day <= daysInMonth; day++) {
        const dateStr = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const isToday = dateStr === todayStr;
        const entry = entriesMap[dateStr];
        
        let dayClass = 'report-day';
        if (isToday) dayClass += ' today';
        if (entry) dayClass += ' has-entry';
        
        let statusClass = '';
        let statusIcon = '';
        if (entry) {
            statusClass = entry.status;
            statusIcon = entry.status === 'approved' ? '✓' : entry.status === 'rejected' ? '✗' : '⏳';
        }
        
        calendarHTML += `
            <div class="${dayClass}" ${entry ? `title="${entry.start_time} - ${entry.end_time} (${entry.total_hours.toFixed(1)}h) - ${entry.status}"` : ''}>
                <span class="report-day-number">${day}</span>
                ${entry ? `
                    <div class="report-entry-info">
                        <div class="report-hours">${entry.total_hours.toFixed(1)}h</div>
                        <div class="report-status status-${statusClass}">${statusIcon}</div>
                    </div>
                ` : ''}
            </div>
        `;
    }
    
    calendarHTML += '</div>';
    return calendarHTML;
}

// Generate monthly report
async function generateReport() {
    const year = document.getElementById('report-year').value;
    const month = document.getElementById('report-month').value;
    const resultsDiv = document.getElementById('report-results');
    
    resultsDiv.innerHTML = '<div class="loading"></div> Loading report...';
    
    try {
        const response = await fetch(`/api/monthly-timesheet/${year}/${month}`);
        if (response.ok) {
            const entries = await response.json();
            
            if (entries.length === 0) {
                resultsDiv.innerHTML = '<p>No entries found for the selected month.</p>';
                return;
            }
            
            const totalHours = entries.reduce((sum, entry) => sum + entry.total_hours, 0);
            const approvedHours = entries.filter(e => e.status === 'approved').reduce((sum, entry) => sum + entry.total_hours, 0);
            const pendingHours = entries.filter(e => e.status === 'pending').reduce((sum, entry) => sum + entry.total_hours, 0);
            
            resultsDiv.innerHTML = `
                <div class="stats-container">
                    <div class="stat-card">
                        <div class="stat-value">${totalHours.toFixed(1)}</div>
                        <div class="stat-label">Total Hours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${approvedHours.toFixed(1)}</div>
                        <div class="stat-label">Approved Hours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${pendingHours.toFixed(1)}</div>
                        <div class="stat-label">Pending Hours</div>
                    </div>
                    <div class="stat-card">
                        <div class="stat-value">${entries.length}</div>
                        <div class="stat-label">Total Days</div>
                    </div>
                </div>
                
                <h3>Monthly Calendar View</h3>
                <div class="report-calendar-container">
                    <div class="report-calendar-grid">
                        ${generateReportCalendar(year, month, entries)}
                    </div>
                </div>
                
                <h3>Detailed Entries</h3>
                <table class="data-table">
                    <thead>
                        <tr>
                            <th>Date</th>
                            <th>Start Time</th>
                            <th>End Time</th>
                            <th>Hours</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        ${entries.map(entry => `
                            <tr>
                                <td>${entry.date}</td>
                                <td>${entry.start_time}</td>
                                <td>${entry.end_time}</td>
                                <td>${entry.total_hours.toFixed(1)}</td>
                                <td><span class="status-${entry.status}">${entry.status}</span></td>
                            </tr>
                        `).join('')}
                    </tbody>
                </table>
            `;
        }
    } catch (error) {
        resultsDiv.innerHTML = `<div class="message error">Error generating report: ${error.message}</div>`;
    }
}

// Admin: Manage Timesheets Section
function showManageTimesheetsSection() {
    const content = `
        <div class="content-section">
            <h2>📋 Manage Timesheets</h2>
            
            <div class="form-row">
                <div class="form-group">
                    <button type="button" class="btn-primary" onclick="loadPendingTimesheets()">Pending Approvals</button>
                </div>
                <div class="form-group">
                    <select id="admin-year"></select>
                </div>
                <div class="form-group">
                    <select id="admin-month"></select>
                </div>
                <div class="form-group">
                    <button type="button" class="btn-secondary" onclick="loadAllTimesheets()">View All</button>
                </div>
            </div>
            
            <div id="timesheets-container">
                <p>Click "Pending Approvals" to see entries awaiting approval, or select a month to view all entries.</p>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    // Populate selectors
    const currentYear = new Date().getFullYear();
    const yearSelect = document.getElementById('admin-year');
    const monthSelect = document.getElementById('admin-month');
    
    for (let year = currentYear - 1; year <= currentYear + 1; year++) {
        const option = document.createElement('option');
        option.value = year;
        option.textContent = year;
        if (year === currentYear) option.selected = true;
        yearSelect.appendChild(option);
    }
    
    const months = [
        'January', 'February', 'March', 'April', 'May', 'June',
        'July', 'August', 'September', 'October', 'November', 'December'
    ];
    
    months.forEach((month, index) => {
        const option = document.createElement('option');
        option.value = index + 1;
        option.textContent = month;
        if (index === new Date().getMonth()) option.selected = true;
        monthSelect.appendChild(option);
    });
}

// Load pending timesheets
async function loadPendingTimesheets() {
    const container = document.getElementById('timesheets-container');
    container.innerHTML = '<div class="loading"></div> Loading pending timesheets...';
    
    try {
        const response = await fetch('/api/pending-timesheets');
        if (response.ok) {
            const timesheets = await response.json();
            displayTimesheets(timesheets, 'Pending Approvals');
        } else {
            container.innerHTML = '<div class="message error">Error loading pending timesheets</div>';
        }
    } catch (error) {
        container.innerHTML = `<div class="message error">Error: ${error.message}</div>`;
    }
}

// Load all timesheets for selected month
async function loadAllTimesheets() {
    const year = document.getElementById('admin-year').value;
    const month = document.getElementById('admin-month').value;
    const container = document.getElementById('timesheets-container');
    
    container.innerHTML = '<div class="loading"></div> Loading timesheets...';
    
    try {
        const response = await fetch(`/api/all-timesheets/${year}/${month}`);
        if (response.ok) {
            const timesheets = await response.json();
            const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
            displayTimesheets(timesheets, `${monthNames[month-1]} ${year} - All Entries`);
        } else {
            container.innerHTML = '<div class="message error">Error loading timesheets</div>';
        }
    } catch (error) {
        container.innerHTML = `<div class="message error">Error: ${error.message}</div>`;
    }
}

// Display timesheets
function displayTimesheets(timesheets, title) {
    const container = document.getElementById('timesheets-container');
    
    if (timesheets.length === 0) {
        container.innerHTML = `<p>No ${title.toLowerCase()} found.</p>`;
        return;
    }
    
    const totalHours = timesheets.reduce((sum, entry) => sum + entry.total_hours, 0);
    
    container.innerHTML = `
        <h3>${title}</h3>
        <div class="stats-container">
            <div class="stat-card">
                <div class="stat-value">${timesheets.length}</div>
                <div class="stat-label">Total Entries</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${totalHours.toFixed(1)}</div>
                <div class="stat-label">Total Hours</div>
            </div>
            <div class="stat-card">
                <div class="stat-value">${timesheets.filter(t => t.status === 'pending').length}</div>
                <div class="stat-label">Pending</div>
            </div>
        </div>
        
        <table class="data-table">
            <thead>
                <tr>
                    <th>Employee</th>
                    <th>Department</th>
                    <th>Date</th>
                    <th>Start</th>
                    <th>End</th>
                    <th>Hours</th>
                    <th>Status</th>
                    <th>Actions</th>
                </tr>
            </thead>
            <tbody>
                ${timesheets.map(entry => `
                    <tr>
                        <td>${entry.username}</td>
                        <td>${entry.department}</td>
                        <td>${entry.date}</td>
                        <td>${entry.start_time}</td>
                        <td>${entry.end_time}</td>
                        <td>${entry.total_hours.toFixed(1)}h</td>
                        <td><span class="status-${entry.status}">${entry.status}</span></td>
                        <td>
                            ${entry.status === 'pending' ? `
                                <button class="btn-secondary" onclick="approveTimesheet(${entry.id})">Approve</button>
                                <button class="btn-danger" onclick="rejectTimesheet(${entry.id})">Reject</button>
                            ` : ''}
                        </td>
                    </tr>
                `).join('')}
            </tbody>
        </table>
    `;
}

// Approve timesheet
async function approveTimesheet(entryId) {
    try {
        const response = await fetch(`/api/timesheet/${entryId}/approve`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            loadPendingTimesheets(); // Refresh the view
        } else {
            alert('Error approving timesheet entry');
        }
    } catch (error) {
        alert('Error approving timesheet entry: ' + error.message);
    }
}

// Reject timesheet
async function rejectTimesheet(entryId) {
    try {
        const response = await fetch(`/api/timesheet/${entryId}/reject`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        });
        
        if (response.ok) {
            loadPendingTimesheets(); // Refresh the view
        } else {
            alert('Error rejecting timesheet entry');
        }
    } catch (error) {
        alert('Error rejecting timesheet entry: ' + error.message);
    }
}

// Admin: User Management Section
function showUserManagementSection() {
    const content = `
        <div class="content-section">
            <h2>👥 User Management</h2>
            
            <h3>All Users</h3>
            <table class="data-table" id="users-table">
                <thead>
                    <tr>
                        <th>Username</th>
                        <th>Role</th>
                        <th>Department</th>
                        <th>Created</th>
                    </tr>
                </thead>
                <tbody id="users-table-body">
                    <tr><td colspan="4">Loading...</td></tr>
                </tbody>
            </table>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    loadAllUsers();
}

// Load all users
async function loadAllUsers() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const users = await response.json();
            const tbody = document.getElementById('users-table-body');
            
            if (users.length === 0) {
                tbody.innerHTML = '<tr><td colspan="4">No users found</td></tr>';
            } else {
                tbody.innerHTML = users.map(user => `
                    <tr>
                        <td>${user.username}</td>
                        <td><span class="role-badge role-${user.role}">${user.role}</span></td>
                        <td>${user.department}</td>
                        <td>${new Date(user.created_at).toLocaleDateString()}</td>
                    </tr>
                `).join('');
            }
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

// Admin Weekly Planning Section
function showAdminWeeklyPlanningSection() {
    const content = `
        <div class="content-section">
            <h2>📅 Admin Weekly Planning</h2>
            
            <!-- User Selection -->
            <div class="admin-planning-controls">
                <div class="form-row">
                    <div class="form-group">
                        <label for="user-select">Select Employee:</label>
                        <select id="user-select" class="user-select">
                            <option value="">Loading users...</option>
                        </select>
                    </div>
                    <div class="form-group">
                        <button type="button" class="btn-primary" onclick="loadUserWeeklyPlan()">Load Schedule</button>
                    </div>
                </div>
            </div>
            
            <!-- Week Navigation -->
            <div class="week-navigation">
                <button type="button" id="admin-prev-week" class="nav-calendar-btn">‹</button>
                <h3 id="admin-week-range"></h3>
                <button type="button" id="admin-next-week" class="nav-calendar-btn">›</button>
            </div>
            
            <!-- Selected User Stats -->
            <div class="stats-container" id="user-stats" style="display: none;">
                <div class="stat-card">
                    <div class="stat-value" id="user-week-hours">0</div>
                    <div class="stat-label">Week Hours</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="user-week-remaining">30</div>
                    <div class="stat-label">Remaining</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="user-week-days">0</div>
                    <div class="stat-label">Days Worked</div>
                </div>
                <div class="stat-card">
                    <div class="stat-value" id="user-name-display">-</div>
                    <div class="stat-label">Employee</div>
                </div>
            </div>
            
            <!-- Weekly Schedule Grid -->
            <div class="weekly-schedule" id="admin-weekly-schedule" style="display: none;">
                <div class="schedule-header">
                    <div class="time-column">Time</div>
                    <div class="day-column">Monday</div>
                    <div class="day-column">Tuesday</div>
                    <div class="day-column">Wednesday</div>
                    <div class="day-column">Thursday</div>
                    <div class="day-column">Friday</div>
                    <div class="day-column">Saturday</div>
                    <div class="day-column">Sunday</div>
                </div>
                <div class="schedule-body" id="admin-schedule-body">
                    <!-- Schedule grid will be generated here -->
                </div>
            </div>
            
            <!-- All Users Weekly Summary -->
            <div class="all-users-summary">
                <h3>All Employees This Week</h3>
                <table class="data-table" id="all-users-weekly">
                    <thead>
                        <tr>
                            <th>Employee</th>
                            <th>Department</th>
                            <th>Total Hours</th>
                            <th>Days Worked</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody id="all-users-weekly-body">
                        <tr><td colspan="6">Loading...</td></tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    document.getElementById('main-content').innerHTML = content;
    
    // Initialize admin weekly planning
    adminCurrentWeekDate = new Date();
    setupAdminWeeklyPlanning();
    
    // Setup event listeners
    document.getElementById('admin-prev-week').addEventListener('click', () => changeAdminWeek(-1));
    document.getElementById('admin-next-week').addEventListener('click', () => changeAdminWeek(1));
    
    // Load users for selection
    loadUsersForPlanning();
}

// Admin Weekly Planning Functions
let adminCurrentWeekDate = new Date();
let selectedUserId = null;
let selectedUserData = null;

function setupAdminWeeklyPlanning() {
    updateAdminWeekHeader();
    loadAllUsersWeeklySummary();
}

function updateAdminWeekHeader() {
    const weekRange = document.getElementById('admin-week-range');
    const startOfWeek = getStartOfWeek(adminCurrentWeekDate);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    
    const options = { month: 'short', day: 'numeric' };
    const start = startOfWeek.toLocaleDateString('en-US', options);
    const end = endOfWeek.toLocaleDateString('en-US', options);
    const year = startOfWeek.getFullYear();
    
    weekRange.textContent = `${start} - ${end}, ${year}`;
}

function changeAdminWeek(direction) {
    adminCurrentWeekDate.setDate(adminCurrentWeekDate.getDate() + (direction * 7));
    setupAdminWeeklyPlanning();
    if (selectedUserId) {
        loadUserWeeklyPlan();
    }
}

async function loadUsersForPlanning() {
    try {
        const response = await fetch('/api/users');
        if (response.ok) {
            const users = await response.json();
            const userSelect = document.getElementById('user-select');
            
            userSelect.innerHTML = '<option value="">Select an employee...</option>';
            users.filter(user => user.role === 'employee').forEach(user => {
                userSelect.innerHTML += `<option value="${user.id}">${user.username} (${user.department})</option>`;
            });
        }
    } catch (error) {
        console.error('Error loading users:', error);
    }
}

async function loadUserWeeklyPlan() {
    const userSelect = document.getElementById('user-select');
    selectedUserId = userSelect.value;
    
    if (!selectedUserId) {
        alert('Please select an employee first');
        return;
    }
    
    // Find user data
    const response = await fetch('/api/users');
    if (response.ok) {
        const users = await response.json();
        selectedUserData = users.find(u => u.id == selectedUserId);
    }
    
    // Show user stats and schedule
    document.getElementById('user-stats').style.display = 'block';
    document.getElementById('admin-weekly-schedule').style.display = 'block';
    document.getElementById('user-name-display').textContent = selectedUserData?.username || 'Unknown';
    
    // Generate schedule grid
    generateAdminWeeklySchedule();
    
    // Load user's weekly data
    await loadSelectedUserWeeklyData();
}

function generateAdminWeeklySchedule() {
    const scheduleBody = document.getElementById('admin-schedule-body');
    const hours = ['09:00', '10:00', '11:00', '12:00', '13:00', '14:00', '15:00', '16:00', '17:00', '18:00', '19:00', '20:00'];
    const startOfWeek = getStartOfWeek(adminCurrentWeekDate);
    
    let scheduleHTML = '';
    hours.forEach(hour => {
        scheduleHTML += `<div class="schedule-row">`;
        scheduleHTML += `<div class="time-cell">${hour}</div>`;
        
        for (let day = 0; day < 7; day++) {
            const date = new Date(startOfWeek);
            date.setDate(startOfWeek.getDate() + day);
            const dateStr = date.toISOString().split('T')[0];
            
            scheduleHTML += `<div class="schedule-cell admin-cell" data-date="${dateStr}" data-hour="${hour}"></div>`;
        }
        scheduleHTML += `</div>`;
    });
    
    scheduleBody.innerHTML = scheduleHTML;
}

async function loadSelectedUserWeeklyData() {
    if (!selectedUserId) return;
    
    try {
        const startOfWeek = getStartOfWeek(adminCurrentWeekDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const year = startOfWeek.getFullYear();
        const month = startOfWeek.getMonth() + 1;
        
        // Load user's monthly data and filter for this week
        const response = await fetch(`/api/all-timesheets/${year}/${month}`);
        if (response.ok) {
            const allEntries = await response.json();
            
            // Filter entries for selected user and current week
            const userWeekEntries = allEntries.filter(entry => {
                const entryDate = new Date(entry.date);
                return entry.user_id == selectedUserId && entryDate >= startOfWeek && entryDate <= endOfWeek;
            });
            
            // Update stats
            const totalHours = userWeekEntries.reduce((sum, entry) => sum + entry.total_hours, 0);
            const daysWorked = userWeekEntries.length;
            
            document.getElementById('user-week-hours').textContent = totalHours.toFixed(1);
            document.getElementById('user-week-remaining').textContent = Math.max(0, 30 - totalHours).toFixed(1);
            document.getElementById('user-week-days').textContent = daysWorked;
            
            // Update schedule grid
            updateAdminScheduleGrid(userWeekEntries);
        }
    } catch (error) {
        console.error('Error loading user weekly data:', error);
    }
}

function updateAdminScheduleGrid(entries) {
    // Clear existing entries
    document.querySelectorAll('.admin-cell').forEach(cell => {
        cell.className = 'schedule-cell admin-cell';
        cell.title = '';
    });
    
    // Mark cells with entries
    entries.forEach(entry => {
        const startHour = parseInt(entry.start_time.split(':')[0]);
        const endHour = parseInt(entry.end_time.split(':')[0]);
        
        for (let hour = startHour; hour < endHour; hour++) {
            const hourStr = String(hour).padStart(2, '0') + ':00';
            const cell = document.querySelector(`[data-date="${entry.date}"][data-hour="${hourStr}"].admin-cell`);
            if (cell) {
                cell.classList.add('occupied');
                cell.title = `${entry.start_time} - ${entry.end_time} (${entry.total_hours.toFixed(1)}h) - ${entry.status}`;
            }
        }
    });
}

async function loadAllUsersWeeklySummary() {
    try {
        const startOfWeek = getStartOfWeek(adminCurrentWeekDate);
        const endOfWeek = new Date(startOfWeek);
        endOfWeek.setDate(startOfWeek.getDate() + 6);
        
        const year = startOfWeek.getFullYear();
        const month = startOfWeek.getMonth() + 1;
        
        // Load all users and their timesheets for this week
        const [usersResponse, timesheetsResponse] = await Promise.all([
            fetch('/api/users'),
            fetch(`/api/all-timesheets/${year}/${month}`)
        ]);
        
        if (usersResponse.ok && timesheetsResponse.ok) {
            const users = await usersResponse.json();
            const allTimesheets = await timesheetsResponse.json();
            
            // Filter timesheets for current week
            const weekTimesheets = allTimesheets.filter(entry => {
                const entryDate = new Date(entry.date);
                return entryDate >= startOfWeek && entryDate <= endOfWeek;
            });
            
            const tbody = document.getElementById('all-users-weekly-body');
            const employees = users.filter(user => user.role === 'employee');
            
            if (employees.length === 0) {
                tbody.innerHTML = '<tr><td colspan="6">No employees found</td></tr>';
                return;
            }
            
            tbody.innerHTML = employees.map(user => {
                const userEntries = weekTimesheets.filter(entry => entry.user_id === user.id);
                const totalHours = userEntries.reduce((sum, entry) => sum + entry.total_hours, 0);
                const daysWorked = userEntries.length;
                const hasOvertime = totalHours > 30;
                const status = totalHours === 0 ? 'No entries' : hasOvertime ? 'Over limit' : 'Normal';
                
                return `
                    <tr>
                        <td>${user.username}</td>
                        <td>${user.department}</td>
                        <td>${totalHours.toFixed(1)}h</td>
                        <td>${daysWorked}</td>
                        <td><span class="status-${hasOvertime ? 'rejected' : totalHours === 0 ? 'pending' : 'approved'}">${status}</span></td>
                        <td>
                            <button class="btn-secondary" onclick="viewUserPlan(${user.id}, '${user.username}')">View Plan</button>
                        </td>
                    </tr>
                `;
            }).join('');
        }
    } catch (error) {
        console.error('Error loading all users weekly summary:', error);
    }
}

function viewUserPlan(userId, username) {
    document.getElementById('user-select').value = userId;
    loadUserWeeklyPlan();
}