package com.mymercurie.analytics.service;

import com.mymercurie.analytics.dto.AnalyticsDashboardResponse;
import com.mymercurie.assessment.repository.AssessmentResponseRepository;
import com.mymercurie.user.entity.enums.UserRole;
import com.mymercurie.user.repository.SchoolRepository;
import com.mymercurie.user.repository.StudentRepository;
import com.mymercurie.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import com.mymercurie.intervention.repository.InterventionRepository;
import com.mymercurie.schedule.repository.ScheduleTaskRepository;
import com.mymercurie.wellness.repository.MoodEntryRepository;
import com.mymercurie.wellness.repository.SleepEntryRepository;
import com.mymercurie.intervention.entity.Intervention;
import com.mymercurie.schedule.entity.ScheduleTask;
import com.mymercurie.wellness.entity.MoodEntry;
import com.mymercurie.wellness.entity.SleepEntry;

import java.time.LocalDate;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class AnalyticsService {

    private final StudentRepository studentRepository;
    private final UserRepository userRepository;
    private final SchoolRepository schoolRepository;
    private final AssessmentResponseRepository assessmentResponseRepository;
    
    private final MoodEntryRepository moodEntryRepository;
    private final SleepEntryRepository sleepEntryRepository;
    private final ScheduleTaskRepository scheduleTaskRepository;
    private final InterventionRepository interventionRepository;
    private final com.mymercurie.chat.repository.FlaggedChatRepository flaggedChatRepository;

    public AnalyticsDashboardResponse getDashboard(Long studentId, LocalDate weekStart) {
        log.info("getDashboard analytics started for studentId={} and weekStart={}", studentId, weekStart);

        long totalStudents = studentRepository.count();
        long totalAssessments = assessmentResponseRepository.countDistinctSubmissions();
        long totalPsychologists = userRepository.countByRole(UserRole.PSYCHOLOGIST);
        long totalSchools = schoolRepository.count();
        long openFlaggedChats = flaggedChatRepository.countByStatus(com.mymercurie.chat.entity.FlagStatus.PENDING);

        // Date boundaries
        LocalDate startDate;
        LocalDate endDate;
        LocalDateTime startDateTime;
        LocalDateTime endDateTime;

        if (weekStart != null) {
            startDate = weekStart;
            endDate = weekStart.plusDays(7);
            startDateTime = weekStart.atStartOfDay();
            endDateTime = endDate.atStartOfDay();
        } else {
            startDate = LocalDate.now().minusDays(7);
            endDate = LocalDate.now().plusDays(1); // Future bound
            startDateTime = LocalDateTime.now().minusDays(7);
            endDateTime = LocalDateTime.now().plusDays(1);
        }

        // Fetch Data
        List<ScheduleTask> tasks;
        List<MoodEntry> moods;
        List<SleepEntry> sleeps;
        List<Intervention> interventions;

        if (studentId != null) {
            tasks = scheduleTaskRepository.findByStudentIdAndWeekStartDateGreaterThanEqual(studentId, startDate);
            moods = moodEntryRepository.findByStudentIdAndLoggedAtAfterOrderByLoggedAtDesc(studentId, startDateTime);
            sleeps = sleepEntryRepository.findByStudentIdAndLoggedAtAfterOrderByLoggedAtDesc(studentId, startDateTime);
            interventions = interventionRepository.findByStudentId(studentId);
        } else {
            tasks = scheduleTaskRepository.findByWeekStartDateGreaterThanEqual(startDate);
            moods = moodEntryRepository.findAllByLoggedAtAfterOrderByLoggedAtDesc(startDateTime);
            sleeps = sleepEntryRepository.findAllByLoggedAtAfterOrderByLoggedAtDesc(startDateTime);
            interventions = interventionRepository.findAll();
        }

        // Filter out items that are beyond the end boundary (only strictly needed if weekStart is provided and is in the past)
        if (weekStart != null) {
            tasks = tasks.stream().filter(t -> !t.getWeekStartDate().isAfter(endDate)).collect(Collectors.toList());
            moods = moods.stream().filter(m -> m.getLoggedAt().isBefore(endDateTime)).collect(Collectors.toList());
            sleeps = sleeps.stream().filter(s -> s.getLoggedAt().isBefore(endDateTime)).collect(Collectors.toList());
            interventions = interventions.stream().filter(i -> i.getCreatedAt().isBefore(endDateTime) && i.getCreatedAt().isAfter(startDateTime)).collect(Collectors.toList());
        } else {
            // For interventions when weekStart is null (last 7 days), we still need to filter since we do findAll()
            interventions = interventions.stream().filter(i -> i.getCreatedAt().isAfter(startDateTime)).collect(Collectors.toList());
        }

        // 1. Schedule Stats
        Map<String, List<ScheduleTask>> tasksByDate = tasks.stream()
                .collect(Collectors.groupingBy(t -> t.getWeekStartDate().toString()));
        List<AnalyticsDashboardResponse.ScheduleStat> scheduleStats = tasksByDate.entrySet().stream()
                .map(e -> AnalyticsDashboardResponse.ScheduleStat.builder()
                        .date(e.getKey())
                        .created(e.getValue().size())
                        .completed(e.getValue().stream().filter(ScheduleTask::isCompleted).count())
                        .build())
                .collect(Collectors.toList());

        // 2. Mood Stats
        Map<String, Long> moodStats = moods.stream()
                .collect(Collectors.groupingBy(MoodEntry::getMood, Collectors.counting()));

        // Calculate predominant mood per day for the week tracker
        List<AnalyticsDashboardResponse.DailyMoodStat> dailyMoods = new java.util.ArrayList<>();
        Map<LocalDate, List<MoodEntry>> moodsByDate = moods.stream()
                .collect(Collectors.groupingBy(m -> m.getLoggedAt().toLocalDate()));

        for (int i = 0; i < 7; i++) {
            LocalDate d = weekStart.plusDays(i);
            List<MoodEntry> dayMoods = moodsByDate.getOrDefault(d, java.util.Collections.emptyList());
            String predominant = null;
            if (!dayMoods.isEmpty()) {
                predominant = dayMoods.stream()
                        .collect(Collectors.groupingBy(MoodEntry::getMood, Collectors.counting()))
                        .entrySet().stream()
                        .max(Map.Entry.comparingByValue())
                        .map(Map.Entry::getKey)
                        .orElse(null);
            }
            dailyMoods.add(AnalyticsDashboardResponse.DailyMoodStat.builder()
                    .date(d.toString())
                    .predominantMood(predominant)
                    .build());
        }

        // 3. Sleep Stats
        double avgSleep = sleeps.stream()
                .mapToDouble(s -> {
                    long minutes = java.time.Duration.between(s.getBedtime(), s.getWakeTime()).toMinutes();
                    if (minutes < 0) {
                        minutes += 24 * 60;
                    }
                    return minutes / 60.0;
                })
                .average().orElse(0.0);
        AnalyticsDashboardResponse.SleepStat sleepStat = AnalyticsDashboardResponse.SleepStat.builder()
                .averageHours(avgSleep)
                .build();

        // 4. Intervention Stats
        long totalInterventions = interventions.size();
        Map<String, Long> interventionByType = interventions.stream()
                .collect(Collectors.groupingBy(Intervention::getType, Collectors.counting()));
        AnalyticsDashboardResponse.InterventionStat interventionStat = AnalyticsDashboardResponse.InterventionStat.builder()
                .totalCount(totalInterventions)
                .countByType(interventionByType)
                .build();

        log.info("getDashboard analytics completed");

        return AnalyticsDashboardResponse.builder()
                .totalStudents(totalStudents)
                .totalAssessments(totalAssessments)
                .totalPsychologists(totalPsychologists)
                .totalSchools(totalSchools)
                .openFlaggedChats(openFlaggedChats)
                .scheduleStats(scheduleStats)
                .moodStats(moodStats)
                .dailyMoods(dailyMoods)
                .sleepStats(sleepStat)
                .interventionStats(interventionStat)
                .build();
    }
}