package com.empathai.curriculum.repository;

import com.empathai.curriculum.entity.ChapterTopic;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ChapterTopicRepository extends JpaRepository<ChapterTopic, Long> {
    List<ChapterTopic> findByChapterIdAndParentIdIsNullOrderBySortOrder(Long chapterId);
    List<ChapterTopic> findByParentIdOrderBySortOrder(Long parentId);
    List<ChapterTopic> findByChapterIdOrderBySortOrder(Long chapterId);
    long countByParentId(Long parentId);
}
