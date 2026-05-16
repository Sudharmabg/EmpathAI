package com.empathai.curriculum.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SubTopicResponse {
    private Long id;
    private Long moduleId;
    private String title;
    private String videoUrl;
    private String summary;
    private String learningObjectives;
    private String summaryImageType;
    private Integer orderIndex;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private List<QuizQuestionResponse> quizzes;
}