package com.example.attendance.repository;

import com.example.attendance.model.ClassRoom;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface ClassRepository extends JpaRepository<ClassRoom, Integer> {
    List<ClassRoom> findByTeacherId(Integer teacherId);
}
