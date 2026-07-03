package com.empathai.curriculum.dto.request;

import lombok.Data;
import java.util.List;

@Data
public class ChapterMetadataUpdateRequest {
    private List<String> topics;
    private List<String> learningObjectives;
    private List<String> bloomsLevels;
    private List<String> keywords;
    private List<String> commonMisconceptions;
    private String difficultyLevel;
    private Integer estimatedReadingTime;
}
