package com.empathai.user.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response for psychologist list view.
 * GET /api/users/psychologists
 * No audit fields. No school/student fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class PsychologistResponse {
    private Long id;
    private String name;
    private String email;
    private String username;
    private String phoneNumber;
    private boolean active;
}
