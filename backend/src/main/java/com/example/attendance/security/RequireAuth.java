package com.example.attendance.security;

import java.lang.annotation.*;

/** Requires a valid JWT with the given role. Can be placed on a controller class or method. */
@Target({ElementType.TYPE, ElementType.METHOD})
@Retention(RetentionPolicy.RUNTIME)
@Documented
public @interface RequireAuth {
    Role value();
}
