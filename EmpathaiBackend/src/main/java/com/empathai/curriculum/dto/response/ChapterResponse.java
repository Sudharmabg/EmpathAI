package com.empathai.curriculum.dto.response;

import com.empathai.curriculum.entity.ProcessingStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
public class ChapterResponse {
    private Long id;
    private String board;
    private String grade;
    private String subject;
    private String title;
    private Integer chapterNumber;
    private ProcessingStatus processingStatus;
    // Parsed metadata lists (deserialized from JSON columns)
    private List<String> topics;
    private List<String> subtopics;
    private List<String> concepts;
    private List<String> learningObjectives;
    private List<String> bloomsLevels;
    private List<String> keywords;
    private List<String> definitions;
    private List<String> formulae;
    private List<String> commonMisconceptions;
    private List<String> prerequisites;
    private String difficultyLevel;
    private Integer estimatedReadingTime;
    private String createdBy;
    private LocalDateTime createdAt;
    private String publishedBy;
    private LocalDateTime publishedAt;
    private String archivedBy;
    private LocalDateTime archivedAt;
}
