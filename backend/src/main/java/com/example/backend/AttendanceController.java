package com.example.backend.controller;

import com.example.backend.dto.AttendanceRequest;
import com.example.backend.model.Attendance;
import com.example.backend.service.AttendanceService;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/attendance")
@CrossOrigin(origins = "http://localhost:5173")
public class AttendanceController {

    @Autowired
    private AttendanceService attendanceService;

    @PostMapping
    public ResponseEntity<Map<String, Object>> checkIn(@RequestBody AttendanceRequest request) {
        Map<String, Object> response = new HashMap<>();
        try {
            attendanceService.processCheckIn(request);
            response.put("success", true);
            response.put("message", "Điểm danh thành công!");
            return ResponseEntity.ok(response);
        } catch (IllegalStateException e) {
            response.put("success", false);
            response.put("message", e.getMessage());
            return ResponseEntity.status(HttpStatus.BAD_REQUEST).body(response);
        } catch (Exception e) {
            response.put("success", false);
            response.put("message", "Lỗi hệ thống bất ngờ.");
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).body(response);
        }
    }

    @GetMapping
    public ResponseEntity<List<Attendance>> getHistoryList() {
        return ResponseEntity.ok(attendanceService.getAllRecords());
    }
}
