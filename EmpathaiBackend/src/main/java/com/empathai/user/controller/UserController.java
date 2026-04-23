package com.empathai.user.controller;

import com.empathai.user.dto.user.*;
import com.empathai.user.entity.enums.UserRole;
import com.empathai.user.service.UserService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;

import java.util.List;
import java.util.Map;
import java.util.Random;

@RestController
@RequestMapping("/api/users")
@RequiredArgsConstructor
public class UserController {

    private final UserService userService;
    private static final Logger logger = LoggerFactory.getLogger(UserController.class);


    @PostMapping
    public ResponseEntity<UserResponse> createUser(@Valid @RequestBody UserRequest request) {
        logger.info("createUser started");
        try {
            ResponseEntity<UserResponse> response = new ResponseEntity<>(userService.createUser(request), HttpStatus.CREATED);
            logger.info("createUser completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("createUser failed: " + e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping
    public ResponseEntity<List<UserResponse>> getAllUsers() {
        logger.info("getAllUsers started");
        try {
            ResponseEntity<List<UserResponse>> response = ResponseEntity.ok(userService.getAllUsers());
            logger.info("getAllUsers completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getAllUsers failed: " + e.getMessage(), e);
            throw e;
        }
    }



    @GetMapping("/me")
    public ResponseEntity<UserResponse> getCurrentUser() {
        logger.info("getCurrentUser started");
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            String principal = auth.getName();
            ResponseEntity<UserResponse> response = ResponseEntity.ok(
                    userService.getAllUsers().stream()
                            .filter(u -> principal.equals(u.getEmail()) || principal.equals(u.getUsername()))
                            .findFirst()
                            .orElseThrow(() -> new RuntimeException("User not found"))
            );
            logger.info("getCurrentUser completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getCurrentUser failed: " + e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/students")
    public ResponseEntity<Page<UserResponse>> getStudents(
            @RequestParam(required = false) String school,
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        logger.info("getStudents started");
        try {
            List<UserResponse> all = userService.getUsersByRole(UserRole.STUDENT);
            List<UserResponse> filtered = all.stream()
                    .filter(u -> school == null || school.equals(u.getSchool()))
                    .filter(u -> search == null ||
                            (u.getName() != null && u.getName().toLowerCase().contains(search.toLowerCase())) ||
                            (u.getEmail() != null && u.getEmail().toLowerCase().contains(search.toLowerCase())))
                    .toList();
            int start = Math.min(page * size, filtered.size());
            int end = Math.min(start + size, filtered.size());
            ResponseEntity<Page<UserResponse>> response = ResponseEntity.ok(new PageImpl<>(filtered.subList(start, end), PageRequest.of(page, size), filtered.size()));
            logger.info("getStudents completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getStudents failed: " + e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/school-admins")
    public ResponseEntity<Page<UserResponse>> getSchoolAdmins(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        logger.info("getSchoolAdmins started");
        try {
            List<UserResponse> all = userService.getUsersByRole(UserRole.SCHOOL_ADMIN);
            List<UserResponse> filtered = all.stream()
                    .filter(u -> search == null ||
                            (u.getName() != null && u.getName().toLowerCase().contains(search.toLowerCase())))
                    .toList();
            int start = Math.min(page * size, filtered.size());
            int end = Math.min(start + size, filtered.size());
            ResponseEntity<Page<UserResponse>> response = ResponseEntity.ok(new PageImpl<>(filtered.subList(start, end), PageRequest.of(page, size), filtered.size()));
            logger.info("getSchoolAdmins completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getSchoolAdmins failed: " + e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/psychologists")
    public ResponseEntity<Page<UserResponse>> getPsychologists(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        logger.info("getPsychologists started");
        try {
            List<UserResponse> all = userService.getUsersByRole(UserRole.PSYCHOLOGIST);
            List<UserResponse> filtered = all.stream()
                    .filter(u -> search == null ||
                            (u.getName() != null && u.getName().toLowerCase().contains(search.toLowerCase())))
                    .toList();
            int start = Math.min(page * size, filtered.size());
            int end = Math.min(start + size, filtered.size());
            ResponseEntity<Page<UserResponse>> response = ResponseEntity.ok(new PageImpl<>(filtered.subList(start, end), PageRequest.of(page, size), filtered.size()));
            logger.info("getPsychologists completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getPsychologists failed: " + e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/content-admins")
    public ResponseEntity<Page<UserResponse>> getContentAdmins(
            @RequestParam(required = false) String search,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        logger.info("getContentAdmins started");
        try {
            List<UserResponse> all = userService.getUsersByRole(UserRole.CONTENT_ADMIN);
            List<UserResponse> filtered = all.stream()
                    .filter(u -> search == null ||
                            (u.getName() != null && u.getName().toLowerCase().contains(search.toLowerCase())))
                    .toList();
            int start = Math.min(page * size, filtered.size());
            int end = Math.min(start + size, filtered.size());
            ResponseEntity<Page<UserResponse>> response = ResponseEntity.ok(new PageImpl<>(filtered.subList(start, end), PageRequest.of(page, size), filtered.size()));
            logger.info("getContentAdmins completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getContentAdmins failed: " + e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/{id}")
    public ResponseEntity<UserResponse> getUserById(@PathVariable Long id) {
        logger.info("getUserById started");
        try {
            ResponseEntity<UserResponse> response = ResponseEntity.ok(userService.getUserById(id));
            logger.info("getUserById completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getUserById failed: " + e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<UserResponse> updateUser(@PathVariable Long id,
                                                   @RequestBody UserRequest request) {
        logger.info("updateUser started");
        try {
            ResponseEntity<UserResponse> response = ResponseEntity.ok(userService.updateUser(id, request));
            logger.info("updateUser completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("updateUser failed: " + e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/{id}/reset-password")
    public ResponseEntity<Map<String, String>> resetPassword(@PathVariable Long id) {
        logger.info("resetPassword started");
        try {
            String newPassword = generateTempPassword();
            userService.resetPassword(id, newPassword);
            ResponseEntity<Map<String, String>> response = ResponseEntity.ok(Map.of("newPassword", newPassword));
            logger.info("resetPassword completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("resetPassword failed: " + e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteUser(@PathVariable Long id) {
        logger.info("deleteUser started");
        try {
            userService.deleteUser(id);
            ResponseEntity<Void> response = ResponseEntity.noContent().build();
            logger.info("deleteUser completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("deleteUser failed: " + e.getMessage(), e);
            throw e;
        }
    }






    @PatchMapping("/{id}/time-spent")
    public ResponseEntity<Void> updateTimeSpent(
            @PathVariable Long id,
            @RequestBody Map<String, Long> body) {
        logger.info("updateTimeSpent started for id={}", id);
        try {
            Long seconds = body.get("seconds");
            if (seconds != null && seconds > 0) {
                userService.incrementTimeSpent(id, seconds);
            }
            ResponseEntity<Void> response = ResponseEntity.ok().build();
            logger.info("updateTimeSpent completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("updateTimeSpent failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * POST /api/users/{id}/intervention-complete
     * Increments student's interventionSessionCount by 1.
     * Called when student completes a wellness activity (meditation timer).
     */
    @PostMapping("/{id}/intervention-complete")
    public ResponseEntity<Map<String, Object>> completeIntervention(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        logger.info("completeIntervention started for id={}", id);
        try {
            String activityType = body.getOrDefault("activityType", "unknown");
            int newCount = userService.incrementInterventionAndAwardBadges(id, activityType);
            ResponseEntity<Map<String, Object>> response = ResponseEntity.ok(Map.of(
                    "interventionSessionCount", newCount,
                    "activityType", activityType
            ));
            logger.info("completeIntervention completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("completeIntervention failed for id={}: {}", id, e.getMessage(), e);
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