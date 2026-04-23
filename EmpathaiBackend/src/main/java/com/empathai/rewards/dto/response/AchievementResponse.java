package com.empathai.rewards.dto.response;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class AchievementResponse {
    private Long id;
    private String title;
    private String description;
    private String imageBase64;   // base64 encoded image for frontend
    private String imageType;
    private LocalDateTime createdAt;
    private LocalDateTime modifiedAt;
}