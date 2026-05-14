package com.empathai.assessment.service.impl;

import com.empathai.assessment.dto.*;
import com.empathai.assessment.entity.*;
import com.empathai.assessment.repository.*;
import com.empathai.assessment.service.IAssessmentService;
import com.empathai.user.exception.EmpathaiException;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.*;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class AssessmentServiceImpl implements IAssessmentService {

    private final AssessmentGroupRepository groupRepo;
    private final AssessmentQuestionRepository questionRepo;
    private final AssessmentResponseRepository responseRepo;

    // ── Groups ────────────────────────────────────────────────────────────────

    @Override
    public List<GroupResponse> getAllGroups() {
        return groupRepo.findAll().stream()
                .map(this::toGroupResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<GroupResponse> getGroupsByClassName(String className) {
        return groupRepo.findByClassName(className)
                .stream()
                .map(this::toGroupResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<GroupResponse> getGroupsByGrade(String grade) {
        return groupRepo.findByClassNameContainingIgnoreCase(grade)
                .stream()
                .map(this::toGroupResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public GroupResponse createGroup(GroupRequest request) {
        if (groupRepo.existsByName(request.getName())) {
            throw new EmpathaiException("Group '" + request.getName() + "' already exists", "DUPLICATE_GROUP");
        }
        AssessmentGroup g = AssessmentGroup.builder()
                .name(request.getName())
                .color(request.getColor())
                .isDefault(false)
                .className(request.getClassName())
                .build();
        return toGroupResponse(groupRepo.save(g));
    }

    @Override
    @Transactional
    public void deleteGroup(Long id) {
        if (!groupRepo.existsById(id))
            throw new EmpathaiException("Group not found", "NOT_FOUND");
        groupRepo.deleteById(id);
    }

    // ── Questions ─────────────────────────────────────────────────────────────

    @Override
    public Page<QuestionResponse> getQuestions(int page, int size) {
        return questionRepo.findAll(PageRequest.of(page, size))
                .map(this::toQuestionResponse);
    }

    @Override
    @Transactional
    public QuestionResponse createQuestion(QuestionRequest request) {
        String[] opts = request.getOptions() != null
                ? request.getOptions().split(",", -1)
                : new String[]{};

        AssessmentQuestion q = AssessmentQuestion.builder()
                .groupMapId(request.getGroupMapId())
                .questionText(request.getQuestionText())
                .optionA(opts.length > 0 ? opts[0].trim() : null)
                .optionB(opts.length > 1 ? opts[1].trim() : null)
                .optionC(opts.length > 2 ? opts[2].trim() : null)
                .optionD(opts.length > 3 ? opts[3].trim() : null)
                .build();
        return toQuestionResponse(questionRepo.save(q));
    }

    @Override
    @Transactional
    public QuestionResponse updateQuestion(Long id, QuestionRequest request) {
        AssessmentQuestion q = questionRepo.findById(id)
                .orElseThrow(() -> new EmpathaiException("Question not found", "NOT_FOUND"));

        if (request.getQuestionText() != null) q.setQuestionText(request.getQuestionText());
        if (request.getGroupMapId() != null) q.setGroupMapId(request.getGroupMapId());

        if (request.getOptions() != null) {
            String[] opts = request.getOptions().split(",", -1);
            if (opts.length > 0) q.setOptionA(opts[0].trim());
            if (opts.length > 1) q.setOptionB(opts[1].trim());
            if (opts.length > 2) q.setOptionC(opts[2].trim());
            if (opts.length > 3) q.setOptionD(opts[3].trim());
        }
        return toQuestionResponse(questionRepo.save(q));
    }

    @Override
    @Transactional
    public void deleteQuestion(Long id) {
        if (!questionRepo.existsById(id))
            throw new EmpathaiException("Question not found", "NOT_FOUND");

        responseRepo.deleteByQuestionId(id);
        questionRepo.deleteById(id);
    }

    @Override
    public List<QuestionResponse> getQuestionsByGroupMap(Long groupMapId) {
        return questionRepo.findByGroupMapId(groupMapId)
                .stream().map(this::toQuestionResponse).collect(Collectors.toList());
    }

    // ── Responses ─────────────────────────────────────────────────────────────

    @Override
    public Page<ResponseDto> getResponses(Long studentId, int page, int size) {
        return responseRepo.findAll(PageRequest.of(page, size))
                .map(this::toResponseDto);
    }

    @Override
    public List<ResponseDto> getResponsesByGroup(String groupName) {
        // STEP 4 FIX: First try exact group name match
        List<AssessmentResponse> byGroup = responseRepo.findByGroupName(groupName);
        if (!byGroup.isEmpty()) {
            return byGroup.stream().map(this::toResponseDto).collect(Collectors.toList());
        }

        // Fallback: try by className (handles case where class name was stored as group)
        List<AssessmentResponse> byClass = responseRepo.findByClassName(groupName);
        return byClass.stream().map(this::toResponseDto).collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ResponseDto createResponse(ResponseRequest request) {
        String value = request.getResponseValue() != null
                ? request.getResponseValue()
                : request.getAnswer();

        // STEP 5 FIX: Normalize class name before saving
        String normalizedClass = normalizeClassName(request.getClassName());

        // Check if response already exists for this student+question
        AssessmentResponse existing = responseRepo
                .findByStudentIdAndQuestionId(request.getStudentId(), request.getQuestionId())
                .orElse(null);

        if (existing != null) {
            // Update existing response
            existing.setResponseValue(value);
            existing.setEmotion(request.getEmotion());
            existing.setGroupName(request.getGroupName());
            existing.setClassName(normalizedClass);
            existing.setSchoolName(request.getSchoolName());
            if (request.getStudentName() != null && !request.getStudentName().isBlank())
                existing.setStudentName(request.getStudentName());
            if (request.getGender() != null) existing.setGender(request.getGender());
            if (request.getAge()    != null) existing.setAge(request.getAge());
            return toResponseDto(responseRepo.save(existing));
        }

        // Create new response
        AssessmentResponse r = AssessmentResponse.builder()
                .studentId(request.getStudentId())
                .studentName(request.getStudentName())
                .questionId(request.getQuestionId())
                .questionText(request.getQuestionText())
                .responseValue(value)
                .emotion(request.getEmotion())
                .groupId(request.getGroupId())
                .groupName(request.getGroupName())
                .className(normalizedClass)           // STEP 5 FIX
                .gender(request.getGender())
                .age(request.getAge())
                .schoolName(request.getSchoolName())
                .build();

        return toResponseDto(responseRepo.save(r));
    }

    // ── Analytics ─────────────────────────────────────────────────────────────

    @Override
    public Map<String, Object> getAnalyticsSummary(String filter) {
        Map<String, Object> summary = new LinkedHashMap<>();
        summary.put("totalGroups",    groupRepo.count());
        summary.put("totalQuestions", questionRepo.count());
        summary.put("totalResponses", responseRepo.count());
        summary.put("filter", filter);
        return summary;
    }

    @Override
    public Map<String, Object> getGroupAnalytics(String groupName, String filter) {
        List<AssessmentResponse> responses = responseRepo.findByGroupName(groupName);
        Map<String, Object> analytics = new LinkedHashMap<>();
        analytics.put("groupName",      groupName);
        analytics.put("totalResponses", responses.size());
        analytics.put("filter",         filter);
        return analytics;
    }

    // ── Helpers ───────────────────────────────────────────────────────────────


    private String normalizeClassName(String raw) {
        if (raw == null || raw.isBlank()) return raw;
        raw = raw.trim();

        // Already in correct format — leave it alone
        if (raw.toLowerCase().startsWith("class ")) return raw;

        // Remove " Standard" suffix if present (case-insensitive)
        String cleaned = raw.replaceAll("(?i)\\s*standard\\s*$", "").trim();

        // If it's a plain number like "8", add ordinal suffix → "8th"
        if (cleaned.matches("\\d+")) {
            int n = Integer.parseInt(cleaned);
            cleaned = n + ordinalSuffix(n);
        }

        return "Class " + cleaned;
    }


    private String ordinalSuffix(int n) {
        int v = n % 100;
        if (v >= 11 && v <= 13) return "th";
        switch (n % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    }

    // ── Mappers ───────────────────────────────────────────────────────────────

    private GroupResponse toGroupResponse(AssessmentGroup g) {
        return GroupResponse.builder()
                .id(g.getId())
                .name(g.getName())
                .description(g.getDescription())
                .color(g.getColor())
                .isDefault(g.getIsDefault())
                .createdAt(g.getCreatedAt())
                .className(g.getClassName())
                .build();
    }

    private QuestionResponse toQuestionResponse(AssessmentQuestion q) {
        return QuestionResponse.builder()
                .id(q.getId())
                .groupMapId(q.getGroupMapId())
                .questions(q.getQuestionText())
                .optionA(q.getOptionA())
                .optionB(q.getOptionB())
                .optionC(q.getOptionC())
                .optionD(q.getOptionD())
                .createdAt(q.getCreatedAt())
                .build();
    }

    private ResponseDto toResponseDto(AssessmentResponse r) {
        return ResponseDto.builder()
                .id(r.getId())
                .studentId(r.getStudentId())
                .studentName(r.getStudentName())
                .questionId(r.getQuestionId())
                .questionText(r.getQuestionText())
                .responseValue(r.getResponseValue())
                .answer(r.getResponseValue())
                .emotion(r.getEmotion())
                .className(r.getClassName())
                .groupId(r.getGroupId())
                .groupName(r.getGroupName())
                .gender(r.getGender())
                .age(r.getAge())
                .schoolName(r.getSchoolName())
                .submittedAt(r.getSubmittedAt())
                .build();
    }

}