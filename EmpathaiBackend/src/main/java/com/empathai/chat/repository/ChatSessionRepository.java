package com.empathai.chat.repository;

import com.empathai.chat.entity.ChatSession;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface ChatSessionRepository extends JpaRepository<ChatSession, Long> {
    Optional<ChatSession> findByStudentIdAndWeekStart(Long studentId, LocalDate weekStart);
    List<ChatSession> findByStudentIdOrderByWeekStartDesc(Long studentId);
}
