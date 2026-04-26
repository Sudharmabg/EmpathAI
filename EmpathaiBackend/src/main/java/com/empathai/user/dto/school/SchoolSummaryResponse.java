package com.empathai.user.dto.school;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight response for the school list view.
 * Returns ONLY what the frontend needs: id, name, studentCount.
 * No audit fields. No contact details (those belong in detail view).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolSummaryResponse {
    private Long id;
    private String name;
    private long studentCount;
}
