package com.empathai.curriculum.repository;

import com.empathai.curriculum.entity.AiGeneratedContent;
import com.empathai.curriculum.entity.AiTaskType;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import com.empathai.curriculum.entity.ApprovalStatus;
import java.util.List;
import java.util.Optional;

@Repository
public interface AiGeneratedContentRepository extends JpaRepository<AiGeneratedContent, Long> {

    // Cache lookup: exact match on taskType + chapterId + topic
    Optional<AiGeneratedContent> findByTaskTypeAndChapterIdAndTopic(
        AiTaskType taskType, Long chapterId, String topic
    );

    // Cache lookup with approval status
    Optional<AiGeneratedContent> findByTaskTypeAndChapterIdAndTopicAndApprovalStatus(
        AiTaskType taskType, Long chapterId, String topic, ApprovalStatus approvalStatus
    );

    boolean existsByTaskTypeAndChapterIdAndTopic(
        AiTaskType taskType, Long chapterId, String topic
    );

    // Admin: list all content for a chapter (all statuses)
    List<AiGeneratedContent> findByChapterIdOrderByTaskTypeAscTopicAsc(Long chapterId);

    // Admin: global pending review queue
    List<AiGeneratedContent> findByApprovalStatusOrderByCreatedAtDesc(ApprovalStatus status);

    // Admin: filter by chapter + tool type
    List<AiGeneratedContent> findByChapterIdAndTaskTypeOrderByTopicAsc(Long chapterId, AiTaskType taskType);

    // Cascade cleanup
    void deleteByChapterId(Long chapterId);

    // For cache stats / admin
    long countByChapterId(Long chapterId);
}
