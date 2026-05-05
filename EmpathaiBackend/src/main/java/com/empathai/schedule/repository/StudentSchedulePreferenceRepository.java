package com.empathai.schedule.repository;

import com.empathai.schedule.entity.StudentSchedulePreference;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface StudentSchedulePreferenceRepository
        extends JpaRepository<StudentSchedulePreference, Long> {

    Optional<StudentSchedulePreference> findByStudentId(Long studentId);

    boolean existsByStudentId(Long studentId);

    void deleteByStudentId(Long studentId);
}