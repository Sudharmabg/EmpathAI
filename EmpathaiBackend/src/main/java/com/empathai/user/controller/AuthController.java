package com.empathai.user.controller;

import com.empathai.user.dto.auth.AuthResponse;
import com.empathai.user.dto.auth.LoginRequest;
import com.empathai.user.dto.auth.SetPasswordRequest;
import com.empathai.user.service.AuthService;
import jakarta.servlet.http.Cookie;
import jakarta.servlet.http.HttpServletResponse;
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

    // ── JWT cookie settings ───────────────────────────────────────────────────
    private static final String COOKIE_NAME    = "jwt";
    private static final int    COOKIE_MAX_AGE = 60 * 60; // 1 hour — matches jwt.expiration-ms

    @PostMapping("/login")
    public ResponseEntity<AuthResponse> login(
            @RequestBody LoginRequest request,
            HttpServletResponse response) {

        logger.info("login started");
        try {
            AuthResponse authResponse = authService.login(request);

            // ── Set the JWT as an HttpOnly, Secure, SameSite=Strict cookie ──
            Cookie jwtCookie = new Cookie(COOKIE_NAME, authResponse.getToken());
            jwtCookie.setHttpOnly(true);          // JS cannot read this cookie
            jwtCookie.setSecure(true);            // only sent over HTTPS
            jwtCookie.setPath("/");               // sent with every request
            jwtCookie.setMaxAge(COOKIE_MAX_AGE);  // 1 hour
            // SameSite=Strict — cookie is NOT sent on cross-site requests (CSRF protection)
            response.addHeader("Set-Cookie",
                    String.format("%s=%s; Path=/; Max-Age=%d; HttpOnly; Secure; SameSite=Strict",
                            COOKIE_NAME, authResponse.getToken(), COOKIE_MAX_AGE));

            // ── Strip the raw token from the JSON body before returning ──────
            // The frontend only needs the user object; the cookie carries the JWT.
            AuthResponse safeResponse = AuthResponse.builder()
                    .token(null)          // do NOT expose the token in the response body
                    .user(authResponse.getUser())
                    .build();

            logger.info("login completed successfully");
            return ResponseEntity.ok(safeResponse);

        } catch (Exception e) {
            logger.error("login failed: " + e.getMessage(), e);
            throw e;
        }
    }

    // ── Logout: clear the JWT cookie ─────────────────────────────────────────
    @PostMapping("/logout")
    public ResponseEntity<Map<String, String>> logout(HttpServletResponse response) {
        // Overwrite the cookie with an empty value and Max-Age=0 to delete it
        response.addHeader("Set-Cookie",
                String.format("%s=; Path=/; Max-Age=0; HttpOnly; Secure; SameSite=Strict",
                        COOKIE_NAME));
        return ResponseEntity.ok(Map.of("message", "Logged out successfully"));
    }

    // ── Validate one-time setup token from email invite link ─────────────────
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

    // ── Student submits their new password ────────────────────────────────────
    @PostMapping("/set-password")
    public ResponseEntity<Map<String, String>> setPassword(@RequestBody SetPasswordRequest request) {
        logger.info("setPassword started");
        try {
            authService.setPassword(request);
            ResponseEntity<Map<String, String>> response = ResponseEntity.ok(
                    Map.of("message", "Password set successfully. You can now log in."));
            logger.info("setPassword completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("setPassword failed: " + e.getMessage(), e);
            throw e;
        }
    }
}