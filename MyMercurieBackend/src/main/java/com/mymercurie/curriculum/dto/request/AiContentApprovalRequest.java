package com.mymercurie.curriculum.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiContentApprovalRequest {
    @NotBlank(message = "Approval status is required (APPROVED or REJECTED)")
    private String approvalStatus;
}
