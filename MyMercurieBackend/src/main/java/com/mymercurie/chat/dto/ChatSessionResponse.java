package com.mymercurie.chat.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ChatSessionResponse {
    private Long id;
    private LocalDate weekStart;
    private LocalDateTime createdAt;
    private String source;                      // ✅ NEW — "CHAT" or "SCHEDULE"
    
    // Additional fields for Admin View
    private Long studentId;
    private String studentName;
    private String className;
    private String schoolName;

    private List<ChatMessageResponse> messages; // populated on single session fetch
}