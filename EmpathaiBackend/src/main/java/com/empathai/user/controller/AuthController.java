package com.empathai.user.controller;

import com.empathai.user.dto.auth.AuthResponse;
import com.empathai.user.dto.auth.LoginRequest;
import com.empathai.user.dto.auth.SetPasswordRequest;
import com.empathai.user.service.AuthService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.Map;

@RestController
@RequestMapping("/api/auth")
@RequiredArgsConstructor
public class AuthController {

    private final AuthService authService;
    private static final Logger logger = LoggerFactory.getLogger(AuthController.class);

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(@RequestBody LoginRequest request) {
        logger.info("login started");
        try {
            ResponseEntity<AuthResponse> response = ResponseEntity.ok(authService.login(request));
            logger.info("login completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("login failed: " + e.getMessage(), e);
            throw e;
        }
    }

    // Validates the token from the email link before showing the form
    @GetMapping("/validate-token")
    public ResponseEntity<Map<String, Object>> validateToken(@RequestParam String token) {
        logger.info("validateToken started");
        try {
            Map<String, Object> result = authService.validateSetupToken(token);
            ResponseEntity<Map<String, Object>> response = ResponseEntity.ok(result);
            logger.info("validateToken completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("validateToken failed: " + e.getMessage(), e);
            throw e;
        }
    }

    // Student submits their new password
    @PostMapping("/set-password")
    public ResponseEntity<Map<String, String>> setPassword(@RequestBody SetPasswordRequest request) {
        logger.info("setPassword started");
        try {
            authService.setPassword(request);
            ResponseEntity<Map<String, String>> response = ResponseEntity.ok(Map.of("message", "Password set successfully. You can now log in."));
            logger.info("setPassword completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("setPassword failed: " + e.getMessage(), e);
            throw e;
        }
    }
}