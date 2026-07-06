package com.mymercurie.user.repository;

import com.mymercurie.user.entity.Student;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Optional;

@Repository
public interface StudentRepository extends JpaRepository<Student, Long> {

    // ── Original methods ──────────────────────────────────────────────────

    Optional<Student> findByEmail(String email);

    long countBySchoolId(Long schoolId);

    List<Student> findBySchoolId(Long schoolId);

    List<Student> findBySchoolIdAndClassName(Long schoolId, String className);

    @Query("""
            SELECT s FROM Student s
            WHERE (:schoolName IS NULL OR EXISTS (
                SELECT sc FROM School sc WHERE sc.id = s.schoolId AND sc.name = :schoolName
            ))
            AND (:search IS NULL OR LOWER(s.name) LIKE LOWER(CONCAT('%', :search, '%'))
                                 OR LOWER(s.email) LIKE LOWER(CONCAT('%', :search, '%'))
                                 OR LOWER(s.username) LIKE LOWER(CONCAT('%', :search, '%')))
            """)
    Page<Student> findByFilters(@Param("schoolName") String schoolName,
                                @Param("search") String search,
                                Pageable pageable);

    // ── Login / Intervention tracking ─────────────────────────────────────

    @Modifying
    @Query("UPDATE Student s SET s.loginCount = s.loginCount + 1 WHERE s.id = :id")
    void incrementLoginCount(@Param("id") Long id);

    @Modifying
    @Query("UPDATE Student s SET s.interventionSessionCount = s.interventionSessionCount + 1 WHERE s.id = :id")
    void incrementInterventionSessionCount(@Param("id") Long id);

    // ✅ XP tracking ───────────────────────────────────────────────────────

    @Modifying
    @Query("UPDATE Student s SET s.xp = s.xp + :xpAmount WHERE s.id = :id")
    void addXP(@Param("id") Long id, @Param("xpAmount") int xpAmount);
}