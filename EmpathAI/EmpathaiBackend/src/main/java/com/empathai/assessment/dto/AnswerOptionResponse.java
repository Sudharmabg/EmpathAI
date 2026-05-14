package com.empathai.assessment.dto;

import lombok.*;
import java.time.LocalDateTime;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AnswerOptionResponse {

    private Long id;
    private Long questionId;
    private String optionLabel;
    private String rangeValue;
    private String overallMeaning;
    private String interpretation;
    private String tag;
    private String cachedBullets;
    private LocalDateTime bulletsGeneratedAt;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}