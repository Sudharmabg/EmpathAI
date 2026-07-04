package com.mymercurie.assessment.controller;

import com.mymercurie.assessment.dto.GroupRequest;
import com.mymercurie.assessment.dto.QuestionRequest;
import com.mymercurie.assessment.dto.ResponseRequest;
import com.mymercurie.assessment.dto.GroupResponse;
import com.mymercurie.assessment.dto.QuestionResponse;
import com.mymercurie.assessment.dto.ResponseDto;
import com.mymercurie.assessment.service.AssessmentReportService;   // ← ADD THIS IMPORT
import com.mymercurie.assessment.service.IAssessmentService;
import lombok.RequiredArgsConstructor;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.data.domain.Page;
import org.springframework.http.*;
import org.springframework.web.bind.annotation.*;
import org.springframework.security.core.context.SecurityContextHolder;

import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class AssessmentController {

    private static final Logger logger = LoggerFactory.getLogger(AssessmentController.class);

    private final IAssessmentService assessmentService;
    private final AssessmentReportService reportService;

    // ── Groups ────────────────────────────────────────────────────────────────

    @GetMapping("/groups")
    public ResponseEntity<List<com.mymercurie.assessment.dto.GroupResponse>> getAllGroups() {
        logger.info("getAllGroups started");
        try {
            ResponseEntity<List<GroupResponse>> response = ResponseEntity.ok(assessmentService.getAllGroups());
            logger.info("getAllGroups completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getAllGroups failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/groups/class/{className}")
    public ResponseEntity<List<GroupResponse>> getGroupsByClass(
            @PathVariable String className) {
        logger.info("getGroupsByClass started for className={}", className);
        try {
            ResponseEntity<List<GroupResponse>> response = ResponseEntity.ok(assessmentService.getGroupsByClassName(className));
            logger.info("getGroupsByClass completed successfully for className={}", className);
            return response;
        } catch (Exception e) {
            logger.error("getGroupsByClass failed for className={}: {}", className, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/groups")
    public ResponseEntity<GroupResponse> createGroup(@RequestBody GroupRequest request) {
        logger.info("createGroup started");
        try {
            ResponseEntity<GroupResponse> response = ResponseEntity.status(HttpStatus.CREATED).body(assessmentService.createGroup(request));
            logger.info("createGroup completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("createGroup failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/groups/{id}")
    public ResponseEntity<Void> deleteGroup(@PathVariable Long id) {
        logger.info("deleteGroup started for id={}", id);
        try {
            assessmentService.deleteGroup(id);
            ResponseEntity<Void> response = ResponseEntity.noContent().build();
            logger.info("deleteGroup completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("deleteGroup failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    // ── Questions ─────────────────────────────────────────────────────────────

    @GetMapping("/questions")
    public ResponseEntity<Page<com.mymercurie.assessment.dto.QuestionResponse>> getQuestions(
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "50") int size) {
        logger.info("getQuestions started");
        try {
            ResponseEntity<Page<QuestionResponse>> response = ResponseEntity.ok(assessmentService.getQuestions(page, size));
            logger.info("getQuestions completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getQuestions failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/questions/class/{className}")
    public ResponseEntity<List<QuestionResponse>> getQuestionsByClass(
            @PathVariable String className) {
        logger.info("getQuestionsByClass started for className={}", className);
        try {
            List<QuestionResponse> combinedQuestions = new ArrayList<>();

            List<GroupResponse> classGroups = assessmentService.getGroupsByClassName(className);
            for (GroupResponse group : classGroups) {
                List<QuestionResponse> qs = assessmentService.getQuestionsByGroupMap(group.getId());
                if (qs != null) combinedQuestions.addAll(qs);
            }

            List<QuestionResponse> finalQuestions = combinedQuestions.stream()
                    .filter(q -> q.getId() != null)
                    .collect(Collectors.collectingAndThen(
                            Collectors.toMap(
                                    QuestionResponse::getId,
                                    q -> q,
                                    (a, b) -> a,
                                    java.util.LinkedHashMap::new
                            ),
                            m -> new ArrayList<>(m.values())
                    ));

            ResponseEntity<List<QuestionResponse>> response = ResponseEntity.ok(finalQuestions);
            logger.info("getQuestionsByClass completed successfully for className={}", className);
            return response;
        } catch (Exception e) {
            logger.error("getQuestionsByClass failed for className={}: {}", className, e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/responses/by-class/{className}")
    public ResponseEntity<List<com.mymercurie.assessment.dto.ResponseDto>> getResponsesByClass(
            @PathVariable String className) {
        logger.info("getResponsesByClass started for className={}", className);
        try {
            ResponseEntity<List<ResponseDto>> response = ResponseEntity.ok(assessmentService.getResponsesByGroup(className));
            logger.info("getResponsesByClass completed successfully for className={}", className);
            return response;
        } catch (Exception e) {
            logger.error("getResponsesByClass failed for className={}: {}", className, e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/questions/group/{groupId}")
    public ResponseEntity<List<QuestionResponse>> getQuestionsByGroup(
            @PathVariable Long groupId) {
        logger.info("getQuestionsByGroup started for groupId={}", groupId);
        try {
            ResponseEntity<List<QuestionResponse>> response = ResponseEntity.ok(assessmentService.getQuestionsByGroupMap(groupId));
            logger.info("getQuestionsByGroup completed successfully for groupId={}", groupId);
            return response;
        } catch (Exception e) {
            logger.error("getQuestionsByGroup failed for groupId={}: {}", groupId, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/questions")
    public ResponseEntity<QuestionResponse> createQuestion(@RequestBody QuestionRequest request) {
        logger.info("createQuestion started");
        try {
            ResponseEntity<QuestionResponse> response = ResponseEntity.status(HttpStatus.CREATED).body(assessmentService.createQuestion(request));
            logger.info("createQuestion completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("createQuestion failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/questions/{id}")
    public ResponseEntity<QuestionResponse> updateQuestion(
            @PathVariable Long id, @RequestBody QuestionRequest request) {
        logger.info("updateQuestion started for id={}", id);
        try {
            ResponseEntity<QuestionResponse> response = ResponseEntity.ok(assessmentService.updateQuestion(id, request));
            logger.info("updateQuestion completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("updateQuestion failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/questions/{id}")
    public ResponseEntity<Void> deleteQuestion(@PathVariable Long id) {
        logger.info("deleteQuestion started for id={}", id);
        try {
            assessmentService.deleteQuestion(id);
            ResponseEntity<Void> response = ResponseEntity.noContent().build();
            logger.info("deleteQuestion completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("deleteQuestion failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    // ── Responses ─────────────────────────────────────────────────────────────

    @GetMapping("/responses")
    public ResponseEntity<Page<ResponseDto>> getResponses(
            @RequestParam(required = false) Long studentId,
            @RequestParam(defaultValue = "0") int page,
            @RequestParam(defaultValue = "200") int size) {
        logger.info("getResponses started");
        try {
            ResponseEntity<Page<ResponseDto>> response = ResponseEntity.ok(assessmentService.getResponses(studentId, page, size));
            logger.info("getResponses completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getResponses failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping({"/responses/group/{groupName}", "/responses/sheet/{groupName}"})
    public ResponseEntity<List<ResponseDto>> getResponsesByGroup(@PathVariable String groupName) {
        logger.info("getResponsesByGroup/Sheet started for groupName={}", groupName);
        try {
            ResponseEntity<List<ResponseDto>> response = ResponseEntity.ok(assessmentService.getResponsesByGroup(groupName));
            logger.info("getResponsesByGroup/Sheet completed successfully for groupName={}", groupName);
            return response;
        } catch (Exception e) {
            logger.error("getResponsesByGroup/Sheet failed for groupName={}: {}", groupName, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/responses")
    public ResponseEntity<ResponseDto> createResponse(@RequestBody ResponseRequest request) {
        logger.info("createResponse started");
        try {
            ResponseEntity<ResponseDto> response = ResponseEntity.status(HttpStatus.CREATED).body(assessmentService.createResponse(request));
            logger.info("createResponse completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("createResponse failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    // ── AI Summary ────────────────────────────────────────────────────────────
    // Called by the admin response sheet to show AI summary per student.


    @GetMapping("/responses/summary/{studentId}")
    public ResponseEntity<Map<String, Object>> getStudentSummary(
            @PathVariable String studentId,
            @RequestParam(required = false) Long groupId) {
        logger.info("getStudentSummary studentId={} groupId={}", studentId, groupId);

        Map<String, Object> result = new LinkedHashMap<>();
        try {
            if (groupId == null) {
                result.put("summary", null);
                result.put("bulletPoints", null);
                return ResponseEntity.ok(result);
            }

            reportService.getLatestReport(studentId, groupId).ifPresentOrElse(
                    report -> {
                        result.put("id",                report.getId());
                        result.put("summary",           report.getSummaryText());
                        result.put("summaryText",       report.getSummaryText());
                        result.put("bulletPoints",      report.getBulletPoints());
                        result.put("editedSummaryText", report.getEditedSummaryText());
                        result.put("editedBy",          report.getEditedBy());
                        result.put("confirmed",         report.getConfirmed() != null ? report.getConfirmed() : "N");
                        result.put("studentId",         report.getStudentId());
                        result.put("sessionDate",       report.getSessionDate());
                    },
                    () -> {
                        result.put("summary",      null);
                        result.put("bulletPoints", null);
                    }
            );
        } catch (Exception e) {
            logger.error("getStudentSummary failed for studentId={}: {}", studentId, e.getMessage(), e);
            result.put("summary",      null);
            result.put("bulletPoints", null);
        }
        return ResponseEntity.ok(result);
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    @GetMapping("/analytics/summary")
    public ResponseEntity<Map<String, Object>> getAnalyticsSummary(
            @RequestParam(defaultValue = "ALL") String filter) {
        logger.info("getAnalyticsSummary started for filter={}", filter);
        try {
            ResponseEntity<Map<String, Object>> response = ResponseEntity.ok(assessmentService.getAnalyticsSummary(filter));
            logger.info("getAnalyticsSummary completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getAnalyticsSummary failed for filter={}: {}", filter, e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/analytics/group/{groupName}")
    public ResponseEntity<Map<String, Object>> getGroupAnalytics(
            @PathVariable String groupName,
            @RequestParam(defaultValue = "ALL") String filter) {
        logger.info("getGroupAnalytics started for groupName={}, filter={}", groupName, filter);
        try {
            ResponseEntity<Map<String, Object>> response = ResponseEntity.ok(assessmentService.getGroupAnalytics(groupName, filter));
            logger.info("getGroupAnalytics completed successfully for groupName={}", groupName);
            return response;
        } catch (Exception e) {
            logger.error("getGroupAnalytics failed for groupName={}: {}", groupName, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/api/test-responses")
    public ResponseEntity<String> testEndpoint(@RequestBody(required = false) String body) {
        logger.info("testEndpoint started");
        try {
            ResponseEntity<String> response = ResponseEntity.ok("Works! Body: " + body);
            logger.info("testEndpoint completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("testEndpoint failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/assessment/reports/{id}/edit")
    public ResponseEntity<Map<String, Object>> editInsight(
            @PathVariable Long id,
            @RequestBody Map<String, String> body) {
        String editedText = body.getOrDefault("editedText", "");
        String editedBy = getCurrentUsername();
        logger.info("editInsight reportId={} by {}", id, editedBy);
        com.mymercurie.assessment.dto.AssessmentReportResponse updated =
                reportService.updateEditedSummary(id, editedText, editedBy);
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id",                updated.getId());
        result.put("summaryText",       updated.getSummaryText());
        result.put("bulletPoints",      updated.getBulletPoints());
        result.put("editedSummaryText", updated.getEditedSummaryText());
        result.put("editedBy",          updated.getEditedBy());
        result.put("confirmed",         updated.getConfirmed());
        return ResponseEntity.ok(result);
    }

    @PutMapping("/assessment/reports/{id}/confirm")
    public ResponseEntity<Map<String, Object>> confirmInsight(@PathVariable Long id) {
        String confirmedBy = getCurrentUsername();
        logger.info("confirmInsight reportId={} by {}", id, confirmedBy);
        com.mymercurie.assessment.dto.AssessmentReportResponse updated =
                reportService.confirmInsight(id, confirmedBy);
        Map<String, Object> result = new java.util.LinkedHashMap<>();
        result.put("id",        updated.getId());
        result.put("confirmed", updated.getConfirmed());
        result.put("editedBy",  updated.getEditedBy());
        return ResponseEntity.ok(result);
    }

    private String getCurrentUsername() {
        try {
            var auth = SecurityContextHolder.getContext().getAuthentication();
            if (auth != null && auth.getPrincipal() != null) {
                Object p = auth.getPrincipal();
                if (p instanceof org.springframework.security.core.userdetails.UserDetails ud) {
                    return ud.getUsername();
                }
                return p.toString();
            }
        } catch (Exception ignored) {}
        return "unknown";
    }

}