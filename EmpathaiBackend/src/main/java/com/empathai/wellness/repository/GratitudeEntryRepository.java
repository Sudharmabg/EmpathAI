package com.empathai.wellness.repository;

import com.empathai.wellness.entity.GratitudeEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface GratitudeEntryRepository extends JpaRepository<GratitudeEntry, Long> {
    List<GratitudeEntry> findByStudentIdOrderByLoggedAtDesc(Long studentId);
}