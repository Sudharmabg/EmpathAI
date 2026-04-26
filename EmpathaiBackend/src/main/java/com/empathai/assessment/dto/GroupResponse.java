package com.empathai.assessment.dto;

import lombok.*;
import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupResponse {
    private Long id;
    private String name;
    private String color;
    private Boolean isDefault;
    private String description;
    private LocalDateTime createdAt;

    private LocalDateTime updatedAt;
    private String className;
}
