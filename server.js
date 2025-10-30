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

app.get('/api/users', requireManager, async (req, res) => {
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

app.get('/api/all-availability/:weekStartDate', requireManager, async (req, res) => {
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

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`METUnic Shift Scheduler running on port ${PORT}`);
    console.log('Manager login: username=manager, password=manager123');
    console.log('Employee login: username=ali, password=emp123 (or ayşe, mehmet, fatma, ahmet)');
});