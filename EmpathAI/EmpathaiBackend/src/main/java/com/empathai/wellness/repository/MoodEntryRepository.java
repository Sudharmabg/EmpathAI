package com.empathai.wellness.repository;

import com.empathai.wellness.entity.MoodEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface MoodEntryRepository extends JpaRepository<MoodEntry, Long> {
    List<MoodEntry> findByStudentIdOrderByLoggedAtDesc(Long studentId);
    Optional<MoodEntry> findFirstByStudentIdOrderByLoggedAtDesc(Long studentId);
}