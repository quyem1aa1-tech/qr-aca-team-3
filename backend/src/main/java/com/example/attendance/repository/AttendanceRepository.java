package com.example.attendance.repository;

import com.example.attendance.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {

    // Spring Data JPA sẽ tự động sinh câu truy vấn:
    // SELECT COUNT(*) > 0 FROM attendance WHERE student_id = ? AND check_in_time BETWEEN ? AND ?
    boolean existsByStudentIdAndCheckInTimeBetween(String studentId, LocalDateTime startTime, LocalDateTime endTime);
}