# QR Attendance System: Project Guide for Agents

Small university project. A teacher logs in and creates a QR code for a class session, with a 4-digit PIN shown next to it. Students do not log in. They scan the QR, enter their student code and the PIN, and the system records that they attended that class on that day. Only students enrolled in the class can be marked.

Stack used in the examples: MySQL 8, Node.js/Express, Next.js. Adapt if the project uses something else, but keep the data model and rules the same.

---

## 1. Requirements

- Teachers log in and manage their own classes and QR codes.
- Students do not have accounts or passwords.
- A student scans the QR, enters their student code and the PIN, and is marked present.
- Only students enrolled in the class can be marked.
- Classes already have enrolled students from sample data. Teachers are view-only.
- Each QR is for one class session and expires after a set time.
- A student can be marked only once per QR.

---

## 2. Data model (ERD)

```mermaid
erDiagram
  TEACHER ||--o{ CLASS : teaches
  CLASS ||--o{ QR_CODE : has
  CLASS ||--o{ ENROLLMENT : has
  STUDENT ||--o{ ENROLLMENT : joins
  STUDENT ||--o{ ATTENDANCE : makes
  QR_CODE ||--o{ ATTENDANCE : records
  TEACHER {
    int teacher_id PK
    string full_name
    string email UK
    string password_hash
  }
  STUDENT {
    int student_id PK
    string student_code UK
    string full_name
    string email
  }
  CLASS {
    int class_id PK
    int teacher_id FK
    string class_name
    string room
  }
  ENROLLMENT {
    int enrollment_id PK
    int student_id FK
    int class_id FK
    datetime enrolled_at
  }
  QR_CODE {
    int qr_id PK
    int class_id FK
    string token UK
    string pin_hash
    datetime created_at
    datetime expires_at
  }
  ATTENDANCE {
    int attendance_id PK
    int student_id FK
    int qr_id FK
    datetime scan_time
  }
```

Design decisions:

- `ENROLLMENT` links students and classes (many to many). It decides who may attend.
- `ATTENDANCE` has no `class_id` or date. The class comes from `qr_code.class_id` and the day from `qr_code.created_at`.
- A new `QR_CODE` row is created per session, so an old QR cannot be reused on another day.
- Only `TEACHER` has a password. Students have no login data.
- The PIN is stored hashed, never in plain text.

---

## 3. Database tasks

Use MySQL. Create the tables in this order (foreign keys depend on it).

```sql
CREATE DATABASE IF NOT EXISTS qr_attendance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE qr_attendance;

CREATE TABLE teacher (
  teacher_id     INT AUTO_INCREMENT PRIMARY KEY,
  full_name      VARCHAR(100) NOT NULL,
  email          VARCHAR(255) NOT NULL UNIQUE,
  password_hash  VARCHAR(255) NOT NULL
) ENGINE=InnoDB;

CREATE TABLE student (
  student_id    INT AUTO_INCREMENT PRIMARY KEY,
  student_code  VARCHAR(30)  NOT NULL UNIQUE,
  full_name     VARCHAR(100) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE
) ENGINE=InnoDB;

CREATE TABLE `class` (
  class_id    INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id  INT NOT NULL,
  class_name  VARCHAR(100) NOT NULL,
  room        VARCHAR(50),
  CONSTRAINT fk_class_teacher
    FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
) ENGINE=InnoDB;

CREATE TABLE enrollment (
  enrollment_id  INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT NOT NULL,
  class_id       INT NOT NULL,
  enrolled_at    DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_enrollment UNIQUE (student_id, class_id),
  CONSTRAINT fk_enrollment_student
    FOREIGN KEY (student_id) REFERENCES student(student_id),
  CONSTRAINT fk_enrollment_class
    FOREIGN KEY (class_id) REFERENCES `class`(class_id)
) ENGINE=InnoDB;

CREATE TABLE qr_code (
  qr_id       INT AUTO_INCREMENT PRIMARY KEY,
  class_id    INT NOT NULL,
  token       VARCHAR(64) NOT NULL UNIQUE,
  pin_hash    VARCHAR(255) NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  created_at  DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  expires_at  DATETIME NOT NULL,
  INDEX idx_qr_class_expiry (class_id, expires_at),
  CONSTRAINT fk_qr_class
    FOREIGN KEY (class_id) REFERENCES `class`(class_id)
) ENGINE=InnoDB;

CREATE TABLE attendance (
  attendance_id  INT AUTO_INCREMENT PRIMARY KEY,
  student_id     INT NOT NULL,
  qr_id          INT NOT NULL,
  scan_time      DATETIME NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_attendance UNIQUE (student_id, qr_id),
  CONSTRAINT fk_attendance_student
    FOREIGN KEY (student_id) REFERENCES student(student_id),
  CONSTRAINT fk_attendance_qr
    FOREIGN KEY (qr_id) REFERENCES qr_code(qr_id)
) ENGINE=InnoDB;
```

Rules:

