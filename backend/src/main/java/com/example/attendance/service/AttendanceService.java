package com.example.attendance.service;

import com.example.attendance.dto.Dtos.AttendanceRequest;
import com.example.attendance.dto.Dtos.AttendanceResponse;
import com.example.attendance.exception.ApiException;
import com.example.attendance.model.Attendance;
import com.example.attendance.model.QrCode;
import com.example.attendance.repository.AttendanceRepository;
import com.example.attendance.repository.EnrollmentRepository;
import com.example.attendance.repository.QrCodeRepository;
import com.example.attendance.repository.StudentRepository;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
public class AttendanceService {

    private final QrCodeRepository qrCodes;
    private final EnrollmentRepository enrollments;
    private final AttendanceRepository attendances;
    private final StudentRepository students;

    public AttendanceService(QrCodeRepository qrCodes, EnrollmentRepository enrollments,
                             AttendanceRepository attendances, StudentRepository students) {
        this.qrCodes = qrCodes;
        this.enrollments = enrollments;
        this.attendances = attendances;
        this.students = students;
    }

    /** @param studentId always taken from the verified token, never from the request body. */
    @Transactional
    public AttendanceResponse mark(int studentId, AttendanceRequest req) {
        boolean hasToken = req != null && req.token() != null && !req.token().isBlank();
        if (req == null || (req.qr_id() == null && !hasToken)) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "qr_id or token is required");
        }

        QrCode qr = (hasToken ? qrCodes.findByToken(req.token().trim()) : qrCodes.findById(req.qr_id()))
                .orElseThrow(() -> new ApiException(HttpStatus.NOT_FOUND, "QR code not found"));

        Instant now = Instant.now(); // server time only
        if (!qr.getExpiresAt().isAfter(now)) {
            throw new ApiException(HttpStatus.GONE, "QR code has expired");
        }

        Integer classId = qr.getClassRoom().getId();
        if (!enrollments.existsByStudentIdAndClassRoomId(studentId, classId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "You are not enrolled in this class");
        }
        if (attendances.existsByStudentIdAndQrCodeId(studentId, qr.getId())) {
            throw new ApiException(HttpStatus.CONFLICT, "Attendance already marked");
        }

        try {
            Attendance saved = attendances.saveAndFlush(
                    new Attendance(students.getReferenceById(studentId), qr, now));
            return new AttendanceResponse("Attendance marked", classId,
                    qr.getClassRoom().getClassName(), saved.getScanTime());
        } catch (DataIntegrityViolationException e) {
            throw new ApiException(HttpStatus.CONFLICT, "Attendance already marked");
        }
    }
}
