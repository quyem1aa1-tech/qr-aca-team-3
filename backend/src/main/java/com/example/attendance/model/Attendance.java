package com.example.attendance.model;

import jakarta.persistence.*;
import java.time.Instant;

/**
 * A student's attendance. The class comes from {@code qrCode.classRoom} and the day from
 * {@code qrCode.createdAt}, so no duplicated columns are stored here.
 */
@Entity
@Table(name = "attendance",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "qr_id"}))
public class Attendance {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "attendance_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "student_id", nullable = false)
    private Student student;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "qr_id", nullable = false)
    private QrCode qrCode;

    @Column(name = "scan_time", nullable = false)
    private Instant scanTime;

    public Attendance() {
    }

    public Attendance(Student student, QrCode qrCode, Instant scanTime) {
        this.student = student;
        this.qrCode = qrCode;
        this.scanTime = scanTime;
    }

    public Integer getId() { return id; }
    public Student getStudent() { return student; }
    public QrCode getQrCode() { return qrCode; }
    public Instant getScanTime() { return scanTime; }
}
