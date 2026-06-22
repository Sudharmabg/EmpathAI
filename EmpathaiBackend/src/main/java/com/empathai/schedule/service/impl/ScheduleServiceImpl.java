package com.empathai.schedule.service.impl;

import com.empathai.user.entity.Student;
import com.empathai.user.exception.EmpathaiException;
import com.empathai.user.repository.StudentRepository;
import com.empathai.schedule.dto.RuleResult;
import com.empathai.schedule.dto.TaskRequest;
import com.empathai.schedule.dto.TaskResponse;
import com.empathai.schedule.entity.ScheduleTask;
import com.empathai.schedule.repository.ScheduleTaskRepository;
import com.empathai.schedule.repository.StudentSchedulePreferenceRepository;
import com.empathai.schedule.entity.StudentSchedulePreference;
import com.empathai.schedule.service.IScheduleService;
import com.empathai.schedule.service.ScheduleRuleEngine;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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
    private final StudentSchedulePreferenceRepository preferenceRepository;

    // ─────────────────────────────────────────────────────────────────────────
    // ADD TASK
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TaskResponse addTask(TaskRequest request) {
        String studentGrade = getStudentGrade(request.getStudentId());

        RuleResult result = ruleEngine.validate(request, studentGrade);

        if (result.hasErrors()) {
            throw new EmpathaiException(result.getErrors().get(0), "RULE_VIOLATION");
        }

<<<<<<< HEAD
        String detectedType = ruleEngine.detectType(request.getTitle());
=======
        // auto-detect type silently if not provided, otherwise use passed type
        String detectedType = request.getDetectedType();
        if (detectedType == null || detectedType.isBlank()) {
            detectedType = ruleEngine.detectType(request.getTitle());
        } else {
            detectedType = detectedType.toUpperCase();
        }
>>>>>>> 27769a253f6926e6af04d5afd95e5788956fd62f

        java.time.LocalDate weekStart = java.time.LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        ScheduleTask task = ScheduleTask.builder()
                .studentId(request.getStudentId())
                .weekStartDate(weekStart)
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

        if ("WELLNESS".equalsIgnoreCase(detectedType)) {
            saveLastRelaxActivity(request.getStudentId(), request.getTitle());
        }

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

        request.setExcludeTaskId(taskId);

        String studentGrade = getStudentGrade(request.getStudentId());
        RuleResult result = ruleEngine.validate(request, studentGrade);

        if (result.hasErrors()) {
            throw new EmpathaiException(result.getErrors().get(0), "RULE_VIOLATION");
        }

        String detectedType = request.getDetectedType();
        if (detectedType == null || detectedType.isBlank()) {
            detectedType = ruleEngine.detectType(request.getTitle());
        } else {
            detectedType = detectedType.toUpperCase();
        }

        existing.setTitle(request.getTitle());
        existing.setStartTime(request.getStartTime());
        existing.setEndTime(request.getEndTime());
        existing.setNotes(request.getNotes());
        existing.setDayOfWeek(request.getDayOfWeek());
        existing.setDetectedType(detectedType);

        ScheduleTask saved = taskRepository.save(existing);
        log.info("Task edited: id={} title={} type={}", taskId, saved.getTitle(), saved.getDetectedType());

        if ("WELLNESS".equalsIgnoreCase(detectedType)) {
            saveLastRelaxActivity(request.getStudentId(), request.getTitle());
        }

        return toResponse(saved, result.getWarnings());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // TOGGLE COMPLETE — awards +10 XP when task is marked complete
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TaskResponse toggleComplete(Long taskId) {
        ScheduleTask task = taskRepository.findById(taskId)
                .orElseThrow(() -> new EmpathaiException("Task not found", "NOT_FOUND"));

        boolean nowCompleted = !task.isCompleted();
        task.setCompleted(nowCompleted);
        ScheduleTask saved = taskRepository.save(task);

        // ── Award 10 XP when task is marked complete ──────────────────────
        int xpEarned = 0;
        if (nowCompleted) {
            Student student = studentRepository.findById(task.getStudentId())
                    .orElseThrow(() -> new EmpathaiException("Student not found", "NOT_FOUND"));
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
        java.time.LocalDate weekStart = java.time.LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        return taskRepository.findByStudentIdAndDayOfWeekAndWeekStartDate(studentId, day, weekStart)
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
        java.time.LocalDate weekStart = java.time.LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        List<ScheduleTask> allTasks = taskRepository.findByStudentIdAndWeekStartDate(studentId, weekStart);
        Map<String, List<ScheduleTask>> tasksByDay = allTasks.stream()
                .collect(Collectors.groupingBy(ScheduleTask::getDayOfWeek));

        List<String> days = List.of(
                "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday");

        return days.stream().collect(Collectors.toMap(
                day -> day,
                day -> tasksByDay.getOrDefault(day, List.of()).stream()
                        .sorted(Comparator.comparing(ScheduleTask::getStartTime))
                        .map(t -> toResponse(t, List.of()))
                        .collect(Collectors.toList()),
                (v1, v2) -> v1,
                LinkedHashMap::new
        ));
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private String getStudentGrade(Long studentId) {
        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new EmpathaiException("Student not found", "NOT_FOUND"));
        return student.getClassName();
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
                .xpEarned(0)
                .build();
    }
<<<<<<< HEAD
}
=======

    private void saveLastRelaxActivity(Long studentId, String title) {
        try {
            StudentSchedulePreference preference = preferenceRepository.findByStudentId(studentId)
                    .orElseGet(() -> StudentSchedulePreference.builder()
                            .studentId(studentId)
                            .preferredStudyTime("MORNING")
                            .build());
            preference.setLastRelaxActivity(title);
            preferenceRepository.save(preference);
            log.info("Saved last relax activity preference: studentId={}, title={}", studentId, title);
        } catch (Exception e) {
            log.error("Failed to save last relax activity for studentId={}", studentId, e);
        }
    }
}
>>>>>>> 27769a253f6926e6af04d5afd95e5788956fd62f
