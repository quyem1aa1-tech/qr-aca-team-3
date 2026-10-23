package com.example.backend.repository;

import com.example.backend.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AttendanceRepository extends JpaRepository<Attendance, Long> {
    
    @Query(value = "SELECT * FROM attendance WHERE student_id = :studentId AND DATE(timestamp) = CURDATE() LIMIT 1", nativeQuery = true)
    Optional<Attendance> findTodayAttendance(@Param("studentId") String studentId);
}
