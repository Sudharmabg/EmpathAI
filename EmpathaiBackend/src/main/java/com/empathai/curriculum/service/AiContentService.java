package com.empathai.curriculum.service;

import com.empathai.curriculum.dto.request.AiProcessRequest;
import com.empathai.curriculum.dto.response.AiProcessResponse;

public interface AiContentService {
    AiProcessResponse process(AiProcessRequest request);
    AiProcessResponse getCached(String taskType, Long chapterId, String topic);
}
