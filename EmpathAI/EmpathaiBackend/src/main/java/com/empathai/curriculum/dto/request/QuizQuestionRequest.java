package com.empathai.curriculum.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class QuizQuestionRequest {

    @NotNull(message = "SubTopic ID must not be null")
    private Long subTopicId;

    @NotBlank(message = "Question text must not be blank")
    private String questionText;

    @NotBlank(message = "Option A must not be blank")
    private String optionA;

    @NotBlank(message = "Option B must not be blank")
    private String optionB;

    private String optionC;
    private String optionD;

    @NotNull(message = "Correct answer must not be null")
    private Integer correctAnswer;

    private String explanation;
    private String createdBy;
    private String updatedBy;
}