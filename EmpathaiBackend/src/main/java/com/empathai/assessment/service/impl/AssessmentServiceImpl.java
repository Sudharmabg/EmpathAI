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
    private final com.empathai.assessment.service.AnswerOptionService answerOptionService;
    private final com.empathai.user.repository.SchoolRepository schoolRepo;

    // ── Groups ────────────────────────────────────────────────────────────────

    @Override
    public List<GroupResponse> getAllGroups() {
        return groupRepo.findAll().stream()
                .map(this::toGroupResponse)
                .collect(Collectors.toList());
    }

    @Override
    public List<GroupResponse> getGroupsByClassName(String className) {
        return groupRepo.findByClassNameIgnoreCase(className)
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
        Page<AssessmentQuestion> questionsPage = questionRepo.findAll(PageRequest.of(page, size));
        List<AssessmentQuestion> content = questionsPage.getContent();
        List<Long> ids = content.stream().map(AssessmentQuestion::getId).collect(Collectors.toList());
        Map<Long, List<AnswerOption>> optionsMap = answerOptionService.getOptionsMapForQuestions(ids);

        List<QuestionResponse> responseList = content.stream()
                .map(q -> toQuestionResponse(q, optionsMap.getOrDefault(q.getId(), List.of())))
                .collect(Collectors.toList());

        return new PageImpl<>(responseList, PageRequest.of(page, size), questionsPage.getTotalElements());
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
                .domain(request.getDomain())
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
        if (request.getDomain() != null) q.setDomain(request.getDomain());

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
        answerOptionService.deleteByQuestionId(id);
        questionRepo.deleteById(id);
    }

    @Override
    public List<QuestionResponse> getQuestionsByGroupMap(Long groupMapId) {
        List<AssessmentQuestion> questions = questionRepo.findByGroupMapId(groupMapId);
        List<Long> ids = questions.stream().map(AssessmentQuestion::getId).collect(Collectors.toList());
        Map<Long, List<AnswerOption>> optionsMap = answerOptionService.getOptionsMapForQuestions(ids);
        return questions.stream()
                .map(q -> toQuestionResponse(q, optionsMap.getOrDefault(q.getId(), List.of())))
                .collect(Collectors.toList());
    }

    // ── Responses ─────────────────────────────────────────────────────────────

    @Override
    public Page<ResponseDto> getResponses(Long studentId, int page, int size) {
        return responseRepo.findAll(PageRequest.of(page, size))
                .map(this::toResponseDto);
    }

    @Override
    public List<ResponseDto> getResponsesByGroup(String groupName) {
        List<AssessmentResponse> byGroup = responseRepo.findByGroupName(groupName);
        if (!byGroup.isEmpty()) return byGroup.stream().map(this::toResponseDto).collect(Collectors.toList());

        // try case-insensitive
        List<AssessmentResponse> byGroupCI = responseRepo.findByGroupNameIgnoreCase(groupName);
        if (!byGroupCI.isEmpty()) return byGroupCI.stream().map(this::toResponseDto).collect(Collectors.toList());

        // try className
        List<AssessmentResponse> byClass = responseRepo.findByClassNameIgnoreCase(groupName);
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

        AssessmentResponse existing = responseRepo.findByStudentIdAndQuestionId(
                request.getStudentId(), request.getQuestionId())
                .orElse(null);

        if (existing != null) {
            // Update existing response
            existing.setResponseValue(value);
            existing.setEmotion(request.getEmotion());
            return toResponseDto(responseRepo.save(existing));
        }

        // Create new response
        AssessmentResponse r = AssessmentResponse.builder()
                .studentId(request.getStudentId())
                .questionId(request.getQuestionId())
                .responseValue(value)
                .emotion(request.getEmotion())
                .groupId(request.getGroupId())
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
        List<AnswerOption> options = answerOptionService.getOptionsMapForQuestions(List.of(q.getId()))
                .getOrDefault(q.getId(), List.of());
        return toQuestionResponse(q, options);
    }

    private QuestionResponse toQuestionResponse(AssessmentQuestion q, List<AnswerOption> options) {
        QuestionResponse.QuestionResponseBuilder builder = QuestionResponse.builder()
                .id(q.getId())
                .groupMapId(q.getGroupMapId())
                .questions(q.getQuestionText())
                .questionText(q.getQuestionText())
                .domain(q.getDomain())
                .optionA(q.getOptionA())
                .optionB(q.getOptionB())
                .optionC(q.getOptionC())
                .optionD(q.getOptionD())
                .createdAt(q.getCreatedAt());

        if (options != null) {
            for (AnswerOption opt : options) {
                Integer index = opt.getOptionIndex();
                if (index != null) {
                    if (index == 0) {
                        builder.option1OverallMeaning(opt.getOverallMeaning())
                               .option1Interpretation(opt.getInterpretation())
                               .option1Tag(opt.getTag());
                    } else if (index == 1) {
                        builder.option2OverallMeaning(opt.getOverallMeaning())
                               .option2Interpretation(opt.getInterpretation())
                               .option2Tag(opt.getTag());
                    } else if (index == 2) {
                        builder.option3OverallMeaning(opt.getOverallMeaning())
                               .option3Interpretation(opt.getInterpretation())
                               .option3Tag(opt.getTag());
                    } else if (index == 3) {
                        builder.option4OverallMeaning(opt.getOverallMeaning())
                               .option4Interpretation(opt.getInterpretation())
                               .option4Tag(opt.getTag());
                    }
                }
            }
        }
        return builder.build();
    }

    private ResponseDto toResponseDto(AssessmentResponse r) {
        String studentName = "";
        String className = "";
        String gender = "";
        Integer age = null;
        String schoolName = "";

        if (r.getStudent() != null) {
            studentName = r.getStudent().getName();
            className = r.getStudent().getClassName();
            gender = r.getStudent().getGender();
            if (r.getStudent().getDateOfBirth() != null) {
                try {
                    java.time.LocalDate dob = java.time.LocalDate.parse(r.getStudent().getDateOfBirth());
                    age = java.time.Period.between(dob, java.time.LocalDate.now()).getYears();
                } catch (Exception e) {
                    // ignore
                }
            }
            if (r.getStudent().getSchoolId() != null) {
                schoolName = schoolRepo.findById(r.getStudent().getSchoolId())
                        .map(com.empathai.user.entity.School::getName)
                        .orElse("");
            }
        }

        String groupName = r.getGroup() != null ? r.getGroup().getName() : "";
        String questionText = r.getQuestion() != null ? r.getQuestion().getQuestionText() : "";

        return ResponseDto.builder()
                .id(r.getId())
                .studentId(r.getStudentId())
                .studentName(studentName)
                .questionId(r.getQuestionId())
                .questionText(questionText)
                .responseValue(r.getResponseValue())
                .answer(r.getResponseValue())
                .emotion(r.getEmotion())
                .className(className)
                .groupId(r.getGroupId())
                .groupName(groupName)
                .gender(gender)
                .age(age)
                .schoolName(schoolName)
                .submittedAt(r.getSubmittedAt())
                .build();
    }

}