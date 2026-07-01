package com.empathai.curriculum.controller;

import com.empathai.curriculum.dto.request.AiProcessRequest;
import com.empathai.curriculum.dto.response.AiProcessResponse;
import com.empathai.curriculum.service.AiContentService;
import com.empathai.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/ai")
@RequiredArgsConstructor
@Slf4j
public class AiContentController {

    private final AiContentService aiContentService;

    @PostMapping("/process")
    public ResponseEntity<AiProcessResponse> process(
        @Valid @RequestBody AiProcessRequest request,
        @AuthenticationPrincipal User currentUser
    ) {
        log.info("AI process: task={} chapter={} topic={} student={}",
            request.getTask(), request.getChapterId(), request.getTopic(),
            currentUser.getId());
        request.setStudentId(currentUser.getId());
        return ResponseEntity.ok(aiContentService.process(request));
    }

    @GetMapping("/content/{taskType}/{chapterId}")
    public ResponseEntity<AiProcessResponse> getCached(
        @PathVariable String taskType,
        @PathVariable Long chapterId,
        @RequestParam(required = false) String topic
    ) {
        return ResponseEntity.ok(aiContentService.getCached(taskType, chapterId, topic));
    }
}
