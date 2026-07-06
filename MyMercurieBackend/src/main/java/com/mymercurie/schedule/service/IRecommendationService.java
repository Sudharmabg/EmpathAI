package com.mymercurie.schedule.service;

import com.mymercurie.schedule.dto.*;

import java.time.LocalDate;
import java.util.List;

public interface IRecommendationService {

    // ── Student: get full recommendations on schedule load ────────────────────
    ScheduleRecommendationResponse getRecommendations(Long studentId, String dayOfWeek, LocalDate date);

    // ── Admin: school timings ─────────────────────────────────────────────────
    List<SchoolTimingResponse> saveSchoolTimings(Long schoolId, List<SchoolTimingRequest> requests);

    List<SchoolTimingResponse> getSchoolTimings(Long schoolId);

    // ── Admin: exam dates ─────────────────────────────────────────────────────
    ExamDateResponse saveExamDate(ExamDateRequest request);

    List<ExamDateResponse> getExamDatesBySchool(Long schoolId);

    void deleteExamDate(Long examId);
}