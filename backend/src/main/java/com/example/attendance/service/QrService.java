package com.example.attendance.service;

import com.example.attendance.dto.Dtos.*;
import com.example.attendance.exception.ApiException;
import com.example.attendance.model.ClassRoom;
import com.example.attendance.model.QrCode;
import com.example.attendance.repository.*;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.time.LocalDate;
import java.time.ZoneOffset;
import java.util.HexFormat;
import java.util.List;
import java.util.Optional;

@Service
public class QrService {

    private static final SecureRandom RANDOM = new SecureRandom();

    private final ClassRepository classes;
    private final QrCodeRepository qrCodes;
    private final AttendanceRepository attendances;
    private final PasswordEncoder encoder;
    private final Duration qrLifetime;

    public QrService(ClassRepository classes, QrCodeRepository qrCodes,
                     AttendanceRepository attendances, PasswordEncoder encoder,
                     @Value("${app.qr.expiration-minutes}") long qrMinutes) {
        this.classes = classes;
        this.qrCodes = qrCodes;
        this.attendances = attendances;
        this.encoder = encoder;
        this.qrLifetime = Duration.ofMinutes(qrMinutes);
    }

    @Transactional(readOnly = true)
    public List<ClassResponse> teacherClasses(int teacherId) {
        return classes.findByTeacherId(teacherId).stream().map(QrService::toDto).toList();
    }

    @Transactional
    public QrCreatedResponse createQr(int teacherId, int classId) {
        ClassRoom cls = ownedClass(teacherId, classId);
        byte[] bytes = new byte[32];
        RANDOM.nextBytes(bytes);
        String token = HexFormat.of().formatHex(bytes);
        String pin = String.format("%04d", RANDOM.nextInt(10000));
        String pinHash = encoder.encode(pin);

        Instant now = Instant.now();
        Instant expiresAt = now.plus(qrLifetime);
        QrCode qr = qrCodes.save(new QrCode(cls, token, pinHash, now, expiresAt));
        return new QrCreatedResponse(
                qr.getId(), qr.getId(), qr.getToken(), pin,
                qr.getCreatedAt(), qr.getCreatedAt(), qr.getExpiresAt(), qr.getExpiresAt()
        );
    }

    @Transactional(readOnly = true)
    public Optional<QrResponse> activeQrForTeacher(int teacherId, int classId) {
        ownedClass(teacherId, classId);
        return qrCodes.findActive(classId, Instant.now()).map(QrService::toDto);
    }

    /** Attendance list for a class on a day (UTC), based on the QR creation date. */
    @Transactional(readOnly = true)
    public List<AttendanceRecord> attendanceForClass(int teacherId, int classId, LocalDate date) {
        ownedClass(teacherId, classId);
        LocalDate day = date != null ? date : LocalDate.now(ZoneOffset.UTC);
        Instant from = day.atStartOfDay(ZoneOffset.UTC).toInstant();
        Instant to = day.plusDays(1).atStartOfDay(ZoneOffset.UTC).toInstant();
        return attendances.findForClassBetween(classId, from, to).stream()
                .map(a -> new AttendanceRecord(a.getId(), a.getStudent().getId(),
                        a.getStudent().getStudentCode(), a.getStudent().getFullName(),
                        a.getStudent().getEmail(), a.getQrCode().getId(), a.getScanTime()))
                .toList();
    }

    private ClassRoom ownedClass(int teacherId, int classId) {
        ClassRoom cls = classes.findById(classId).orElse(null);
        if (cls == null || !cls.getTeacher().getId().equals(teacherId)) {
            throw new ApiException(HttpStatus.FORBIDDEN, "This class does not belong to you");
        }
        return cls;
    }

    private static ClassResponse toDto(ClassRoom c) {
        return new ClassResponse(c.getId(), c.getClassName(), c.getRoom());
    }

    private static QrResponse toDto(QrCode q) {
        return new QrResponse(
                q.getId(), q.getId(), q.getToken(),
                q.getCreatedAt(), q.getCreatedAt(), q.getExpiresAt(), q.getExpiresAt()
        );
    }
}
