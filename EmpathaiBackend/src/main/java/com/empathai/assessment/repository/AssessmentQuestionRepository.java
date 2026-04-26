package com.empathai.assessment.repository;

import com.empathai.assessment.entity.AssessmentQuestion;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface AssessmentQuestionRepository extends JpaRepository<AssessmentQuestion, Long> {

    Page<AssessmentQuestion> findAll(Pageable pageable);


    List<AssessmentQuestion> findByGroupMapId(Long groupMapId);
}