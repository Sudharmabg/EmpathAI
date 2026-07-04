package com.mymercurie.chat.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class AssignRequest {

    @NotNull(message = "Psychologist ID is required")
    private Long psychologistId;
}