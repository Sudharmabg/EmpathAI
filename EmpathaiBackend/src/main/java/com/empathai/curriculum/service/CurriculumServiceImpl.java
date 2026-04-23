package com.empathai.curriculum.service;

import com.empathai.curriculum.dto.request.ModuleRequest;
import com.empathai.curriculum.dto.request.QuizQuestionRequest;
import com.empathai.curriculum.dto.request.SubTopicRequest;
import com.empathai.curriculum.dto.request.SyllabusRequest;
import com.empathai.curriculum.dto.response.ModuleResponse;
import com.empathai.curriculum.dto.response.QuizQuestionResponse;
import com.empathai.curriculum.dto.response.SubTopicResponse;
import com.empathai.curriculum.dto.response.SyllabusResponse;
import com.empathai.curriculum.entity.Module;
import com.empathai.curriculum.entity.QuizQuestion;
import com.empathai.curriculum.entity.SubTopic;
import com.empathai.curriculum.entity.Syllabus;
import com.empathai.curriculum.exception.EmpathaiException;
import com.empathai.curriculum.repository.ModuleRepository;
import com.empathai.curriculum.repository.QuizQuestionRepository;
import com.empathai.curriculum.repository.SubTopicRepository;
import com.empathai.curriculum.repository.SyllabusRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;

import java.io.IOException;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
public class CurriculumServiceImpl implements CurriculumService {

    private final SyllabusRepository syllabusRepository;
    private final ModuleRepository moduleRepository;
    private final SubTopicRepository subTopicRepository;
    private final QuizQuestionRepository quizQuestionRepository;

