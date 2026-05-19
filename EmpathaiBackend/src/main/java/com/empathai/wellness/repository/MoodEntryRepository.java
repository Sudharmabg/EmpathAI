package com.empathai.wellness.repository;

import com.empathai.wellness.entity.MoodEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

@Repository
public interface MoodEntryRepository extends JpaRepository<MoodEntry, Long> {
    List<MoodEntry> findByStudentIdOrderByLoggedAtDesc(Long studentId);

    Optional<MoodEntry> findFirstByStudentIdOrderByLoggedAtDesc(Long studentId);

    // ── NEW: Fetch all moods logged after a given date (for last 7 days) ──
    List<MoodEntry> findByStudentIdAndLoggedAtAfterOrderByLoggedAtDesc(
            Long studentId, LocalDateTime fromDate);
}