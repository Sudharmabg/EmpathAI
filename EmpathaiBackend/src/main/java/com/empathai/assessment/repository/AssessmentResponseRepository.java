package com.empathai.assessment.repository;

import com.empathai.assessment.entity.AssessmentResponse;
import com.empathai.user.entity.School;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentResponseRepository extends JpaRepository<AssessmentResponse, Long> {

    @Query("SELECT r FROM AssessmentResponse r JOIN r.group g WHERE g.name = :groupName")
    List<AssessmentResponse> findByGroupName(@Param("groupName") String groupName);

    List<AssessmentResponse> findByStudentId(Long studentId);

    @Query("SELECT r FROM AssessmentResponse r JOIN r.student s WHERE s.className = :className")
    List<AssessmentResponse> findByClassName(@Param("className") String className);

    void deleteByQuestionId(Long questionId);

    void deleteByStudentId(Long studentId);

    @Query("SELECT r FROM AssessmentResponse r JOIN r.student s JOIN r.group g WHERE LOWER(g.name) = LOWER(:groupName) OR LOWER(s.className) = LOWER(:className)")
    List<AssessmentResponse> findByGroupNameIgnoreCaseOrClassNameIgnoreCase(
            @Param("groupName") String groupName, @Param("className") String className
    );

    @Query("SELECT r FROM AssessmentResponse r JOIN r.student s JOIN r.group g LEFT JOIN School sch ON sch.id = s.schoolId WHERE LOWER(g.name) = LOWER(:groupName) OR LOWER(s.className) = LOWER(:className) OR LOWER(sch.name) = LOWER(:schoolName)")
    List<AssessmentResponse> findByGroupNameIgnoreCaseOrClassNameIgnoreCaseOrSchoolNameIgnoreCase(
            @Param("groupName") String groupName, @Param("className") String className, @Param("schoolName") String schoolName
    );

    Optional<AssessmentResponse> findByStudentIdAndQuestionId(Long studentId, Long questionId);

    @Query("SELECT COUNT(DISTINCT CONCAT(CAST(a.studentId AS string), '-', CAST(CAST(a.submittedAt AS date) AS string))) FROM AssessmentResponse a")
    long countDistinctSubmissions();

    @Query("SELECT r FROM AssessmentResponse r JOIN r.group g WHERE LOWER(g.name) = LOWER(:groupName)")
    List<AssessmentResponse> findByGroupNameIgnoreCase(@Param("groupName") String groupName);

    @Query("SELECT r FROM AssessmentResponse r JOIN r.student s WHERE LOWER(s.className) = LOWER(:className)")
    List<AssessmentResponse> findByClassNameIgnoreCase(@Param("className") String className);
}