    public CurriculumServiceImpl(SyllabusRepository syllabusRepository,
                                 ModuleRepository moduleRepository,
                                 SubTopicRepository subTopicRepository,
                                 QuizQuestionRepository quizQuestionRepository) {
        this.syllabusRepository     = syllabusRepository;
        this.moduleRepository       = moduleRepository;
        this.subTopicRepository     = subTopicRepository;
        this.quizQuestionRepository = quizQuestionRepository;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SYLLABUS
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<SyllabusResponse> getAllSyllabi() {
        return syllabusRepository.findAllByOrderByIdAsc()
                .stream()
                .map(this::toSyllabusResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional(readOnly = true)
    public List<SyllabusResponse> getSyllabiByClassLevel(String classLevel) {
        // Normalise: strip a leading "Class" prefix (case-insensitive) and trim whitespace
        // e.g. "Class5th Standard" → "5th Standard"
        // e.g. "Class 5th Standard" → "5th Standard"
        String normalised = classLevel
                .replaceAll("(?i)^class\\s*", "")
                .trim();

        List<SyllabusResponse> results = syllabusRepository
                .findByClassLevelFlexible(classLevel, normalised)
                .stream()
                .map(this::toSyllabusResponse)
                .collect(Collectors.toList());

        // If flexible match found results, return them
        if (!results.isEmpty()) {
            return results;
        }

        // Last resort: exact match with original value
        return syllabusRepository.findByClassLevel(classLevel)
                .stream()
                .map(this::toSyllabusResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SyllabusResponse createSyllabus(SyllabusRequest request) {
        Syllabus syllabus = new Syllabus();
        syllabus.setSubject(request.getSubject());
        syllabus.setClassLevel(request.getClassLevel());
        syllabus.setCreatedBy(request.getCreatedBy());
        syllabus.setUpdatedBy(request.getCreatedBy());
        return toSyllabusResponse(syllabusRepository.save(syllabus));
    }

    @Override
    @Transactional
    public SyllabusResponse updateSyllabus(Long id, SyllabusRequest request) {
        Syllabus syllabus = syllabusRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException(
                        "Syllabus not found with id: " + id, HttpStatus.NOT_FOUND));
        syllabus.setSubject(request.getSubject());
        syllabus.setClassLevel(request.getClassLevel());
        syllabus.setUpdatedBy(request.getUpdatedBy());
        return toSyllabusResponse(syllabusRepository.save(syllabus));
    }

    @Override
    @Transactional
    public void deleteSyllabus(Long id) {
        if (!syllabusRepository.existsById(id))
            throw new EmpathaiException("Syllabus not found with id: " + id, HttpStatus.NOT_FOUND);
        syllabusRepository.deleteById(id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MODULE
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<ModuleResponse> getModulesBySyllabus(Long syllabusId) {
        return moduleRepository.findBySyllabusIdOrderByIdAsc(syllabusId)
                .stream()
                .map(this::toModuleResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public ModuleResponse createModule(ModuleRequest request) {
        Syllabus syllabus = syllabusRepository.findById(request.getSyllabusId())
                .orElseThrow(() -> new EmpathaiException(
                        "Syllabus not found with id: " + request.getSyllabusId(), HttpStatus.NOT_FOUND));

        Module module = new Module();
        module.setSyllabus(syllabus);
        module.setTitle(request.getTitle());
        module.setCreatedBy(request.getCreatedBy());
        module.setUpdatedBy(request.getCreatedBy());

        return toModuleResponse(moduleRepository.save(module));
    }

    @Override
    @Transactional
    public ModuleResponse updateModule(Long id, ModuleRequest request) {
        Module module = moduleRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException(
                        "Module not found with id: " + id, HttpStatus.NOT_FOUND));
        module.setTitle(request.getTitle());
        module.setUpdatedBy(request.getUpdatedBy());
        return toModuleResponse(moduleRepository.save(module));
    }

    @Override
    @Transactional
    public void deleteModule(Long id) {
        if (!moduleRepository.existsById(id))
            throw new EmpathaiException("Module not found with id: " + id, HttpStatus.NOT_FOUND);
        moduleRepository.deleteById(id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SUBTOPIC
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<SubTopicResponse> getSubTopicsByModule(Long moduleId) {
        return subTopicRepository.findByModuleIdOrderByOrderIndexAscIdAsc(moduleId)
                .stream()
                .map(this::toSubTopicResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public SubTopicResponse createSubTopic(SubTopicRequest request, MultipartFile summaryImage) {
        Module module = moduleRepository.findById(request.getModuleId())
                .orElseThrow(() -> new EmpathaiException(
                        "Module not found with id: " + request.getModuleId(), HttpStatus.NOT_FOUND));

        SubTopic subTopic = new SubTopic();
        subTopic.setModule(module);
        subTopic.setTitle(request.getTitle());
        subTopic.setVideoUrl(request.getVideoUrl());
        subTopic.setSummary(request.getSummary());
        subTopic.setLearningObjectives(request.getLearningObjectives());
        subTopic.setOrderIndex(request.getOrderIndex() != null ? request.getOrderIndex() : 0);
        subTopic.setCreatedBy(request.getCreatedBy());
        subTopic.setUpdatedBy(request.getCreatedBy());
        applySubTopicImage(subTopic, summaryImage);

        return toSubTopicResponse(subTopicRepository.save(subTopic));
    }

    @Override
    @Transactional
    public SubTopicResponse updateSubTopic(Long id, SubTopicRequest request, MultipartFile summaryImage) {
        SubTopic subTopic = subTopicRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException(
                        "SubTopic not found with id: " + id, HttpStatus.NOT_FOUND));

        subTopic.setTitle(request.getTitle());
        subTopic.setVideoUrl(request.getVideoUrl());
        subTopic.setSummary(request.getSummary());
        subTopic.setLearningObjectives(request.getLearningObjectives());
        if (request.getOrderIndex() != null) subTopic.setOrderIndex(request.getOrderIndex());
        subTopic.setUpdatedBy(request.getUpdatedBy());
        applySubTopicImage(subTopic, summaryImage);

        return toSubTopicResponse(subTopicRepository.save(subTopic));
    }

    @Override
    @Transactional
    public void deleteSubTopic(Long id) {
        if (!subTopicRepository.existsById(id))
            throw new EmpathaiException("SubTopic not found with id: " + id, HttpStatus.NOT_FOUND);
        subTopicRepository.deleteById(id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // QUIZ
    // ═══════════════════════════════════════════════════════════════════════

    @Override
    @Transactional(readOnly = true)
    public List<QuizQuestionResponse> getQuizBySubTopic(Long subTopicId) {
        return quizQuestionRepository.findBySubTopicIdOrderByIdAsc(subTopicId)
                .stream()
                .map(this::toQuizResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public QuizQuestionResponse createQuizQuestion(QuizQuestionRequest request, MultipartFile questionImage) {
        SubTopic subTopic = subTopicRepository.findById(request.getSubTopicId())
                .orElseThrow(() -> new EmpathaiException(
                        "SubTopic not found with id: " + request.getSubTopicId(), HttpStatus.NOT_FOUND));

        QuizQuestion q = new QuizQuestion();
        q.setSubTopic(subTopic);
        q.setQuestionText(request.getQuestionText());
        q.setOptionA(request.getOptionA());
        q.setOptionB(request.getOptionB());
        q.setOptionC(request.getOptionC());
        q.setOptionD(request.getOptionD());
        q.setCorrectAnswer(request.getCorrectAnswer());
        q.setExplanation(request.getExplanation());
        q.setCreatedBy(request.getCreatedBy());
        q.setUpdatedBy(request.getCreatedBy());
        applyQuizImage(q, questionImage);

        return toQuizResponse(quizQuestionRepository.save(q));
    }

    @Override
    @Transactional
    public QuizQuestionResponse updateQuizQuestion(Long id, QuizQuestionRequest request, MultipartFile questionImage) {
        QuizQuestion q = quizQuestionRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException(
                        "Quiz question not found with id: " + id, HttpStatus.NOT_FOUND));

        q.setQuestionText(request.getQuestionText());
        q.setOptionA(request.getOptionA());
        q.setOptionB(request.getOptionB());
        q.setOptionC(request.getOptionC());
        q.setOptionD(request.getOptionD());
        q.setCorrectAnswer(request.getCorrectAnswer());
        q.setExplanation(request.getExplanation());
        q.setUpdatedBy(request.getUpdatedBy());
        applyQuizImage(q, questionImage);

        return toQuizResponse(quizQuestionRepository.save(q));
    }

    @Override
    @Transactional
    public void deleteQuizQuestion(Long id) {
        if (!quizQuestionRepository.existsById(id))
            throw new EmpathaiException("Quiz question not found with id: " + id, HttpStatus.NOT_FOUND);
        quizQuestionRepository.deleteById(id);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // HELPERS
    // ═══════════════════════════════════════════════════════════════════════

    private void applySubTopicImage(SubTopic subTopic, MultipartFile image) {
        if (image != null && !image.isEmpty()) {
            try {
                subTopic.setSummaryImage(image.getBytes());
                subTopic.setSummaryImageType(image.getContentType());
            } catch (IOException ex) {
                throw new EmpathaiException(
                        "Failed to read subtopic image: " + ex.getMessage(),
                        HttpStatus.UNPROCESSABLE_ENTITY, ex);
            }
        }
    }

    private void applyQuizImage(QuizQuestion question, MultipartFile image) {
        if (image != null && !image.isEmpty()) {
            try {
                question.setQuestionImage(image.getBytes());
                question.setQuestionImageType(image.getContentType());
            } catch (IOException ex) {
                throw new EmpathaiException(
                        "Failed to read quiz image: " + ex.getMessage(),
                        HttpStatus.UNPROCESSABLE_ENTITY, ex);
            }
        }
    }

    private SyllabusResponse toSyllabusResponse(Syllabus s) {
        List<ModuleResponse> modules = (s.getModules() == null || s.getModules().isEmpty())
                ? Collections.emptyList()
                : s.getModules().stream().map(this::toModuleResponse).collect(Collectors.toList());

        return SyllabusResponse.builder()
                .id(s.getId())
                .subject(s.getSubject())
                .classLevel(s.getClassLevel())
                .createdBy(s.getCreatedBy())
                .createdAt(s.getCreatedAt())
                .updatedBy(s.getUpdatedBy())
                .updatedAt(s.getUpdatedAt())
                .modules(modules)
                .build();
    }

    private ModuleResponse toModuleResponse(Module m) {
        List<SubTopicResponse> subTopics =
                (m.getSubTopics() == null || m.getSubTopics().isEmpty())
                        ? Collections.emptyList()
                        : m.getSubTopics().stream().map(this::toSubTopicResponse).collect(Collectors.toList());

        return ModuleResponse.builder()
                .id(m.getId())
                .syllabusId(m.getSyllabus().getId())
                .title(m.getTitle())
                .createdBy(m.getCreatedBy())
                .createdAt(m.getCreatedAt())
                .updatedBy(m.getUpdatedBy())
                .updatedAt(m.getUpdatedAt())
                .subTopics(subTopics)
                .build();
    }

    private SubTopicResponse toSubTopicResponse(SubTopic st) {
        List<QuizQuestionResponse> quizzes =
                (st.getQuizQuestions() == null || st.getQuizQuestions().isEmpty())
                        ? Collections.emptyList()
                        : st.getQuizQuestions().stream().map(this::toQuizResponse).collect(Collectors.toList());

        return SubTopicResponse.builder()
                .id(st.getId())
                .moduleId(st.getModule().getId())
                .title(st.getTitle())
                .videoUrl(st.getVideoUrl())
                .summary(st.getSummary())
                .learningObjectives(st.getLearningObjectives())
                .summaryImageType(st.getSummaryImageType())
                .orderIndex(st.getOrderIndex())
                .createdBy(st.getCreatedBy())
                .createdAt(st.getCreatedAt())
                .updatedBy(st.getUpdatedBy())
                .updatedAt(st.getUpdatedAt())
                .quizzes(quizzes)
                .build();
    }

    private QuizQuestionResponse toQuizResponse(QuizQuestion q) {
        return QuizQuestionResponse.builder()
                .id(q.getId())
                .subTopicId(q.getSubTopic().getId())
                .questionText(q.getQuestionText())
                .optionA(q.getOptionA())
                .optionB(q.getOptionB())
                .optionC(q.getOptionC())
                .optionD(q.getOptionD())
                .correctAnswer(q.getCorrectAnswer())
                .explanation(q.getExplanation())
                .questionImageType(q.getQuestionImageType())
                .createdBy(q.getCreatedBy())
                .createdAt(q.getCreatedAt())
                .updatedBy(q.getUpdatedBy())
                .updatedAt(q.getUpdatedAt())
                .build();
    }
}