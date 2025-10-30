const express = require('express');
const session = require('express-session');
const bodyParser = require('body-parser');
const bcrypt = require('bcrypt');
const path = require('path');
const Database = require('./database');

const app = express();
const db = new Database();

// Middleware
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(express.static('public'));

app.use(session({
    secret: 'timesheet-secret-key',
    resave: false,
    saveUninitialized: false,
    cookie: { secure: false }
}));

// Auth middleware
function requireAuth(req, res, next) {
    if (req.session.userId) {
        next();
    } else {
        res.redirect('/login');
    }
}

function requireAdmin(req, res, next) {
    if (req.session.userId && req.session.role === 'admin') {
        next();
    } else {
        res.status(403).send('Admin access required');
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

app.post('/register', async (req, res) => {
    try {
        const { username, password, confirmPassword, department } = req.body;
        
        if (!username || !password || !confirmPassword || !department) {
            return res.status(400).json({ error: 'All fields are required' });
        }
        
        if (password !== confirmPassword) {
            return res.status(400).json({ error: 'Passwords do not match' });
        }
        
        if (password.length < 6) {
            return res.status(400).json({ error: 'Password must be at least 6 characters long' });
        }
        
        const existingUser = await db.getUserByUsername(username);
        if (existingUser) {
            return res.status(400).json({ error: 'Username already exists' });
        }
        
        await db.createUser(username, password, 'employee', department);
        res.json({ success: true, message: 'Account created successfully! You can now log in.' });
    } catch (error) {
        console.error('Registration error:', error);
        res.status(500).json({ error: 'Failed to create account. Please try again.' });
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

// Timesheet routes
app.post('/api/timesheet', requireAuth, async (req, res) => {
    try {
        const { date, startTime, endTime } = req.body;
        
        const start = new Date(`${date}T${startTime}`);
        const end = new Date(`${date}T${endTime}`);
        if (end < start) end.setDate(end.getDate() + 1);
        
        const totalHours = (end - start) / (1000 * 60 * 60);
        
        if (start.getHours() < 9) {
            return res.status(400).json({ error: 'Work cannot start before 09:00' });
        }
        
        // Check weekly hours limit
        const weekStart = new Date(date);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const weekStartStr = weekStart.toISOString().split('T')[0];
        
        const currentWeeklyHours = await db.getWeeklyHours(req.session.userId, weekStartStr);
        if (currentWeeklyHours + totalHours > 30) {
            return res.status(400).json({ error: 'Weekly hours limit (30h) would be exceeded' });
        }
        
        await db.saveTimesheet(req.session.userId, date, startTime, endTime, totalHours);
        res.json({ success: true, totalHours });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/timesheet/:date', requireAuth, async (req, res) => {
    try {
        const timesheet = await db.getTimesheetByDate(req.session.userId, req.params.date);
        res.json(timesheet);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/monthly-timesheet/:year/:month', requireAuth, async (req, res) => {
    try {
        const timesheets = await db.getMonthlyTimesheets(
            req.session.userId, 
            req.params.year, 
            req.params.month
        );
        res.json(timesheets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/weekly-hours/:weekStart', requireAuth, async (req, res) => {
    try {
        const hours = await db.getWeeklyHours(req.session.userId, req.params.weekStart);
        res.json({ totalHours: hours });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

// Admin routes
app.get('/api/all-timesheets/:year/:month', requireAdmin, async (req, res) => {
    try {
        const timesheets = await db.getAllTimesheets(req.params.year, req.params.month);
        res.json(timesheets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/pending-timesheets', requireAdmin, async (req, res) => {
    try {
        const timesheets = await db.getPendingTimesheets();
        res.json(timesheets);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/timesheet/:id/approve', requireAdmin, async (req, res) => {
    try {
        await db.updateTimesheetStatus(req.params.id, 'approved');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.post('/api/timesheet/:id/reject', requireAdmin, async (req, res) => {
    try {
        await db.updateTimesheetStatus(req.params.id, 'rejected');
        res.json({ success: true });
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

app.get('/api/users', requireAdmin, async (req, res) => {
    try {
        const users = await db.getAllUsers();
        res.json(users);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

const PORT = process.env.PORT || 8080;
app.listen(PORT, () => {
    console.log(`Timesheet server running on port ${PORT}`);
    console.log('Default admin login: username=admin, password=admin123');
});