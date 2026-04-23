package com.empathai.chat.repository;

import com.empathai.chat.entity.ChatUsage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.Optional;

@Repository
public interface ChatUsageRepository extends JpaRepository<ChatUsage, Long> {
    Optional<ChatUsage> findByStudentIdAndUsageDate(Long studentId, LocalDate usageDate);
}
