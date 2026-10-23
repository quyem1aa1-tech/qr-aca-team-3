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

    @Column(nullable = false, unique = true, length = 64)
    private String token;

    @Column(name = "pin_hash", nullable = false, length = 255)
    private String pinHash;

    @Column(name = "failed_attempts", nullable = false)
    private int failedAttempts = 0;

    @Column(name = "created_at", nullable = false)
    private Instant createdAt;

    @Column(name = "expires_at", nullable = false)
    private Instant expiresAt;

    public QrCode() {
    }

    public QrCode(ClassRoom classRoom, String token, String pinHash, Instant createdAt, Instant expiresAt) {
        this.classRoom = classRoom;
        this.token = token;
        this.pinHash = pinHash;
        this.createdAt = createdAt;
        this.expiresAt = expiresAt;
    }

    public Integer getId() { return id; }
    public ClassRoom getClassRoom() { return classRoom; }
    public String getToken() { return token; }
    public String getPinHash() { return pinHash; }
    public void setPinHash(String pinHash) { this.pinHash = pinHash; }
    public int getFailedAttempts() { return failedAttempts; }
    public void setFailedAttempts(int failedAttempts) { this.failedAttempts = failedAttempts; }
    public Instant getCreatedAt() { return createdAt; }
    public Instant getExpiresAt() { return expiresAt; }
}
