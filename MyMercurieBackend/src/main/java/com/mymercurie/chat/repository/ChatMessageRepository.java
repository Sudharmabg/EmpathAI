package com.mymercurie.chat.repository;

import com.mymercurie.chat.entity.ChatMessage;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface ChatMessageRepository extends JpaRepository<ChatMessage, Long> {

    // All messages for a session in chronological order
    List<ChatMessage> findBySessionIdOrderByCreatedAtAsc(Long sessionId);

    // Fetch last 10 messages for providing history to GPT
    List<ChatMessage> findTop10BySessionIdOrderByCreatedAtDesc(Long sessionId);

    // ✅ NEW — get the single latest message for a session (for last activity time)
    Optional<ChatMessage> findTopBySessionIdOrderByCreatedAtDesc(Long sessionId);
}