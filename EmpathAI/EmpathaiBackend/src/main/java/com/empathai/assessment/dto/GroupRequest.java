package com.empathai.assessment.dto;

import lombok.*;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class GroupRequest {
    private String name;
    private String description;
    private String color;
    private Boolean isDefault;
    private String className;
}