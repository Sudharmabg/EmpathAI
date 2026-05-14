package com.empathai.analytics.service;

import com.empathai.analytics.dto.AnalyticsDashboardResponse;
import com.empathai.assessment.repository.AssessmentResponseRepository;
import com.empathai.user.entity.enums.UserRole;
import com.empathai.user.repository.SchoolRepository;
import com.empathai.user.repository.StudentRepository;
import com.empathai.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final AssessmentResponseRepository assessmentResponseRepository;

    public AnalyticsDashboardResponse getDashboard() {
        log.info("getDashboard analytics started");

        long totalStudents = studentRepository.count();

        long totalAssessments = assessmentResponseRepository.countDistinctSubmissions();

        long totalPsychologists = userRepository.countByRole(UserRole.PSYCHOLOGIST);

        long totalSchools = schoolRepository.count();

        log.info("getDashboard analytics completed — students={}, assessments={}, psychologists={}, schools={}",
                totalStudents, totalAssessments, totalPsychologists, totalSchools);

        return AnalyticsDashboardResponse.builder()
                .totalStudents(totalStudents)
                .totalAssessments(totalAssessments)
                .totalPsychologists(totalPsychologists)
                .totalSchools(totalSchools)
                .build();
    }
}