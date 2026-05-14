package com.empathai.curriculum.dto.request;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.*;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SubTopicRequest {

    @NotNull(message = "Module ID must not be null")
    private Long moduleId;

    @NotBlank(message = "SubTopic title must not be blank")
    private String title;

    private String videoUrl;
    private String summary;
    private String learningObjectives;
    private Integer orderIndex;
    private String createdBy;
    private String updatedBy;
}