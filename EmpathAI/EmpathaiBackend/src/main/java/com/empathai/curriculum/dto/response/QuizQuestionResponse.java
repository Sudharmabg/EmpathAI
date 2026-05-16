package com.empathai.curriculum.dto.response;

import lombok.*;
import java.time.LocalDateTime;

@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class QuizQuestionResponse {
    private Long id;
    private Long subTopicId;
    private String questionText;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private Integer correctAnswer;
    private String explanation;
    private String questionImageType;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
}