package com.example.attendance.dto;

import java.time.Instant;

public final class Dtos {
    private Dtos() {
    }

    public record LoginRequest(String email, String password, String role) {
    }

    public record LoginResponse(String token, String tokenType, long expiresInSeconds, String role,
                                int userId, String fullName) {
    }

    public record ClassResponse(int classId, String className, String room) {
    }

    public record QrResponse(int qrId, String token, Instant createdAt, Instant expiresAt) {
    }

    /** Active QR for a student, including whether they already attended with it. */
    public record StudentQrResponse(int qrId, String token, Instant createdAt, Instant expiresAt,
                                    boolean attended, Instant attendedAt) {
    }

    public record AttendanceRequest(Integer qr_id, String token) {
    }

    public record AttendanceResponse(String message, int classId, String className, Instant scanTime) {
    }

    public record AttendanceRecord(int attendanceId, int studentId, String studentCode, String fullName,
                                   String email, int qrId, Instant scanTime) {
    }
}
