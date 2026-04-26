package com.empathai.activities.service;

import com.empathai.activities.dto.StudentGoalRequest;
import com.empathai.activities.dto.StudentGoalResponse;

import java.util.List;

public interface IActivityService {

    // Save a new goal for a student
    StudentGoalResponse saveGoal(StudentGoalRequest request);

    // Get all active goals for a student
    List<StudentGoalResponse> getGoals(Long studentId);

    // Delete a specific goal for a student
    void deleteGoal(Long studentId, Long goalId);
}