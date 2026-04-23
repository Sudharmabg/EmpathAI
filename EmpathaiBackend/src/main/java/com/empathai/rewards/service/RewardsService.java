package com.empathai.rewards.service;

import com.empathai.rewards.dto.response.AchievementResponse;
import com.empathai.rewards.dto.response.BadgeResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface RewardsService {

    // ── Badges ────────────────────────────────────────────────────────────
    List<BadgeResponse> getAllBadges();

    // FIX: triggerValue added — the numeric milestone string ("1","5","10") used for award matching
    BadgeResponse createBadge(String title, String triggerType, String triggerTitle,
                              String triggerValue, MultipartFile image);

    BadgeResponse updateBadge(Long id, String title, String triggerType, String triggerTitle,
                              String triggerValue, MultipartFile image);

    void deleteBadge(Long id);

    // ── Student Badges ────────────────────────────────────────────────────
    List<BadgeResponse> getStudentBadges(Long studentId);

    // ── Badge Award Triggers ──────────────────────────────────────────────
    void checkAndAwardLoginBadges(Long studentId, int totalLogins);
    void checkAndAwardInterventionBadges(Long studentId, int totalInterventions);

    // ── Achievements ──────────────────────────────────────────────────────
    List<AchievementResponse> getAllAchievements();
    AchievementResponse createAchievement(String title, String description, MultipartFile image);
    AchievementResponse updateAchievement(Long id, String title, String description, MultipartFile image);
    void deleteAchievement(Long id);
}