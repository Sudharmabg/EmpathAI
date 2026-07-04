package com.mymercurie.curriculum.service;

import com.mymercurie.curriculum.dto.request.AiProcessRequest;
import com.mymercurie.curriculum.dto.response.AiProcessResponse;

import java.util.List;

public interface AiContentService {
    AiProcessResponse process(AiProcessRequest request);
    AiProcessResponse getCached(String taskType, Long chapterId, String topic);
    
    // Admin tools
    AiProcessResponse generateToolContent(com.mymercurie.curriculum.dto.request.AiGenerateRequest request, String createdBy);
    AiProcessResponse regenerateToolContent(Long id, String regeneratedBy);
    List<com.mymercurie.curriculum.dto.response.AiContentAdminResponse> listContentForChapter(Long chapterId);
    List<com.mymercurie.curriculum.dto.response.AiContentAdminResponse> listPendingContent();
    com.mymercurie.curriculum.dto.response.AiContentAdminResponse approveOrReject(Long id, com.mymercurie.curriculum.dto.request.AiContentApprovalRequest request, String adminBy);
    com.mymercurie.curriculum.dto.response.AiContentAdminResponse editContent(Long id, com.mymercurie.curriculum.dto.request.AiContentEditRequest request, String editedBy);
    void deleteContent(Long id);
    com.mymercurie.curriculum.dto.response.AiContentAdminResponse createContent(com.mymercurie.curriculum.dto.request.AiContentCreateRequest request, String createdBy);
}
