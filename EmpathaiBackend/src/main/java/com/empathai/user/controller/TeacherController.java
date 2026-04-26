package com.empathai.user.controller;

import com.empathai.user.dto.teacher.TeacherRequest;
import com.empathai.user.dto.teacher.TeacherResponse;
import com.empathai.user.service.TeacherService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/teachers")
@RequiredArgsConstructor
@PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SCHOOL_ADMIN')")
public class TeacherController {

    private static final Logger logger = LoggerFactory.getLogger(TeacherController.class);

    private final TeacherService teacherService;

    @GetMapping
    public ResponseEntity<Page<TeacherResponse>> getTeachers(
            @RequestParam(required = false) String school,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        logger.info("getTeachers started");
        try {
            ResponseEntity<Page<TeacherResponse>> response = ResponseEntity.ok(teacherService.getTeacherPage(school, search, page, size));
            logger.info("getTeachers completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getTeachers failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<TeacherResponse> getTeacherById(@PathVariable Long id) {
        logger.info("getTeacherById started for id={}", id);
        try {
            ResponseEntity<TeacherResponse> response = ResponseEntity.ok(teacherService.getTeacherById(id));
            logger.info("getTeacherById completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("getTeacherById failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping
    public ResponseEntity<TeacherResponse> createTeacher(@Valid @RequestBody TeacherRequest request) {
        logger.info("createTeacher started");
        try {
            ResponseEntity<TeacherResponse> response = new ResponseEntity<>(teacherService.createTeacher(request), HttpStatus.CREATED);
            logger.info("createTeacher completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("createTeacher failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<TeacherResponse> updateTeacher(
            @PathVariable Long id,
            @RequestBody TeacherRequest request) {
        logger.info("updateTeacher started for id={}", id);
        try {
            ResponseEntity<TeacherResponse> response = ResponseEntity.ok(teacherService.updateTeacher(id, request));
            logger.info("updateTeacher completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("updateTeacher failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteTeacher(@PathVariable Long id) {
        logger.info("deleteTeacher started for id={}", id);
        try {
            teacherService.deleteTeacher(id);
            ResponseEntity<Void> response = ResponseEntity.noContent().build();
            logger.info("deleteTeacher completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("deleteTeacher failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * Dedicated reset-password — does NOT reuse updateTeacher so fields are never blanked.
     */
    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@PathVariable Long id) {
        logger.info("resetPassword started for id={}", id);
        try {
            String newPassword = generateTempPassword();
            teacherService.resetPassword(id, newPassword);
            ResponseEntity<Map<String, String>> response = ResponseEntity.ok(Map.of("newPassword", newPassword));
            logger.info("resetPassword completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("resetPassword failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    private String generateTempPassword() {
        String chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
        StringBuilder sb = new StringBuilder();
        Random random = new Random();
        for (int i = 0; i < 12; i++) sb.append(chars.charAt(random.nextInt(chars.length())));
        return sb.toString();
    }
}