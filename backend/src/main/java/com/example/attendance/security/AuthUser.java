package com.example.attendance.security;

/** Identity of the authenticated teacher, always taken from the verified JWT. */
public record AuthUser(int teacherId, Role role) {
    public int userId() {
        return teacherId;
    }
}
