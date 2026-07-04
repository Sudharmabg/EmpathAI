package com.mymercurie.chat.repository;

import com.mymercurie.chat.entity.FlaggedChat;
import com.mymercurie.chat.entity.FlagStatus;
import com.mymercurie.chat.entity.Severity;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;

@Repository
public interface FlaggedChatRepository extends JpaRepository<FlaggedChat, Long> {

    /** Paginated list with optional filters for the admin dashboard */
    @Query("""
        SELECT f FROM FlaggedChat f
        WHERE (:severity IS NULL OR f.severity = :severity)
          AND (:status   IS NULL OR f.status   = :status)
        ORDER BY
            CASE f.severity
                WHEN 'CRITICAL' THEN 1
                WHEN 'HIGH'     THEN 2
                WHEN 'MEDIUM'   THEN 3
            END ASC,
            f.createdAt DESC
    """)
    Page<FlaggedChat> findAllWithFilters(
            @Param("severity") Severity severity,
            @Param("status")   FlagStatus status,
            Pageable pageable
    );

    /** All flags for a specific student (for student history view) */
    List<FlaggedChat> findByStudentIdOrderByCreatedAtDesc(Long studentId);

    /** All flags assigned to a specific psychologist */
    List<FlaggedChat> findByAssignedPsychologistIdOrderByCreatedAtDesc(Long psychologistId);

    /** Count of critical flags that are still pending — used in dashboard header badge */
    long countBySeverityAndStatus(Severity severity, FlagStatus status);

    /** Count of all flags created today */
    @Query("SELECT COUNT(f) FROM FlaggedChat f WHERE f.createdAt >= :startOfDay")
    long countCreatedSince(@Param("startOfDay") LocalDateTime startOfDay);

    /** Count of flags NOT in PENDING state (resolved + assigned) */
    long countByStatusNot(FlagStatus status);

    /** Total count for a given status */
    long countByStatus(FlagStatus status);

    /** Check if a session already has a flag with the same severity to avoid duplicates */
    boolean existsBySessionIdAndSeverity(Long sessionId, Severity severity);
}