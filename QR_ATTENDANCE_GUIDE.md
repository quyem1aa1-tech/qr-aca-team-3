# QR Attendance System: Project Guide for Agents

Small university project. Teachers create a QR code for a class session. Students log in, open a class they are enrolled in, and mark attendance using that QR. The system records which student attended which class on which day.

The stack is not fixed. The examples below use PostgreSQL (Supabase-compatible), Node.js/Express and Next.js. Adapt them if the project uses something else (e.g. Spring Boot or JSP), but keep the data model and rules the same.

---

## 1. Requirements

- Required tables: `Student`, `Class`.
- `Teacher` table exists. Teachers can log in and create a QR code for their own classes.
- Students can log in.
- Students see only the classes they are enrolled in. Opening a class shows the QR code the teacher generated, which makes attendance easy.
- Attendance means: this student was in this class on this day.

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
    string email UK
    string password_hash
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
    timestamp enrolled_at
  }
  QR_CODE {
    int qr_id PK
    int class_id FK
    string token UK
    timestamp created_at
    timestamp expires_at
  }
  ATTENDANCE {
    int attendance_id PK
    int student_id FK
    int qr_id FK
    timestamp scan_time
  }
```

Design decisions:

- `ENROLLMENT` is a many-to-many link between students and classes.
- `ATTENDANCE` has no `class_id` or date column. The class comes from `qr_code.class_id` and the day from `qr_code.created_at`. This avoids duplicated data.
- A new `QR_CODE` row is created per class session, so an old QR cannot be reused on another day.

---

## 3. Database tasks

Create the tables in this order (foreign keys depend on it).

```sql
CREATE TABLE teacher (
  teacher_id     SERIAL PRIMARY KEY,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL
);

CREATE TABLE student (
  student_id     SERIAL PRIMARY KEY,
  student_code   TEXT NOT NULL UNIQUE,
  full_name      TEXT NOT NULL,
  email          TEXT NOT NULL UNIQUE,
  password_hash  TEXT NOT NULL
);

CREATE TABLE class (
  class_id    SERIAL PRIMARY KEY,
  teacher_id  INT NOT NULL REFERENCES teacher(teacher_id),
  class_name  TEXT NOT NULL,
  room        TEXT
);

CREATE TABLE enrollment (
  enrollment_id  SERIAL PRIMARY KEY,
  student_id     INT NOT NULL REFERENCES student(student_id),
  class_id       INT NOT NULL REFERENCES class(class_id),
  enrolled_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, class_id)
);

CREATE TABLE qr_code (
  qr_id       SERIAL PRIMARY KEY,
  class_id    INT NOT NULL REFERENCES class(class_id),
  token       TEXT NOT NULL UNIQUE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  expires_at  TIMESTAMPTZ NOT NULL
);

CREATE TABLE attendance (
  attendance_id  SERIAL PRIMARY KEY,
  student_id     INT NOT NULL REFERENCES student(student_id),
  qr_id          INT NOT NULL REFERENCES qr_code(qr_id),
  scan_time      TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (student_id, qr_id)
);

CREATE INDEX idx_class_teacher   ON class(teacher_id);
CREATE INDEX idx_enroll_student  ON enrollment(student_id);
CREATE INDEX idx_qr_class_expiry ON qr_code(class_id, expires_at);
```

Rules:

- Keep the `UNIQUE (student_id, class_id)` on `enrollment` so a student can't be enrolled twice.
- Keep the `UNIQUE (student_id, qr_id)` on `attendance` so a student can't be marked twice for the same QR.
- Store only hashed passwords (bcrypt or argon2). Never store plain text.
- Add a few seed rows (1 teacher, 2 students, 1 class, enrollments) so the flow can be tested.

---

## 4. Backend tasks

### Auth

- `POST /auth/login` with `{ email, password, role }` where role is `student` or `teacher`.
- Compare the password with `password_hash`. On success, issue a session or JWT containing `userId` and `role`.
- Add middleware `requireAuth(role)`. Every route below uses it.

### Teacher endpoints (role = teacher)

| Method | Route | What it does |
|---|---|---|
| GET | `/teacher/classes` | List classes where `class.teacher_id` = session user |
| POST | `/classes/:classId/qr` | Create a QR for the class |
| GET | `/classes/:classId/qr/active` | Return the current unexpired QR, if any |
| GET | `/classes/:classId/attendance?date=YYYY-MM-DD` | List who attended |

Creating a QR (`POST /classes/:classId/qr`):

1. Check the class belongs to the logged-in teacher. If not, return 403.
2. Generate `token` with a cryptographically secure random generator (e.g. `crypto.randomBytes(32).toString('hex')`).
3. Insert a `qr_code` row with `expires_at = now() + N minutes` (suggest 15, make it configurable).
4. Return `{ qr_id, token, expires_at }`.

### Student endpoints (role = student)

| Method | Route | What it does |
|---|---|---|
| GET | `/student/classes` | `enrollment` joined to `class` for the session student |
| GET | `/student/classes/:classId/qr/active` | Active QR for the class, only if the student is enrolled |
| POST | `/attendance` | Mark attendance, body `{ qr_id }` (or `{ token }` if scanning with a camera) |

Marking attendance (`POST /attendance`) must do all of these checks on the server:

1. Take `student_id` from the session. Never read it from the request body.
2. Find the `qr_code` row. If missing, return 404.
3. Check `expires_at > now()`. If expired, return 410 or 400.
4. Check the student is enrolled in `qr_code.class_id`. If not, return 403.
5. Insert into `attendance`. If the unique constraint fails, return 409 ("already marked").
6. Return success with the class name and `scan_time`.

Use server time for all expiry checks, never the client's clock.

---

## 5. Frontend tasks

Pages:

| Page | Role | Content |
|---|---|---|
| `/login` | both | Email, password, role selector |
| `/student` | student | List of enrolled classes |
| `/student/classes/[id]` | student | Shows the active QR/"Attend" button, or "No active QR yet". After attending, shows "Attended at HH:MM" |
| `/teacher` | teacher | List of own classes |
| `/teacher/classes/[id]` | teacher | "Generate QR" button, rendered QR code with an expiry countdown, list of students who attended |

Implementation notes:

- Render the QR image from the `token` with a QR library (e.g. `qrcode` or `qrcode.react`).
- Student class page: call `GET /student/classes/:classId/qr/active` on load. If a QR exists, show an "Attend" button that sends `POST /attendance`. Show clear states: success, already marked, expired, not enrolled.
- Teacher class page: refresh the attendance list on an interval (e.g. every 5 to 10 seconds) while the QR is active.
- Redirect to `/login` on 401. Hide pages that don't match the user's role.
- Never display or store `password_hash` in the frontend.

---

## 6. Security checklist

- Hash passwords (bcrypt or argon2).
- Identity always comes from the session or token, never from the request body.
- QR tokens are random, unguessable, and expire.
- Teachers can only manage QR codes for their own classes.
- Students can only attend classes they are enrolled in.
- Use parameterized queries or an ORM. Never build SQL by string concatenation.

---

## 7. Open decisions

- **Button vs real scan.** The current flow lets a student tap "Attend" on the class page, which means a student could mark attendance from home. To require physical presence, show the QR only on the teacher's screen in the classroom and have students scan it with their camera (`POST /attendance` with `{ token }`). Confirm which one the project wants.
- **QR lifetime.** 15 minutes is a suggestion, so confirm the value.
- **Enrollment management.** Not yet defined who creates enrollments (admin, teacher, or seed data).
