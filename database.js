const sqlite3 = require('sqlite3').verbose();
const bcrypt = require('bcrypt');

class Database {
    constructor() {
        this.db = new sqlite3.Database('timesheet.db');
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
                department TEXT NOT NULL,
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP
            )`);

            // Timesheets table
            this.db.run(`CREATE TABLE IF NOT EXISTS timesheets (
                id INTEGER PRIMARY KEY AUTOINCREMENT,
                user_id INTEGER,
                date DATE,
                start_time TIME,
                end_time TIME,
                total_hours DECIMAL(4,2),
                status TEXT DEFAULT 'pending',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                FOREIGN KEY (user_id) REFERENCES users (id)
            )`);

            this.createDefaultAdmin();
        });
    }

    createDefaultAdmin() {
        const adminPassword = bcrypt.hashSync('admin123', 10);
        this.db.run(`INSERT OR IGNORE INTO users (username, password, role, department) 
                     VALUES ('admin', ?, 'admin', 'Management')`, [adminPassword]);
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
            this.db.all(`SELECT id, username, role, department, created_at FROM users ORDER BY created_at DESC`, 
                [], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
        });
    }

    // Timesheet management
    saveTimesheet(userId, date, startTime, endTime, totalHours) {
        return new Promise((resolve, reject) => {
            this.db.run(`INSERT OR REPLACE INTO timesheets (user_id, date, start_time, end_time, total_hours) 
                         VALUES (?, ?, ?, ?, ?)`,
                [userId, date, startTime, endTime, totalHours], function(err) {
                    if (err) reject(err);
                    else resolve(this.lastID);
                });
        });
    }

    getTimesheetByDate(userId, date) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT * FROM timesheets WHERE user_id = ? AND date = ?`,
                [userId, date], (err, row) => {
                    if (err) reject(err);
                    else resolve(row);
                });
        });
    }

    getMonthlyTimesheets(userId, year, month) {
        return new Promise((resolve, reject) => {
            this.db.all(`SELECT * FROM timesheets 
                         WHERE user_id = ? AND strftime('%Y', date) = ? AND strftime('%m', date) = ?
                         ORDER BY date`,
                [userId, year.toString(), month.toString().padStart(2, '0')], (err, rows) => {
                    if (err) reject(err);
                    else resolve(rows);
                });
        });
    }

    getWeeklyHours(userId, weekStart) {
        return new Promise((resolve, reject) => {
            this.db.get(`SELECT SUM(total_hours) as total FROM timesheets 
                         WHERE user_id = ? AND date >= ? AND date < date(?, '+7 days')`,
                [userId, weekStart, weekStart], (err, row) => {
                    if (err) reject(err);
                    else resolve(row.total || 0);
                });
        });
    }

    // Admin functions
    getAllTimesheets(year, month) {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT t.*, u.username, u.department 
                FROM timesheets t
                JOIN users u ON t.user_id = u.id
                WHERE strftime('%Y', t.date) = ? AND strftime('%m', t.date) = ?
                ORDER BY t.date DESC, u.username
            `, [year.toString(), month.toString().padStart(2, '0')], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }

    updateTimesheetStatus(timesheetId, status) {
        return new Promise((resolve, reject) => {
            this.db.run(`UPDATE timesheets SET status = ? WHERE id = ?`,
                [status, timesheetId], function(err) {
                    if (err) reject(err);
                    else resolve(this.changes);
                });
        });
    }

    getPendingTimesheets() {
        return new Promise((resolve, reject) => {
            this.db.all(`
                SELECT t.*, u.username, u.department 
                FROM timesheets t
                JOIN users u ON t.user_id = u.id
                WHERE t.status = 'pending'
                ORDER BY t.date DESC
            `, [], (err, rows) => {
                if (err) reject(err);
                else resolve(rows);
            });
        });
    }
}

module.exports = Database;