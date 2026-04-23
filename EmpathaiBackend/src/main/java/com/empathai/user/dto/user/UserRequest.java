package com.empathai.user.dto.user;

import com.empathai.user.entity.enums.UserRole;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class UserRequest {

    @NotBlank(message = "Name is required")
    private String name;

    @NotBlank(message = "Email is required")
    @Email(message = "Invalid email format")
    private String email;

    private String username;

    private String password;

    private String phoneNumber;
    private String parentPhone;
    private String parentEmail;

    @NotNull(message = "Role is required")
    private UserRole role;

    private Long schoolId;
    private String school;

    private String className;
    private String section;
    private String rollNo;
    private String dateOfBirth;
    private Integer age;
    private String gender;
    private String parentName;
    // === Tracking fields (used by admin panel and activity tracking) ===
    private Integer loginCount;
    private Integer interventionSessionCount;
    private Long timeSpent;
    private String intervention;
}