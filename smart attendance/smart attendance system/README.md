# 🎓 Smart Attendance System

A production-ready, secure, and modern **Student Attendance & Fee Management System** built with **Flask**, **SQLite3**, **Vanilla CSS (Glassmorphism)**, and **Chart.js**.

---

## 🌟 Features

### 👨‍💼 Admin Dashboard
* **Bulk Attendance Marking:** Easily mark attendance for multiple students across classes and subjects on any date.
* **Multi-Subject Tracking:** Supports marking attendance for multiple subjects (e.g., Mathematics, Science) on the same date for a single student.
* **Fee Management:** Update and track fees due for each student with real-time analytics.
* **Class, Section & Subject Management:** Add and manage academic classes, sections, and subjects with strict relational consistency.
* **Student Onboarding:** Register new students with class/section assignment and roll numbers.
* **CSV Export:** Filter and export attendance history to CSV with built-in formula injection protection.
* **Interactive Analytics:** Real-time Chart.js visual breakdown of attendance distribution and fees due.

### 👨‍🎓 Student Dashboard
* **Attendance Overview:** Personal attendance statistics, total classes attended, and attendance percentage.
* **Class Schedule:** Weekly timetables and timetable schedule view.
* **Attendance History:** Searchable history of marked attendance records.
* **Fee Status:** Transparent view of outstanding fees due.

### 🛡️ Security & Reliability
* **CAPTCHA Authentication:** Integrated math CAPTCHA on login with replay prevention and session invalidation.
* **Environment-Based Security:** Support for environment variable secret keys and credentials via `python-dotenv`.
* **Session Cookie Hardening:** `HttpOnly`, `SameSite=Lax`, and HTTPS `Secure` cookie policies.
* **Database Foreign Keys & Migrations:** Automated schema checks, foreign key enforcement (`PRAGMA foreign_keys = ON`), and idempotent index migration (`student_id + date + subject_id`).
* **WSGI / Gunicorn Ready:** Automated database initialization context for production WSGI servers.

---

## 🛠️ Tech Stack

* **Backend Framework:** [Flask 3.0.3](https://flask.palletsprojects.com/)
* **Security & Forms:** [Flask-WTF 1.2.1](https://flask-wtf.readthedocs.io/), [Werkzeug 3.0.3](https://werkzeug.palletsprojects.com/)
* **Database:** SQLite 3 (with foreign keys and WAL connection timeout)
* **WSGI Production Server:** [Gunicorn 22.0.0](https://gunicorn.org/)
* **Frontend:** HTML5, Vanilla CSS3 (Glassmorphism Design System), JavaScript (ES6)
* **Data Visualization:** [Chart.js](https://www.chartjs.org/)

---

## 📁 Project Structure

```text
smart-attendance-system/
├── app.py                  # Main Flask application & routes
├── database/
│   └── attendance.db       # SQLite database file
├── static/
│   ├── css/
│   │   └── styles.css      # Glassmorphism design system styles
│   └── js/
│       ├── admin.js        # Admin dashboard charts & interactive toggles
│       └── student.js      # Student dashboard chart scripts
├── templates/
│   ├── base.html           # Master layout template
│   ├── login.html          # Login view with CAPTCHA
│   ├── register.html       # Student registration view
│   ├── admin_dashboard.html# Admin dashboard interface
│   └── student_dashboard.html# Student dashboard interface
├── requirements.txt        # Production dependencies
├── .env.example            # Environment configuration template
├── .gitignore              # Git ignore configuration
└── README.md               # Documentation
```

---

## 🚀 Quick Start Guide

### Prerequisites
* Python 3.10 or higher
* `pip` (Python package manager)

### 1. Clone the Repository
```bash
git clone https://github.com/Rajat-R17/Smart-Attendance-System.git
cd Smart-Attendance-System
```

### 2. Create and Activate Virtual Environment
```bash
# On Linux/macOS
python3 -m venv .venv
source .venv/bin/activate

# On Windows
python -m venv .venv
.venv\Scripts\activate
```

### 3. Install Dependencies
```bash
pip install -r requirements.txt
```

### 4. Configure Environment Variables
Create a `.env` file from `.env.example`:
```bash
cp .env.example .env
```

Edit `.env` with your secure configuration:
```env
SECRET_KEY=your-long-secure-random-secret-key
INITIAL_ADMIN_EMAIL=admin@school.edu
INITIAL_ADMIN_PASSWORD=YourStrongAdminPassword123!
FLASK_ENV=production
FLASK_DEBUG=0
```

---

## 💻 Running the Application

### Local Development Server
```bash
python app.py
```
Open your browser and navigate to `http://127.0.0.1:5000`.

### Production Server (Gunicorn)
```bash
gunicorn app:app --bind 0.0.0.0:8000 --workers 4
```

---

## 🔑 Default Credentials

Upon initial database boot, the application automatically seeds the default administrator account (if configured in `.env`):

* **Admin Email:** `admin@school.edu`
* **Admin Password:** `Admin@123` *(Change this in production via `.env`)*

---

## 🧪 Running Automated Tests

Run the automated test suite to verify database migrations, CAPTCHA validation, pagination edge cases, multi-subject attendance, and CSV exports:

```bash
python -m unittest scratch/test_suite.py
```

---

## 📜 License

Distributed under the MIT License. See `LICENSE` for more information.
