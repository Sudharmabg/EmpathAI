package com.empathai.rewards.repository;

import com.empathai.rewards.entity.StudentBadge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface StudentBadgeRepository extends JpaRepository<StudentBadge, Long> {

    @Query("SELECT sb FROM StudentBadge sb JOIN FETCH sb.badge WHERE sb.studentId = :studentId")
    List<StudentBadge> findByStudentId(@Param("studentId") Long studentId);

    boolean existsByStudentIdAndBadgeId(Long studentId, Long badgeId);

    long countByStudentId(Long studentId);
}