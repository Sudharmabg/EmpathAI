package com.empathai.user.dto.user;

import com.empathai.user.entity.enums.UserRole;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Full user response — used only for:
 *   - GET /api/users/{id}  (edit/detail screen)
 *   - POST /api/users       (create response)
 *   - PUT /api/users/{id}   (update response)
 *   - GET /api/users/me
 *
 * List endpoints use role-specific lean DTOs instead:
 *   - StudentSummaryResponse, SchoolAdminResponse,
 *     PsychologistResponse, ContentAdminResponse
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserResponse {
    private Long id;
    private String name;
    private String email;
    private String username;
    private String phoneNumber;
    private String parentPhone;
    private String parentEmail;
    private UserRole role;
    private boolean active;

    // Role-specific fields (null when not applicable)
    private Long schoolId;
    private String school;
    private String className;
    private String section;
    private String rollNo;
    private String dateOfBirth;
    private String gender;
    private String parentName;

    // Student activity tracking fields
    private Integer loginCount;
    private Integer interventionSessionCount;
    private String intervention;
    private Long timeSpent;
}