package com.example.backend.service;

import com.example.backend.dto.AttendanceRequest;
import com.example.backend.model.Attendance;
import com.example.backend.repository.AttendanceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;
import java.time.LocalDateTime;
import java.time.LocalTime;
import java.util.List;

@Service
public class AttendanceService {

    @Autowired
    private AttendanceRepository attendanceRepository;

    public Attendance processCheckIn(AttendanceRequest request) {
        if (attendanceRepository.findTodayAttendance(request.getStudentId()).isPresent()) {
            throw new IllegalStateException("Hôm nay bạn đã điểm danh rồi!");
        }

        Attendance record = new Attendance();
        record.setStudentId(request.getStudentId());
        record.setName(request.getName());
        record.setEmail(request.getEmail());

        LocalDateTime now = LocalDateTime.now();
        record.setTimestamp(now);

        LocalTime cutoffTime = LocalTime.of(7, 30);
        if (now.toLocalTime().isBefore(cutoffTime) || now.toLocalTime().equals(cutoffTime)) {
            record.setStatus("ON_TIME");
        } else {
            record.setStatus("LATE");
        }

        return attendanceRepository.save(record);
    }

    public List<Attendance> getAllRecords() {
        return attendanceRepository.findAll();
    }
}
