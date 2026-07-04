package com.mymercurie.assessment.repository;

import com.mymercurie.assessment.entity.AssessmentReport;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;

import java.time.LocalDate;
import java.util.List;
import java.util.Optional;

@Repository
public interface AssessmentReportRepository extends JpaRepository<AssessmentReport, Long> {
    Optional<AssessmentReport> findByStudentIdAndGroupIdAndSessionDate(
            String studentId, Long groupId, LocalDate sessionDate);

    List<AssessmentReport> findByStudentIdOrderByCreatedAtDesc(String studentId);

    List<AssessmentReport> findByGroupIdOrderByCreatedAtDesc(Long groupId);

    List<AssessmentReport> findByClassNameOrderByCreatedAtDesc(String className);

    @Query("SELECT r FROM AssessmentReport r WHERE r.chromaSynced = false")
    List<AssessmentReport> findAllNotChromaSynced();

    boolean existsByStudentIdAndGroupIdAndSessionDate(
            String studentId, Long groupId, LocalDate sessionDate);

    // ── NEW: Fetch the latest report for a student (regardless of group) ──
    default Optional<AssessmentReport> findLatestByStudentId(String studentId) {
        List<AssessmentReport> reports = findByStudentIdOrderByCreatedAtDesc(studentId);
        return reports.isEmpty() ? Optional.empty() : Optional.of(reports.get(0));
    }
}