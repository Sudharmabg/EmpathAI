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
    private String domain;
    private String optionA;
    private String optionB;
    private String optionC;
    private String optionD;
    
    private String option1OverallMeaning;
    private String option1Interpretation;
    private String option1Tag;
    
    private String option2OverallMeaning;
    private String option2Interpretation;
    private String option2Tag;
    
    private String option3OverallMeaning;
    private String option3Interpretation;
    private String option3Tag;
    
    private String option4OverallMeaning;
    private String option4Interpretation;
    private String option4Tag;

    private LocalDateTime createdAt;
}