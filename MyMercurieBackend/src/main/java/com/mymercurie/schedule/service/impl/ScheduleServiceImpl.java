package com.mymercurie.schedule.service.impl;

import com.mymercurie.user.entity.Student;
import com.mymercurie.user.exception.MyMercurieException;
import com.mymercurie.user.repository.StudentRepository;
import com.mymercurie.schedule.dto.RuleResult;
import com.mymercurie.schedule.dto.TaskRequest;
import com.mymercurie.schedule.dto.TaskResponse;
import com.mymercurie.schedule.entity.ScheduleTask;
import com.mymercurie.schedule.repository.ScheduleTaskRepository;
import com.mymercurie.schedule.service.IScheduleService;
import com.mymercurie.schedule.service.ScheduleRuleEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.LocalTime;
import java.time.YearMonth;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleServiceImpl implements IScheduleService {

    private final ScheduleTaskRepository taskRepository;
    private final StudentRepository studentRepository;
    private final ScheduleRuleEngine ruleEngine;

    @Override
    @Transactional
    public TaskResponse addTask(TaskRequest request) {
        String studentGrade = getStudentGrade(request.getStudentId());
        RuleResult result = ruleEngine.validate(request, studentGrade);
        if (result.hasErrors()) {
            throw new MyMercurieException(result.getErrors().get(0), "RULE_VIOLATION");
        }

        String detectedType = request.getDetectedType();
        if (detectedType == null || detectedType.isBlank()) {
            detectedType = ruleEngine.detectType(request.getTitle());
        } else {
            detectedType = detectedType.toUpperCase();
        }

        ScheduleTask task = ScheduleTask.builder()
                .studentId(request.getStudentId())
                .taskDate(request.getDate())
                .title(request.getTitle())
                .startTime(request.getStartTime() != null ? LocalTime.parse(request.getStartTime()) : null)
                .endTime(request.getEndTime() != null ? LocalTime.parse(request.getEndTime()) : null)
                .notes(request.getNotes())
                .detectedType(detectedType)
                .completed(false)
                .build();
        ScheduleTask saved = taskRepository.save(task);
        log.info("Task added: studentId={} date={} title={} type={}",
                saved.getStudentId(), saved.getTaskDate(), saved.getTitle(), saved.getDetectedType());
        return toResponse(saved, result.getWarnings());
    }

    @Override
    @Transactional
    public TaskResponse editTask(Long taskId, TaskRequest request) {
        ScheduleTask existing = taskRepository.findById(taskId)
                .orElseThrow(() -> new MyMercurieException("Task not found", "NOT_FOUND"));
        request.setExcludeTaskId(taskId);
        String studentGrade = getStudentGrade(request.getStudentId());
        RuleResult result = ruleEngine.validate(request, studentGrade);
        if (result.hasErrors()) {
            throw new MyMercurieException(result.getErrors().get(0), "RULE_VIOLATION");
        }
        String detectedType = ruleEngine.detectType(request.getTitle());
        existing.setTitle(request.getTitle());
        existing.setStartTime(request.getStartTime() != null ? LocalTime.parse(request.getStartTime()) : null);
        existing.setEndTime(request.getEndTime() != null ? LocalTime.parse(request.getEndTime()) : null);
        existing.setNotes(request.getNotes());
        existing.setTaskDate(request.getDate());
        existing.setDetectedType(detectedType);
        ScheduleTask saved = taskRepository.save(existing);
        log.info("Task edited: id={} title={} type={}", taskId, saved.getTitle(), saved.getDetectedType());
        return toResponse(saved, result.getWarnings());
    }

    @Override
    @Transactional
    public TaskResponse toggleComplete(Long taskId) {
        ScheduleTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new MyMercurieException("Task not found", "NOT_FOUND"));
        boolean nowCompleted = !task.isCompleted();
        task.setCompleted(nowCompleted);
        ScheduleTask saved = taskRepository.save(task);

        int xpEarned = 0;
        if (nowCompleted) {
            Student student = studentRepository.findById(task.getStudentId())
                    .orElseThrow(() -> new MyMercurieException("Student not found", "NOT_FOUND"));
            student.setXp(student.getXp() + 10);
            studentRepository.save(student);
            xpEarned = 10;
            log.info("✅ +10 XP awarded to studentId={} for completing task '{}'",
                    task.getStudentId(), task.getTitle());
        }

        TaskResponse response = toResponse(saved, List.of());
        response.setXpEarned(xpEarned);
        return response;
    }

    @Override
    @Transactional
    public void deleteTask(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new MyMercurieException("Task not found", "NOT_FOUND");
        }
        taskRepository.deleteById(taskId);
        log.info("Task deleted: id={}", taskId);
    }

    @Override
    public List<TaskResponse> getTasksForDate(Long studentId, LocalDate date) {
        return taskRepository.findByStudentIdAndTaskDate(studentId, date)
                .stream()
                .sorted(Comparator.comparing(ScheduleTask::getStartTime))
                .map(t -> toResponse(t, List.of()))
                .collect(Collectors.toList());
    }

    @Override
    public Map<LocalDate, List<TaskResponse>> getMonthTasks(Long studentId, YearMonth month) {
        LocalDate start = month.atDay(1);
        LocalDate end = month.atEndOfMonth();
        List<ScheduleTask> allTasks = taskRepository.findByStudentIdAndTaskDateBetween(studentId, start, end);

        Map<LocalDate, List<ScheduleTask>> tasksByDate = allTasks.stream()
                .collect(Collectors.groupingBy(ScheduleTask::getTaskDate));

        Map<LocalDate, List<TaskResponse>> result = new LinkedHashMap<>();
        for (LocalDate d = start; !d.isAfter(end); d = d.plusDays(1)) {
            List<TaskResponse> dayTasks = tasksByDate.getOrDefault(d, List.of()).stream()
                    .sorted(Comparator.comparing(ScheduleTask::getStartTime))
                    .map(t -> toResponse(t, List.of()))
                    .collect(Collectors.toList());
            result.put(d, dayTasks);
        }
        return result;
    }

    private String getStudentGrade(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new MyMercurieException("Student not found", "NOT_FOUND"));
        return student.getClassName();
    }

    private TaskResponse toResponse(ScheduleTask task, List<String> warnings) {
        return TaskResponse.builder()
                .id(task.getId())
                .studentId(task.getStudentId())
                .date(task.getTaskDate())
                .dayOfWeek(task.getDayOfWeek())
                .title(task.getTitle())
                .startTime(task.getStartTime() != null ? task.getStartTime().toString() : "")
                .endTime(task.getEndTime() != null ? task.getEndTime().toString() : "")
                .notes(task.getNotes())
                .completed(task.isCompleted())
                .detectedType(task.getDetectedType())
                .warnings(warnings)
                .xpEarned(0)
                .build();
    }
}