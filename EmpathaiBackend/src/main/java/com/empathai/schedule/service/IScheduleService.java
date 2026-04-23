package com.empathai.schedule.service;

import com.empathai.schedule.dto.TaskRequest;
import com.empathai.schedule.dto.TaskResponse;

import java.util.List;
import java.util.Map;

public interface IScheduleService {

    // Add a new task
    TaskResponse addTask(TaskRequest request);

    // Edit an existing task
    TaskResponse editTask(Long taskId, TaskRequest request);

    // Toggle task completion
    TaskResponse toggleComplete(Long taskId);

    // Delete a task
    void deleteTask(Long taskId);

    // Get all tasks for a student on a specific day
    List<TaskResponse> getTasksForDay(Long studentId, String day);

    // Get full week schedule for a student
    Map<String, List<TaskResponse>> getWeekTasks(Long studentId);
}
