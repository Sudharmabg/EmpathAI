package com.empathai.assessment.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionRequest {
    private Long groupMapId;
    private String questionText;
    private String options;
}