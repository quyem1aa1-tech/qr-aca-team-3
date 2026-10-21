package com.example.attendance.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "enrollment",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "class_id"}),
        indexes = @Index(name = "idx_enroll_student", columnList = "student_id"))
public class Enrollment {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "enrollment_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;

    @Column(name = "enrolled_at", nullable = false)
    private Instant enrolledAt = Instant.now();

    public Enrollment() {
    }

    public Enrollment(Student student, ClassRoom classRoom) {
        this.student = student;
        this.classRoom = classRoom;
    }

    public Integer getId() { return id; }
    public Student getStudent() { return student; }
    public ClassRoom getClassRoom() { return classRoom; }
    public Instant getEnrolledAt() { return enrolledAt; }
}
