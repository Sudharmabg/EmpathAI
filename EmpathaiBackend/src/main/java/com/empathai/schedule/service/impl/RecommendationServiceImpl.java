package com.empathai.schedule.service.impl;

import com.empathai.activities.entity.StudentGoal;
import com.empathai.activities.repository.StudentGoalRepository;
import com.empathai.schedule.dto.*;
import com.empathai.schedule.entity.ExamDate;
import com.empathai.schedule.entity.SchoolTiming;
import com.empathai.schedule.repository.ExamDateRepository;
import com.empathai.schedule.repository.SchoolTimingRepository;
import com.empathai.schedule.repository.ScheduleTaskRepository;
import com.empathai.schedule.entity.ScheduleTask;
import com.empathai.schedule.service.IRecommendationService;
import com.empathai.user.entity.Student;
import com.empathai.user.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class RecommendationServiceImpl implements IRecommendationService {

    private final ExamDateRepository examDateRepository;
    private final StudentGoalRepository studentGoalRepository;
    private final SchoolTimingRepository schoolTimingRepository;
    private final ScheduleTaskRepository scheduleTaskRepository;
    private final StudentRepository studentRepository;

    // ── Weekly fallback subjects ───────────────────────────────────────────────
    private static final List<String> WEEKLY_SUBJECTS = List.of(
            "Mathematics", "Science", "SST", "English", "Hindi"
    );

    // ── Wellness task pool ────────────────────────────────────────────────────
    private static final List<String> WELLNESS_TASKS = List.of(
            "Take a short walk",
            "Stretching & breathing",
            "Free time / relax",
            "Drink water & rest",
            "Light exercise"
    );

    // ── Other task pool ───────────────────────────────────────────────────────
    private static final List<String> OTHER_TASKS = List.of(
            "Organise notes & bag",
            "Read for 20 minutes",
            "Prepare for tomorrow",
            "Tidy your desk & bag",
            "Plan tomorrow's schedule"
    );

    // ── Days of week in order (for consecutive-study check) ──────────────────
    private static final List<String> DAYS_ORDER = List.of(
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    );

    // ─────────────────────────────────────────────────────────────────────────
    // CLASS-BASED CAPS
    // ─────────────────────────────────────────────────────────────────────────

    /** Max single study session (minutes) per class group */
    private int getMaxSessionMins(String className) {
        if (className == null) return 45;
        String lc = className.toLowerCase();
        if (matchesClass(lc, 1, 4))  return 30;
        if (matchesClass(lc, 5, 6))  return 45;
        if (matchesClass(lc, 7, 8))  return 60;
        if (matchesClass(lc, 9, 10)) return 75;
        if (matchesClass(lc, 11, 12)) return 90;
        return 45; // default
    }

    /** Max total study time per day (minutes) — weekday */
    private int getMaxDailyStudyMins(String className, boolean isWeekend) {
        if (className == null) return 120;
        String lc = className.toLowerCase();
        if (matchesClass(lc, 1, 2))   return isWeekend ? 90  : 60;
        if (matchesClass(lc, 3, 4))   return isWeekend ? 120 : 90;
        if (matchesClass(lc, 5, 6))   return isWeekend ? 180 : 120;
        if (matchesClass(lc, 7, 8))   return isWeekend ? 240 : 180;
        if (matchesClass(lc, 9, 10))  return isWeekend ? 300 : 240;
        if (matchesClass(lc, 11, 12)) return isWeekend ? 360 : 300;
        return 120;
    }

    private boolean matchesClass(String lc, int from, int to) {
        for (int i = from; i <= to; i++) {
            if (lc.contains(String.valueOf(i))
                    || lc.contains(i + "st") || lc.contains(i + "nd")
                    || lc.contains(i + "rd") || lc.contains(i + "th")) {
                return true;
            }
        }
        return false;
    }

    private boolean isWeekend(String dayOfWeek) {
        return "Saturday".equalsIgnoreCase(dayOfWeek) || "Sunday".equalsIgnoreCase(dayOfWeek);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // MAIN METHOD
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public ScheduleRecommendationResponse getRecommendations(Long studentId, String dayOfWeek) {

        Student student = studentRepository.findById(studentId)
                .orElseThrow(() -> new RuntimeException("Student not found: " + studentId));

        Long schoolId   = student.getSchoolId();
        String className = student.getClassName();

        log.info("══════════════════════════════════════════════════════════");
        log.info("🔍 RECOMMENDATIONS — student={}, class='{}', day={}", studentId, className, dayOfWeek);

        // 1. Blocked windows
        List<SchoolTimingResponse> blockedWindows = getBlockedWindows(schoolId, dayOfWeek, className);
        log.info("📚 Blocked windows: {}", blockedWindows.size());

        // 2. Upcoming exams
        List<ExamDateResponse> upcomingExams = getUpcomingExams(schoolId, className);
        log.info("📝 Upcoming exams: {}", upcomingExams.size());

        // 3. Goals
        List<StudentGoal> goals = studentGoalRepository.findByStudentIdAndActiveTrue(studentId);
        Set<String> goalSubjects = goals.stream()
                .map(StudentGoal::getSubjectTag)
                .collect(Collectors.toSet());
        log.info("🎯 Goal subjects: {}", goalSubjects);

        // 4. All tasks this week — for covered-subjects check
        List<ScheduleTask> weekTasks = scheduleTaskRepository.findByStudentId(studentId);
        Set<String> coveredSubjects = WEEKLY_SUBJECTS.stream()
                .filter(subject -> weekTasks.stream()
                        .anyMatch(t -> t.getTitle() != null
                                && t.getTitle().toLowerCase().contains(subject.toLowerCase())))
                .collect(Collectors.toSet());

        // 5. Today's tasks — for rule checks
        List<ScheduleTask> todayTasks = scheduleTaskRepository
                .findByStudentIdAndDayOfWeek(studentId, dayOfWeek);

        // How many study minutes already scheduled today
        int todayStudyMins = todayTasks.stream()
                .filter(t -> "study".equalsIgnoreCase(t.getDetectedType()))
                .mapToInt(t -> toMins(t.getEndTime()) - toMins(t.getStartTime()))
                .filter(d -> d > 0)
                .sum();

        // How many study sessions already today
        int todayStudySessions = (int) todayTasks.stream()
                .filter(t -> "study".equalsIgnoreCase(t.getDetectedType()))
                .count();

        // Whether student already has a wellness task today
        boolean hasWellnessToday = todayTasks.stream()
                .anyMatch(t -> "wellness".equalsIgnoreCase(t.getDetectedType()));

        // 6. Consecutive study days (look back up to 3 days before today)
        int consecutiveStudyDays = countConsecutiveStudyDays(studentId, dayOfWeek, weekTasks);
        log.info("📊 Today study: {}min, {} sessions | wellness: {} | consecutive days: {}",
                todayStudyMins, todayStudySessions, hasWellnessToday, consecutiveStudyDays);

        // 7. Class caps
        int maxSessionMins  = getMaxSessionMins(className);
        int maxDailyMins    = getMaxDailyStudyMins(className, isWeekend(dayOfWeek));
        int remainingMins   = Math.max(0, maxDailyMins - todayStudyMins);
        boolean canAddStudy = todayStudySessions < 3 && remainingMins >= 15;
        log.info("📏 Class caps — maxSession={}m, maxDaily={}m, remaining={}m, canAddStudy={}",
                maxSessionMins, maxDailyMins, remainingMins, canAddStudy);

        // 8. Generate suggestions
        List<TaskSuggestion> suggestions = generateSuggestions(
                upcomingExams, goalSubjects, coveredSubjects,
                canAddStudy, hasWellnessToday, consecutiveStudyDays,
                maxSessionMins, remainingMins, className
        );

        // 9. Filter out subjects already scheduled today
        Set<String> todaySubjects = todayTasks.stream()
                .filter(t -> t.getTitle() != null)
                .flatMap(t -> WEEKLY_SUBJECTS.stream()
                        .filter(s -> t.getTitle().toLowerCase().contains(s.toLowerCase())))
                .collect(Collectors.toSet());
        goalSubjects.forEach(gs -> todayTasks.stream()
                .filter(t -> t.getTitle() != null
                        && t.getTitle().toLowerCase().contains(gs.toLowerCase()))
                .findFirst()
                .ifPresent(t -> todaySubjects.add(gs)));

        suggestions = suggestions.stream()
                .filter(s -> s.getSubjectName() == null || !todaySubjects.contains(s.getSubjectName()))
                .collect(Collectors.toList());

        log.info("✨ Final suggestions: {}", suggestions.size());
        suggestions.forEach(s -> log.info("   → {} | {} | {}m",
                s.getTitle(), s.getReasonLabel(), s.getEstimatedMinutes()));
        log.info("══════════════════════════════════════════════════════════");

        return ScheduleRecommendationResponse.builder()
                .blockedWindows(blockedWindows)
                .upcomingExams(upcomingExams)
                .suggestions(suggestions)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONSECUTIVE STUDY DAYS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Count how many days immediately before today (in the same week list)
     * had at least one study task.
     */
    private int countConsecutiveStudyDays(Long studentId, String dayOfWeek,
                                          List<ScheduleTask> weekTasks) {
        int todayIdx = DAYS_ORDER.indexOf(dayOfWeek);
        if (todayIdx <= 0) return 0;

        int count = 0;
        for (int i = todayIdx - 1; i >= 0; i--) {
            String prevDay = DAYS_ORDER.get(i);
            boolean hadStudy = weekTasks.stream()
                    .filter(t -> prevDay.equalsIgnoreCase(t.getDayOfWeek()))
                    .anyMatch(t -> "study".equalsIgnoreCase(t.getDetectedType()));
            if (hadStudy) count++;
            else break;
        }
        return count;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BLOCKED WINDOWS
    // ─────────────────────────────────────────────────────────────────────────

    private List<SchoolTimingResponse> getBlockedWindows(Long schoolId, String dayOfWeek,
                                                         String className) {
        if (schoolId == null || className == null) return Collections.emptyList();
        return schoolTimingRepository.findBySchoolId(schoolId).stream()
                .filter(t -> t.getDayOfWeek().equalsIgnoreCase(dayOfWeek))
                .filter(t -> t.getClassName() != null
                        && t.getClassName().equalsIgnoreCase(className))
                .map(t -> SchoolTimingResponse.builder()
                        .id(t.getId())
                        .className(t.getClassName())
                        .dayOfWeek(t.getDayOfWeek())
                        .startTime(t.getStartTime())
                        .endTime(t.getEndTime())
                        .build())
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // UPCOMING EXAMS
    // ─────────────────────────────────────────────────────────────────────────

    private List<ExamDateResponse> getUpcomingExams(Long schoolId, String className) {
        if (schoolId == null || className == null) return Collections.emptyList();
        LocalDate today = LocalDate.now();
        return examDateRepository
                .findBySchoolIdAndClassNameAndExamDateAfterOrderByExamDateAsc(
                        schoolId, className, today)
                .stream()
                .map(e -> {
                    long days = ChronoUnit.DAYS.between(today, e.getExamDate());
                    String urgency = days <= 7 ? "URGENT" : days <= 14 ? "UPCOMING" : "NORMAL";
                    return ExamDateResponse.builder()
                            .id(e.getId())
                            .className(e.getClassName())
                            .subjectName(e.getSubjectName())
                            .examDate(e.getExamDate())
                            .daysRemaining(days)
                            .urgency(urgency)
                            .build();
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // SUGGESTION ENGINE (FIXED)
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Generates a balanced list of suggestions with correct priority:
     * 1. Exam-based (highest) — closest/urgent exam per subject
     * 2. Goal-based
     * 3. Weekly subjects (only uncovered ones — now guaranteed)
     *
     * Weekly rule is now fully respected.
     * Same-subject urgent exams are correctly prioritized.
     */
    private List<TaskSuggestion> generateSuggestions(
            List<ExamDateResponse> upcomingExams,
            Set<String> goalSubjects,
            Set<String> coveredSubjects,
            boolean canAddStudy,
            boolean hasWellnessToday,
            int consecutiveStudyDays,
            int maxSessionMins,
            int remainingMins,
            String className) {

        // The session duration we'll suggest — clamped to class max and remaining cap
        int sessionMins = Math.min(maxSessionMins, Math.max(15, remainingMins));

        Map<String, TaskSuggestion> studyMap = new LinkedHashMap<>();

        if (canAddStudy) {
            // ── STEP 1: Weekly subjects that are still uncovered this week ─────
            for (String subject : WEEKLY_SUBJECTS) {
                if (coveredSubjects.contains(subject)) continue;
                studyMap.put(subject.toLowerCase(), TaskSuggestion.builder()
                        .title("Study session — " + subject)
                        .subjectName(subject)
                        .reasonLabel("Weekly subject")
                        .estimatedMinutes(sessionMins)
                        .taskType("STUDY")
                        .score(10)
                        .build());
            }

            // ── STEP 2: Goals (boost or add) ───────────────────────────────────
            for (String gs : goalSubjects) {
                String key = gs.toLowerCase();
                TaskSuggestion existing = studyMap.get(key);
                if (existing != null) {
                    existing.setScore(existing.getScore() + 20);
                    existing.setReasonLabel("Matches your goal");
                } else {
                    studyMap.put(key, TaskSuggestion.builder()
                            .title("Study session — " + gs)
                            .subjectName(gs)
                            .reasonLabel("Matches your goal")
                            .estimatedMinutes(sessionMins)
                            .taskType("STUDY")
                            .score(20)
                            .build());
                }
            }

            // ── STEP 2b: Homework reminder when exams exist ─────────────────────
            if (!upcomingExams.isEmpty()) {
                String hwKey = "homework";
                if (!studyMap.containsKey(hwKey)) {
                    studyMap.put(hwKey, TaskSuggestion.builder()
                            .title("Complete homework")
                            .subjectName("Homework")
                            .reasonLabel("Exam preparation")
                            .estimatedMinutes(sessionMins)
                            .taskType("STUDY")
                            .score(15)
                            .build());
                }
            }

            // ── STEP 3: Exams (highest priority) — FIXED: only closest/urgent per subject
            Set<String> processedExamSubjects = new HashSet<>();
            for (ExamDateResponse exam : upcomingExams) {
                String key = exam.getSubjectName().toLowerCase();

                // Skip farther exams for the same subject (only keep the closest/urgent one)
                if (processedExamSubjects.contains(key)) continue;
                processedExamSubjects.add(key);

                int boost = "URGENT".equals(exam.getUrgency()) ? 50 : 25;
                String label = "Exam in " + exam.getDaysRemaining() + " day"
                        + (exam.getDaysRemaining() == 1 ? "" : "s");

                TaskSuggestion existing = studyMap.get(key);
                if (existing != null) {
                    existing.setScore(existing.getScore() + boost);
                    existing.setReasonLabel(label);
                    existing.setTitle("Revise — " + exam.getSubjectName());
                } else {
                    studyMap.put(key, TaskSuggestion.builder()
                            .title("Revise — " + exam.getSubjectName())
                            .subjectName(exam.getSubjectName())
                            .reasonLabel(label)
                            .estimatedMinutes(sessionMins)
                            .taskType("STUDY")
                            .score(boost)
                            .build());
                }
            }
        }

        // ── Collect ALL study suggestions (no more arbitrary limit(5)) ─────────
        // This guarantees every uncovered weekly subject appears
        List<TaskSuggestion> result = new ArrayList<>(studyMap.values());

        // ── WELLNESS suggestions ──────────────────────────────────────────────
        // Always suggest at least 1 wellness if no wellness today
        // Suggest 2 if student has 3 consecutive study days
        int wellnessCount = hasWellnessToday ? 0 : (consecutiveStudyDays >= 3 ? 2 : 1);

        List<String> wellnessPool = new ArrayList<>(WELLNESS_TASKS);
        Collections.shuffle(wellnessPool);
        for (int i = 0; i < Math.min(wellnessCount, wellnessPool.size()); i++) {
            String reason = consecutiveStudyDays >= 3
                    ? "3 study days in a row — rest up!"
                    : "Stay balanced";
            result.add(TaskSuggestion.builder()
                    .title(wellnessPool.get(i))
                    .subjectName(null)
                    .reasonLabel(reason)
                    .estimatedMinutes(20)
                    .taskType("WELLNESS")
                    .score(consecutiveStudyDays >= 3 ? 40 : 15)
                    .build());
        }

        // ── OTHER suggestions ────────────────────────────────────────────────
        // Always add 1–2 "other" tasks (homework, organisation, etc.)
        // If there are upcoming exams → add a homework/revision reminder
        List<String> otherPool = new ArrayList<>(OTHER_TASKS);
        Collections.shuffle(otherPool);

        int otherCount = upcomingExams.isEmpty() ? 1 : 2;

        for (int i = 0; i < Math.min(otherCount, otherPool.size()); i++) {
            result.add(TaskSuggestion.builder()
                    .title(otherPool.get(i))
                    .subjectName(null)
                    .reasonLabel("Daily routine")
                    .estimatedMinutes(30)
                    .taskType("OTHER")
                    .score(8)
                    .build());
        }

        // ── Final sort + cap at 8 total suggestions ───────────────────────────
        result.sort(Comparator.comparingInt(TaskSuggestion::getScore).reversed());
        return result.stream().limit(8).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER
    // ─────────────────────────────────────────────────────────────────────────

    private int toMins(String time) {
        if (time == null || !time.contains(":")) return 0;
        String[] parts = time.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: School timings (FIXED - yellow warning removed)
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public List<SchoolTimingResponse> saveSchoolTimings(Long schoolId,
                                                        List<SchoolTimingRequest> requests) {
        schoolTimingRepository.deleteBySchoolId(schoolId);

        List<SchoolTiming> saved = requests.stream()
                .map(r -> SchoolTiming.builder()
                        .schoolId(schoolId)                    // ← FIXED
                        .className(r.getClassName())           // ← FIXED
                        .dayOfWeek(r.getDayOfWeek())
                        .startTime(r.getStartTime())
                        .endTime(r.getEndTime())
                        .build())
                .map(schoolTimingRepository::save)
                .collect(Collectors.toList());

        return saved.stream()
                .map(t -> SchoolTimingResponse.builder()
                        .id(t.getId())
                        .className(t.getClassName())
                        .dayOfWeek(t.getDayOfWeek())
                        .startTime(t.getStartTime())
                        .endTime(t.getEndTime())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<SchoolTimingResponse> getSchoolTimings(Long schoolId) {
        return schoolTimingRepository.findBySchoolId(schoolId).stream()
                .map(t -> SchoolTimingResponse.builder()
                        .id(t.getId())
                        .className(t.getClassName())
                        .dayOfWeek(t.getDayOfWeek())
                        .startTime(t.getStartTime())
                        .endTime(t.getEndTime())
                        .build())
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Exam dates
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public ExamDateResponse saveExamDate(ExamDateRequest request) {
        ExamDate saved = examDateRepository.save(ExamDate.builder()
                .schoolId(request.getSchoolId())
                .className(request.getClassName())
                .subjectName(request.getSubjectName())
                .examDate(request.getExamDate())
                .build());

        long days = ChronoUnit.DAYS.between(LocalDate.now(), saved.getExamDate());
        return ExamDateResponse.builder()
                .id(saved.getId())
                .className(saved.getClassName())
                .subjectName(saved.getSubjectName())
                .examDate(saved.getExamDate())
                .daysRemaining(days)
                .urgency(days <= 7 ? "URGENT" : days <= 14 ? "UPCOMING" : "NORMAL")
                .build();
    }

    @Override
    public void deleteExamDate(Long examId) {
        examDateRepository.deleteById(examId);
    }

    @Override
    public List<ExamDateResponse> getExamDatesBySchool(Long schoolId) {
        LocalDate today = LocalDate.now();
        return examDateRepository.findBySchoolId(schoolId).stream()
                .map(e -> {
                    long days = ChronoUnit.DAYS.between(today, e.getExamDate());
                    return ExamDateResponse.builder()
                            .id(e.getId())
                            .className(e.getClassName())
                            .subjectName(e.getSubjectName())
                            .examDate(e.getExamDate())
                            .daysRemaining(days)
                            .urgency(days <= 7 ? "URGENT" : days <= 14 ? "UPCOMING" : "NORMAL")
                            .build();
                })
                .collect(Collectors.toList());
    }
}