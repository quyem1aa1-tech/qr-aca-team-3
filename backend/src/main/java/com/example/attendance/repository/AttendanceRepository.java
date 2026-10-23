package com.example.attendance.repository;

import com.example.attendance.model.Attendance;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.List;

public interface AttendanceRepository extends JpaRepository<Attendance, Integer> {

    boolean existsByStudentIdAndQrCodeId(Integer studentId, Integer qrId);

    boolean existsByStudentIdAndQrCodeClassRoomIdAndQrCodeCreatedAtGreaterThanEqualAndQrCodeCreatedAtLessThan(
            Integer studentId, Integer classId, Instant from, Instant to);

    @Query("select a from Attendance a join fetch a.student join fetch a.qrCode q "
            + "where q.classRoom.id = :classId and q.createdAt >= :from and q.createdAt < :to "
            + "order by a.scanTime")
    List<Attendance> findForClassBetween(@Param("classId") Integer classId,
                                         @Param("from") Instant from, @Param("to") Instant to);

    @Query("select a from Attendance a where a.student.id = :studentId and a.qrCode.id = :qrId")
    List<Attendance> findByStudentAndQr(@Param("studentId") Integer studentId, @Param("qrId") Integer qrId);
}
