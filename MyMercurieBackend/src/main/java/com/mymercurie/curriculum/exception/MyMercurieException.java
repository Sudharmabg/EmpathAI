package com.mymercurie.curriculum.exception;

import org.springframework.http.HttpStatus;

/**
 * Central application exception for MyMercurie Curriculum Service.
 * Thrown in place of generic RuntimeException or IOException throughout the service layer.
 */
public class MyMercurieException extends RuntimeException {

    private final HttpStatus status;

    /** Defaults to HTTP 400 Bad Request */
    public MyMercurieException(String message) {
        super(message);
        this.status = HttpStatus.BAD_REQUEST;
    }

    /** Full constructor with explicit HTTP status */
    public MyMercurieException(String message, HttpStatus status) {
        super(message);
        this.status = status;
    }

    /** Wraps a lower-level cause */
    public MyMercurieException(String message, HttpStatus status, Throwable cause) {
        super(message, cause);
        this.status = status;
    }

    public HttpStatus getStatus() {
        return status;
    }
}
