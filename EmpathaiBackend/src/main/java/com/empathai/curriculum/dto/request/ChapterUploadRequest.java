package com.empathai.curriculum.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;
import java.util.List;
import java.util.Map;

@Data
public class ChapterUploadRequest {

    @NotBlank(message = "Board must not be blank")
    private String board = "CBSE";

    @NotBlank(message = "Grade must not be blank")
    private String grade;

    @NotBlank(message = "Subject must not be blank")
    private String subject;

    @NotBlank(message = "Chapter title must not be blank")
    private String title;

    @NotBlank(message = "Raw content must not be blank")
    @Size(min = 200, message = "Raw content must be at least 200 characters")
    private String rawContent;

    private Integer chapterNumber;

    private List<String> subtopics; // Array of subtopic names from chip UI

    /** Optional image bank: [{conceptName, imageUrl}] from the upload form */
    private List<Map<String, String>> imageBank;
}

