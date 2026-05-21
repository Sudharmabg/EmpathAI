package com.empathai.chat.dto;

import lombok.Data;

@Data
public class ChatLogRequest {
    private String userMessage;
    private String assistantMessage;
    private String source;
}