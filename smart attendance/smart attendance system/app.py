import os
import re
import csv
import io
import sqlite3
from datetime import datetime, timezone
from functools import wraps
from pathlib import Path

from flask import (
    Flask,
    render_template,
    request,
    redirect,
    url_for,
    session,
    flash,
    Response,
)
from werkzeug.security import generate_password_hash, check_password_hash
from flask_wtf import CSRFProtect
try:
    from dotenv import load_dotenv
    BASE_DIR = Path(__file__).resolve().parent
    load_dotenv(BASE_DIR / ".env")
except ImportError:
    BASE_DIR = Path(__file__).resolve().parent

DB_PATH = BASE_DIR / "database" / "attendance.db"

app = Flask(__name__)
app.secret_key = os.environ.get("SECRET_KEY", "dev-secret-key-change-in-production")
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    SESSION_COOKIE_SECURE=os.environ.get("FLASK_ENV") == "production",
)
csrf = CSRFProtect(app)

DEFAULT_ADMIN_EMAIL = os.environ.get("INITIAL_ADMIN_EMAIL", "admin@school.edu")
DEFAULT_ADMIN_PASSWORD = os.environ.get("INITIAL_ADMIN_PASSWORD", "Admin@123")


def get_db_connection():
    """Create a SQLite connection with timeout, row factory, and foreign keys enabled."""
    conn = sqlite3.connect(DB_PATH, timeout=10)
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA foreign_keys = ON;")
    return conn


def ensure_column(conn, table, column, col_def):
    """Add column if missing (safe migration helper)."""
    cols = [row["name"] for row in conn.execute(f"PRAGMA table_info({table})").fetchall()]
    if column not in cols:
        conn.execute(f"ALTER TABLE {table} ADD COLUMN {column} {col_def}")


def run_migrations(conn):
    """Run database schema and data migrations safely and idempotently."""
    cur = conn.cursor()

    # 1. Fix Student 5 email collision with default admin if present
    cur.execute("SELECT id, email FROM students WHERE email = ?", (DEFAULT_ADMIN_EMAIL,))
    colliding_student = cur.fetchone()
    if colliding_student:
        cur.execute(
            "UPDATE students SET email = 'somil.student@school.edu' WHERE id = ?",
            (colliding_student["id"],),
        )

    # 2. Check and repair idx_attendance_unique index
    indexes = cur.execute("PRAGMA index_list('attendance')").fetchall()
    unique_idx = [idx for idx in indexes if idx["name"] == "idx_attendance_unique"]

    recreate_index = False
    if unique_idx:
        info = cur.execute("PRAGMA index_info('idx_attendance_unique')").fetchall()
        col_names = [row["name"] for row in info]
        if col_names != ["student_id", "date", "subject_id"]:
            cur.execute("DROP INDEX idx_attendance_unique")
            recreate_index = True
    else:
        recreate_index = True

    if recreate_index:
        # Resolve any duplicates on (student_id, date, subject_id) keeping latest ID
        cur.execute(
            """
            DELETE FROM attendance
            WHERE id NOT IN (
                SELECT MAX(id)
                FROM attendance
                GROUP BY student_id, date, COALESCE(subject_id, 0)
            )
            """
        )
        cur.execute(
            """
            CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_unique
            ON attendance (student_id, date, subject_id)
            """
        )

    conn.commit()


