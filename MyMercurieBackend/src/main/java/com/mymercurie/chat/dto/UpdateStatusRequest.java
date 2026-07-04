package com.mymercurie.chat.dto;

import com.mymercurie.chat.entity.FlagStatus;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class UpdateStatusRequest {

    @NotNull(message = "Status is required")
    private FlagStatus status;
}