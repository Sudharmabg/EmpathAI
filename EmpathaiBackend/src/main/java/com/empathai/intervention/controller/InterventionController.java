package com.empathai.intervention.controller;

import com.empathai.rewards.service.RewardsService;
import com.empathai.user.entity.Student;
import com.empathai.user.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/interventions")
@RequiredArgsConstructor
@Slf4j
public class InterventionController {

    private final StudentRepository studentRepository;
    private final RewardsService    rewardsService;

    /**
     * POST /api/interventions/students/{studentId}/complete
     *
     * Call this endpoint when a student finishes an intervention or counseling session.
     * It will:
     *   1. Atomically increment the student's interventionSessionCount
     *   2. Auto-award any intervention milestone badges not yet earned
     *
     * Milestones the frontend expects badges for: 1, 3, 5, 10
     *
     * Accessible by the student, their psychologist, school admin, or super admin.
     */
    @PostMapping("/students/{studentId}/complete")
    @PreAuthorize("hasAnyRole('STUDENT','PSYCHOLOGIST','SCHOOL_ADMIN','SUPER_ADMIN')")
    @Transactional
    public ResponseEntity<Map<String, Object>> completeInterventionSession(
            @PathVariable Long studentId) {
        log.info("completeInterventionSession started for studentId={}", studentId);
        try {
            studentRepository.incrementInterventionSessionCount(studentId);

            Student refreshed = studentRepository.findById(studentId)
                    .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));

            int newCount = refreshed.getInterventionSessionCount() != null
                    ? refreshed.getInterventionSessionCount() : 1;

            rewardsService.checkAndAwardInterventionBadges(studentId, newCount);

            log.info("Student {} completed intervention session — count now {}", studentId, newCount);

            ResponseEntity<Map<String, Object>> result = ResponseEntity.ok(Map.of(
                    "studentId",                studentId,
                    "interventionSessionCount", newCount
            ));
            log.info("completeInterventionSession completed successfully for studentId={}", studentId);
            return result;
        } catch (Exception e) {
            log.error("completeInterventionSession failed for studentId={}: {}", studentId, e.getMessage(), e);
            throw e;
        }
    }

    /**
     * GET /api/interventions/students/{studentId}/count
     *
     * Returns the current intervention session count for a student.
     * Useful for the frontend to display progress toward the next milestone badge.
     */
    @GetMapping("/students/{studentId}/count")
    @PreAuthorize("hasAnyRole('STUDENT','PSYCHOLOGIST','SCHOOL_ADMIN','SUPER_ADMIN')")
    public ResponseEntity<Map<String, Object>> getInterventionCount(@PathVariable Long studentId) {
        log.info("getInterventionCount started for studentId={}", studentId);
        try {
            Student student = studentRepository.findById(studentId)
                    .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));

            int count = student.getInterventionSessionCount() != null
                    ? student.getInterventionSessionCount() : 0;

            ResponseEntity<Map<String, Object>> result = ResponseEntity.ok(Map.of(
                    "studentId",                studentId,
                    "interventionSessionCount", count
            ));
            log.info("getInterventionCount completed successfully for studentId={}", studentId);
            return result;
        } catch (Exception e) {
            log.error("getInterventionCount failed for studentId={}: {}", studentId, e.getMessage(), e);
            throw e;
        }
    }
}