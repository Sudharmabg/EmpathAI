package com.empathai.user.dto.auth;

import lombok.Data;

@Data
public class SetPasswordRequest {
    private String token;
    private String password;
    private String confirmPassword;
}