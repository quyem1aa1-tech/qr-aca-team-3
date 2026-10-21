package com.example.attendance.model;

import jakarta.persistence.*;
import java.time.Instant;

@Entity
@Table(name = "qr_code", indexes = @Index(name = "idx_qr_class_expiry", columnList = "class_id, expires_at"))
public class QrCode {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    @Column(name = "qr_id")
    private Integer id;

    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "class_id", nullable = false)
    private ClassRoom classRoom;

    @Column(nullable = false, unique = true, length = 128)
    private String token;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public QrCode() {
    }

    public QrCode(ClassRoom classRoom, String token, Instant createdAt, Instant expiresAt) {
        this.classRoom = classRoom;
        this.token = token;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public Integer getId() { return id; }
    public ClassRoom getClassRoom() { return classRoom; }
    public String getToken() { return token; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
}
