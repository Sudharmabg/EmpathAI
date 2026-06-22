package com.empathai.schedule.repository;

import com.empathai.schedule.entity.ScheduleTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduleTaskRepository extends JpaRepository<ScheduleTask, Long> {

    // all tasks for a student on a specific day
    List<ScheduleTask> findByStudentIdAndDayOfWeekAndWeekStartDate(Long studentId, String dayOfWeek, java.time.LocalDate weekStartDate);

    // full week for a student
    List<ScheduleTask> findByStudentIdAndWeekStartDate(Long studentId, java.time.LocalDate weekStartDate);

    // tasks for a student on a day by detected type (used by rule engine)
    List<ScheduleTask> findByStudentIdAndDayOfWeekAndDetectedTypeAndWeekStartDate(
            Long studentId, String dayOfWeek, String detectedType, java.time.LocalDate weekStartDate);

    List<ScheduleTask> findByStudentIdAndDayOfWeekInAndDetectedTypeAndWeekStartDate(
            Long studentId, List<String> prevDays, String study, java.time.LocalDate weekStartDate);

    // ── NEW: for weekly task count in ChatService ─────────────────────────────
    List<ScheduleTask> findByStudentIdAndDayOfWeekInAndWeekStartDate(Long studentId, List<String> daysOfWeek, java.time.LocalDate weekStartDate);
}