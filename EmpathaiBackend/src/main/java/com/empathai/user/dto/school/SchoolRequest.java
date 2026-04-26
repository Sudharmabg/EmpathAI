package com.empathai.user.dto.school;

import jakarta.validation.constraints.NotBlank;
import lombok.AllArgsConstructor;
import lombok.Builder;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@Builder
@NoArgsConstructor
@AllArgsConstructor
public class SchoolRequest {
    @NotBlank(message = "School name is required")
    private String name;
    private String address;
    private String contactNumber;
    private String contactName;
    private String email;
}

