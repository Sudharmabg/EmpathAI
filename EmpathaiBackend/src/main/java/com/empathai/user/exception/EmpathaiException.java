package com.empathai.user.exception;

import lombok.Getter;

@Getter
public class EmpathaiException extends RuntimeException {
    private final String status;

    public EmpathaiException(String message) {
        super(message);
        this.status = "ERROR";
    }

    public EmpathaiException(String message, String status) {
        super(message);
        this.status = status;
    }
}
