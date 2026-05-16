package com.empathai.curriculum.exception;

import org.springframework.http.HttpStatus;

/**
 * Central application exception for Empathai Curriculum Service.
 * Thrown in place of generic RuntimeException or IOException throughout the service layer.
 */
public class EmpathaiException extends RuntimeException {

    private final HttpStatus status;

    /** Defaults to HTTP 400 Bad Request */
    public EmpathaiException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
    }

    /** Full constructor with explicit HTTP status */
    public EmpathaiException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    /** Wraps a lower-level cause */
    public EmpathaiException(String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
