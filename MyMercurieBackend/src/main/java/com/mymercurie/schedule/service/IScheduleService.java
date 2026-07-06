package com.mymercurie.schedule.service;

import com.mymercurie.schedule.dto.TaskRequest;
import com.mymercurie.schedule.dto.TaskResponse;

import java.time.LocalDate;
import java.time.YearMonth;
import java.util.List;
import java.util.Map;

public interface IScheduleService {

    TaskResponse addTask(TaskRequest request);

    TaskResponse editTask(Long taskId, TaskRequest request);

    TaskResponse toggleComplete(Long taskId);

    void deleteTask(Long taskId);

    List<TaskResponse> getTasksForDate(Long studentId, LocalDate date);

    Map<LocalDate, List<TaskResponse>> getMonthTasks(Long studentId, YearMonth month);
}