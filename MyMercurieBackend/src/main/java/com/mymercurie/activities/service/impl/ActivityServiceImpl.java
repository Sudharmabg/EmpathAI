package com.mymercurie.activities.service.impl;

import com.mymercurie.activities.dto.StudentGoalRequest;
import com.mymercurie.activities.dto.StudentGoalResponse;
import com.mymercurie.activities.entity.StudentGoal;
import com.mymercurie.activities.repository.StudentGoalRepository;
import com.mymercurie.activities.service.IActivityService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ActivityServiceImpl implements IActivityService {

    private final StudentGoalRepository studentGoalRepository;

    @Override
    public StudentGoalResponse saveGoal(StudentGoalRequest request) {
        StudentGoal goal = StudentGoal.builder()
                .studentId(request.getStudentId())
                .goalText(request.getGoalText())
                .subjectTag(request.getSubjectTag())
                .targetDate(request.getTargetDate())
                .build();

        StudentGoal saved = studentGoalRepository.save(goal);
        log.info("Goal saved for studentId={}, subject={}", saved.getStudentId(), saved.getSubjectTag());
        return mapToResponse(saved);
    }

    @Override
    public List<StudentGoalResponse> getGoals(Long studentId) {
        return studentGoalRepository.findByStudentIdAndActiveTrue(studentId)
                .stream()
                .map(this::mapToResponse)
                .collect(Collectors.toList());
    }

    @Override
    @Transactional
    public void deleteGoal(Long studentId, Long goalId) {
        studentGoalRepository.deleteByStudentIdAndId(studentId, goalId);
        log.info("Goal deleted — studentId={}, goalId={}", studentId, goalId);
    }

    private StudentGoalResponse mapToResponse(StudentGoal goal) {
        return StudentGoalResponse.builder()
                .id(goal.getId())
                .goalText(goal.getGoalText())
                .subjectTag(goal.getSubjectTag())
                .targetDate(goal.getTargetDate())
                .createdAt(goal.getCreatedAt())
                .build();
    }
}