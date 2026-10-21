package com.example.attendance.security;

public enum Role {
    STUDENT, TEACHER;

    public static Role parse(String value) {
        if (value == null) return null;
        try {
            return Role.valueOf(value.trim().toUpperCase());
        } catch (IllegalArgumentException e) {
            return null;
        }
    }
}
