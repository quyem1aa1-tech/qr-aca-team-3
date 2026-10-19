package com.example.attendance.service;

import com.example.attendance.dto.CheckInRequest;
import com.example.attendance.model.Attendance;
import com.example.attendance.repository.AttendanceRepository;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.stereotype.Service;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.LocalTime;

@Service
public class AttendanceService {

    private final AttendanceRepository repository;

    @Autowired
    public AttendanceService(AttendanceRepository repository) {
        this.repository = repository;
    }

    public Attendance checkIn(CheckInRequest request) {
        // 1. Kiểm tra dữ liệu đầu vào (Validation)
        if (request.getStudentId() == null || request.getStudentId().trim().isEmpty()) {
            throw new IllegalArgumentException("Mã số sinh viên không được để trống!");
        }
        if (request.getFullName() == null || request.getFullName().trim().isEmpty()) {
            throw new IllegalArgumentException("Họ và tên không được để trống!");
        }
        if (request.getEmail() == null || !request.getEmail().matches("^[A-Za-z0-9+_.-]+@(.+)$")) {
            throw new IllegalArgumentException("Email không đúng định dạng!");
        }

        // Chuẩn hóa dữ liệu sạch sẽ
        String cleanStudentId = request.getStudentId().trim().toUpperCase();
        String cleanFullName = request.getFullName().trim();
        String cleanEmail = request.getEmail().trim().toLowerCase();

        // 2. Chặn điểm danh trùng trong ngày (từ 00:00:00 đến 23:59:59 của ngày hôm
        // nay)
        LocalDateTime startOfDay = LocalDate.now().atStartOfDay();
        LocalDateTime endOfDay = LocalDate.now().atTime(LocalTime.MAX);

        boolean isAlreadyCheckedIn = repository.existsByStudentIdAndCheckInTimeBetween(
                cleanStudentId, startOfDay, endOfDay);

        if (isAlreadyCheckedIn) {
            throw new IllegalStateException("Sinh viên " + cleanStudentId + " đã điểm danh hôm nay rồi!");
        }

        // 3. Logic phân loại: Đúng giờ hay Đi muộn (Ví dụ mốc quy định: sau 07:30 là
        // muộn)
        LocalDateTime now = LocalDateTime.now();
        LocalTime deadline = LocalTime.of(7, 30);
        String status = now.toLocalTime().isAfter(deadline) ? "LATE" : "ON_TIME";

        // 4. Đóng gói đối tượng Entity và lưu vào MySQL
        Attendance attendance = new Attendance(
                cleanStudentId,
                cleanFullName,
                cleanEmail,
                now,
                status);

        return repository.save(attendance);
    }
}