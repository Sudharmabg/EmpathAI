package com.empathai.assessment.service;

import com.empathai.assessment.dto.*;
import org.springframework.data.domain.Page;

import java.util.List;
import java.util.Map;

public interface IAssessmentService {

    // Groups
    List<GroupResponse> getAllGroups();
    GroupResponse createGroup(GroupRequest request);
    void deleteGroup(Long id);

    // Questions
    Page<QuestionResponse> getQuestions(int page, int size);
    QuestionResponse createQuestion(QuestionRequest request);
    QuestionResponse updateQuestion(Long id, QuestionRequest request);
    void deleteQuestion(Long id);

    // CHANGED: Updated from String groupId to Long groupMapId
    List<QuestionResponse> getQuestionsByGroupMap(Long groupMapId);

    // Responses
    Page<ResponseDto> getResponses(Long studentId, int page, int size);
    List<ResponseDto> getResponsesByGroup(String groupName);
    ResponseDto createResponse(ResponseRequest request);

    // Analytics
    Map<String, Object> getAnalyticsSummary(String filter);
    Map<String, Object> getGroupAnalytics(String groupName, String filter);
    List<GroupResponse> getGroupsByClassName(String className);
    List<GroupResponse> getGroupsByGrade(String grade);
}