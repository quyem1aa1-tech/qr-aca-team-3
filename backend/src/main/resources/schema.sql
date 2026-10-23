CREATE DATABASE IF NOT EXISTS qr_attendance
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE qr_attendance;

DROP TABLE IF EXISTS attendance;
DROP TABLE IF EXISTS qr_code;
DROP TABLE IF EXISTS enrollment;
DROP TABLE IF EXISTS `class`;
DROP TABLE IF EXISTS student;
DROP TABLE IF EXISTS teacher;

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

-- Seed data (1 teacher [password: teacher123], 2 students, 1 class, enrollments for both students)
INSERT INTO teacher (full_name, email, password_hash) VALUES
  ('Nguyen Van A', 'teacher@school.edu', '$2a$10$NSJZgaOSbnUFwfebCtOzXOWHV0We3Q8NKnMF5aWQYer8ocRCV8r.O');

INSERT INTO student (student_code, full_name, email) VALUES
  ('SV001', 'Tran Thi B', 'student1@school.edu'),
  ('SV002', 'Le Van C', 'student2@school.edu');

INSERT INTO `class` (teacher_id, class_name, room) VALUES
  (1, 'Web Programming', 'B101');

INSERT INTO enrollment (student_id, class_id) VALUES
  (1, 1),
  (2, 1);
