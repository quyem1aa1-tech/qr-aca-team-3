package com.example.attendance.repository;

import com.example.attendance.model.QrCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.time.Instant;
import java.util.Optional;

public interface QrCodeRepository extends JpaRepository<QrCode, Integer> {

    Optional<QrCode> findByToken(String token);

    @Query("select q from QrCode q where q.classRoom.id = :classId and q.expiresAt > :now "
            + "order by q.createdAt desc limit 1")
    Optional<QrCode> findActive(@Param("classId") Integer classId, @Param("now") Instant now);
}