def init_db():
    """Initialize database tables and seed initial data if missing."""
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = get_db_connection()
    cur = conn.cursor()

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS admins (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            created_at TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS students (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            full_name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password_hash TEXT NOT NULL,
            fees_due REAL DEFAULT 0,
            face_image_path TEXT,
            class_id INTEGER,
            section_id INTEGER,
            roll_no TEXT,
            FOREIGN KEY (class_id) REFERENCES classes (id),
            FOREIGN KEY (section_id) REFERENCES sections (id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS classes (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT UNIQUE NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS sections (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            UNIQUE (class_id, name),
            FOREIGN KEY (class_id) REFERENCES classes (id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS subjects (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            class_id INTEGER NOT NULL,
            name TEXT NOT NULL,
            UNIQUE (class_id, name),
            FOREIGN KEY (class_id) REFERENCES classes (id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS attendance (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            student_id INTEGER NOT NULL,
            date TEXT NOT NULL,
            status TEXT NOT NULL,
            subject_id INTEGER,
            FOREIGN KEY (student_id) REFERENCES students (id),
            FOREIGN KEY (subject_id) REFERENCES subjects (id)
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS schedule (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            day TEXT NOT NULL,
            subject TEXT NOT NULL,
            start_time TEXT NOT NULL,
            end_time TEXT NOT NULL
        )
        """
    )

    cur.execute(
        """
        CREATE TABLE IF NOT EXISTS audit_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            actor_role TEXT NOT NULL,
            actor_name TEXT NOT NULL,
            action TEXT NOT NULL,
            details TEXT,
            created_at TEXT NOT NULL
        )
        """
    )

    # Migrations for older databases
    ensure_column(conn, "students", "class_id", "INTEGER")
    ensure_column(conn, "students", "section_id", "INTEGER")
    ensure_column(conn, "students", "roll_no", "TEXT")
    ensure_column(conn, "attendance", "subject_id", "INTEGER")

    run_migrations(conn)

    # Seed one class/section/subject if empty
    cur.execute("SELECT COUNT(*) as count FROM classes")
    if cur.fetchone()["count"] == 0:
        cur.execute("INSERT INTO classes (name) VALUES (?)", ("Class 10",))
        class_id = cur.lastrowid
        cur.execute("INSERT INTO sections (class_id, name) VALUES (?, ?)", (class_id, "A"))
        cur.executemany(
            "INSERT INTO subjects (class_id, name) VALUES (?, ?)",
            [(class_id, "Mathematics"), (class_id, "Science"), (class_id, "English")],
        )

    # Seed default admin if missing
    cur.execute("SELECT COUNT(*) as count FROM admins")
    if cur.fetchone()["count"] == 0:
        cur.execute(
            """
            INSERT INTO admins (email, password_hash, created_at)
            VALUES (?, ?, ?)
            """,
            (
                DEFAULT_ADMIN_EMAIL,
                generate_password_hash(DEFAULT_ADMIN_PASSWORD),
                datetime.now(timezone.utc).isoformat(),
            ),
        )

    # Seed schedule once
    cur.execute("SELECT COUNT(*) as count FROM schedule")
    if cur.fetchone()["count"] == 0:
        cur.executemany(
            """
            INSERT INTO schedule (day, subject, start_time, end_time)
            VALUES (?, ?, ?, ?)
            """,
            [
                ("Monday", "Mathematics", "09:00", "10:00"),
                ("Monday", "Physics", "10:15", "11:15"),
                ("Tuesday", "Chemistry", "09:00", "10:00"),
                ("Wednesday", "Computer Science", "11:30", "12:30"),
                ("Thursday", "English", "09:00", "10:00"),
                ("Friday", "Biology", "10:15", "11:15"),
            ],
        )

    conn.commit()
    conn.close()


# Ensure database and migrations are initialized on module load (works under WSGI & Gunicorn)
with app.app_context():
    init_db()


def create_captcha():
    """Create a simple math captcha and store answer in session."""
    a = os.urandom(1)[0] % 9 + 1
    b = os.urandom(1)[0] % 9 + 1
    session["captcha_answer"] = str(a + b)
    return f"{a} + {b} = ?"


def log_action(action: str, details: str = ""):
    """Store audit logs for admin/student actions."""
    try:
        conn = get_db_connection()
        conn.execute(
            """
            INSERT INTO audit_logs (actor_role, actor_name, action, details, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (
                session.get("role", "system"),
                session.get("user_name", "system"),
                action,
                details,
                datetime.now(timezone.utc).isoformat(),
            ),
        )
        conn.commit()
        conn.close()
    except Exception as e:
        app.logger.error(f"Audit log failed: {e}")


def role_required(role):
    """Decorator for role-based route protection."""
    def decorator(func):
        @wraps(func)
        def wrapper(*args, **kwargs):
            if session.get("role") != role:
                flash("Access denied. Please log in with appropriate credentials.", "error")
                return redirect(url_for("login"))
            return func(*args, **kwargs)
        return wrapper
    return decorator


def safe_int_param(val, default=1):
    """Parse integer parameters safely, converting non-integer, <=0 to default."""
    try:
        res = int(val)
        return res if res >= 1 else default
    except (TypeError, ValueError):
        return default


def validate_email(email: str) -> bool:
    return bool(re.match(r"^[^@\s]+@[^@\s]+\.[^@\s]+$", (email or "").strip()))


def validate_password(password: str) -> bool:
    return password is not None and len(password) >= 6


@app.route("/")
def index():
    return redirect(url_for("login"))


@app.route("/login", methods=["GET", "POST"])
def login():
    if request.method == "POST":
        role = request.form.get("role")
        email = (request.form.get("email") or "").strip()
        password = request.form.get("password")
        captcha_answer = (request.form.get("captcha") or "").strip()

        session_captcha = session.get("captcha_answer")
        session.pop("captcha_answer", None)

        if not captcha_answer or not session_captcha or captcha_answer != session_captcha:
            flash("Invalid CAPTCHA. Please try again.", "error")
            return redirect(url_for("login"))

        # Admin login flow
        if role == "admin":
            if not validate_email(email) or not validate_password(password):
                flash("Invalid admin credentials.", "error")
                return redirect(url_for("login"))
            conn = get_db_connection()
            admin = conn.execute("SELECT * FROM admins WHERE email = ?", (email,)).fetchone()
            conn.close()
            if admin and check_password_hash(admin["password_hash"], password):
                session["role"] = "admin"
                session["user_name"] = "Administrator"
                log_action("admin_login", f"Admin email: {email}")
                return redirect(url_for("admin_dashboard"))
            flash("Invalid admin credentials.", "error")
            return redirect(url_for("login"))

        # Student login flow
        if not validate_email(email) or not validate_password(password):
            flash("Invalid credentials.", "error")
            return redirect(url_for("login"))

        conn = get_db_connection()
        student = conn.execute("SELECT * FROM students WHERE email = ?", (email,)).fetchone()
        conn.close()
        if student and check_password_hash(student["password_hash"], password):
            session["user_id"] = student["id"]
            session["role"] = "student"
            session["user_name"] = student["full_name"]
            log_action("student_login", f"Student email: {email}")
            return redirect(url_for("student_dashboard"))

        flash("Invalid credentials.", "error")
        return redirect(url_for("login"))

    captcha_question = create_captcha()
    return render_template("login.html", captcha_question=captcha_question)


@app.route("/register", methods=["GET", "POST"])
def register():
    if request.method == "POST":
        full_name = (request.form.get("full_name") or "").strip()
        email = (request.form.get("email") or "").strip()
        password = request.form.get("password")
        if not full_name or not validate_email(email):
            flash("Please provide a valid name and email.", "error")
            return redirect(url_for("register"))
        if not validate_password(password):
            flash("Password must be at least 6 characters.", "error")
            return redirect(url_for("register"))

        conn = get_db_connection()
        try:
            conn.execute(
                """
                INSERT INTO students (full_name, email, password_hash, fees_due, face_image_path)
                VALUES (?, ?, ?, ?, ?)
                """,
                (full_name, email, generate_password_hash(password), 0, None),
            )
            conn.commit()
            flash("Registration successful. You can login now.", "success")
            log_action("student_registered", f"Student email: {email}")
            return redirect(url_for("login"))
        except sqlite3.IntegrityError:
            flash("Email already registered.", "error")
        finally:
            conn.close()

    return render_template("register.html")


@app.route("/admin/dashboard")
@role_required("admin")
def admin_dashboard():
    conn = get_db_connection()
    students = conn.execute("SELECT * FROM students ORDER BY full_name").fetchall()
    classes = conn.execute("SELECT * FROM classes ORDER BY name").fetchall()
    sections = conn.execute(
        """
        SELECT sections.id, sections.name, classes.name as class_name, sections.class_id
        FROM sections JOIN classes ON classes.id = sections.class_id
        ORDER BY classes.name, sections.name
        """
    ).fetchall()
    subjects = conn.execute(
        """
        SELECT subjects.id, subjects.name, classes.name as class_name, subjects.class_id
        FROM subjects JOIN classes ON classes.id = subjects.class_id
        ORDER BY classes.name, subjects.name
        """
    ).fetchall()

    page = safe_int_param(request.args.get("page", 1))
    per_page = 10
    offset = (page - 1) * per_page
    total_count = conn.execute("SELECT COUNT(*) as count FROM attendance").fetchone()["count"]
    present_count = conn.execute(
        "SELECT COUNT(*) as count FROM attendance WHERE status = 'Present'"
    ).fetchone()["count"]
    absent_count = conn.execute(
        "SELECT COUNT(*) as count FROM attendance WHERE status = 'Absent'"
    ).fetchone()["count"]
    attendance_records = conn.execute(
        """
        SELECT attendance.id, students.full_name, attendance.date, attendance.status,
               subjects.name as subject_name
        FROM attendance
        JOIN students ON students.id = attendance.student_id
        LEFT JOIN subjects ON subjects.id = attendance.subject_id
        ORDER BY attendance.date DESC, attendance.id DESC
        LIMIT ? OFFSET ?
        """,
        (per_page, offset),
    ).fetchall()
    conn.close()

    today_str = datetime.now().strftime("%Y-%m-%d")
    total_pages = max(1, (total_count + per_page - 1) // per_page)
    if page > total_pages:
        page = total_pages

    return render_template(
        "admin_dashboard.html",
        students=students,
        classes=classes,
        sections=sections,
        subjects=subjects,
        attendance_records=attendance_records,
        today_str=today_str,
        page=page,
        total_pages=total_pages,
        present_count=present_count,
        absent_count=absent_count,
    )


@app.route("/admin/mark-attendance", methods=["POST"])
@role_required("admin")
def mark_attendance():
    date = (request.form.get("date") or "").strip()
    subject_id = request.form.get("subject_id")
    student_ids = request.form.getlist("student_id")

    if not date or not re.match(r"^\d{4}-\d{2}-\d{2}$", date):
        flash("Invalid date format. Expected YYYY-MM-DD.", "error")
        return redirect(url_for("admin_dashboard"))

    if not subject_id or not subject_id.isdigit():
        flash("Valid subject is required.", "error")
        return redirect(url_for("admin_dashboard"))

    if not student_ids:
        flash("No students selected for attendance.", "error")
        return redirect(url_for("admin_dashboard"))

    conn = get_db_connection()
    subj = conn.execute("SELECT id FROM subjects WHERE id = ?", (subject_id,)).fetchone()
    if not subj:
        conn.close()
        flash("Selected subject does not exist.", "error")
        return redirect(url_for("admin_dashboard"))

    for sid in student_ids:
        if not sid.isdigit():
            continue
        status = request.form.get(f"status_{sid}", "Absent")
        if status not in ("Present", "Absent"):
            status = "Absent"

        conn.execute(
            """
            INSERT INTO attendance (student_id, date, status, subject_id)
            VALUES (?, ?, ?, ?)
            ON CONFLICT(student_id, date, subject_id) DO UPDATE SET status=excluded.status
            """,
            (sid, date, status, subject_id),
        )
    conn.commit()
    conn.close()

    log_action("bulk_attendance", f"Date: {date}, Subject: {subject_id}, Students: {len(student_ids)}")
    flash("Bulk attendance marked successfully.", "success")
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/update-fees", methods=["POST"])
@role_required("admin")
def update_fees():
    student_id = request.form.get("student_id")
    fees_due = request.form.get("fees_due")

    if not student_id or not student_id.isdigit():
        flash("Valid student selection is required.", "error")
        return redirect(url_for("admin_dashboard"))

    try:
        fees_value = float(fees_due)
        if fees_value < 0 or fees_value > 10000000:
            raise ValueError
    except (ValueError, TypeError):
        flash("Fees must be a valid non-negative number.", "error")
        return redirect(url_for("admin_dashboard"))

    conn = get_db_connection()
    student = conn.execute("SELECT id FROM students WHERE id = ?", (student_id,)).fetchone()
    if not student:
        conn.close()
        flash("Student not found.", "error")
        return redirect(url_for("admin_dashboard"))

    conn.execute(
        "UPDATE students SET fees_due = ? WHERE id = ?",
        (fees_value, student_id),
    )
    conn.commit()
    conn.close()

    log_action("update_fees", f"Student ID: {student_id}, Fees: {fees_value}")
    flash("Fees updated successfully.", "success")
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/add-class", methods=["POST"])
@role_required("admin")
def add_class():
    class_name = (request.form.get("class_name") or "").strip()
    if not class_name:
        flash("Class name is required.", "error")
        return redirect(url_for("admin_dashboard"))
    conn = get_db_connection()
    try:
        conn.execute("INSERT INTO classes (name) VALUES (?)", (class_name,))
        conn.commit()
        log_action("add_class", f"Class: {class_name}")
        flash("Class added.", "success")
    except sqlite3.IntegrityError:
        flash("Class already exists.", "error")
    finally:
        conn.close()
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/add-section", methods=["POST"])
@role_required("admin")
def add_section():
    class_id = request.form.get("class_id")
    section_name = (request.form.get("section_name") or "").strip()
    if not class_id or not section_name:
        flash("Class and section name are required.", "error")
        return redirect(url_for("admin_dashboard"))
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO sections (class_id, name) VALUES (?, ?)",
            (class_id, section_name),
        )
        conn.commit()
        log_action("add_section", f"Class ID: {class_id}, Section: {section_name}")
        flash("Section added.", "success")
    except sqlite3.IntegrityError:
        flash("Section already exists for this class.", "error")
    finally:
        conn.close()
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/add-subject", methods=["POST"])
@role_required("admin")
def add_subject():
    class_id = request.form.get("class_id")
    subject_name = (request.form.get("subject_name") or "").strip()
    if not class_id or not subject_name:
        flash("Class and subject name are required.", "error")
        return redirect(url_for("admin_dashboard"))
    conn = get_db_connection()
    try:
        conn.execute(
            "INSERT INTO subjects (class_id, name) VALUES (?, ?)",
            (class_id, subject_name),
        )
        conn.commit()
        log_action("add_subject", f"Class ID: {class_id}, Subject: {subject_name}")
        flash("Subject added.", "success")
    except sqlite3.IntegrityError:
        flash("Subject already exists for this class.", "error")
    finally:
        conn.close()
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/update-student", methods=["POST"])
@role_required("admin")
def update_student():
    student_id = request.form.get("student_id")
    full_name = (request.form.get("full_name") or "").strip()
    email = (request.form.get("email") or "").strip()
    if not student_id or not full_name or not validate_email(email):
        flash("Valid student name and email are required.", "error")
        return redirect(url_for("admin_dashboard"))

    conn = get_db_connection()
    try:
        conn.execute(
            "UPDATE students SET full_name = ?, email = ? WHERE id = ?",
            (full_name, email, student_id),
        )
        conn.commit()
        log_action("update_student", f"Student ID: {student_id}")
        flash("Student details updated.", "success")
    except sqlite3.IntegrityError:
        flash("Email already in use.", "error")
    finally:
        conn.close()
    return redirect(url_for("admin_dashboard"))


@app.route("/admin/add-student", methods=["POST"])
@role_required("admin")
def add_student():
    full_name = (request.form.get("full_name") or "").strip()
    email = (request.form.get("email") or "").strip()
    roll_no = (request.form.get("roll_no") or "").strip()
    class_id = request.form.get("class_id")
    section_id = request.form.get("section_id")
    password = request.form.get("password") or "Student@123"

    if not full_name or not validate_email(email) or not class_id or not section_id:
        flash("Name, valid email, class, and section are required.", "error")
        return redirect(url_for("admin_dashboard"))

    conn = get_db_connection()
    # Verify class and section match
    sec = conn.execute(
        "SELECT id FROM sections WHERE id = ? AND class_id = ?",
        (section_id, class_id),
    ).fetchone()
    if not sec:
        conn.close()
        flash("Selected section does not belong to the selected class.", "error")
        return redirect(url_for("admin_dashboard"))

    try:
        conn.execute(
            """
            INSERT INTO students (full_name, email, password_hash, fees_due, face_image_path, class_id, section_id, roll_no)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """,
            (
                full_name,
                email,
                generate_password_hash(password),
                0,
                None,
                class_id,
                section_id,
                roll_no,
            ),
        )
        conn.commit()
        log_action("add_student", f"Student email: {email}, Class ID: {class_id}, Roll: {roll_no}")
        flash("Student added successfully.", "success")
    except sqlite3.IntegrityError:
        flash("Email already registered.", "error")
    finally:
        conn.close()
    return redirect(url_for("admin_dashboard"))


@app.route("/student/dashboard")
@role_required("student")
def student_dashboard():
    student_id = session.get("user_id")
    if not student_id:
        session.clear()
        flash("Please log in to access the dashboard.", "error")
        return redirect(url_for("login"))

    conn = get_db_connection()
    student = conn.execute("SELECT * FROM students WHERE id = ?", (student_id,)).fetchone()
    if not student:
        conn.close()
        session.clear()
        flash("Student record not found. Please log in again.", "error")
        return redirect(url_for("login"))

    page = safe_int_param(request.args.get("page", 1))
    per_page = 10
    offset = (page - 1) * per_page

    total_count = conn.execute(
        "SELECT COUNT(*) as count FROM attendance WHERE student_id = ?",
        (student_id,),
    ).fetchone()["count"]
    present_count = conn.execute(
        "SELECT COUNT(*) as count FROM attendance WHERE student_id = ? AND status = 'Present'",
        (student_id,),
    ).fetchone()["count"]
    attendance = conn.execute(
        """
        SELECT attendance.date, attendance.status, subjects.name as subject_name
        FROM attendance
        LEFT JOIN subjects ON subjects.id = attendance.subject_id
        WHERE attendance.student_id = ?
        ORDER BY attendance.date DESC, attendance.id DESC
        LIMIT ? OFFSET ?
        """,
        (student_id, per_page, offset),
    ).fetchall()
    schedule = conn.execute("SELECT * FROM schedule").fetchall()
    conn.close()

    total_pages = max(1, (total_count + per_page - 1) // per_page)
    if page > total_pages:
        page = total_pages

    percentage = round((present_count / total_count) * 100, 2) if total_count > 0 else 0

    return render_template(
        "student_dashboard.html",
        student=student,
        attendance=attendance,
        schedule=schedule,
        percentage=percentage,
        total=total_count,
        present=present_count,
        page=page,
        total_pages=total_pages,
    )


@app.route("/admin/attendance-export")
@role_required("admin")
def attendance_export():
    start_date = (request.args.get("start_date") or "").strip()
    end_date = (request.args.get("end_date") or "").strip()

    conn = get_db_connection()
    query = """
        SELECT students.full_name, students.email, attendance.date, attendance.status,
               subjects.name as subject_name
        FROM attendance
        JOIN students ON students.id = attendance.student_id
        LEFT JOIN subjects ON subjects.id = attendance.subject_id
    """
    params = []
    conditions = []

    if start_date and re.match(r"^\d{4}-\d{2}-\d{2}$", start_date):
        conditions.append("attendance.date >= ?")
        params.append(start_date)
    if end_date and re.match(r"^\d{4}-\d{2}-\d{2}$", end_date):
        conditions.append("attendance.date <= ?")
        params.append(end_date)

    if conditions:
        query += " WHERE " + " AND ".join(conditions)

    query += " ORDER BY attendance.date DESC"
    rows = conn.execute(query, params).fetchall()
    conn.close()

    output = io.StringIO()
    writer = csv.writer(output)
    writer.writerow(["Student Name", "Email", "Date", "Subject", "Status"])
    for r in rows:
        name = r["full_name"]
        if name and name[0] in ("=", "+", "-", "@"):
            name = "'" + name
        subj = r["subject_name"] or ""
        if subj and subj[0] in ("=", "+", "-", "@"):
            subj = "'" + subj
        writer.writerow([name, r["email"], r["date"], subj, r["status"]])

    log_action("export_attendance", f"Range: {start_date} to {end_date}")
    return Response(
        output.getvalue(),
        mimetype="text/csv",
        headers={"Content-Disposition": "attachment; filename=attendance_export.csv"},
    )


@app.route("/logout")
def logout():
    session.clear()
    flash("You have been logged out.", "success")
    return redirect(url_for("login"))


if __name__ == "__main__":
    app.run(debug=os.environ.get("FLASK_DEBUG", "0") == "1")
