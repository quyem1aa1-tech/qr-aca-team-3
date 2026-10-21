package com.example.attendance.security;

import com.example.attendance.exception.ApiException;
import jakarta.servlet.http.HttpServletRequest;
import jakarta.servlet.http.HttpServletResponse;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Component;
import org.springframework.web.method.HandlerMethod;
import org.springframework.web.servlet.HandlerInterceptor;

/** Implements {@code requireAuth(role)}: validates the bearer token and the required role. */
@Component
public class AuthInterceptor implements HandlerInterceptor {

    public static final String ATTR = "authUser";

    private final JwtService jwtService;

    public AuthInterceptor(JwtService jwtService) {
        this.jwtService = jwtService;
    }

    @Override
    public boolean preHandle(HttpServletRequest request, HttpServletResponse response, Object handler) {
        if (!(handler instanceof HandlerMethod hm)) return true;

        RequireAuth required = hm.getMethodAnnotation(RequireAuth.class);
        if (required == null) required = hm.getBeanType().getAnnotation(RequireAuth.class);
        if (required == null) return true;

        String header = request.getHeader("Authorization");
        if (header == null || !header.regionMatches(true, 0, "Bearer ", 0, 7)) {
            throw new ApiException(HttpStatus.UNAUTHORIZED, "Missing or invalid token");
        }
        AuthUser user = jwtService.verify(header.substring(7).trim())
                .orElseThrow(() -> new ApiException(HttpStatus.UNAUTHORIZED, "Missing or invalid token"));
        if (user.role() != required.value()) {
            throw new ApiException(HttpStatus.FORBIDDEN, "Role not allowed for this resource");
        }
        request.setAttribute(ATTR, user);
        return true;
    }
}
