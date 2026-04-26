package com.empathai.user.dto.school;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Full school response — used only for:
 *   - POST /api/schools       (create response)
 *   - PUT /api/schools/{id}   (update response)
 *   - GET /api/schools/{id}   (detail/edit screen)
 *
 * The list endpoint GET /api/schools uses SchoolSummaryResponse instead.
 *
 * Audit fields (createdAt, createdBy, updatedAt, updatedBy) removed —
 * these are internal and must never appear in the frontend.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolResponse {
    private Long id;
    private String name;
    private String address;
    private String contactNumber;
    private String contactName;
    private String email;
    private boolean active;
}
