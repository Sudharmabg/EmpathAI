package com.empathai.curriculum.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.*;

/**
 * Request payload for creating or updating a Syllabus.
 */
@Data
@NoArgsConstructor
@AllArgsConstructor
public class SyllabusRequest {

    @NotBlank(message = "Subject must not be blank")
    private String subject;

    @NotBlank(message = "Class level must not be blank")
    private String classLevel;

    private String createdBy;
    private String updatedBy;
}
