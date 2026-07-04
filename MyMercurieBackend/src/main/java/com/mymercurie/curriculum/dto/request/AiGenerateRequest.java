package com.mymercurie.curriculum.dto.request;

import com.mymercurie.curriculum.entity.AiTaskType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiGenerateRequest {
    @NotNull(message = "Chapter ID is required")
    private Long chapterId;
    
    @NotNull(message = "Task type is required")
    private AiTaskType taskType;
    
    private String topic; // null for chapter-level
}
