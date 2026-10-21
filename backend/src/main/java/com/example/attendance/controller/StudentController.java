package com.example.attendance.controller;

import com.example.attendance.dto.Dtos.*;
import com.example.attendance.security.AuthUser;
import com.example.attendance.security.RequireAuth;
import com.example.attendance.security.Role;
import com.example.attendance.service.AttendanceService;
import com.example.attendance.service.QrService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequireAuth(Role.STUDENT)
public class StudentController {

    private final QrService qrService;
    private final AttendanceService attendanceService;

    public StudentController(QrService qrService, AttendanceService attendanceService) {
        this.qrService = qrService;
        this.attendanceService = attendanceService;
    }

    @GetMapping("/student/classes")
    public List<ClassResponse> classes(AuthUser user) {
        return qrService.studentClasses(user.userId());
    }

    /** 204 No Content when the class has no active QR. */
    @GetMapping("/student/classes/{classId}/qr/active")
    public ResponseEntity<StudentQrResponse> activeQr(AuthUser user, @PathVariable int classId) {
        return qrService.activeQrForStudent(user.userId(), classId)
                .map(ResponseEntity::ok)
                .orElseGet(() -> ResponseEntity.noContent().build());
    }

    @PostMapping("/attendance")
    public AttendanceResponse attend(AuthUser user, @RequestBody AttendanceRequest request) {
        return attendanceService.mark(user.userId(), request);
    }
}