- Keep `UNIQUE (student_id, class_id)` on `enrollment`.
- Keep `UNIQUE (student_id, qr_id)` on `attendance`.
- Hash passwords and PINs with bcrypt or argon2. Never store them in plain text.
- Seed data for testing: 1 teacher, 2 students, 1 class, and enrollments for both students.

Verify:

```bash
mysql -u root -p < db/schema.sql
mysql -u root -p qr_attendance -e "SHOW TABLES;"
```

Expect six tables: `teacher`, `student`, `class`, `enrollment`, `qr_code`, `attendance`.

---

## 4. Backend tasks

### Auth (teachers only)

- `POST /auth/login` with `{ email, password }`. Compare with `teacher.password_hash`.
- On success, issue a session or JWT containing `teacherId` and `role = "teacher"`.
- Middleware `requireTeacher` protects every route under `/teacher` and `/classes`.
- There is no student login and no student session.

### Teacher endpoints

| Method | Route | What it does |
|---|---|---|
| GET | `/teacher/classes` | Classes where `class.teacher_id` = session teacher |
| POST | `/classes/:classId/qr` | Create a QR and PIN for a class session |
| GET | `/classes/:classId/qr/active` | Current unexpired QR (no PIN, see below) |
| GET | `/classes/:classId/attendance?date=YYYY-MM-DD` | Who attended that day |

Creating a QR (`POST /classes/:classId/qr`):

1. Check the class belongs to the session teacher. If not, return 403.
2. Generate `token` with `crypto.randomBytes(32).toString('hex')`.
3. Generate `pin` as a random 4-digit number with `crypto.randomInt(0, 10000)`, zero-padded to 4 digits.
4. Store `pin_hash` (bcrypt or argon2). Store only the hash.
5. Set `expires_at = NOW() + INTERVAL 15 MINUTE` (make this configurable).
6. Return `{ qr_id, token, pin, expires_at }`. The plain `pin` is returned only in this response.

The PIN is shown once, on the teacher's screen. If the teacher loses it, create a new QR.

`GET /classes/:classId/qr/active` must never return `pin` or `pin_hash`.

### Student endpoint (no login)

| Method | Route | What it does |
|---|---|---|
| POST | `/attendance` | Mark attendance. Body: `{ token, student_code, pin }` |

Server steps, in this order:

1. Find `qr_code` by `token`. If not found, return 404.
2. Check `expires_at > NOW()`. If expired, return 410.
3. Check the attempt limit for this token (see Security). If locked, return 429.
4. Verify `pin` against `pin_hash`. If wrong, record a failed attempt and return 401 with the message "Invalid code or PIN". Use the same message as step 5 to avoid revealing which part was wrong.
5. Find `student` by `student_code`. If not found, return 401 with the same message.
6. Check `enrollment` for (`student_id`, `qr_code.class_id`). If not enrolled, return 403 ("You are not enrolled in this class").
7. Insert into `attendance`. If MySQL error 1062 (duplicate key), return 409 ("Already marked").
8. Return `{ class_name, scan_time }`.

Rules:

- The class always comes from the QR row, never from the request.
- Use server time for all expiry checks.
- Do not use `student_id` from the request. Look it up from `student_code`.

---

## 5. Frontend tasks

Pages:

| Page | Who | Content |
|---|---|---|
| `/login` | teacher | Email and password |
| `/teacher` | teacher | List of own classes (view only) |
| `/teacher/classes/[id]` | teacher | "Generate QR" button. After generating: the QR, the 4-digit PIN in large text, expiry countdown. Below: list of who attended, refreshed every 5 to 10 seconds |
| `/scan?token=...` | student (no login) | Form asking for student code and PIN, then submit |

Student flow on `/scan`:

1. The QR encodes a URL like `https://<app>/scan?token=<token>`. Opening it reads `token` from the URL.
2. Save `token` in `sessionStorage` so a refresh doesn't lose it. Remove it from the URL with `history.replaceState` once saved.
3. Show two inputs: student code and PIN (numeric keypad, max 4 digits). The PIN is read from the teacher's screen, not from the QR.
4. Submit `POST /attendance` with `{ token, student_code, pin }`.
5. Show the result:
   - Success: "Attendance recorded for <class_name>."
   - 401: "Invalid code or PIN."
   - 403: "You are not enrolled in this class."
   - 409: "Already marked."
   - 410: "This QR has expired. Ask your teacher for a new one." Clear the stored token.
   - 429: "Too many attempts. Ask your teacher for a new QR." Clear the stored token.
6. After success, clear the stored token so the page can't be reused.

Teacher page notes:

- Render the QR image from the URL that includes the token (use `qrcode` or `qrcode.react`).
- Show the PIN in large, clear text next to the QR.
- Stop the countdown and show "Expired" when `expires_at` passes.

General:

- Redirect to `/login` on 401 for teacher pages.
- Never display or store `password_hash` or `pin_hash`.

---
## 5.1 Local development setup (PC as server, phone as student)
 
Setup:
 
