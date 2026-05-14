package com.empathai.user.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response for school admin list view.
 * GET /api/users/school-admins
 * No audit fields. No student-specific fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolAdminResponse {
    private Long id;
    private String name;
    private String email;
    private String username;
    private boolean active;
    private Long schoolId;
    private String school;   // school name
}
