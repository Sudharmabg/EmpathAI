package com.empathai.assessment.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ResponseDto {
    private Long id;
    private Long studentId;
    private String studentName;
    private Long questionId;
    private String questionText;
    private String responseValue;
    private String emotion;
    private String className;
    private String gender;
    private Long groupId;
    private String groupName;
    private String schoolName;
    private Integer age;
    private String answer;
    private LocalDateTime submittedAt;
}