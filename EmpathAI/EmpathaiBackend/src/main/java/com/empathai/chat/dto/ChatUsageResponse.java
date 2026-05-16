package com.empathai.chat.dto;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class ChatUsageResponse {
    private int used;
    private int limit;
    private int remaining;
}
