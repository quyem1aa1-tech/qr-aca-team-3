package com.example.attendance.service;

import com.example.attendance.dto.Dtos.LoginRequest;
import com.example.attendance.dto.Dtos.LoginResponse;
import com.example.attendance.exception.ApiException;
import com.example.attendance.model.Teacher;
import com.example.attendance.repository.TeacherRepository;
import com.example.attendance.security.AuthUser;
import com.example.attendance.security.JwtService;
import com.example.attendance.security.Role;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {

    private final TeacherRepository teachers;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(TeacherRepository teachers, PasswordEncoder encoder, JwtService jwt) {
        this.teachers = teachers;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    public LoginResponse login(LoginRequest req) {
        if (req == null || isBlank(req.email()) || isBlank(req.password())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "email and password are required");
        }
        String email = req.email().trim();

        Teacher teacher = teachers.findByEmailIgnoreCase(email).orElse(null);
        if (teacher == null || !encoder.matches(req.password(), teacher.getPasswordHash())) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        int teacherId = teacher.getId();
        String token = jwt.issue(new AuthUser(teacherId, Role.TEACHER));
        return new LoginResponse(token, "Bearer", jwt.ttlSeconds(), "teacher", teacherId, teacherId, teacher.getFullName());
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
