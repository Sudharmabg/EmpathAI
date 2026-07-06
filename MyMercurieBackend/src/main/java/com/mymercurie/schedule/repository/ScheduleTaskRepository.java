package com.mymercurie.schedule.repository;

import com.mymercurie.schedule.entity.ScheduleTask;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;

@Repository
public interface ScheduleTaskRepository extends JpaRepository<ScheduleTask, Long> {

    List<ScheduleTask> findByStudentIdAndTaskDate(Long studentId, LocalDate taskDate);

    List<ScheduleTask> findByStudentIdAndTaskDateBetween(Long studentId, LocalDate start, LocalDate end);

    List<ScheduleTask> findByStudentIdAndDetectedTypeAndTaskDateBetween(
            Long studentId, String detectedType, LocalDate start, LocalDate end);

    List<ScheduleTask> findByStudentIdAndTaskDateGreaterThanEqual(Long studentId, LocalDate date);

    List<ScheduleTask> findByTaskDateGreaterThanEqual(LocalDate date);
}