const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const ShiftDatabase = require('./database');

const app = express();
const db = new ShiftDatabase();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: 'metunic-shift-scheduler-secret',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Helper functions
function getWeekStartDate(date) {
    const d = new Date(date);
    const day = d.getDay();
    const diff = d.getDate() - day + (day === 0 ? -6 : 1); // Adjust for Monday start
    const monday = new Date(d.setDate(diff));
    monday.setHours(0, 0, 0, 0);
    return monday.toISOString().split('T')[0];
}

function getDayOfWeek(dateStr) {
    const date = new Date(dateStr);
    const day = date.getDay();
    return day === 0 ? 6 : day - 1; // Convert Sunday=0 to Monday=0 format
}

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

function requireManager(req, res, next) {
    if (req.session.userId && req.session.role === 'manager') {
        next();
    } else {
        res.status(403).json({ error: 'Manager access required' });
    }
}

// Routes
app.get('/', (req, res) => {
    if (req.session.userId) {
        res.redirect('/dashboard');
    } else {
        res.redirect('/login');
    }
});

app.get('/login', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'login.html'));
});

app.post('/login', async (req, res) => {
    try {
        const { username, password } = req.body;
        const user = await db.getUserByUsername(username);
        
        if (user && await bcrypt.compare(password, user.password)) {
            req.session.userId = user.id;
            req.session.username = user.username;
            req.session.role = user.role;
            req.session.department = user.department;
            res.redirect('/dashboard');
        } else {
            res.redirect('/login?error=1');
        }
    } catch (error) {
        console.error('Login error:', error);
        res.redirect('/login?error=1');
    }
});

app.post('/logout', (req, res) => {
    req.session.destroy();
    res.redirect('/login');
});

app.get('/dashboard', requireAuth, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'dashboard.html'));
});

// API Routes
app.get('/api/user', requireAuth, (req, res) => {
    res.json({
        id: req.session.userId,
        username: req.session.username,
        role: req.session.role,
        department: req.session.department
    });
});

