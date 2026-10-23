package com.example.attendance.service;

import com.example.attendance.dto.Dtos.AttendanceRequest;
import com.example.attendance.dto.Dtos.AttendanceResponse;
import com.example.attendance.exception.ApiException;
import com.example.attendance.model.Attendance;
import com.example.attendance.model.QrCode;
import com.example.attendance.model.Student;
import com.example.attendance.repository.AttendanceRepository;
import com.example.attendance.repository.EnrollmentRepository;
import com.example.attendance.repository.QrCodeRepository;
import com.example.attendance.repository.StudentRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.time.Instant;

@Service
public class AttendanceService {

    private static final int MAX_FAILED_ATTEMPTS = 5;
    private static final String INVALID_CODE_OR_PIN = "Invalid code or PIN";

    private final QrCodeRepository qrCodes;
    private final EnrollmentRepository enrollments;
    private final AttendanceRepository attendances;
    private final StudentRepository students;
    private final PasswordEncoder encoder;

    public AttendanceService(QrCodeRepository qrCodes, EnrollmentRepository enrollments,
                             AttendanceRepository attendances, StudentRepository students,
                             PasswordEncoder encoder) {
        this.qrCodes = qrCodes;
        this.enrollments = enrollments;
        this.attendances = attendances;
        this.students = students;
        this.encoder = encoder;
    }

    public AttendanceResponse mark(AttendanceRequest req) {
        // 1. Find qr_code by token. If not found, return 404.
        String token = (req == null || req.token() == null) ? "" : req.token().trim();
        if (token.isEmpty()) {
            throw new ApiException(HttpStatus.NOT_FOUND, "QR code not found");
        }
        QrCode qr = qrCodes.findByToken(token)
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "QR code not found"));

        // 2. Check expires_at > NOW(). If expired, return 410.
        Instant now = Instant.now(); // server time only
        if (!qr.getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.GONE, "This QR has expired. Ask your teacher for a new one.");
        }

        // 3. Check the attempt limit for this token. If locked, return 429.
        if (qr.getFailedAttempts() >= MAX_FAILED_ATTEMPTS) {
            throw new ApiException(HttpStatus.TOO_MANY_REQUESTS, "Too many attempts. Ask your teacher for a new QR.");
        }

        // 4. Verify pin against pin_hash. If wrong, record a failed attempt and return 401 with "Invalid code or PIN".
        String pin = (req.pin() == null) ? "" : req.pin().trim();
        if (pin.isEmpty() || !encoder.matches(pin, qr.getPinHash())) {
            qrCodes.incrementFailedAttempts(qr.getId());
            throw new ApiException(HttpStatus.UNAUTHORIZED, INVALID_CODE_OR_PIN);
        }

        // 5. Find student by student_code. If not found, return 401 with the same message.
        String studentCode = (req.student_code() == null) ? "" : req.student_code().trim();
        if (studentCode.isEmpty()) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, INVALID_CODE_OR_PIN);
        }
        Student student = students.findByStudentCode(studentCode)
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, INVALID_CODE_OR_PIN));

        // 6. Check enrollment for (student_id, qr_code.class_id). If not enrolled, return 403.
        Integer classId = qr.getClassRoom().getId();
        if (!enrollments.existsByStudentIdAndClassRoomId(student.getId(), classId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not enrolled in this class");
        }

        // 7. Insert into attendance. If MySQL error 1062 (duplicate key), return 409 ("Already marked").
        try {
            Attendance saved = attendances.saveAndFlush(new Attendance(student, qr, now));
            // 8. Return { class_name, scan_time }.
            String className = qr.getClassRoom().getClassName();
            return new AttendanceResponse(className, className, saved.getScanTime(), saved.getScanTime());
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.CONFLICT, "Already marked");
        }
    }
}
