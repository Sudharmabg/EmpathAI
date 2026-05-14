package com.empathai.schedule.repository;

import com.empathai.schedule.entity.ExamDate;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.util.List;

public interface ExamDateRepository extends JpaRepository<ExamDate, Long> {

    List<ExamDate> findBySchoolIdAndClassNameAndExamDateAfterOrderByExamDateAsc(
            Long schoolId, String className, LocalDate after);

    List<ExamDate> findBySchoolId(Long schoolId);
}