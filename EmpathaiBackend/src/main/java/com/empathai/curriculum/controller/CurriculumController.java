package com.empathai.curriculum.controller;

import com.empathai.curriculum.dto.request.ModuleRequest;
import com.empathai.curriculum.dto.request.QuizQuestionRequest;
import com.empathai.curriculum.dto.request.SubTopicRequest;
import com.empathai.curriculum.dto.request.SyllabusRequest;
import com.empathai.curriculum.dto.response.ModuleResponse;
import com.empathai.curriculum.dto.response.QuizQuestionResponse;
import com.empathai.curriculum.dto.response.SubTopicResponse;
import com.empathai.curriculum.dto.response.SyllabusResponse;
import com.empathai.curriculum.service.CurriculumService;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.*;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/curriculum")
@Validated
public class CurriculumController {

    private static final Logger logger = LoggerFactory.getLogger(CurriculumController.class);

    private final CurriculumService curriculumService;

    public CurriculumController(CurriculumService curriculumService) {
        this.curriculumService = curriculumService;
    }

    private String normalizeText(String text) {
        if (text == null) return null;
        return text.replace("\r\n", "\n").replace("\r", "\n").trim();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SYLLABUS
    // ═══════════════════════════════════════════════════════════════════════

    @GetMapping("/syllabi")
    public ResponseEntity<List<SyllabusResponse>> getAllSyllabi() {
        logger.info("getAllSyllabi started");
        try {
            ResponseEntity<List<SyllabusResponse>> response = ResponseEntity.ok(curriculumService.getAllSyllabi());
            logger.info("getAllSyllabi completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("getAllSyllabi failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @GetMapping("/syllabi/class/{classLevel}")
    public ResponseEntity<List<SyllabusResponse>> getSyllabiByClass(
            @PathVariable String classLevel) {
        logger.info("getSyllabiByClass started for classLevel={}", classLevel);
        try {
            ResponseEntity<List<SyllabusResponse>> response = ResponseEntity.ok(curriculumService.getSyllabiByClassLevel(classLevel));
            logger.info("getSyllabiByClass completed successfully for classLevel={}", classLevel);
            return response;
        } catch (Exception e) {
            logger.error("getSyllabiByClass failed for classLevel={}: {}", classLevel, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/syllabi")
    public ResponseEntity<SyllabusResponse> createSyllabus(
            @Valid @RequestBody SyllabusRequest request) {
        logger.info("createSyllabus started");
        try {
            ResponseEntity<SyllabusResponse> response = ResponseEntity.status(HttpStatus.CREATED)
                    .body(curriculumService.createSyllabus(request));
            logger.info("createSyllabus completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("createSyllabus failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/syllabi/{id}")
    public ResponseEntity<SyllabusResponse> updateSyllabus(
            @PathVariable Long id,
            @Valid @RequestBody SyllabusRequest request) {
        logger.info("updateSyllabus started for id={}", id);
        try {
            ResponseEntity<SyllabusResponse> response = ResponseEntity.ok(curriculumService.updateSyllabus(id, request));
            logger.info("updateSyllabus completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("updateSyllabus failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/syllabi/{id}")
    public ResponseEntity<Map<String, String>> deleteSyllabus(@PathVariable Long id) {
        logger.info("deleteSyllabus started for id={}", id);
        try {
            curriculumService.deleteSyllabus(id);
            ResponseEntity<Map<String, String>> response = ResponseEntity.ok(Map.of("message", "Syllabus deleted successfully"));
            logger.info("deleteSyllabus completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("deleteSyllabus failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODULE  (title only — no content fields)
    // ═══════════════════════════════════════════════════════════════════════

    @GetMapping("/modules/syllabus/{syllabusId}")
    public ResponseEntity<List<ModuleResponse>> getModules(@PathVariable Long syllabusId) {
        logger.info("getModules started for syllabusId={}", syllabusId);
        try {
            ResponseEntity<List<ModuleResponse>> response = ResponseEntity.ok(curriculumService.getModulesBySyllabus(syllabusId));
            logger.info("getModules completed successfully for syllabusId={}", syllabusId);
            return response;
        } catch (Exception e) {
            logger.error("getModules failed for syllabusId={}: {}", syllabusId, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping("/modules")
    public ResponseEntity<ModuleResponse> createModule(
            @Valid @RequestBody ModuleRequest request) {
        logger.info("createModule started");
        try {
            ResponseEntity<ModuleResponse> response = ResponseEntity.status(HttpStatus.CREATED)
                    .body(curriculumService.createModule(request));
            logger.info("createModule completed successfully");
            return response;
        } catch (Exception e) {
            logger.error("createModule failed: {}", e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping("/modules/{id}")
    public ResponseEntity<ModuleResponse> updateModule(
            @PathVariable Long id,
            @Valid @RequestBody ModuleRequest request) {
        logger.info("updateModule started for id={}", id);
        try {
            ResponseEntity<ModuleResponse> response = ResponseEntity.ok(curriculumService.updateModule(id, request));
            logger.info("updateModule completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("updateModule failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/modules/{id}")
    public ResponseEntity<Map<String, String>> deleteModule(@PathVariable Long id) {
        logger.info("deleteModule started for id={}", id);
        try {
            curriculumService.deleteModule(id);
            ResponseEntity<Map<String, String>> response = ResponseEntity.ok(Map.of("message", "Module deleted successfully"));
            logger.info("deleteModule completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("deleteModule failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUBTOPIC
    // ═══════════════════════════════════════════════════════════════════════

    @GetMapping("/subtopics/module/{moduleId}")
    public ResponseEntity<List<SubTopicResponse>> getSubTopics(@PathVariable Long moduleId) {
        logger.info("getSubTopics started for moduleId={}", moduleId);
        try {
            ResponseEntity<List<SubTopicResponse>> response = ResponseEntity.ok(curriculumService.getSubTopicsByModule(moduleId));
            logger.info("getSubTopics completed successfully for moduleId={}", moduleId);
            return response;
        } catch (Exception e) {
            logger.error("getSubTopics failed for moduleId={}: {}", moduleId, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping(value = "/subtopics", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SubTopicResponse> createSubTopic(
            @RequestParam @NotNull(message = "Module ID must not be null") Long moduleId,
            @RequestParam @NotBlank(message = "SubTopic title must not be blank") String title,
            @RequestParam(required = false) String videoUrl,
            @RequestParam(required = false) String summary,
            @RequestParam(required = false) String learningObjectives,
            @RequestParam(required = false) Integer orderIndex,
            @RequestParam(required = false) MultipartFile summaryImage,
            @RequestParam(required = false) String createdBy) {
        logger.info("createSubTopic started for moduleId={}", moduleId);
        try {
            SubTopicRequest request = new SubTopicRequest(
                    moduleId,
                    normalizeText(title),
                    normalizeText(videoUrl),
                    normalizeText(summary),
                    normalizeText(learningObjectives),
                    orderIndex,
                    createdBy, null);

            ResponseEntity<SubTopicResponse> response = ResponseEntity.status(HttpStatus.CREATED)
                    .body(curriculumService.createSubTopic(request, summaryImage));
            logger.info("createSubTopic completed successfully for moduleId={}", moduleId);
            return response;
        } catch (Exception e) {
            logger.error("createSubTopic failed for moduleId={}: {}", moduleId, e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping(value = "/subtopics/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<SubTopicResponse> updateSubTopic(
            @PathVariable Long id,
            @RequestParam @NotNull(message = "Module ID must not be null") Long moduleId,
            @RequestParam @NotBlank(message = "SubTopic title must not be blank") String title,
            @RequestParam(required = false) String videoUrl,
            @RequestParam(required = false) String summary,
            @RequestParam(required = false) String learningObjectives,
            @RequestParam(required = false) Integer orderIndex,
            @RequestParam(required = false) MultipartFile summaryImage,
            @RequestParam(required = false) String modifiedBy) {
        logger.info("updateSubTopic started for id={}", id);
        try {
            SubTopicRequest request = new SubTopicRequest(
                    moduleId,
                    normalizeText(title),
                    normalizeText(videoUrl),
                    normalizeText(summary),
                    normalizeText(learningObjectives),
                    orderIndex,
                    null, modifiedBy);

            ResponseEntity<SubTopicResponse> response = ResponseEntity.ok(curriculumService.updateSubTopic(id, request, summaryImage));
            logger.info("updateSubTopic completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("updateSubTopic failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/subtopics/{id}")
    public ResponseEntity<Map<String, String>> deleteSubTopic(@PathVariable Long id) {
        logger.info("deleteSubTopic started for id={}", id);
        try {
            curriculumService.deleteSubTopic(id);
            ResponseEntity<Map<String, String>> response = ResponseEntity.ok(Map.of("message", "SubTopic deleted successfully"));
            logger.info("deleteSubTopic completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("deleteSubTopic failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUIZ
    // ═══════════════════════════════════════════════════════════════════════

    @GetMapping("/quiz/subtopic/{subTopicId}")
    public ResponseEntity<List<QuizQuestionResponse>> getQuiz(@PathVariable Long subTopicId) {
        logger.info("getQuiz started for subTopicId={}", subTopicId);
        try {
            ResponseEntity<List<QuizQuestionResponse>> response = ResponseEntity.ok(curriculumService.getQuizBySubTopic(subTopicId));
            logger.info("getQuiz completed successfully for subTopicId={}", subTopicId);
            return response;
        } catch (Exception e) {
            logger.error("getQuiz failed for subTopicId={}: {}", subTopicId, e.getMessage(), e);
            throw e;
        }
    }

    @PostMapping(value = "/quiz", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<QuizQuestionResponse> createQuiz(
            @RequestParam @NotNull(message = "SubTopic ID must not be null") Long subTopicId,
            @RequestParam @NotBlank(message = "Question text must not be blank") String questionText,
            @RequestParam @NotBlank(message = "Option A must not be blank") String optionA,
            @RequestParam @NotBlank(message = "Option B must not be blank") String optionB,
            @RequestParam @NotBlank(message = "Option C must not be blank") String optionC,
            @RequestParam @NotBlank(message = "Option D must not be blank") String optionD,
            @RequestParam @NotNull(message = "Correct answer must not be null") Integer correctAnswer,
            @RequestParam(required = false) String explanation,
            @RequestParam(required = false) MultipartFile questionImage,
            @RequestParam(required = false) String createdBy) {
        logger.info("createQuiz started for subTopicId={}", subTopicId);
        try {
            QuizQuestionRequest request = new QuizQuestionRequest(
                    subTopicId, questionText, optionA, optionB, optionC, optionD,
                    correctAnswer, explanation, createdBy, null);

            ResponseEntity<QuizQuestionResponse> response = ResponseEntity.status(HttpStatus.CREATED)
                    .body(curriculumService.createQuizQuestion(request, questionImage));
            logger.info("createQuiz completed successfully for subTopicId={}", subTopicId);
            return response;
        } catch (Exception e) {
            logger.error("createQuiz failed for subTopicId={}: {}", subTopicId, e.getMessage(), e);
            throw e;
        }
    }

    @PutMapping(value = "/quiz/{id}", consumes = MediaType.MULTIPART_FORM_DATA_VALUE)
    public ResponseEntity<QuizQuestionResponse> updateQuiz(
            @PathVariable Long id,
            @RequestParam @NotNull(message = "SubTopic ID must not be null") Long subTopicId,
            @RequestParam @NotBlank(message = "Question text must not be blank") String questionText,
            @RequestParam @NotBlank(message = "Option A must not be blank") String optionA,
            @RequestParam @NotBlank(message = "Option B must not be blank") String optionB,
            @RequestParam @NotBlank(message = "Option C must not be blank") String optionC,
            @RequestParam @NotBlank(message = "Option D must not be blank") String optionD,
            @RequestParam @NotNull(message = "Correct answer must not be null") Integer correctAnswer,
            @RequestParam(required = false) String explanation,
            @RequestParam(required = false) MultipartFile questionImage,
            @RequestParam(required = false) String modifiedBy) {
        logger.info("updateQuiz started for id={}", id);
        try {
            QuizQuestionRequest request = new QuizQuestionRequest(
                    subTopicId, questionText, optionA, optionB, optionC, optionD,
                    correctAnswer, explanation, null, modifiedBy);

            ResponseEntity<QuizQuestionResponse> response = ResponseEntity.ok(curriculumService.updateQuizQuestion(id, request, questionImage));
            logger.info("updateQuiz completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("updateQuiz failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }

    @DeleteMapping("/quiz/{id}")
    public ResponseEntity<Map<String, String>> deleteQuiz(@PathVariable Long id) {
        logger.info("deleteQuiz started for id={}", id);
        try {
            curriculumService.deleteQuizQuestion(id);
            ResponseEntity<Map<String, String>> response = ResponseEntity.ok(Map.of("message", "Quiz question deleted successfully"));
            logger.info("deleteQuiz completed successfully for id={}", id);
            return response;
        } catch (Exception e) {
            logger.error("deleteQuiz failed for id={}: {}", id, e.getMessage(), e);
            throw e;
        }
    }
}