package com.example.attendance.controller;

import com.example.attendance.dto.Dtos.*;
import com.example.attendance.security.AuthUser;
import com.example.attendance.security.RequireAuth;
import com.example.attendance.security.Role;
import com.example.attendance.service.QrService;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
@RequireAuth(Role.TEACHER)
public class TeacherController {

    private final QrService qrService;

    public TeacherController(QrService qrService) {
        this.qrService = qrService;
    }

    @GetMapping("/teacher/classes")
    public List<ClassResponse> classes(AuthUser user) {
        return qrService.teacherClasses(user.userId());
    }

    @PostMapping("/classes/{classId}/qr")
    public ResponseEntity<QrResponse> createQr(AuthUser user, @PathVariable int classId) {
        return ResponseEntity.status(HttpStatus.CREATED).body(qrService.createQr(user.userId(), classId));
    }

    @GetMapping("/classes/{classId}/qr/active")
    public ResponseEntity<QrResponse> activeQr(AuthUser user, @PathVariable int classId) {
        return qrService.activeQrForTeacher(user.userId(), classId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @GetMapping("/classes/{classId}/attendance")
    public List<AttendanceRecord> attendance(
            AuthUser user, @PathVariable int classId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate date) {
        return qrService.attendanceForClass(user.userId(), classId, date);
    }
}
