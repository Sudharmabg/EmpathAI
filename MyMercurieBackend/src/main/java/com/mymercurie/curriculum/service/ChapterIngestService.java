package com.mymercurie.curriculum.service;

import com.mymercurie.curriculum.dto.request.ChapterMetadataUpdateRequest;
import com.mymercurie.curriculum.dto.request.ChapterUploadRequest;
import com.mymercurie.curriculum.dto.response.ChapterResponse;
import com.mymercurie.curriculum.dto.response.ChapterStatusResponse;
import java.util.List;

public interface ChapterIngestService {
    ChapterStatusResponse uploadChapter(ChapterUploadRequest request, String createdBy);
    ChapterStatusResponse getStatus(Long chapterId);
    ChapterResponse updateMetadata(Long chapterId, ChapterMetadataUpdateRequest request);
    ChapterResponse publishChapter(Long chapterId, String publishedBy);
    List<ChapterResponse> listPublishedChapters(String grade, String subject);
    ChapterResponse getChapter(Long chapterId);
    
    // Image Bank
    java.util.Map<String, String> uploadChapterImage(Long chapterId, String conceptName, org.springframework.web.multipart.MultipartFile file);
    com.mymercurie.curriculum.entity.ChapterImage getChapterImage(Long imageId);
    
    // Archive
    ChapterResponse archiveChapter(Long chapterId, String archivedBy);
    ChapterResponse restoreChapter(Long chapterId);
    List<ChapterResponse> listArchivedChapters();
    
    // Topics
    com.mymercurie.curriculum.dto.response.ChapterTopicResponse addTopic(Long chapterId, com.mymercurie.curriculum.dto.request.ChapterTopicRequest request, String createdBy);
    com.mymercurie.curriculum.dto.response.ChapterTopicResponse updateTopic(Long topicId, com.mymercurie.curriculum.dto.request.ChapterTopicRequest request);
    void deleteTopic(Long topicId);
    List<com.mymercurie.curriculum.dto.response.ChapterTopicResponse> getTopicTree(Long chapterId);
}
