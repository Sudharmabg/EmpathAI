package com.empathai.assessment.repository;

import com.empathai.assessment.entity.AssessmentReportHistory;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface AssessmentReportHistoryRepository extends JpaRepository<AssessmentReportHistory, Long> {
    List<AssessmentReportHistory> findByReportIdOrderByEditedAtDesc(Long reportId);
}
