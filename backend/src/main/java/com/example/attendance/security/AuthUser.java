package com.example.attendance.security;

/** Identity of the caller, always taken from the verified JWT. */
public record AuthUser(int userId, Role role) {
}
