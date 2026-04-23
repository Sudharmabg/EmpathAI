package com.empathai.user.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Full student detail — returned when drilling into a specific class.
 * GET /api/schools/{id}/classes/{className}/students
 * No audit fields (createdAt, createdBy, updatedAt, updatedBy).
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class StudentDetailResponse {
    private Long id;
    private String name;
    private String email;
    private String username;
    private String phoneNumber;
    private String parentPhone;
    private String parentName;
    private boolean active;

    // Student-specific
    private Long schoolId;
    private String school;
    private String className;
    private String section;
    private String rollNo;
    private String dateOfBirth;

    // ✅ FIX 3: gender added so it shows in the expanded row
    private String gender;

    // ✅ Activity tracking fields — needed for expanded row display
    private Integer loginCount;
    private Integer interventionSessionCount;
    private String intervention;
    private Long timeSpent;
}
