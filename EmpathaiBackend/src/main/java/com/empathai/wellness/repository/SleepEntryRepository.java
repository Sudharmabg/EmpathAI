package com.empathai.wellness.repository;

import com.empathai.wellness.entity.SleepEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface SleepEntryRepository extends JpaRepository<SleepEntry, Long> {
    List<SleepEntry> findByStudentIdOrderByLoggedAtDesc(Long studentId);
    Optional<SleepEntry> findFirstByStudentIdOrderByLoggedAtDesc(Long studentId);

    List<SleepEntry> findByStudentIdAndLoggedAtAfterOrderByLoggedAtDesc(Long studentId, java.time.LocalDateTime fromDate);
    List<SleepEntry> findAllByLoggedAtAfterOrderByLoggedAtDesc(java.time.LocalDateTime fromDate);
}