package com.empathai.curriculum.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ModuleRequest {

    @NotNull(message = "Syllabus ID must not be null")
    private Long syllabusId;

    @NotBlank(message = "Title must not be blank")
    private String title;

    private String createdBy;
    private String updatedBy;
}