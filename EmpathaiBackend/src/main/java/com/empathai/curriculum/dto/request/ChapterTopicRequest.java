package com.empathai.curriculum.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class ChapterTopicRequest {
    @NotBlank(message = "Topic name is required")
    private String topicName;
    
    private Long parentId;
    private String rawContent;
}
