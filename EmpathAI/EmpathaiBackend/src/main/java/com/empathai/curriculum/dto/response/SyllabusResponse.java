package com.empathai.curriculum.dto.response;

import lombok.*;
import java.time.LocalDateTime;
import java.util.List;

/**
 * Response payload representing a Syllabus returned to the client.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class SyllabusResponse {
    private Long id;
    private String subject;
    private String classLevel;
    private String createdBy;
    private LocalDateTime createdAt;
    private String updatedBy;
    private LocalDateTime updatedAt;
    private List<ModuleResponse> modules;
}
