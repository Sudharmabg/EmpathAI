package com.empathai.assessment.repository;

import com.empathai.assessment.entity.AssessmentGroup;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;
import java.util.List;

@Repository
public interface AssessmentGroupRepository extends JpaRepository<AssessmentGroup, Long> {
    boolean existsByName(String name);
    Optional<AssessmentGroup> findByName(String name);
    List<AssessmentGroup> findByClassName(String className);
    List<AssessmentGroup> findByClassNameContainingIgnoreCase(String className);

}
