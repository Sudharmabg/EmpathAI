package com.empathai.curriculum.dto.response;

import lombok.Builder;
import lombok.Data;

@Data
@Builder
public class AiProcessResponse {
    private String taskType;
    private Long chapterId;
    private String topic;
    private String content;    // Validated JSON string — parsed on the frontend
    private boolean cached;    // true if returned from MySQL cache
}
