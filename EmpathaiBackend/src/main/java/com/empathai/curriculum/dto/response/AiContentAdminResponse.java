package com.empathai.curriculum.dto.response;

import com.empathai.curriculum.entity.AiTaskType;
import com.empathai.curriculum.entity.ApprovalStatus;
import lombok.Builder;
import lombok.Data;
import java.time.LocalDateTime;

@Data
@Builder
public class AiContentAdminResponse {
    private Long id;
    private Long chapterId;
    private AiTaskType taskType;
    private String topic;
    private String content;
    private ApprovalStatus approvalStatus;
    private String approvedBy;
    private LocalDateTime approvedAt;
    private String editedBy;
    private LocalDateTime createdAt;
    private LocalDateTime updatedAt;
}
