package com.empathai.user.dto.school;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Represents one class inside a school.
 * Returned by GET /api/schools/{id}/classes
 * Only shows className and studentCount — nothing else needed at this level.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ClassSummaryResponse {
    private String className;
    private long studentCount;
}
