package com.empathai.assessment.dto;


import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class QuestionResponse {
    private Long id;
    private Long groupMapId;
    private String questions;
    private String questionText;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    private LocalDateTime createdAt;
}
