package com.empathai.curriculum.controller;

import com.empathai.curriculum.dto.request.*;
import com.empathai.curriculum.dto.response.*;
import com.empathai.curriculum.service.AiContentService;
import com.empathai.user.entity.User;
import java.util.List;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
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

    // ── Admin Endpoints ───────────────────────────────────────────────────

    @PostMapping("/content/generate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<AiProcessResponse> generateToolContent(
        @Valid @RequestBody AiGenerateRequest request,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(aiContentService.generateToolContent(request, currentUser.getName()));
    }

    @GetMapping("/content/chapter/{chapterId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<List<AiContentAdminResponse>> listContentForChapter(@PathVariable Long chapterId) {
        return ResponseEntity.ok(aiContentService.listContentForChapter(chapterId));
    }

    @GetMapping("/content/pending")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<List<AiContentAdminResponse>> listPendingContent() {
        return ResponseEntity.ok(aiContentService.listPendingContent());
    }

    @PutMapping("/content/{id}/approve")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<AiContentAdminResponse> approveOrReject(
        @PathVariable Long id,
        @Valid @RequestBody AiContentApprovalRequest request,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(aiContentService.approveOrReject(id, request, currentUser.getName()));
    }

    @PutMapping("/content/{id}/edit")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<AiContentAdminResponse> editContent(
        @PathVariable Long id,
        @Valid @RequestBody AiContentEditRequest request,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(aiContentService.editContent(id, request, currentUser.getName()));
    }

    @DeleteMapping("/content/{id}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<Void> deleteContent(@PathVariable Long id) {
        aiContentService.deleteContent(id);
        return ResponseEntity.noContent().build();
    }

    @PostMapping("/content/{id}/regenerate")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<AiProcessResponse> regenerateContent(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(aiContentService.regenerateToolContent(id, currentUser.getName()));
    }
}

