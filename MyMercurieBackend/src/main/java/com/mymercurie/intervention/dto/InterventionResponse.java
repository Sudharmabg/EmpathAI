package com.mymercurie.intervention.dto;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

import java.time.LocalDateTime;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class InterventionResponse {
    private Long id;
    private Long studentId;
    private String type;
    private String notes;
    private LocalDateTime createdAt;
}
