package com.empathai.curriculum.dto.response;

import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ChapterTopicResponse {
    private Long id;
    private Long chapterId;
    private String topicName;
    private Long parentId;
    private Integer sortOrder;
    private String rawContent;
    private boolean hasContent;
    private String createdBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
    
    private List<ChapterTopicResponse> subtopics;
}
