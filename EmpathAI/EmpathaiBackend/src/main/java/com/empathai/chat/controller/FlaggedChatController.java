package com.empathai.chat.controller;

import com.empathai.chat.dto.*;
import com.empathai.chat.service.FlaggedChatService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.prepost.PreAuthorize;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/flagged-chats")
@RequiredArgsConstructor
public class FlaggedChatController {

    private final FlaggedChatService flaggedChatService;

    /**
     * GET /api/flagged-chats
     * Paginated list of flagged chats with optional severity/status filters.
     * Access: Psychologist, SchoolAdmin, SuperAdmin
     */
    @GetMapping
    @PreAuthorize("hasAnyRole('PSYCHOLOGIST', 'SCHOOL_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<Page<FlaggedChatResponse>> getFlags(
            @RequestParam(required = false) String severity,
            @RequestParam(required = false) String status,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "20") int size
    ) {
        return ResponseEntity.ok(flaggedChatService.getFlags(severity, status, page, size));
    }

    /**
     * GET /api/flagged-chats/stats
     * Summary statistics for the Support Alerts dashboard cards.
     * Access: Psychologist, SchoolAdmin, SuperAdmin
     */
    @GetMapping("/stats")
    @PreAuthorize("hasAnyRole('PSYCHOLOGIST', 'SCHOOL_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<FlaggedChatStatsResponse> getStats() {
        return ResponseEntity.ok(flaggedChatService.getStats());
    }

    /**
     * GET /api/flagged-chats/{id}/transcript
     * Full session message history for the week this flag was raised.
     * Access: Psychologist, SchoolAdmin, SuperAdmin
     */
    @GetMapping("/{id}/transcript")
    @PreAuthorize("hasAnyRole('PSYCHOLOGIST', 'SCHOOL_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<ChatSessionResponse> getTranscript(@PathVariable Long id) {
        return ResponseEntity.ok(flaggedChatService.getTranscript(id));
    }

    /**
     * POST /api/flagged-chats/{id}/assign
     * Assign a psychologist to a flagged case (sets status → ASSIGNED).
     * Access: SchoolAdmin, SuperAdmin
     */
    @PostMapping("/{id}/assign")
    @PreAuthorize("hasAnyRole('SCHOOL_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<FlaggedChatResponse> assign(
            @PathVariable Long id,
            @Valid @RequestBody AssignRequest request
    ) {
        return ResponseEntity.ok(flaggedChatService.assign(id, request));
    }

    /**
     * PUT /api/flagged-chats/{id}/status
     * Update the status of a flagged case (e.g. RESOLVED).
     * Access: Psychologist, SchoolAdmin, SuperAdmin
     */
    @PutMapping("/{id}/status")
    @PreAuthorize("hasAnyRole('PSYCHOLOGIST', 'SCHOOL_ADMIN', 'SUPER_ADMIN')")
    public ResponseEntity<FlaggedChatResponse> updateStatus(
            @PathVariable Long id,
            @Valid @RequestBody UpdateStatusRequest request
    ) {
        return ResponseEntity.ok(flaggedChatService.updateStatus(id, request));
    }
}