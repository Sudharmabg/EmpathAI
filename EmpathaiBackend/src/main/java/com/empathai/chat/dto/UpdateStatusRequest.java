package com.empathai.chat.dto;

import com.empathai.chat.entity.FlagStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateStatusRequest {

    @NotNull(message = "Status is required")
    private FlagStatus status;
}