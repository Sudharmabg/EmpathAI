package com.empathai.curriculum.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AiProcessRequest {

    @NotBlank(message = "Task must not be blank")
    private String task;   // FLASHCARDS | SUMMARY | MNEMONIC | MOCK_TEST

    @NotNull(message = "Chapter ID must not be null")
    private Long chapterId;

    private String topic;  // null for SUMMARY (chapter-level)

    @NotBlank(message = "Grade must not be blank")
    private String grade;

    @NotBlank(message = "Subject must not be blank")
    private String subject;

    @NotBlank(message = "Chapter must not be blank")
    private String chapter;

    private Long studentId;
}
