package com.empathai.curriculum.exception;

import jakarta.validation.ConstraintViolationException;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.validation.FieldError;
import org.springframework.web.bind.MethodArgumentNotValidException;
import org.springframework.web.bind.annotation.ExceptionHandler;
import org.springframework.web.bind.annotation.RestControllerAdvice;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.Map;
import java.util.stream.Collectors;

@RestControllerAdvice(basePackages = "com.empathai.curriculum")
public class EmpathaiExceptionHandler {

    // ── EmpathaiException (main application exception) ──────────────────────

    @ExceptionHandler(EmpathaiException.class)
    public ResponseEntity<Map<String, Object>> handleEmpathaiException(EmpathaiException ex) {
        return buildError(ex.getStatus(), ex.getMessage());
    }

    // ── Validation errors from @RequestBody + @Valid ─────────────────────────

    @ExceptionHandler(MethodArgumentNotValidException.class)
    public ResponseEntity<Map<String, Object>> handleValidation(MethodArgumentNotValidException ex) {
        String details = ex.getBindingResult()
                .getFieldErrors()
                .stream()
                .map(FieldError::getDefaultMessage)
                .collect(Collectors.joining("; "));
        return buildError(HttpStatus.UNPROCESSABLE_ENTITY, "Validation failed: " + details);
    }

    // ── Validation errors from @Validated + @RequestParam constraints ─────────

    @ExceptionHandler(ConstraintViolationException.class)
    public ResponseEntity<Map<String, Object>> handleConstraintViolation(ConstraintViolationException ex) {
        String details = ex.getConstraintViolations()
                .stream()
                .map(v -> v.getMessage())
                .collect(Collectors.joining("; "));
        return buildError(HttpStatus.UNPROCESSABLE_ENTITY, "Validation failed: " + details);
    }

    // ── Fallback ────────────────────────────────────────────────────────────

    @ExceptionHandler(Exception.class)
    public ResponseEntity<Map<String, Object>> handleGeneric(Exception ex) {
        return buildError(HttpStatus.INTERNAL_SERVER_ERROR,
                "An unexpected error occurred: " + ex.getMessage());
    }

    // ── Helper ──────────────────────────────────────────────────────────────

    private ResponseEntity<Map<String, Object>> buildError(HttpStatus status, String message) {
        Map<String, Object> body = new HashMap<>();
        body.put("timestamp", LocalDateTime.now().toString());
        body.put("status", status.value());
        body.put("error", status.getReasonPhrase());
        body.put("message", message);
        return ResponseEntity.status(status).body(body);
    }
}