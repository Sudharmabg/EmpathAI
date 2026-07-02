package com.empathai.curriculum.controller;

import com.empathai.curriculum.dto.request.ChapterMetadataUpdateRequest;
import com.empathai.curriculum.dto.request.ChapterUploadRequest;
import com.empathai.curriculum.dto.request.ChapterTopicRequest;
import com.empathai.curriculum.dto.response.ChapterResponse;
import com.empathai.curriculum.dto.response.ChapterStatusResponse;
import com.empathai.curriculum.dto.response.ChapterTopicResponse;
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

    // ── Archive ─────────────────────────────────────────────────────────────

    @PostMapping("/{id}/archive")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<ChapterResponse> archiveChapter(
        @PathVariable Long id,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(chapterIngestService.archiveChapter(id, currentUser.getName()));
    }

    @PostMapping("/{id}/restore")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<ChapterResponse> restoreChapter(@PathVariable Long id) {
        return ResponseEntity.ok(chapterIngestService.restoreChapter(id));
    }

    @GetMapping("/archived")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<List<ChapterResponse>> listArchivedChapters() {
        return ResponseEntity.ok(chapterIngestService.listArchivedChapters());
    }

    // ── Topics ──────────────────────────────────────────────────────────────

    @PostMapping("/{id}/topics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<ChapterTopicResponse> addTopic(
        @PathVariable Long id,
        @Valid @RequestBody ChapterTopicRequest request,
        @AuthenticationPrincipal User currentUser
    ) {
        return ResponseEntity.ok(chapterIngestService.addTopic(id, request, currentUser.getName()));
    }

    @PutMapping("/topics/{topicId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<ChapterTopicResponse> updateTopic(
        @PathVariable Long topicId,
        @Valid @RequestBody ChapterTopicRequest request
    ) {
        return ResponseEntity.ok(chapterIngestService.updateTopic(topicId, request));
    }

    @DeleteMapping("/topics/{topicId}")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<Void> deleteTopic(@PathVariable Long topicId) {
        chapterIngestService.deleteTopic(topicId);
        return ResponseEntity.noContent().build();
    }

    @GetMapping("/{id}/topics")
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<List<ChapterTopicResponse>> getTopicTree(@PathVariable Long id) {
        return ResponseEntity.ok(chapterIngestService.getTopicTree(id));
    }

    // ── Image Bank ──────────────────────────────────────────────────────────

    @PostMapping(value = "/image", consumes = org.springframework.http.MediaType.MULTIPART_FORM_DATA_VALUE)
    @PreAuthorize("hasAnyRole('SUPER_ADMIN','CONTENT_ADMIN')")
    public ResponseEntity<java.util.Map<String, String>> uploadImage(
        @RequestParam("conceptName") String conceptName,
        @RequestParam("file") org.springframework.web.multipart.MultipartFile file
    ) {
        return ResponseEntity.ok(chapterIngestService.uploadChapterImage(null, conceptName, file));
    }

    @GetMapping("/image/{imageId}")
    public ResponseEntity<byte[]> getImage(@PathVariable Long imageId) {
        com.empathai.curriculum.entity.ChapterImage image = chapterIngestService.getChapterImage(imageId);
        org.springframework.http.HttpHeaders headers = new org.springframework.http.HttpHeaders();
        if (image.getContentType() != null) {
            headers.setContentType(org.springframework.http.MediaType.parseMediaType(image.getContentType()));
        }
        return new ResponseEntity<>(image.getImageData(), headers, org.springframework.http.HttpStatus.OK);
    }
}
