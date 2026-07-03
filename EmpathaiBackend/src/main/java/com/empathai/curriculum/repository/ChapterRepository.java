package com.empathai.curriculum.repository;

import com.empathai.curriculum.entity.Chapter;
import com.empathai.curriculum.entity.ProcessingStatus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ChapterRepository extends JpaRepository<Chapter, Long> {

    List<Chapter> findByProcessingStatusOrderByCreatedAtDesc(ProcessingStatus status);

    List<Chapter> findByProcessingStatusOrderByArchivedAtDesc(ProcessingStatus status);

    List<Chapter> findByGradeAndSubjectAndProcessingStatusOrderByTitleAsc(
        String grade, String subject, ProcessingStatus status
    );

    List<Chapter> findBySubjectAndProcessingStatusOrderByTitleAsc(
        String subject, ProcessingStatus status
    );

    @Query("SELECT DISTINCT c.subject FROM Chapter c WHERE c.processingStatus = 'PUBLISHED' ORDER BY c.subject ASC")
    List<String> findDistinctPublishedSubjects();

    @Query("SELECT DISTINCT c.grade FROM Chapter c WHERE c.processingStatus = 'PUBLISHED' ORDER BY c.grade ASC")
    List<String> findDistinctPublishedGrades();
}
