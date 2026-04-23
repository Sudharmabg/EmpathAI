package com.empathai.rewards.service;

import com.empathai.rewards.dto.response.AchievementResponse;
import com.empathai.rewards.dto.response.BadgeResponse;
import com.empathai.rewards.entity.Achievement;
import com.empathai.rewards.entity.Badge;
import com.empathai.rewards.entity.StudentBadge;
import com.empathai.rewards.repository.AchievementRepository;
import com.empathai.rewards.repository.BadgeRepository;
import com.empathai.rewards.repository.StudentBadgeRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Base64;
import java.util.List;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class RewardsServiceImpl implements RewardsService {

    private final BadgeRepository badgeRepository;
    private final AchievementRepository achievementRepository;
    private final StudentBadgeRepository studentBadgeRepository;

    // ── Helpers ───────────────────────────────────────────────────────────

    private BadgeResponse toBadgeResponse(Badge badge) {
        BadgeResponse res = new BadgeResponse();
        res.setId(badge.getId());
        res.setTitle(badge.getTitle());
        res.setTriggerType(badge.getTriggerType());
        res.setTriggerTitle(badge.getTriggerTitle());
        res.setTriggerValue(badge.getTriggerValue());
        res.setImageType(badge.getImageType());
        res.setCreatedAt(badge.getCreatedAt());
        res.setModifiedAt(badge.getModifiedAt());
        if (badge.getImage() != null) {
            res.setImageBase64(Base64.getEncoder().encodeToString(badge.getImage()));
        }
        return res;
    }

    private BadgeResponse toStudentBadgeResponse(StudentBadge studentBadge) {
        BadgeResponse res = toBadgeResponse(studentBadge.getBadge());
        res.setEarnedAt(studentBadge.getEarnedAt());
        return res;
    }

    private AchievementResponse toAchievementResponse(Achievement achievement) {
        AchievementResponse res = new AchievementResponse();
        res.setId(achievement.getId());
        res.setTitle(achievement.getTitle());
        res.setDescription(achievement.getDescription());
        res.setImageType(achievement.getImageType());
        res.setCreatedAt(achievement.getCreatedAt());
        res.setModifiedAt(achievement.getModifiedAt());
        if (achievement.getImage() != null) {
            res.setImageBase64(Base64.getEncoder().encodeToString(achievement.getImage()));
        }
        return res;
    }

    private void applyImage(MultipartFile file, Badge badge) throws IOException {
        if (file != null && !file.isEmpty()) {
            badge.setImage(file.getBytes());
            badge.setImageType(file.getContentType());
        }
    }

    private void applyImage(MultipartFile file, Achievement achievement) throws IOException {
        if (file != null && !file.isEmpty()) {
            achievement.setImage(file.getBytes());
            achievement.setImageType(file.getContentType());
        }
    }

    /**
     * Awards a badge to a student if:
     *   1. A badge with the given triggerType and triggerValue exists.
     *   2. The student has not already earned that badge.
     */
    private void awardIfEligible(Long studentId, String triggerType, String milestoneValue) {
        List<Badge> candidates = badgeRepository.findAll().stream()
                .filter(b -> triggerType.equalsIgnoreCase(b.getTriggerType())
                        && milestoneValue.equals(b.getTriggerValue()))
                .collect(Collectors.toList());

        for (Badge badge : candidates) {
            if (!studentBadgeRepository.existsByStudentIdAndBadgeId(studentId, badge.getId())) {
                StudentBadge sb = new StudentBadge();
                sb.setStudentId(studentId);
                sb.setBadge(badge);
                studentBadgeRepository.save(sb);
                log.info("✅ Badge '{}' awarded to student {}", badge.getTitle(), studentId);
            }
        }
    }

    // ── Badges ────────────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<BadgeResponse> getAllBadges() {
        return badgeRepository.findAll()
                .stream()
                .map(this::toBadgeResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public BadgeResponse createBadge(String title, String triggerType, String triggerTitle,
                                     String triggerValue, MultipartFile image) {
        Badge badge = new Badge();
        badge.setTitle(title);
        badge.setTriggerType(triggerType);
        badge.setTriggerTitle(triggerTitle);
        badge.setTriggerValue(triggerValue);
        try {
            applyImage(image, badge);
        } catch (IOException e) {
            throw new RuntimeException("Failed to process image", e);
        }
        return toBadgeResponse(badgeRepository.save(badge));
    }

    @Override
    @Transactional
    public BadgeResponse updateBadge(Long id, String title, String triggerType, String triggerTitle,
                                     String triggerValue, MultipartFile image) {
        Badge badge = badgeRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Badge not found: " + id));
        badge.setTitle(title);
        badge.setTriggerType(triggerType);
        badge.setTriggerTitle(triggerTitle);
        badge.setTriggerValue(triggerValue);
        try {
            applyImage(image, badge);
        } catch (IOException e) {
            throw new RuntimeException("Failed to process image", e);
        }
        return toBadgeResponse(badgeRepository.save(badge));
    }

    @Override
    @Transactional
    public void deleteBadge(Long id) {
        if (!badgeRepository.existsById(id)) {
            throw new RuntimeException("Badge not found: " + id);
        }
        badgeRepository.deleteById(id);
    }

    // ── Student Badges ────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<BadgeResponse> getStudentBadges(Long studentId) {
        // Uses JOIN FETCH to eagerly load badge within transaction
        // This prevents LazyInitializationException
        return studentBadgeRepository.findByStudentId(studentId)
                .stream()
                .map(this::toStudentBadgeResponse)
                .collect(Collectors.toList());
    }

    // ── Badge Award Triggers ──────────────────────────────────────────────

    @Override
    @Transactional
    public void checkAndAwardLoginBadges(Long studentId, int totalLogins) {
        awardIfEligible(studentId, "login", String.valueOf(totalLogins));
    }

    @Override
    @Transactional
    public void checkAndAwardInterventionBadges(Long studentId, int totalInterventions) {
        awardIfEligible(studentId, "intervention", String.valueOf(totalInterventions));
    }

    // ── Achievements ──────────────────────────────────────────────────────

    @Override
    @Transactional(readOnly = true)
    public List<AchievementResponse> getAllAchievements() {
        return achievementRepository.findAll()
                .stream()
                .map(this::toAchievementResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public AchievementResponse createAchievement(String title, String description, MultipartFile image) {
        Achievement achievement = new Achievement();
        achievement.setTitle(title);
        achievement.setDescription(description);
        try {
            applyImage(image, achievement);
        } catch (IOException e) {
            throw new RuntimeException("Failed to process image", e);
        }
        return toAchievementResponse(achievementRepository.save(achievement));
    }

    @Override
    @Transactional
    public AchievementResponse updateAchievement(Long id, String title, String description, MultipartFile image) {
        Achievement achievement = achievementRepository.findById(id)
                .orElseThrow(() -> new RuntimeException("Achievement not found: " + id));
        achievement.setTitle(title);
        achievement.setDescription(description);
        try {
            applyImage(image, achievement);
        } catch (IOException e) {
            throw new RuntimeException("Failed to process image", e);
        }
        return toAchievementResponse(achievementRepository.save(achievement));
    }

    @Override
    @Transactional
    public void deleteAchievement(Long id) {
        if (!achievementRepository.existsById(id)) {
            throw new RuntimeException("Achievement not found: " + id);
        }
        achievementRepository.deleteById(id);
    }
}