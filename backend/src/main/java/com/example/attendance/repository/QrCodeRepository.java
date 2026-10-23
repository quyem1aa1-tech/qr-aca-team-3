package com.example.attendance.repository;

import com.example.attendance.model.QrCode;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;
import java.util.Optional;

public interface QrCodeRepository extends JpaRepository<QrCode, Integer> {

    @Query("select q from QrCode q join fetch q.classRoom where q.token = :token")
    Optional<QrCode> findByToken(@Param("token") String token);

    @Transactional
    @Modifying
    @Query("update QrCode q set q.failedAttempts = q.failedAttempts + 1 where q.id = :qrId")
    void incrementFailedAttempts(@Param("qrId") Integer qrId);

    @Query("select q from QrCode q where q.classRoom.id = :classId and q.expiresAt > :now "
            + "order by q.createdAt desc limit 1")
    Optional<QrCode> findActive(@Param("classId") Integer classId, @Param("now") Instant now);
}
