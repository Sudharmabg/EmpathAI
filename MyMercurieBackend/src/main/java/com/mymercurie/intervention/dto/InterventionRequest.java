package com.mymercurie.intervention.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterventionRequest {
    private Long studentId;
    private String type;
    private String notes;
}
