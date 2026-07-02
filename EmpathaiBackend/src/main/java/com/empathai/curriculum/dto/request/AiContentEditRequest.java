package com.empathai.curriculum.dto.request;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class AiContentEditRequest {
    @NotBlank(message = "Content is required")
    private String content;
}
