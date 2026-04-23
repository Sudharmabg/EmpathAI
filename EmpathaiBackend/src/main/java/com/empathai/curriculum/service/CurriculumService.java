package com.empathai.curriculum.service;

import com.empathai.curriculum.dto.request.ModuleRequest;
import com.empathai.curriculum.dto.request.QuizQuestionRequest;
import com.empathai.curriculum.dto.request.SubTopicRequest;
import com.empathai.curriculum.dto.request.SyllabusRequest;
import com.empathai.curriculum.dto.response.ModuleResponse;
import com.empathai.curriculum.dto.response.QuizQuestionResponse;
import com.empathai.curriculum.dto.response.SubTopicResponse;
import com.empathai.curriculum.dto.response.SyllabusResponse;
import org.springframework.web.multipart.MultipartFile;

import java.util.List;

public interface CurriculumService {

    // Syllabus
    List<SyllabusResponse> getAllSyllabi();
    List<SyllabusResponse> getSyllabiByClassLevel(String classLevel);
    SyllabusResponse createSyllabus(SyllabusRequest request);
    SyllabusResponse updateSyllabus(Long id, SyllabusRequest request);
    void deleteSyllabus(Long id);

    // Module
    List<ModuleResponse> getModulesBySyllabus(Long syllabusId);
    ModuleResponse createModule(ModuleRequest request);
    ModuleResponse updateModule(Long id, ModuleRequest request);
    void deleteModule(Long id);

    // SubTopic
    List<SubTopicResponse> getSubTopicsByModule(Long moduleId);
    SubTopicResponse createSubTopic(SubTopicRequest request, MultipartFile summaryImage);
    SubTopicResponse updateSubTopic(Long id, SubTopicRequest request, MultipartFile summaryImage);
    void deleteSubTopic(Long id);

    // Quiz
    List<QuizQuestionResponse> getQuizBySubTopic(Long subTopicId);
    QuizQuestionResponse createQuizQuestion(QuizQuestionRequest request, MultipartFile questionImage);
    QuizQuestionResponse updateQuizQuestion(Long id, QuizQuestionRequest request, MultipartFile questionImage);
    void deleteQuizQuestion(Long id);
}