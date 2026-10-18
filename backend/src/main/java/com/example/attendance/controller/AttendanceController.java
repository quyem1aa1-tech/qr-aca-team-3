package com.example.attendance.controller;

import com.example.attendance.dto.CheckInRequest;
import com.example.attendance.model.Attendance;
import com.example.attendance.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.HashMap;
import java.util.Map;

@RestControllermysql -u root -p123 -e "SELECT * FROM school_attendance.attendance;"

@RequestMapping("/api/attendance")
@CrossOrigin(origins = "*") // Cho phép Frontend React truy cập
public class AttendanceController {

    private final AttendanceService attendanceService;

    @Autowired
    public AttendanceController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/check-in")
    public ResponseEntity<Map<String, Object>> checkIn(@RequestBody CheckInRequest request) {
        Map<String, Object> response = new HashMap<>();

        try {
            // Gọi Service xử lý logic nghiệp vụ
            Attendance savedAttendance = attendanceService.checkIn(request);

            response.put("status", "SUCCESS");
            response.put("message", "Điểm danh thành công cho sinh viên: "
                    + savedAttendance.getFullName() + " (" + savedAttendance.getStudentId() + ")");
            response.put("data", savedAttendance);

            return ResponseEntity.ok(response); // Mã HTTP 200 OK

        } catch (IllegalArgumentException | IllegalStateException e) {
            // Bắt lỗi dữ liệu không hợp lệ hoặc lỗi đã điểm danh trước đó
            response.put("status", "ERROR");
            response.put("message", e.getMessage());

            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response); // Mã HTTP 400 Bad Request

        } catch (Exception e) {
            // Bắt các lỗi hệ thống phát sinh khác
            response.put("status", "ERROR");
            response.put("message", "Có lỗi xảy ra từ máy chủ: " + e.getMessage());

            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response); // Mã HTTP 500
        }
    }

}