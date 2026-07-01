package com.empathai.curriculum.controller;

import com.empathai.curriculum.dto.request.ChapterMetadataUpdateRequest;
import com.empathai.curriculum.dto.request.ChapterUploadRequest;
import com.empathai.curriculum.dto.response.ChapterResponse;
import com.empathai.curriculum.dto.response.ChapterStatusResponse;
import com.empathai.curriculum.service.ChapterIngestService;
import com.empathai.user.entity.User;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.security.core.annotation.AuthenticationPrincipal;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/curriculum/chapter")
@RequiredArgsConstructor
@Slf4j
public class ChapterIngestController {

    private final ChapterIngestService chapterIngestService;

    @PostMapping("/upload")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<ChapterStatusResponse> uploadChapter(
        @Valid @RequestBody ChapterUploadRequest request,
        @AuthenticationPrincipal User currentUser
    ) {
        log.info("Chapter upload by {}: {} - {}", currentUser.getName(), request.getSubject(), request.getTitle());
        return ResponseEntity.accepted()
            .body(chapterIngestService.uploadChapter(request, currentUser.getName()));
    }

    @GetMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<ChapterStatusResponse> getStatus(@PathVariable Long id) {
        return ResponseEntity.ok(chapterIngestService.getStatus(id));
    }

    @PutMapping("/{id}/metadata")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<ChapterResponse> updateMetadata(
        @PathVariable Long id,
        @RequestBody ChapterMetadataUpdateRequest request
    ) {
        return ResponseEntity.ok(chapterIngestService.updateMetadata(id, request));
    }

    @PostMapping("/{id}/publish")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<ChapterResponse> publishChapter(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser
    ) {
        log.info("Chapter {} published by {}", id, currentUser.getName());
        return ResponseEntity.ok(chapterIngestService.publishChapter(id, currentUser.getName()));
    }

    @GetMapping
    public ResponseEntity<List<ChapterResponse>> listChapters(
        @RequestParam(required = false) String grade,
        @RequestParam(required = false) String subject
    ) {
        return ResponseEntity.ok(chapterIngestService.listPublishedChapters(grade, subject));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ChapterResponse> getChapter(@PathVariable Long id) {
        return ResponseEntity.ok(chapterIngestService.getChapter(id));
    }
}
