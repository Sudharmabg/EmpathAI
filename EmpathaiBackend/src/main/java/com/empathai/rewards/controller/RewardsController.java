package com.empathai.rewards.controller;

import com.empathai.rewards.dto.response.AchievementResponse;
import com.empathai.rewards.dto.response.BadgeResponse;
import com.empathai.rewards.service.RewardsService;
import com.empathai.user.entity.User;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.Authentication;
import org.springframework.security.core.context.SecurityContextHolder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

@RestController
@RequestMapping("/api/rewards")
@RequiredArgsConstructor
public class RewardsController {

    private static final Logger logger = LoggerFactory.getLogger(RewardsController.class);
    private final RewardsService rewardsService;

    // ══════════════════════════════════════════════════════════════════════
    // BADGES (ADMIN)
    // ══════════════════════════════════════════════════════════════════════

    @GetMapping("/badges")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<BadgeResponse>> getAllBadges() {
        logger.info("getAllBadges started");
        try {
            ResponseEntity<List<BadgeResponse>> result = ResponseEntity.ok(rewardsService.getAllBadges());
            logger.info("getAllBadges completed successfully");
            return result;
        } catch (Exception e) {
            logger.error("getAllBadges failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/badges")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<BadgeResponse> createBadge(
            @RequestParam("title") String title,
            @RequestParam("triggerType") String triggerType,
            @RequestParam("triggerTitle") String triggerTitle,
            @RequestParam(value = "triggerValue", required = false) String triggerValue,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        logger.info("createBadge started for title={}", title);
        try {
            ResponseEntity<BadgeResponse> result = ResponseEntity.status(HttpStatus.CREATED)
                    .body(rewardsService.createBadge(title, triggerType, triggerTitle, triggerValue, image));
            logger.info("createBadge completed successfully for title={}", title);
            return result;
        } catch (Exception e) {
            logger.error("createBadge failed for title={}: {}", title, e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/badges/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<BadgeResponse> updateBadge(
            @PathVariable Long id,
            @RequestParam("title") String title,
            @RequestParam("triggerType") String triggerType,
            @RequestParam("triggerTitle") String triggerTitle,
            @RequestParam(value = "triggerValue", required = false) String triggerValue,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        logger.info("updateBadge started for id={}", id);
        try {
            ResponseEntity<BadgeResponse> result = ResponseEntity.ok(rewardsService.updateBadge(id, title, triggerType, triggerTitle, triggerValue, image));
            logger.info("updateBadge completed successfully for id={}", id);
            return result;
        } catch (Exception e) {
            logger.error("updateBadge failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/badges/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteBadge(@PathVariable Long id) {
        logger.info("deleteBadge started for id={}", id);
        try {
            rewardsService.deleteBadge(id);
            ResponseEntity<Void> result = ResponseEntity.noContent().build();
            logger.info("deleteBadge completed successfully for id={}", id);
            return result;
        } catch (Exception e) {
            logger.error("deleteBadge failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // STUDENT BADGES
    // ══════════════════════════════════════════════════════════════════════

    /**
     * Student fetches their OWN badges — ID comes from JWT, never from URL.
     */
    @GetMapping("/students/me/badges")
    @PreAuthorize("hasRole('STUDENT')")
    public ResponseEntity<List<BadgeResponse>> getMyBadges() {
        logger.info("getMyBadges started");
        try {
            Authentication auth = SecurityContextHolder.getContext().getAuthentication();
            User user = (User) auth.getPrincipal();
            List<BadgeResponse> badges = rewardsService.getStudentBadges(user.getId());
            ResponseEntity<List<BadgeResponse>> result = ResponseEntity.ok(badges);
            logger.info("getMyBadges completed successfully for userId={}", user.getId());
            return result;
        } catch (Exception e) {
            logger.error("getMyBadges failed: {}", e.getMessage(), e);
            return ResponseEntity.status(HttpStatus.INTERNAL_SERVER_ERROR).build();
        }
    }

    /**
     * Admin / staff fetch any student's badges by ID.
     */
    @GetMapping("/students/{studentId}/badges")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN', 'SCHOOL_ADMIN', 'PSYCHOLOGIST')")
    public ResponseEntity<List<BadgeResponse>> getStudentBadges(@PathVariable Long studentId) {
        logger.info("getStudentBadges started for studentId={}", studentId);
        try {
            ResponseEntity<List<BadgeResponse>> result = ResponseEntity.ok(rewardsService.getStudentBadges(studentId));
            logger.info("getStudentBadges completed successfully for studentId={}", studentId);
            return result;
        } catch (Exception e) {
            logger.error("getStudentBadges failed for studentId={}: {}", studentId, e.getMessage(), e);
            throw e;
        }
    }

    // ══════════════════════════════════════════════════════════════════════
    // ACHIEVEMENTS (ADMIN)
    // ══════════════════════════════════════════════════════════════════════

    @GetMapping("/achievements")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<List<AchievementResponse>> getAllAchievements() {
        logger.info("getAllAchievements started");
        try {
            ResponseEntity<List<AchievementResponse>> result = ResponseEntity.ok(rewardsService.getAllAchievements());
            logger.info("getAllAchievements completed successfully");
            return result;
        } catch (Exception e) {
            logger.error("getAllAchievements failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/achievements")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AchievementResponse> createAchievement(
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        logger.info("createAchievement started for title={}", title);
        try {
            ResponseEntity<AchievementResponse> result = ResponseEntity.status(HttpStatus.CREATED)
                    .body(rewardsService.createAchievement(title, description, image));
            logger.info("createAchievement completed successfully for title={}", title);
            return result;
        } catch (Exception e) {
            logger.error("createAchievement failed for title={}: {}", title, e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/achievements/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<AchievementResponse> updateAchievement(
            @PathVariable Long id,
            @RequestParam("title") String title,
            @RequestParam("description") String description,
            @RequestParam(value = "image", required = false) MultipartFile image) {
        logger.info("updateAchievement started for id={}", id);
        try {
            ResponseEntity<AchievementResponse> result = ResponseEntity.ok(rewardsService.updateAchievement(id, title, description, image));
            logger.info("updateAchievement completed successfully for id={}", id);
            return result;
        } catch (Exception e) {
            logger.error("updateAchievement failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/achievements/{id}")
    @PreAuthorize("hasRole('SUPER_ADMIN')")
    public ResponseEntity<Void> deleteAchievement(@PathVariable Long id) {
        logger.info("deleteAchievement started for id={}", id);
        try {
            rewardsService.deleteAchievement(id);
            ResponseEntity<Void> result = ResponseEntity.noContent().build();
            logger.info("deleteAchievement completed successfully for id={}", id);
            return result;
        } catch (Exception e) {
            logger.error("deleteAchievement failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }
}