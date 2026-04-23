package com.empathai.chat.repository;

import com.empathai.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    // Fetch last N messages for providing history to GPT
    List<ChatMessage> findTop10BySessionIdOrderByCreatedAtDesc(Long sessionId);
}
