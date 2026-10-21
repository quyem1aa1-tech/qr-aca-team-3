package com.example.attendance.config;

import com.example.attendance.model.*;
import com.example.attendance.repository.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

/** Inserts demo data when the database is empty (disable with app.seed.enabled=false). */
@Component
public class DataSeeder implements CommandLineRunner {

    private static final Logger log = LoggerFactory.getLogger(DataSeeder.class);

    private final TeacherRepository teachers;
    private final StudentRepository students;
    private final ClassRepository classes;
    private final EnrollmentRepository enrollments;
    private final PasswordEncoder encoder;
    private final boolean enabled;

    public DataSeeder(TeacherRepository teachers, StudentRepository students, ClassRepository classes,
                      EnrollmentRepository enrollments, PasswordEncoder encoder,
                      @Value("${app.seed.enabled}") boolean enabled) {
        this.teachers = teachers;
        this.students = students;
        this.classes = classes;
        this.enrollments = enrollments;
        this.encoder = encoder;
        this.enabled = enabled;
    }

    @Override
    public void run(String... args) {
        if (!enabled || teachers.count() > 0 || students.count() > 0) return;

        Teacher teacher = teachers.save(new Teacher("Nguyen Van A", "teacher@school.edu",
                encoder.encode("teacher123")));
        Student s1 = students.save(new Student("SV001", "Tran Thi B", "student1@school.edu",
                encoder.encode("student123")));
        Student s2 = students.save(new Student("SV002", "Le Van C", "student2@school.edu",
                encoder.encode("student123")));
        ClassRoom cls = classes.save(new ClassRoom(teacher, "Web Programming", "B101"));
        enrollments.save(new Enrollment(s1, cls));
        enrollments.save(new Enrollment(s2, cls));
        log.info("Seeded demo data: teacher@school.edu / teacher123, student1@school.edu & student2@school.edu / student123");
    }
}
