const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

class ShiftDatabase {
    constructor() {
        this.db = new sqlite3.Database('shift_scheduler.db');
        this.init();
    }

    init() {
        this.db.serialize(() => {
            // Users table
            this.db.run(`CREATE TABLE IF NOT EXISTS users (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                username TEXT UNIQUE NOT NULL,
                password TEXT NOT NULL,
                role TEXT NOT NULL DEFAULT 'employee',
                department TEXT NOT NULL DEFAULT 'Customer Service',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Availability submissions (Step 1)
            this.db.run(`CREATE TABLE IF NOT EXISTS availability (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                week_start_date DATE,
                day_of_week INTEGER,
                hour_start INTEGER,
                hour_end INTEGER,
                status TEXT DEFAULT 'available',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            // Actual shift assignments (Step 2)
            this.db.run(`CREATE TABLE IF NOT EXISTS shifts (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                week_start_date DATE,
                day_of_week INTEGER,
                hours_assigned DECIMAL(4,1),
                assigned_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (assigned_by) REFERENCES users (id)
            )`);

            // Weekly schedules tracking
            this.db.run(`CREATE TABLE IF NOT EXISTS weekly_schedules (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                week_start_date DATE UNIQUE,
                status TEXT DEFAULT 'draft',
                finalized_by INTEGER,
                finalized_at DATETIME,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (finalized_by) REFERENCES users (id)
            )`);

            // Hourly assignments tracking (for granular hour control)
            this.db.run(`CREATE TABLE IF NOT EXISTS hourly_assignments (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                week_start_date DATE,
                day_of_week INTEGER,
                hour INTEGER,
                assigned_by INTEGER,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id),
                FOREIGN KEY (assigned_by) REFERENCES users (id),
                UNIQUE(user_id, week_start_date, day_of_week, hour)
            )`);

            this.createDefaultManager();
        });
    }

    createDefaultManager() {
        const managerPassword = bcrypt.hashSync('manager123', 10);
        this.db.run(`INSERT OR IGNORE INTO users (username, password, role, department) 
                     VALUES ('manager', ?, 'manager', 'Management')`, [managerPassword]);
        
        // Create some sample employees
        const empPassword = bcrypt.hashSync('emp123', 10);
        const employees = ['Ali', 'Ayşe', 'Mehmet', 'Fatma', 'Ahmet'];
        employees.forEach(name => {
            this.db.run(`INSERT OR IGNORE INTO users (username, password, role, department) 
                         VALUES (?, ?, 'employee', 'Customer Service')`, [name.toLowerCase(), empPassword]);
        });
    }

    // User management
    async createUser(username, password, role, department) {
        const hashedPassword = await bcrypt.hash(password, 10);
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT INTO users (username, password, role, department) VALUES (?, ?, ?, ?)`,
                [username, hashedPassword, role, department], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
        });
    }

    getUserByUsername(username) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM users WHERE username = ?`, [username], (err, row) => {
                if (err) reject(err);
                else resolve(row);
            });
        });
    }

    getAllUsers() {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT id, username, role, department, created_at FROM users ORDER BY role, username`, 
                [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
        });
    }

    // Availability management (Step 1)
    async submitAvailability(userId, weekStartDate, dayOfWeek, hourStart, hourEnd, status = 'available') {
        return new Promise((resolve, reject) => {
            // First, remove existing availability for this user/week/day
            this.db.run(`DELETE FROM availability WHERE user_id = ? AND week_start_date = ? AND day_of_week = ?`,
                [userId, weekStartDate, dayOfWeek], (err) => {
                    if (err) reject(err);
                    else {
                        // Insert new availability
                        this.db.run(`INSERT INTO availability (user_id, week_start_date, day_of_week, hour_start, hour_end, status) 
                                     VALUES (?, ?, ?, ?, ?, ?)`,
                            [userId, weekStartDate, dayOfWeek, hourStart, hourEnd, status], function(err) {
                                if (err) reject(err);
                                else resolve(this.lastID);
                            });
                    }
                });
        });
    }

    getAvailabilityForWeek(weekStartDate) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT a.*, u.username, u.department 
                FROM availability a
                JOIN users u ON a.user_id = u.id
                WHERE a.week_start_date = ?
                ORDER BY u.username, a.day_of_week, a.hour_start
            `, [weekStartDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getUserAvailabilityForWeek(userId, weekStartDate) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM availability 
                WHERE user_id = ? AND week_start_date = ?
                ORDER BY day_of_week, hour_start
            `, [userId, weekStartDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Shift assignment (Step 2)
    async assignShift(userId, weekStartDate, dayOfWeek, hoursAssigned, assignedBy) {
        return new Promise((resolve, reject) => {
            // First, remove existing shift for this user/week/day
            this.db.run(`DELETE FROM shifts WHERE user_id = ? AND week_start_date = ? AND day_of_week = ?`,
                [userId, weekStartDate, dayOfWeek], (err) => {
                    if (err) reject(err);
                    else {
                        // Insert new shift assignment
                        this.db.run(`INSERT INTO shifts (user_id, week_start_date, day_of_week, hours_assigned, assigned_by) 
                                     VALUES (?, ?, ?, ?, ?)`,
                            [userId, weekStartDate, dayOfWeek, hoursAssigned, assignedBy], function(err) {
                                if (err) reject(err);
                                else resolve(this.lastID);
                            });
                    }
                });
        });
    }

    getShiftsForWeek(weekStartDate) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT s.*, u.username, u.department 
                FROM shifts s
                JOIN users u ON s.user_id = u.id
                WHERE s.week_start_date = ?
                ORDER BY u.username, s.day_of_week
            `, [weekStartDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    getUserShiftsForWeek(userId, weekStartDate) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM shifts 
                WHERE user_id = ? AND week_start_date = ?
                ORDER BY day_of_week
            `, [userId, weekStartDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Weekly schedule management
    async finalizeWeeklySchedule(weekStartDate, finalizedBy) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT OR REPLACE INTO weekly_schedules 
                         (week_start_date, status, finalized_by, finalized_at) 
                         VALUES (?, 'finalized', ?, CURRENT_TIMESTAMP)`,
                [weekStartDate, finalizedBy], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
        });
    }

    getWeeklyScheduleStatus(weekStartDate) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM weekly_schedules WHERE week_start_date = ?`, 
                [weekStartDate], (err, row) => {
                    if (err) reject(err);
                    else resolve(row || { status: 'draft' });
                });
        });
    }

    // Monthly reporting
    getMonthlyShifts(year, month) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT s.*, u.username, u.department,
                       DATE(s.week_start_date, '+' || s.day_of_week || ' days') as work_date
                FROM shifts s
                JOIN users u ON s.user_id = u.id
                WHERE strftime('%Y', DATE(s.week_start_date, '+' || s.day_of_week || ' days')) = ?
                AND strftime('%m', DATE(s.week_start_date, '+' || s.day_of_week || ' days')) = ?
                ORDER BY work_date, u.username
            `, [year.toString(), month.toString().padStart(2, '0')], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Hourly assignments (new granular system)
    async assignHour(userId, weekStartDate, dayOfWeek, hour, assignedBy) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT OR REPLACE INTO hourly_assignments 
                         (user_id, week_start_date, day_of_week, hour, assigned_by) 
                         VALUES (?, ?, ?, ?, ?)`,
                [userId, weekStartDate, dayOfWeek, hour, assignedBy], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
        });
    }

    async unassignHour(userId, weekStartDate, dayOfWeek, hour) {
        return new Promise((resolve, reject) => {
            this.db.run(`DELETE FROM hourly_assignments 
                         WHERE user_id = ? AND week_start_date = ? AND day_of_week = ? AND hour = ?`,
                [userId, weekStartDate, dayOfWeek, hour], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
        });
    }

    async getHourlyAssignments(weekStartDate) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT ha.*, u.username 
                FROM hourly_assignments ha
                JOIN users u ON ha.user_id = u.id
                WHERE ha.week_start_date = ?
                ORDER BY u.username, ha.day_of_week, ha.hour
            `, [weekStartDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    async getUserHourlyAssignments(userId, weekStartDate) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT * FROM hourly_assignments 
                WHERE user_id = ? AND week_start_date = ?
                ORDER BY day_of_week, hour
            `, [userId, weekStartDate], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    // Utility functions
    getWeeklyHoursForUser(userId, weekStartDate) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT SUM(hours_assigned) as total_hours 
                FROM shifts 
                WHERE user_id = ? AND week_start_date = ?
            `, [userId, weekStartDate], (err, row) => {
                if (err) reject(err);
                else resolve(row.total_hours || 0);
            });
        });
    }

    // Get weekly hours from hourly assignments
    getWeeklyHoursFromHourlyAssignments(userId, weekStartDate) {
        return new Promise((resolve, reject) => {
            this.db.get(`
                SELECT COUNT(*) as total_hours 
                FROM hourly_assignments 
                WHERE user_id = ? AND week_start_date = ?
            `, [userId, weekStartDate], (err, row) => {
                if (err) reject(err);
                else resolve(row.total_hours || 0);
            });
        });
    }
}

module.exports = ShiftDatabase;