package com.empathai.schedule.service.impl;

import com.empathai.user.entity.Student;
import com.empathai.user.exception.EmpathaiException;
import com.empathai.user.repository.StudentRepository;
import com.empathai.schedule.dto.RuleResult;
import com.empathai.schedule.dto.TaskRequest;
import com.empathai.schedule.dto.TaskResponse;
import com.empathai.schedule.entity.ScheduleTask;
import com.empathai.schedule.repository.ScheduleTaskRepository;
import com.empathai.schedule.service.IScheduleService;
import com.empathai.schedule.service.ScheduleRuleEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // ─────────────────────────────────────────────────────────────────────────
    // ADD TASK
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TaskResponse addTask(TaskRequest request) {
        String studentGrade = getStudentGrade(request.getStudentId());

        // run all 12 rules
        RuleResult result = ruleEngine.validate(request, studentGrade);

        // if any hard block error exists — reject
        if (result.hasErrors()) {
            throw new EmpathaiException(result.getErrors().get(0), "RULE_VIOLATION");
        }

        // auto-detect type silently — never exposed to frontend
        String detectedType = ruleEngine.detectType(request.getTitle());

        ScheduleTask task = ScheduleTask.builder()
                .studentId(request.getStudentId())
                .dayOfWeek(request.getDayOfWeek())
                .title(request.getTitle())
                .startTime(request.getStartTime())
                .endTime(request.getEndTime())
                .notes(request.getNotes())
                .detectedType(detectedType)
                .completed(false)
                .build();

        ScheduleTask saved = taskRepository.save(task);
        log.info("Task added: studentId={} day={} title={} type={}",
                saved.getStudentId(), saved.getDayOfWeek(), saved.getTitle(), saved.getDetectedType());

        return toResponse(saved, result.getWarnings());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // EDIT TASK
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TaskResponse editTask(Long taskId, TaskRequest request) {
        ScheduleTask existing = taskRepository.findById(taskId)
                .orElseThrow(() -> new EmpathaiException("Task not found", "NOT_FOUND"));

        // set excludeTaskId so overlap/duplicate checks skip this task's own entry
        request.setExcludeTaskId(taskId);

        String studentGrade = getStudentGrade(request.getStudentId());
        RuleResult result = ruleEngine.validate(request, studentGrade);

        if (result.hasErrors()) {
            throw new EmpathaiException(result.getErrors().get(0), "RULE_VIOLATION");
        }

        String detectedType = ruleEngine.detectType(request.getTitle());

        existing.setTitle(request.getTitle());
        existing.setStartTime(request.getStartTime());
        existing.setEndTime(request.getEndTime());
        existing.setNotes(request.getNotes());
        existing.setDayOfWeek(request.getDayOfWeek());
        existing.setDetectedType(detectedType);

        ScheduleTask saved = taskRepository.save(existing);
        log.info("Task edited: id={} title={} type={}", taskId, saved.getTitle(), saved.getDetectedType());

        return toResponse(saved, result.getWarnings());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOGGLE COMPLETE
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TaskResponse toggleComplete(Long taskId) {
        ScheduleTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EmpathaiException("Task not found", "NOT_FOUND"));
        task.setCompleted(!task.isCompleted());
        return toResponse(taskRepository.save(task), List.of());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // DELETE TASK
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public void deleteTask(Long taskId) {
        if (!taskRepository.existsById(taskId)) {
            throw new EmpathaiException("Task not found", "NOT_FOUND");
        }
        taskRepository.deleteById(taskId);
        log.info("Task deleted: id={}", taskId);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET TASKS FOR A DAY
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public List<TaskResponse> getTasksForDay(Long studentId, String day) {
        return taskRepository.findByStudentIdAndDayOfWeek(studentId, day)
                .stream()
                .sorted((a, b) -> a.getStartTime().compareTo(b.getStartTime()))
                .map(t -> toResponse(t, List.of()))
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET FULL WEEK
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public Map<String, List<TaskResponse>> getWeekTasks(Long studentId) {
        List<String> days = List.of(
                "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday");

        return days.stream().collect(Collectors.toMap(
                day -> day,
                day -> getTasksForDay(studentId, day)
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private String getStudentGrade(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new EmpathaiException("Student not found", "NOT_FOUND"));
        return student.getClassName();  // grade column removed — className holds the class info
    }

    private TaskResponse toResponse(ScheduleTask task, List<String> warnings) {
        return TaskResponse.builder()
                .id(task.getId())
                .studentId(task.getStudentId())
                .dayOfWeek(task.getDayOfWeek())
                .title(task.getTitle())
                .startTime(task.getStartTime())
                .endTime(task.getEndTime())
                .notes(task.getNotes())
                .completed(task.isCompleted())
                .detectedType(task.getDetectedType())
                .warnings(warnings)
                .build();
    }
}
