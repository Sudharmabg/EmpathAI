package com.empathai.rewards.repository;

import com.empathai.rewards.entity.StudentAchievement;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentAchievementRepository extends JpaRepository<StudentAchievement, Long> {
    List<StudentAchievement> findByStudentId(Long studentId);
    boolean existsByStudentIdAndAchievementId(Long studentId, Long achievementId);
}