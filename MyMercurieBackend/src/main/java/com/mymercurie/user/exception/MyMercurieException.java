package com.mymercurie.user.exception;

import lombok.Getter;

@Getter
public class MyMercurieException extends RuntimeException {
    private final String status;

    public MyMercurieException(String message) {
        super(message);
        this.status = "ERROR";
    }

    public MyMercurieException(String message, String status) {
        super(message);
        this.status = status;
    }
}
