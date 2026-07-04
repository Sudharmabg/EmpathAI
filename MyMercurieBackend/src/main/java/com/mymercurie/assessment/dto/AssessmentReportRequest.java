package com.mymercurie.assessment.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentReportRequest {

    private String studentId;
    private String studentName;
    private Long   groupId;
    private String groupName;
    private String className;

    private List<AnswerEntry> answers;

    @Data
    @NoArgsConstructor
    @AllArgsConstructor
    public static class AnswerEntry {
        private Long   questionId;
        private String questionText;
        private String selectedOption;
    }
}