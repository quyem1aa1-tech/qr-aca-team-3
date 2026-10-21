package com.example.attendance.repository;

import com.example.attendance.model.Enrollment;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;

import java.util.List;

public interface EnrollmentRepository extends JpaRepository<Enrollment, Integer> {

    @Query("select e from Enrollment e join fetch e.classRoom where e.student.id = :studentId")
    List<Enrollment> findByStudentIdWithClass(@Param("studentId") Integer studentId);

    boolean existsByStudentIdAndClassRoomId(Integer studentId, Integer classId);
}
