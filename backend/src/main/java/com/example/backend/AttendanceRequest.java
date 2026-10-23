package com.example.backend.dto;

import com.fasterxml.jackson.annotation.JsonProperty;
import lombok.Data;

@Data
public class AttendanceRequest {
    private String studentId;

    @JsonProperty("fullName")
    private String name; 
    
    private String email;
}