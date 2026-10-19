package com.example.attendance.dto;

public class CheckInRequest {
    private String fullName;
    private String studentId;
    private String email;

    public CheckInRequest() {
    }

    public CheckInRequest(String fullName, String studentId, String email) {
        this.fullName = fullName;
        this.studentId = studentId;
        this.email = email;
    }

    public String getFullName() {
        return fullName;
    }

    public void setFullName(String fullName) {
        this.fullName = fullName;
    }

    public String getStudentId() {
        return studentId;
    }

    public void setStudentId(String studentId) {
        this.studentId = studentId;
    }

    public String getEmail() {
        return email;
    }

    public void setEmail(String email) {
        this.email = email;
    }
}