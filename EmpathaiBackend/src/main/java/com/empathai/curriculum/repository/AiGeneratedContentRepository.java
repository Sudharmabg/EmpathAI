package com.empathai.curriculum.repository;

import com.empathai.curriculum.entity.AiGeneratedContent;
import com.empathai.curriculum.entity.AiTaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.Optional;

@Repository
public interface AiGeneratedContentRepository extends JpaRepository<AiGeneratedContent, Long> {

    // Cache lookup: exact match on taskType + chapterId + topic (null-safe via IS NULL)
    Optional<AiGeneratedContent> findByTaskTypeAndChapterIdAndTopic(
        AiTaskType taskType, Long chapterId, String topic
    );

    boolean existsByTaskTypeAndChapterIdAndTopic(
        AiTaskType taskType, Long chapterId, String topic
    );

    // For cache stats / admin
    long countByChapterId(Long chapterId);
}
