package com.example.attendance.controller;

import com.example.attendance.dto.Dtos.*;
import com.example.attendance.exception.ApiException;
import com.example.attendance.service.AttendanceService;
import jakarta.servlet.http.HttpServletRequest;
import org.springframework.http.HttpStatus;
import org.springframework.web.bind.annotation.*;

import java.util.Deque;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.ConcurrentLinkedDeque;

@RestController
public class StudentController {

    private static final int IP_LIMIT_PER_MINUTE = 20;
    private static final long ONE_MINUTE_MS = 60_000L;

    private final AttendanceService attendanceService;
    private final Map<String, Deque<Long>> ipHits = new ConcurrentHashMap<>();

    public StudentController(AttendanceService attendanceService) {
        this.attendanceService = attendanceService;
    }

    @PostMapping("/attendance")
    public AttendanceResponse attend(@RequestBody(required = false) AttendanceRequest request,
                                     HttpServletRequest httpRequest) {
        checkIpRateLimit(httpRequest.getRemoteAddr());
        return attendanceService.mark(request);
    }

    private void checkIpRateLimit(String ip) {
        if (ip == null) return;
        long now = System.currentTimeMillis();
        Deque<Long> timestamps = ipHits.computeIfAbsent(ip, k -> new ConcurrentLinkedDeque<>());
        synchronized (timestamps) {
            while (!timestamps.isEmpty() && now - timestamps.peekFirst() > ONE_MINUTE_MS) {
                timestamps.pollFirst();
            }
            if (timestamps.size() >= IP_LIMIT_PER_MINUTE) {
                throw new ApiException(HttpStatus.TOO_MANY_REQUESTS,
                        "Too many attempts. Ask your teacher for a new QR.");
            }
            timestamps.addLast(now);
        }
    }
}