app.get('/api/users', requireAuth, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Availability routes (Step 1)
app.post('/api/availability', requireAuth, async (req, res) => {
    try {
        const { weekStartDate, dayOfWeek, hourStart, hourEnd, status } = req.body;
        
        // Validate 30-hour weekly limit
        const currentHours = await db.getWeeklyHoursForUser(req.session.userId, weekStartDate);
        const newHours = hourEnd - hourStart;
        
        if (status === 'available' && currentHours + newHours > 30) {
            return res.status(400).json({ error: 'Would exceed 30-hour weekly limit' });
        }
        
        await db.submitAvailability(req.session.userId, weekStartDate, dayOfWeek, hourStart, hourEnd, status);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/availability/:weekStartDate', requireAuth, async (req, res) => {
    try {
        const availability = await db.getUserAvailabilityForWeek(req.session.userId, req.params.weekStartDate);
        res.json(availability);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/all-availability/:weekStartDate', requireAuth, async (req, res) => {
    try {
        const availability = await db.getAvailabilityForWeek(req.params.weekStartDate);
        res.json(availability);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Shift assignment routes (Step 2)
app.post('/api/assign-shift', requireManager, async (req, res) => {
    try {
        const { userId, weekStartDate, dayOfWeek, hoursAssigned } = req.body;
        
        await db.assignShift(userId, weekStartDate, dayOfWeek, hoursAssigned, req.session.userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// New hourly assignment endpoints
app.post('/api/assign-hour', requireManager, async (req, res) => {
    try {
        const { userId, weekStartDate, dayOfWeek, hour } = req.body;
        
        await db.assignHour(userId, weekStartDate, dayOfWeek, hour, req.session.userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/unassign-hour', requireManager, async (req, res) => {
    try {
        const { userId, weekStartDate, dayOfWeek, hour } = req.body;
        
        await db.unassignHour(userId, weekStartDate, dayOfWeek, hour);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/hourly-assignments/:weekStartDate', requireAuth, async (req, res) => {
    try {
        const { weekStartDate } = req.params;
        const assignments = await db.getHourlyAssignments(weekStartDate);
        res.json(assignments);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/shifts/:weekStartDate', requireAuth, async (req, res) => {
    try {
        let shifts;
        if (req.session.role === 'manager') {
            shifts = await db.getShiftsForWeek(req.params.weekStartDate);
        } else {
            shifts = await db.getUserShiftsForWeek(req.session.userId, req.params.weekStartDate);
        }
        res.json(shifts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Weekly schedule management
app.post('/api/finalize-week', requireManager, async (req, res) => {
    try {
        const { weekStartDate } = req.body;
        await db.finalizeWeeklySchedule(weekStartDate, req.session.userId);
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/week-status/:weekStartDate', requireAuth, async (req, res) => {
    try {
        const status = await db.getWeeklyScheduleStatus(req.params.weekStartDate);
        res.json(status);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Monthly reporting (Step 3)
app.get('/api/monthly-report/:year/:month', requireManager, async (req, res) => {
    try {
        const shifts = await db.getMonthlyShifts(req.params.year, req.params.month);
        res.json(shifts);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Utility routes
app.get('/api/weekly-hours/:weekStartDate', requireAuth, async (req, res) => {
    try {
        const hours = await db.getWeeklyHoursForUser(req.session.userId, req.params.weekStartDate);
        res.json({ totalHours: hours });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Reports page route
app.get('/reports', requireManager, (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'reports.html'));
});

// Reports API endpoints
app.get('/api/reports/employee-schedule/:userId/:weekStart', requireManager, async (req, res) => {
    try {
        const { userId, weekStart } = req.params;

        // Get employee info
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Get hourly assignments for the week
        const assignments = await db.getHourlyAssignments(userId, weekStart);

        // Build schedule for 7 days
        const schedule = [];
        const weekDate = new Date(weekStart);

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const currentDate = new Date(weekDate);
            currentDate.setDate(weekDate.getDate() + dayIndex);
            const dateStr = currentDate.toISOString().split('T')[0];

            // Get assignments for this day
            const dayAssignments = assignments.filter(a => a.day_of_week === dayIndex);
            const hours = dayAssignments.map(a => a.hour).sort((a, b) => a - b);

            schedule.push({
                date: dateStr,
                hours: hours,
                totalHours: hours.length
            });
        }

        res.json({
            employeeName: user.username,
            weekStart: weekStart,
            schedule: schedule
        });
    } catch (error) {
        console.error('Error generating employee schedule:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/hours-summary/:startDate/:endDate', requireManager, async (req, res) => {
    try {
        const { startDate, endDate } = req.params;

        // Get all employees in department
        const employees = await db.getUsersByDepartment(req.session.department);
        const employeeData = [];

        for (const employee of employees) {
            if (employee.role !== 'employee') continue;

            // Get all assignments in date range
            const assignments = await db.getHourlyAssignmentsInDateRange(employee.id, startDate, endDate);

            // Calculate weekly hours
            const weeklyHoursMap = {};
            assignments.forEach(a => {
                if (!weeklyHoursMap[a.week_start_date]) {
                    weeklyHoursMap[a.week_start_date] = 0;
                }
                weeklyHoursMap[a.week_start_date]++;
            });

            const weeklyHours = Object.values(weeklyHoursMap);
            const maxWeeklyHours = weeklyHours.length > 0 ? Math.max(...weeklyHours) : 0;
            const totalHours = assignments.length;
            const weeksWorked = weeklyHours.length;

            employeeData.push({
                username: employee.username,
                totalHours: totalHours,
                weeksWorked: weeksWorked,
                maxWeeklyHours: maxWeeklyHours
            });
        }

        res.json({
            startDate: startDate,
            endDate: endDate,
            employees: employeeData
        });
    } catch (error) {
        console.error('Error generating hours summary:', error);
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/reports/availability-comparison/:userId/:weekStart', requireManager, async (req, res) => {
    try {
        const { userId, weekStart } = req.params;

        // Get employee info
        const user = await db.getUserById(userId);
        if (!user) {
            return res.status(404).json({ error: 'Employee not found' });
        }

        // Get availability and assignments
        const availability = await db.getAvailability(userId, weekStart);
        const assignments = await db.getHourlyAssignments(userId, weekStart);

        // Build comparison for 7 days
        const comparison = [];
        const weekDate = new Date(weekStart);

        for (let dayIndex = 0; dayIndex < 7; dayIndex++) {
            const currentDate = new Date(weekDate);
            currentDate.setDate(weekDate.getDate() + dayIndex);
            const dateStr = currentDate.toISOString().split('T')[0];

            // Get available hours for this day
            const dayAvailability = availability.filter(a => a.day_of_week === dayIndex);
            const availableSlots = [];
            dayAvailability.forEach(slot => {
                for (let hour = slot.hour_start; hour < slot.hour_end; hour++) {
                    availableSlots.push(hour);
                }
            });

            // Get assigned hours for this day
            const dayAssignments = assignments.filter(a => a.day_of_week === dayIndex);
            const assignedSlots = dayAssignments.map(a => a.hour).sort((a, b) => a - b);

            comparison.push({
                date: dateStr,
                availableHours: availableSlots.length,
                availableSlots: availableSlots.length > 0 ? availableSlots.map(h => `${h}:00`) : ['None'],
                assignedHours: assignedSlots.length,
                assignedSlots: assignedSlots.length > 0 ? assignedSlots.map(h => `${h}:00`) : ['None']
            });
        }

        res.json({
            employeeName: user.username,
            weekStart: weekStart,
            comparison: comparison
        });
    } catch (error) {
        console.error('Error generating availability comparison:', error);
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`METUnic Shift Scheduler running on port ${PORT}`);
    console.log('Manager login: username=manager, password=manager123');
    console.log('Employee login: username=ali, password=emp123 (or ayşe, mehmet, fatma, ahmet)');
});