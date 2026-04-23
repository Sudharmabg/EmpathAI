package com.empathai.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ChatSessionResponse {
    private Long id;
    private LocalDate weekStart;
    private LocalDateTime createdAt;
    private List<ChatMessageResponse> messages; // populated on single session fetch
}
