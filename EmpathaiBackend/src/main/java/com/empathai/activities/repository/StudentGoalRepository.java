package com.empathai.activities.repository;

import com.empathai.activities.entity.StudentGoal;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentGoalRepository extends JpaRepository<StudentGoal, Long> {

    // Fetch all active goals for a student
    List<StudentGoal> findByStudentIdAndActiveTrue(Long studentId);

    // Delete a specific goal belonging to a student
    void deleteByStudentIdAndId(Long studentId, Long goalId);
}