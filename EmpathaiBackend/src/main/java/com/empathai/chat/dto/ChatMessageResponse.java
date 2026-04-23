package com.empathai.chat.dto;

import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class ChatMessageResponse {
    private Long id;
    private String role;
    private String content;
    private String detectedMode;
    private LocalDateTime createdAt;
}
