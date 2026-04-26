package com.empathai.assessment.repository;

import com.empathai.assessment.entity.AssessmentResponse;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentResponseRepository extends JpaRepository<AssessmentResponse, Long> {
    List<AssessmentResponse> findByGroupName(String groupName);
    List<AssessmentResponse> findByStudentId(Long studentId);
    List<AssessmentResponse> findByClassName(String className);
    void deleteByQuestionId(Long questionId);
    void deleteByStudentId(Long studentId);
    List<AssessmentResponse> findByGroupNameIgnoreCaseOrClassNameIgnoreCase(
            String groupName, String className
    );
    List<AssessmentResponse> findByGroupNameIgnoreCaseOrClassNameIgnoreCaseOrSchoolNameIgnoreCase(
            String groupName, String className, String schoolName
    );

    Optional<AssessmentResponse> findByStudentIdAndQuestionId(Long studentId, Long questionId);

    @Modifying
    @Query("UPDATE AssessmentResponse r SET r.gender = :gender, r.age = :age WHERE r.studentId = :studentId")
    void updateGenderAndAgeByStudentId(@Param("studentId") Long studentId,
                                       @Param("gender") String gender,
                                       @Param("age") Integer age);

    @Modifying
    @Query("UPDATE AssessmentResponse r SET r.gender = :gender WHERE r.studentId = :studentId")
    void updateGenderByStudentId(@Param("studentId") Long studentId,
                                 @Param("gender") String gender);

    @Modifying
    @Query("UPDATE AssessmentResponse r SET r.age = :age WHERE r.studentId = :studentId")
    void updateAgeByStudentId(@Param("studentId") Long studentId,
                              @Param("age") Integer age);

    @Modifying
    @Query("UPDATE AssessmentResponse r SET r.studentName = :name WHERE r.studentId = :studentId")
    void updateStudentNameByStudentId(@Param("studentId") Long studentId,
                                      @Param("name") String name);
}
