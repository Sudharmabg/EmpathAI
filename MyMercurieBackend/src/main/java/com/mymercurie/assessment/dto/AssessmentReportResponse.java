package com.mymercurie.assessment.dto;

import lombok.*;
import java.time.LocalDate;
import java.time.LocalDateTime;


@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class AssessmentReportResponse {
    private Long        id;
    private String      studentId;
    private String      studentName;
    private Long        groupId;
    private String      groupName;
    private String      className;
    private LocalDate   sessionDate;
    private String      summaryText;
    private String      bulletPoints;
    private String      editedSummaryText;
    private String      editedBy;
    private String      confirmed;
    private Boolean     chromaSynced;
    private LocalDateTime createdAt;
}