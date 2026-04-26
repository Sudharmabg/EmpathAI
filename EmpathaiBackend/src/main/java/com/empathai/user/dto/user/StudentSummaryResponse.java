package com.empathai.user.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Lightweight student response for list/search views.
 * GET /api/users/students
 * No audit fields. Only the columns the table actually displays.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentSummaryResponse {
    private Long id;
    private String name;
    private String email;
    private String username;
    private boolean active;
    private String school;
    private String className;
    private String rollNo;
}
