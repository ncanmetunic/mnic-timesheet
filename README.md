# 🕐 Timesheet System

A simple employee timesheet management system with calendar interface for tracking work hours and weekly planning.

## Features

### For Employees
- **Timesheet Entry**: Calendar-style interface for entering daily work hours
- **Weekly Planning**: View weekly schedules and planned hours
- **Monthly Reports**: Personal timesheet reports with statistics
- **Hour Tracking**: Automatic weekly hour calculation (30-hour limit)

### For Administrators
- **Timesheet Management**: Approve/reject employee timesheets
- **Weekly Planning**: Edit and manage weekly plans for employees
- **Monthly Reports**: View all employee timesheets with calendar layout
- **User Management**: View all registered users and departments

## Business Rules

- Work cannot start before 9:00 AM
- Maximum 30 hours per week per employee
- Maximum 15 hours per day
- All timesheets require admin approval
- Employees can view and edit their own timesheets
- Admins have full access to all timesheets and user management

## Technology Stack

- **Backend**: Node.js with Express.js
- **Database**: SQLite3
- **Frontend**: Vanilla HTML/CSS/JavaScript
- **Authentication**: bcrypt with express-session
- **Styling**: Responsive CSS with modern design

## Installation

1. **Clone the repository**:
   ```bash
   git clone https://github.com/yourusername/mnic-timesheet.git
   cd mnic-timesheet
   ```

2. **Install dependencies**:
   ```bash
   npm install
   ```

3. **Start the server**:
   ```bash
   npm start
   ```

4. **Access the application**:
   Open your browser and go to `http://localhost:8080`

## Default Admin Account

- **Username**: `admin`
- **Password**: `admin123`

## Usage

### Employee Workflow
1. Register a new account or login with existing credentials
2. Enter daily work hours using the timesheet form
3. View weekly hours and remaining capacity
4. Generate monthly reports to track work history

### Admin Workflow
1. Login with admin credentials
2. Review and approve/reject pending timesheets
3. Manage weekly plans for employees
4. Generate monthly reports for all employees
5. View user management dashboard

## Development

### Project Structure
```
timesheet/
├── server.js          # Express server and API routes
├── database.js        # SQLite database management
├── package.json       # Node.js dependencies
├── public/            # Frontend files
│   ├── dashboard.html # Main dashboard interface
│   ├── dashboard.js   # Frontend JavaScript
│   ├── login.html     # Login/registration page
│   └── styles.css     # Application styling
└── README.md          # This file
```

### API Endpoints

#### Authentication
- `POST /login` - User login
- `POST /register` - User registration
- `POST /logout` - User logout

#### Timesheet Management
- `GET /api/user` - Get current user info
- `POST /api/timesheet` - Save timesheet entry
- `GET /api/timesheet/:date` - Get timesheet for specific date
- `GET /api/monthly-timesheet/:year/:month` - Get monthly timesheets
- `GET /api/weekly-hours/:weekStart` - Get weekly hours total

#### Admin Functions
- `GET /api/all-timesheets/:year/:month` - Get all timesheets (admin)
- `GET /api/pending-timesheets` - Get pending approval timesheets
- `POST /api/timesheet/:id/approve` - Approve timesheet
- `POST /api/timesheet/:id/reject` - Reject timesheet
- `GET /api/users` - Get all users

## License

MIT License - Feel free to use this project for your timesheet management needs.