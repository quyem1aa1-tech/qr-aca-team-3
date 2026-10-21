package com.example.attendance.service;

import com.example.attendance.dto.Dtos.LoginRequest;
import com.example.attendance.dto.Dtos.LoginResponse;
import com.example.attendance.exception.ApiException;
import com.example.attendance.model.Student;
import com.example.attendance.model.Teacher;
import com.example.attendance.repository.StudentRepository;
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
    private final StudentRepository students;
    private final PasswordEncoder encoder;
    private final JwtService jwt;

    public AuthService(TeacherRepository teachers, StudentRepository students,
                       PasswordEncoder encoder, JwtService jwt) {
        this.teachers = teachers;
        this.students = students;
        this.encoder = encoder;
        this.jwt = jwt;
    }

    public LoginResponse login(LoginRequest req) {
        if (req == null || isBlank(req.email()) || isBlank(req.password())) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "email, password and role are required");
        }
        Role role = Role.parse(req.role());
        if (role == null) {
            throw new ApiException(HttpStatus.BAD_REQUEST, "role must be 'student' or 'teacher'");
        }
        String email = req.email().trim();

        int id;
        String hash;
        String name;
        if (role == Role.TEACHER) {
            Teacher t = teachers.findByEmailIgnoreCase(email).orElse(null);
            id = t == null ? 0 : t.getId();
            hash = t == null ? null : t.getPasswordHash();
            name = t == null ? null : t.getFullName();
        } else {
            Student s = students.findByEmailIgnoreCase(email).orElse(null);
            id = s == null ? 0 : s.getId();
            hash = s == null ? null : s.getPasswordHash();
            name = s == null ? null : s.getFullName();
        }
        if (hash == null || !encoder.matches(req.password(), hash)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        String token = jwt.issue(new AuthUser(id, role));
        return new LoginResponse(token, "Bearer", jwt.ttlSeconds(), role.name().toLowerCase(), id, name);
    }

    private static boolean isBlank(String s) {
        return s == null || s.isBlank();
    }
}
