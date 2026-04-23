package com.empathai.user.repository;

import com.empathai.user.entity.Student;
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

    // ── Original methods (used by SchoolService & UserService) ────────────

    Optional<Student> findByEmail(String email);

    /** Used by SchoolService.getAllSchoolSummaries() — COUNT query, no rows fetched. */
    long countBySchoolId(Long schoolId);

    /** Used by SchoolService.getClassesBySchool() — all students in a school. */
    List<Student> findBySchoolId(Long schoolId);

    /** Used by SchoolService.getStudentsBySchoolAndClass() — students in a specific class. */
    List<Student> findBySchoolIdAndClassName(Long schoolId, String className);

    /** Used by UserService.getStudentPage() for paginated student list. */
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

    // ── New methods added for login/intervention tracking ─────────────────

    /**
     * Atomically increments the student's loginCount by 1.
     * Called by AuthService on every successful student login.
     */
    @Modifying
    @Query("UPDATE Student s SET s.loginCount = s.loginCount + 1 WHERE s.id = :id")
    void incrementLoginCount(@Param("id") Long id);

    /**
     * Atomically increments the student's interventionSessionCount by 1.
     * Called by InterventionController when a session is completed.
     */
    @Modifying
    @Query("UPDATE Student s SET s.interventionSessionCount = s.interventionSessionCount + 1 WHERE s.id = :id")
    void incrementInterventionSessionCount(@Param("id") Long id);
}