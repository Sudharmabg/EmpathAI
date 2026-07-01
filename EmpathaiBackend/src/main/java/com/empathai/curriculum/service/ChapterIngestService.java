package com.empathai.curriculum.service;

import com.empathai.curriculum.dto.request.ChapterMetadataUpdateRequest;
import com.empathai.curriculum.dto.request.ChapterUploadRequest;
import com.empathai.curriculum.dto.response.ChapterResponse;
import com.empathai.curriculum.dto.response.ChapterStatusResponse;
import java.util.List;

public interface ChapterIngestService {
    ChapterStatusResponse uploadChapter(ChapterUploadRequest request, String createdBy);
    ChapterStatusResponse getStatus(Long chapterId);
    ChapterResponse updateMetadata(Long chapterId, ChapterMetadataUpdateRequest request);
    ChapterResponse publishChapter(Long chapterId, String publishedBy);
    List<ChapterResponse> listPublishedChapters(String grade, String subject);
    ChapterResponse getChapter(Long chapterId);
}
