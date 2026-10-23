package com.example.attendance.dto;

import java.time.Instant;

public final class Dtos {
    private Dtos() {
    }

    public record LoginRequest(String email, String password) {
    }

    public record LoginResponse(String token, String tokenType, long expiresInSeconds, String role,
                                int teacherId, int userId, String fullName) {
    }

    public record ClassResponse(int classId, int class_id, String className, String class_name, String room) {
        public ClassResponse(int classId, String className, String room) {
            this(classId, classId, className, className, room);
        }
    }

    /** Returned ONLY on POST /classes/:classId/qr (includes one-time plain PIN). */
    public record QrCreatedResponse(int qr_id, int qrId, String token, String pin,
                                    Instant created_at, Instant createdAt,
                                    Instant expires_at, Instant expiresAt) {
    }

    /** Returned on GET /classes/:classId/qr/active (never includes pin or pin_hash). */
    public record QrResponse(int qr_id, int qrId, String token,
                             Instant created_at, Instant createdAt,
                             Instant expires_at, Instant expiresAt) {
    }

    public record AttendanceRequest(String token, String student_code, String pin) {
    }

    public record AttendanceResponse(String class_name, String className, Instant scan_time, Instant scanTime) {
    }

    public record AttendanceRecord(int attendanceId, int studentId, String studentCode, String fullName,
                                   String email, int qrId, Instant scanTime) {
    }
}
