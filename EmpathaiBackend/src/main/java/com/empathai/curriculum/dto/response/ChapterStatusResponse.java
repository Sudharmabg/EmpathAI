package com.empathai.curriculum.dto.response;

import com.empathai.curriculum.entity.ProcessingStatus;
import lombok.Builder;
import lombok.Data;
import java.util.List;

@Data
@Builder
public class ChapterStatusResponse {
    private Long chapterId;
    private ProcessingStatus processingStatus;
    private String message;
    private List<String> topics;            // available after PROCESSED
    private String difficultyLevel;         // available after PROCESSED
    private Integer estimatedReadingTime;   // available after PROCESSED
}
