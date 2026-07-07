package com.mymercurie.wellness.repository;

import com.mymercurie.wellness.entity.MindDumpEntry;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface MindDumpEntryRepository extends JpaRepository<MindDumpEntry, Long> {
    List<MindDumpEntry> findByStudentIdOrderByLoggedAtDesc(Long studentId);
}