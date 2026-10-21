-- Reference MySQL DDL (the app creates the same tables through JPA ddl-auto=update).
CREATE DATABASE IF NOT EXISTS school_attendance CHARACTER SET utf8mb4;
USE school_attendance;

CREATE TABLE teacher (
  teacher_id    INT AUTO_INCREMENT PRIMARY KEY,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE student (
  student_id    INT AUTO_INCREMENT PRIMARY KEY,
  student_code  VARCHAR(50)  NOT NULL UNIQUE,
  full_name     VARCHAR(255) NOT NULL,
  email         VARCHAR(255) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL
);

CREATE TABLE `class` (
  class_id   INT AUTO_INCREMENT PRIMARY KEY,
  teacher_id INT NOT NULL,
  class_name VARCHAR(255) NOT NULL,
  room       VARCHAR(100),
  FOREIGN KEY (teacher_id) REFERENCES teacher(teacher_id)
);

CREATE TABLE enrollment (
  enrollment_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  class_id      INT NOT NULL,
  enrolled_at   DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE (student_id, class_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id),
  FOREIGN KEY (class_id)   REFERENCES `class`(class_id)
);

CREATE TABLE qr_code (
  qr_id      INT AUTO_INCREMENT PRIMARY KEY,
  class_id   INT NOT NULL,
  token      VARCHAR(128) NOT NULL UNIQUE,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  expires_at DATETIME(6) NOT NULL,
  FOREIGN KEY (class_id) REFERENCES `class`(class_id)
);

CREATE TABLE attendance (
  attendance_id INT AUTO_INCREMENT PRIMARY KEY,
  student_id    INT NOT NULL,
  qr_id         INT NOT NULL,
  scan_time     DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  UNIQUE (student_id, qr_id),
  FOREIGN KEY (student_id) REFERENCES student(student_id),
  FOREIGN KEY (qr_id)      REFERENCES qr_code(qr_id)
);

CREATE INDEX idx_class_teacher   ON `class`(teacher_id);
CREATE INDEX idx_enroll_student  ON enrollment(student_id);
CREATE INDEX idx_qr_class_expiry ON qr_code(class_id, expires_at);
