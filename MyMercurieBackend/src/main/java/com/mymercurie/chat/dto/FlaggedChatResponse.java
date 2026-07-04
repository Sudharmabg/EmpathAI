package com.mymercurie.chat.dto;

import com.mymercurie.chat.entity.FlagStatus;
import com.mymercurie.chat.entity.Severity;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDateTime;

@Data
@Builder
public class FlaggedChatResponse {

    private Long id;
    private Long sessionId;
    private Long studentId;

    // Populated by joining with user table in service layer
    private String studentName;
    private String studentClass;
    private String school;

    private String lastMessage;
    private String flagReason;
    private String sentiment;
    private Severity severity;
    private FlagStatus status;

    // Populated when status = ASSIGNED
    private Long assignedPsychologistId;
    private String assignedPsychologistName;

    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}