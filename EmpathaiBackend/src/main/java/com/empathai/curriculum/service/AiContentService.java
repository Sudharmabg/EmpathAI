package com.empathai.curriculum.service;

import com.empathai.curriculum.dto.request.AiProcessRequest;
import com.empathai.curriculum.dto.response.AiProcessResponse;

import java.util.List;

public interface AiContentService {
    AiProcessResponse process(AiProcessRequest request);
    AiProcessResponse getCached(String taskType, Long chapterId, String topic);
    
    // Admin tools
    AiProcessResponse generateToolContent(com.empathai.curriculum.dto.request.AiGenerateRequest request, String createdBy);
    AiProcessResponse regenerateToolContent(Long id, String regeneratedBy);
    List<com.empathai.curriculum.dto.response.AiContentAdminResponse> listContentForChapter(Long chapterId);
    List<com.empathai.curriculum.dto.response.AiContentAdminResponse> listPendingContent();
    com.empathai.curriculum.dto.response.AiContentAdminResponse approveOrReject(Long id, com.empathai.curriculum.dto.request.AiContentApprovalRequest request, String adminBy);
    com.empathai.curriculum.dto.response.AiContentAdminResponse editContent(Long id, com.empathai.curriculum.dto.request.AiContentEditRequest request, String editedBy);
    void deleteContent(Long id);
    com.empathai.curriculum.dto.response.AiContentAdminResponse createContent(com.empathai.curriculum.dto.request.AiContentCreateRequest request, String createdBy);
}
