package com.empathai.schedule.repository;

import com.empathai.schedule.entity.ScheduleTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduleTaskRepository extends JpaRepository<ScheduleTask, Long> {

    // all tasks for a student on a specific day
    List<ScheduleTask> findByStudentIdAndDayOfWeek(Long studentId, String dayOfWeek);

    // full week for a student
    List<ScheduleTask> findByStudentId(Long studentId);

    // tasks for a student on a day by detected type (used by rule engine)
    List<ScheduleTask> findByStudentIdAndDayOfWeekAndDetectedType(
            Long studentId, String dayOfWeek, String detectedType);

    List<ScheduleTask> findByStudentIdAndDayOfWeekInAndDetectedType(Long studentId, List<String> prevDays, String study);
}
