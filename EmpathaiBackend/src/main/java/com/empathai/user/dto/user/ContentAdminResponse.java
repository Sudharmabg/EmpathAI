package com.empathai.user.dto.user;

import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

/**
 * Response for content admin list view.
 * GET /api/users/content-admins
 * No audit fields. No school/student fields.
 */
@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class ContentAdminResponse {
    private Long id;
    private String name;
    private String email;
    private String username;
    private String phoneNumber;
    private boolean active;
}
