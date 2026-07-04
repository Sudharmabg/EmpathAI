package com.mymercurie.assessment.repository;

import com.mymercurie.assessment.entity.AssessmentResponse;
import com.mymercurie.user.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.jpa.repository.EntityGraph;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentResponseRepository extends JpaRepository<AssessmentResponse, Long> {

    @Query("SELECT r FROM AssessmentResponse r LEFT JOIN FETCH r.student LEFT JOIN FETCH r.group LEFT JOIN FETCH r.question WHERE r.group.name = :groupName")
    List<AssessmentResponse> findByGroupName(@Param("groupName") String groupName);

    @EntityGraph(attributePaths = {"student", "group", "question"})
    List<AssessmentResponse> findByStudentId(Long studentId);

    @Query("SELECT r FROM AssessmentResponse r LEFT JOIN FETCH r.student LEFT JOIN FETCH r.group LEFT JOIN FETCH r.question WHERE r.student.className = :className")
    List<AssessmentResponse> findByClassName(@Param("className") String className);

    void deleteByQuestionId(Long questionId);

    void deleteByStudentId(Long studentId);

    @Query("SELECT r FROM AssessmentResponse r LEFT JOIN FETCH r.student s LEFT JOIN FETCH r.group LEFT JOIN FETCH r.question WHERE LOWER(r.group.name) = LOWER(:groupName) OR LOWER(s.className) = LOWER(:className)")
    List<AssessmentResponse> findByGroupNameIgnoreCaseOrClassNameIgnoreCase(
            @Param("groupName") String groupName, @Param("className") String className
    );

    @Query("SELECT r FROM AssessmentResponse r LEFT JOIN FETCH r.student s LEFT JOIN FETCH r.group LEFT JOIN FETCH r.question LEFT JOIN School sch ON sch.id = s.schoolId WHERE LOWER(r.group.name) = LOWER(:groupName) OR LOWER(s.className) = LOWER(:className) OR LOWER(sch.name) = LOWER(:schoolName)")
    List<AssessmentResponse> findByGroupNameIgnoreCaseOrClassNameIgnoreCaseOrSchoolNameIgnoreCase(
            @Param("groupName") String groupName, @Param("className") String className, @Param("schoolName") String schoolName
    );

    Optional<AssessmentResponse> findByStudentIdAndQuestionId(Long studentId, Long questionId);

    @Query("SELECT COUNT(DISTINCT CONCAT(CAST(a.studentId AS string), '-', CAST(CAST(a.submittedAt AS date) AS string))) FROM AssessmentResponse a")
    long countDistinctSubmissions();

    @Query("SELECT COUNT(DISTINCT CONCAT(CAST(a.studentId AS string), '-', CAST(CAST(a.submittedAt AS date) AS string))) FROM AssessmentResponse a WHERE a.studentId = :studentId")
    long countDistinctSubmissionsByStudentId(@Param("studentId") Long studentId);

    @Query("SELECT r FROM AssessmentResponse r LEFT JOIN FETCH r.student LEFT JOIN FETCH r.group LEFT JOIN FETCH r.question WHERE LOWER(r.group.name) = LOWER(:groupName)")
    List<AssessmentResponse> findByGroupNameIgnoreCase(@Param("groupName") String groupName);

    @Query("SELECT r FROM AssessmentResponse r LEFT JOIN FETCH r.student LEFT JOIN FETCH r.group LEFT JOIN FETCH r.question WHERE LOWER(r.student.className) = LOWER(:className)")
    List<AssessmentResponse> findByClassNameIgnoreCase(@Param("className") String className);

    @EntityGraph(attributePaths = {"student", "group", "question"})
    Page<AssessmentResponse> findAll(Pageable pageable);
}