- The PC runs the backend and the frontend. The teacher uses the PC browser.
- The phone is the student. It must be on the same Wi-Fi as the PC.
- `localhost` on the phone means the phone itself, so the phone must use the PC's LAN address instead (e.g. `192.168.1.10`).
Find the PC's LAN address:
 
```bash
# Windows
ipconfig          # look for IPv4 Address under your Wi-Fi adapter
# macOS / Linux
ip addr           # or: ifconfig
```
 
Binding (so the phone can reach the PC):
 
- Backend listens on `0.0.0.0:4000`, not `127.0.0.1`.
- Frontend runs with `next dev -H 0.0.0.0 -p 3000`.
- Allow ports 3000 and 4000 through the Windows firewall for Private networks.
Environment files (replace `192.168.1.10` with your PC's address):
 
```
# frontend/.env.local
NEXT_PUBLIC_API_URL=http://192.168.1.10:4000
NEXT_PUBLIC_APP_URL=http://192.168.1.10:3000
 
# backend/.env
PORT=4000
FRONTEND_ORIGIN=http://192.168.1.10:3000
JWT_SECRET=change-me
QR_TTL_MINUTES=15
```
 
Rules for the agent:
 
- Every frontend request goes through `NEXT_PUBLIC_API_URL`. Never hard-code `localhost` in the frontend.
- The QR code must encode `${NEXT_PUBLIC_APP_URL}/scan?token=<token>`, so the phone opens the PC's address, not `localhost`.
- The backend enables CORS only for `FRONTEND_ORIGIN`, with credentials off.
- Teacher auth uses a JWT sent as `Authorization: Bearer <token>`. Don't rely on cookies across the two ports, since cross-port cookies behave differently on each browser.
- Teacher JWT is stored in memory or `localStorage` for this project. Clear it on logout and on any 401.
- The `/scan` page calls `POST ${NEXT_PUBLIC_API_URL}/attendance` directly. No login is needed.
Test steps:
 
1. Start the backend, then the frontend.
2. On the PC, open `http://localhost:3000/login` and log in as the seeded teacher.
3. Open a class, click "Generate QR", and note the PIN.
4. On the phone, scan the QR. Confirm the page opens at `http://192.168.1.10:3000/scan?token=...`.
5. Enter a seeded student code and the PIN. Confirm "Attendance recorded".
6. Refresh the teacher's attendance list. Confirm the student appears.
7. Test the failure cases from section 4 (wrong PIN, duplicate scan, expired QR, not enrolled).
If the phone can't load the page, check in this order: same Wi-Fi, the PC's IP address hasn't changed, firewall rules, and the frontend started with `-H 0.0.0.0`.
 
Note: this setup is for demonstration only. Plain HTTP on a local network is acceptable f

## 6. Security checklist

- Passwords and PINs are hashed (bcrypt or argon2).
- Tokens are random (32 bytes), unguessable, and expire.
- PIN attempts are limited per QR token: lock after 5 failed attempts, returning 429.
- The PIN is shown only in the classroom, on the teacher's screen. It is never inside the QR.
- Error messages for wrong student code and wrong PIN are the same, so attackers cannot tell which one was wrong.
- Teachers can only manage QR codes for their own classes.
- Students can only be marked for classes they are enrolled in.
- Use parameterized queries or an ORM. Never build SQL by string concatenation.
- Rate-limit `POST /attendance` by IP as well (e.g. 20 requests per minute).

Attempt limit: add a `failed_attempts INT NOT NULL DEFAULT 0` column to `qr_code` and increment it on each wrong PIN. Lock the QR when it reaches 5. Alternatively, use an in-memory or Redis counter keyed by token.

---

## 7. Decisions

- **QR lifetime:** 15 minutes. Fixed for this version.
- **Attempt limit:** 5 wrong PIN attempts per QR, then locked (429). Fixed for this version.
- **Enrollment data:** Sample data only. Seed the database with a teacher, classes and students already enrolled, so a class is never empty. There is no UI or endpoint to manage enrollments. This project is one part of a larger system, so the sample data stands in for the real student-class feed.
- **Teacher access is view-only:** Teachers can log in, see their classes, generate QR codes and view attendance. They cannot edit students or delete attendance records. There is no class-creation endpoint or form in this version. Classes and students come from sample data.

## 7.1 Future ideas (not implemented, for discussion)

- **Campus network check:** Only allow attendance from an allowlisted campus IP range (not the teacher's IP). Store the range in config and compare the request IP against it. Known limits: mobile data, shared networks, VPNs and proxies. Needs campus IT to provide the ranges.
- **Location check:** Compare the student's GPS position with the campus building, as a supporting check only.
- **Teacher edits:** Add or remove students and delete wrong attendance records.

## 8. Change log

- Students no longer log in. Attendance uses QR token + student code + PIN.
- `student.password_hash` removed.
- `qr_code.pin_hash` and `failed_attempts` added.
- Student routes (`/student/*`) removed.
- Classes are seeded with enrolled students (sample data). Class creation with students was dropped, and teachers are view-only.
