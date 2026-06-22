package com.empathai.schedule.service.impl;

import com.empathai.activities.entity.StudentGoal;
import com.empathai.activities.repository.StudentGoalRepository;
import com.empathai.schedule.dto.*;
import com.empathai.schedule.entity.ExamDate;
import com.empathai.schedule.entity.SchoolTiming;
import com.empathai.schedule.entity.StudentSchedulePreference;
import com.empathai.schedule.repository.ExamDateRepository;
import com.empathai.schedule.repository.SchoolTimingRepository;
import com.empathai.schedule.repository.ScheduleTaskRepository;
import com.empathai.schedule.repository.StudentSchedulePreferenceRepository;
import com.empathai.schedule.entity.ScheduleTask;
import com.empathai.schedule.service.IRecommendationService;
import com.empathai.user.entity.Student;
import com.empathai.user.repository.StudentRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.*;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
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
    private final StudentSchedulePreferenceRepository preferenceRepository;
    private final ObjectMapper objectMapper;

    private static final List<String> WEEKLY_SUBJECTS = List.of(
            "Mathematics", "Science", "SST", "English", "Hindi"
    );

    // ── Subject alias map — maps any variation to canonical subject name ──────
    private static final Map<String, String> SUBJECT_ALIAS_MAP = new HashMap<>() {{
        // Mathematics
        put("math",              "Mathematics");
        put("maths",             "Mathematics");
        put("mathematics",       "Mathematics");
        put("algebra",           "Mathematics");
        put("geometry",          "Mathematics");
        put("arithmetic",        "Mathematics");
        put("trigonometry",      "Mathematics");
        put("calculus",          "Mathematics");
        // Science
        put("science",           "Science");
        put("sci",               "Science");
        put("physics",           "Science");
        put("phy",               "Science");
        put("chemistry",         "Science");
        put("chem",              "Science");
        put("biology",           "Science");
        put("bio",               "Science");
        // SST / Social Studies
        put("sst",               "SST");
        put("social",            "SST");
        put("social studies",    "SST");
        put("history",           "SST");
        put("geography",         "SST");
        put("geo",               "SST");
        put("civics",            "SST");
        put("economics",         "SST");
        put("political science", "SST");
        // English
        put("english",           "English");
        put("eng",               "English");
        put("grammar",           "English");
        put("literature",        "English");
        put("comprehension",     "English");
        // Hindi
        put("hindi",             "Hindi");
        put("हिंदी",              "Hindi");
    }};

    private static final List<String> WELLNESS_TASKS = List.of(
            "Take a short walk",
            "Stretching & breathing",
            "Free time / relax",
            "Drink water & rest",
            "Light exercise",
            "Listen to music",
            "Doodling or drawing",
            "Play with a pet"
    );

    private static final List<String> OTHER_TASKS = List.of(
            "Organise notes & bag",
            "Read for 20 minutes",
            "Prepare for tomorrow",
            "Tidy your desk & bag",
            "Plan tomorrow's schedule",
            "Revise class notes",
            "Practice handwriting",
            "Pack school bag"
    );

    private static final List<String> DAYS_ORDER = List.of(
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"
    );

    private static final Pattern CLASS_NUMBER_PATTERN = Pattern.compile(
            "(?:class|grade|std|standard)?\\s*(\\d{1,2})(?:st|nd|rd|th)?",
            Pattern.CASE_INSENSITIVE
    );

    // ─────────────────────────────────────────────────────────────────────────
    // Extract canonical subject names from a task title using alias map
    // e.g. "Math revision" → {"Mathematics"}
    //      "Study SST chapter 3" → {"SST"}
    // ─────────────────────────────────────────────────────────────────────────
    private Set<String> extractSubjectsFromTitle(String title) {
        if (title == null) return Collections.emptySet();
        String lower = title.toLowerCase().trim();
        Set<String> found = new HashSet<>();
        for (Map.Entry<String, String> entry : SUBJECT_ALIAS_MAP.entrySet()) {
            if (lower.contains(entry.getKey())) {
                found.add(entry.getValue());
            }
        }
        return found;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // Extract class number
    // ─────────────────────────────────────────────────────────────────────────
    private int extractClassNumber(String className) {
        if (className == null) return -1;
        Matcher m = CLASS_NUMBER_PATTERN.matcher(className.trim());
        if (m.find()) return Integer.parseInt(m.group(1));
        return -1;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RULE 3: Max single session by class
    // ─────────────────────────────────────────────────────────────────────────
    private int getMaxSessionMins(String className) {
        int n = extractClassNumber(className);
        if (n < 0)   return 45;
        if (n <= 4)  return 30;
        if (n <= 6)  return 45;
        if (n <= 8)  return 60;
        if (n <= 10) return 75;
        if (n <= 12) return 90;
        return 45;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RULE 2: Max daily study time by class
    // ─────────────────────────────────────────────────────────────────────────
    private int getMaxDailyStudyMins(String className, boolean isWeekend) {
        int n = extractClassNumber(className);
        if (n < 0)   return 120;
        if (n <= 2)  return isWeekend ? 90  : 60;
        if (n <= 4)  return isWeekend ? 120 : 90;
        if (n <= 6)  return isWeekend ? 180 : 120;
        if (n <= 8)  return isWeekend ? 240 : 180;
        if (n <= 10) return isWeekend ? 300 : 240;
        if (n <= 12) return isWeekend ? 360 : 300;
        return 120;
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

        Long   schoolId  = student.getSchoolId();
        String className = student.getClassName();
        int    classNum  = extractClassNumber(className);

        log.info("══════════════════════════════════════════════════════════");
        log.info("🔍 RECOMMENDATIONS — student={}, class='{}', classNum={}, day={}",
                studentId, className, classNum, dayOfWeek);

        // ── Preferences ───────────────────────────────────────────────────────
        String preferredStudyTime = null;
        List<BusySlotDTO> todayBusySlots = Collections.emptyList();

        Optional<StudentSchedulePreference> prefOpt =
                preferenceRepository.findByStudentId(studentId);
        if (prefOpt.isPresent()) {
            StudentSchedulePreference pref = prefOpt.get();
            preferredStudyTime = pref.getPreferredStudyTime();
            List<BusySlotDTO> allBusySlots = deserializeBusySlots(pref.getBusySlots());
            todayBusySlots = allBusySlots.stream()
                    .filter(s -> dayOfWeek.equalsIgnoreCase(s.getDay()))
                    .collect(Collectors.toList());
            log.info("📋 Preferences: studyTime={}, busySlotsToday={}",
                    preferredStudyTime, todayBusySlots.size());
        }

        // ── School blocked windows ─────────────────────────────────────────────
        List<SchoolTimingResponse> blockedWindows =
                getBlockedWindows(schoolId, dayOfWeek, className);

        // ── Upcoming exams ─────────────────────────────────────────────────────
        List<ExamDateResponse> upcomingExams = getUpcomingExams(schoolId, className);

        // ── Goals ──────────────────────────────────────────────────────────────
        List<StudentGoal> goals =
                studentGoalRepository.findByStudentIdAndActiveTrue(studentId);
        Set<String> goalSubjects = goals.stream()
                .map(StudentGoal::getSubjectTag)
                .collect(Collectors.toSet());

        // ── Weekly coverage — uses alias map ───────────────────────────────────
        LocalDate weekStart = LocalDate.now().with(java.time.temporal.TemporalAdjusters.previousOrSame(java.time.DayOfWeek.MONDAY));
        List<ScheduleTask> weekTasks = scheduleTaskRepository.findByStudentIdAndWeekStartDate(studentId, weekStart);
        Map<String, Long> subjectWeekCount = new HashMap<>();
        for (String subject : WEEKLY_SUBJECTS) {
            long count = weekTasks.stream()
                    .filter(t -> t.getTitle() != null)
                    // ✅ uses alias map instead of simple contains()
                    .filter(t -> extractSubjectsFromTitle(t.getTitle()).contains(subject))
                    .count();
            subjectWeekCount.put(subject, count);
        }
        Set<String> coveredSubjects = subjectWeekCount.entrySet().stream()
                .filter(e -> e.getValue() > 0)
                .map(Map.Entry::getKey)
                .collect(Collectors.toSet());
        log.info("📗 Weekly: {} | Covered: {}", subjectWeekCount, coveredSubjects);

        // ── Today's tasks ──────────────────────────────────────────────────────
        List<ScheduleTask> todayTasks =
                scheduleTaskRepository.findByStudentIdAndDayOfWeekAndWeekStartDate(studentId, dayOfWeek, weekStart);

        // ── RULE 10: Max 8 tasks ───────────────────────────────────────────────
        int todayTotalTasks    = todayTasks.size();
        int remainingTaskSlots = Math.max(0, 8 - todayTotalTasks);
        if (remainingTaskSlots <= 0) {
            log.info("🚫 Rule 10: Max 8 tasks reached.");
            return ScheduleRecommendationResponse.builder()
                    .blockedWindows(blockedWindows)
                    .upcomingExams(upcomingExams)
                    .suggestions(Collections.emptyList())
                    .preferredStudyTime(preferredStudyTime)
                    .busySlots(todayBusySlots)
                    .build();
        }

        // ── RULE 2: Daily study cap ────────────────────────────────────────────
        int todayStudyMins = todayTasks.stream()
                .filter(t -> "study".equalsIgnoreCase(t.getDetectedType()))
                .mapToInt(t -> toMins(t.getEndTime()) - toMins(t.getStartTime()))
                .filter(d -> d > 0)
                .sum();
        int maxDailyMins       = getMaxDailyStudyMins(className, isWeekend(dayOfWeek));
        int remainingStudyMins = Math.max(0, maxDailyMins - todayStudyMins);

        // ── RULE 7: Max 3 study sessions ──────────────────────────────────────
        int todayStudySessions    = (int) todayTasks.stream()
                .filter(t -> "study".equalsIgnoreCase(t.getDetectedType())).count();
        int remainingStudySessions = Math.max(0, 3 - todayStudySessions);

        // ── RULE 3: Max single session ─────────────────────────────────────────
        int maxSessionMins = getMaxSessionMins(className);
        boolean canAddStudy = remainingStudySessions > 0 && remainingStudyMins >= 15;

        // ── Type counts ────────────────────────────────────────────────────────
        int todayWellnessCount = (int) todayTasks.stream()
                .filter(t -> "wellness".equalsIgnoreCase(t.getDetectedType())).count();
        int todayOtherCount    = (int) todayTasks.stream()
                .filter(t -> "other".equalsIgnoreCase(t.getDetectedType())).count();

        // ── RULE 12: Consecutive study days ───────────────────────────────────
        int consecutiveStudyDays =
                countConsecutiveStudyDays(studentId, dayOfWeek, weekTasks);

        // ── RULE 9: Today's titles and subjects — uses alias map ───────────────
        Set<String> todayTitles = todayTasks.stream()
                .filter(t -> t.getTitle() != null)
                .map(t -> t.getTitle().toLowerCase().trim())
                .collect(Collectors.toSet());

        // ✅ Uses alias map — "Math revision" now correctly maps to "Mathematics"
        Set<String> todaySubjects = todayTasks.stream()
                .filter(t -> t.getTitle() != null)
                .flatMap(t -> extractSubjectsFromTitle(t.getTitle()).stream())
                .collect(Collectors.toSet());

        // ✅ Goal subjects also use alias map
        goalSubjects.forEach(gs -> todayTasks.stream()
                .filter(t -> t.getTitle() != null &&
                        extractSubjectsFromTitle(t.getTitle()).contains(gs))
                .findFirst()
                .ifPresent(t -> todaySubjects.add(gs)));

        log.info("📊 Today: {}tasks, {}study({}min/{}max), {}wellness, {}other | " +
                        "consecutive={} | slots={}",
                todayTotalTasks, todayStudySessions, todayStudyMins, maxDailyMins,
                todayWellnessCount, todayOtherCount, consecutiveStudyDays, remainingTaskSlots);

        // ══════════════════════════════════════════════════════════════════════
        // BUILD SUGGESTION POOLS SEPARATELY
        // ══════════════════════════════════════════════════════════════════════

        List<TaskSuggestion> studySuggestions   = new ArrayList<>();
        List<TaskSuggestion> wellnessSuggestions = new ArrayList<>();
        List<TaskSuggestion> otherSuggestions    = new ArrayList<>();

        // ── STUDY POOL ─────────────────────────────────────────────────────────

        if (canAddStudy) {
            int sessionMins = Math.min(maxSessionMins, Math.max(15, remainingStudyMins));
            Map<String, TaskSuggestion> studyMap = new LinkedHashMap<>();

            Set<String> examSubjects = upcomingExams.stream()
                    .map(e -> e.getSubjectName().toLowerCase())
                    .collect(Collectors.toSet());

            LocalDate today = LocalDate.now();
            Set<String> activeGoalSubjectsLower = goals.stream()
                    .filter(g -> g.getTargetDate() == null || !today.isAfter(g.getTargetDate()))
                    .map(g -> g.getSubjectTag().toLowerCase())
                    .collect(Collectors.toSet());

            log.info("📌 Exam: {} | Goals: {}", examSubjects, activeGoalSubjectsLower);

            // Weekly subjects
            for (String subject : WEEKLY_SUBJECTS) {
                if (todaySubjects.contains(subject)) continue;
                String title = "Study session — " + subject;
                if (todayTitles.contains(title.toLowerCase().trim())) continue;

                String  sl       = subject.toLowerCase();
                boolean isExam   = examSubjects.contains(sl);
                boolean isGoal   = activeGoalSubjectsLower.contains(sl);
                boolean isCovered = coveredSubjects.contains(subject);

                if (!isExam && !isGoal && isCovered) continue;

                int    score  = isCovered ? 10 : 12;
                String reason = isCovered
                        ? "Weekly subject"
                        : "Weekly subject — not covered yet";

                studyMap.put(sl, TaskSuggestion.builder()
                        .title(title).subjectName(subject).reasonLabel(reason)
                        .estimatedMinutes(sessionMins).taskType("STUDY").score(score)
                        .build());
            }

            // Goals
            for (String gs : goalSubjects) {
                if (todaySubjects.contains(gs)) continue;
                String key    = gs.toLowerCase();
                boolean active = goals.stream()
                        .filter(g -> g.getSubjectTag().equalsIgnoreCase(gs))
                        .anyMatch(g -> g.getTargetDate() == null
                                || !today.isAfter(g.getTargetDate()));
                if (!active) continue;

                TaskSuggestion existing = studyMap.get(key);
                if (existing != null) {
                    existing.setScore(existing.getScore() + 20);
                    goals.stream()
                            .filter(g -> g.getSubjectTag().equalsIgnoreCase(gs)
                                    && g.getTargetDate() != null)
                            .findFirst()
                            .ifPresent(g -> {
                                long dl = ChronoUnit.DAYS.between(today, g.getTargetDate());
                                existing.setReasonLabel(dl <= 7
                                        ? "Goal deadline in " + dl + " day" + (dl == 1 ? "" : "s")
                                        : "Matches your goal");
                            });
                } else {
                    String title = "Study session — " + gs;
                    if (todayTitles.contains(title.toLowerCase().trim())) continue;
                    String reason = "Matches your goal";
                    Optional<StudentGoal> mg = goals.stream()
                            .filter(g -> g.getSubjectTag().equalsIgnoreCase(gs)
                                    && g.getTargetDate() != null)
                            .findFirst();
                    if (mg.isPresent()) {
                        long dl = ChronoUnit.DAYS.between(today, mg.get().getTargetDate());
                        if (dl <= 7)
                            reason = "Goal deadline in " + dl + " day" + (dl == 1 ? "" : "s");
                    }
                    studyMap.put(key, TaskSuggestion.builder()
                            .title(title).subjectName(gs).reasonLabel(reason)
                            .estimatedMinutes(sessionMins).taskType("STUDY").score(20)
                            .build());
                }
            }

            // Homework
            if (!upcomingExams.isEmpty()) {
                String hwTitle = "Complete homework";
                if (!todayTitles.contains(hwTitle.toLowerCase().trim())
                        && !studyMap.containsKey("homework")) {
                    studyMap.put("homework", TaskSuggestion.builder()
                            .title(hwTitle).subjectName("Homework")
                            .reasonLabel("Exam preparation")
                            .estimatedMinutes(sessionMins).taskType("STUDY").score(6)
                            .build());
                }
            }

            // Exams
            Set<String> processedExams = new HashSet<>();
            for (ExamDateResponse exam : upcomingExams) {
                String key = exam.getSubjectName().toLowerCase();
                if (processedExams.contains(key)
                        || todaySubjects.contains(exam.getSubjectName())) continue;
                processedExams.add(key);

                int    boost = "URGENT".equals(exam.getUrgency()) ? 50 : 25;
                String label = "Exam in " + exam.getDaysRemaining()
                        + " day" + (exam.getDaysRemaining() == 1 ? "" : "s");

                TaskSuggestion existing = studyMap.get(key);
                if (existing != null) {
                    existing.setScore(existing.getScore() + boost);
                    existing.setReasonLabel(label);
                    existing.setTitle("Revise — " + exam.getSubjectName());
                } else {
                    String title = "Revise — " + exam.getSubjectName();
                    if (todayTitles.contains(title.toLowerCase().trim())) continue;
                    studyMap.put(key, TaskSuggestion.builder()
                            .title(title).subjectName(exam.getSubjectName())
                            .reasonLabel(label)
                            .estimatedMinutes(sessionMins).taskType("STUDY").score(boost)
                            .build());
                }
            }

            studySuggestions = new ArrayList<>(studyMap.values());
            studySuggestions.sort(
                    Comparator.comparingInt(TaskSuggestion::getScore).reversed());
            log.info("📚 Study pool: {} items", studySuggestions.size());
            studySuggestions.forEach(s -> log.info("      {} | {} | score={}",
                    s.getTitle(), s.getReasonLabel(), s.getScore()));
        }

        // ── WELLNESS POOL ──────────────────────────────────────────────────────

        int maxWellness  = consecutiveStudyDays >= 3 ? 4
                : todayWellnessCount == 0 ? 3 : 2;
        int wellnessToAdd = Math.max(0, maxWellness - todayWellnessCount);

        List<String> wellnessPool = new ArrayList<>(WELLNESS_TASKS);
        Collections.shuffle(wellnessPool);
        for (String title : wellnessPool) {
            if (wellnessSuggestions.size() >= wellnessToAdd) break;
            if (todayTitles.contains(title.toLowerCase().trim())) continue;
            wellnessSuggestions.add(TaskSuggestion.builder()
                    .title(title).subjectName(null)
                    .reasonLabel(consecutiveStudyDays >= 3
                            ? "3 study days in a row — rest up!"
                            : "Stay balanced")
                    .estimatedMinutes(20).taskType("WELLNESS")
                    .score(consecutiveStudyDays >= 3 ? 40 : 15)
                    .build());
        }
        log.info("🧘 Wellness pool: {} items", wellnessSuggestions.size());

        // ── OTHER POOL ─────────────────────────────────────────────────────────

        int maxOther  = 3;
        int otherToAdd = Math.max(0, maxOther - todayOtherCount);

        List<String> otherPool = new ArrayList<>(OTHER_TASKS);
        Collections.shuffle(otherPool);
        for (String title : otherPool) {
            if (otherSuggestions.size() >= otherToAdd) break;
            if (todayTitles.contains(title.toLowerCase().trim())) continue;
            otherSuggestions.add(TaskSuggestion.builder()
                    .title(title).subjectName(null).reasonLabel("Daily routine")
                    .estimatedMinutes(30).taskType("OTHER").score(8)
                    .build());
        }
        log.info("📋 Other pool: {} items", otherSuggestions.size());

        // ══════════════════════════════════════════════════════════════════════
        // MERGE — guarantee minimum wellness + other slots
        // ══════════════════════════════════════════════════════════════════════

        List<TaskSuggestion> allSuggestions = new ArrayList<>();

        int minWellnessSlots = Math.min(wellnessSuggestions.size(),
                Math.min(2, remainingTaskSlots));
        int minOtherSlots    = Math.min(otherSuggestions.size(),
                Math.min(1, Math.max(0, remainingTaskSlots - minWellnessSlots)));
        int studySlots       = Math.max(0,
                remainingTaskSlots - minWellnessSlots - minOtherSlots);

        // Add study
        int studyAdded = 0;
        for (TaskSuggestion s : studySuggestions) {
            if (studyAdded >= studySlots) break;
            allSuggestions.add(s);
            studyAdded++;
        }

        // Add guaranteed wellness
        int wellnessAdded = 0;
        for (TaskSuggestion s : wellnessSuggestions) {
            if (wellnessAdded >= minWellnessSlots) break;
            allSuggestions.add(s);
            wellnessAdded++;
        }

        // Add guaranteed other
        int otherAdded = 0;
        for (TaskSuggestion s : otherSuggestions) {
            if (otherAdded >= minOtherSlots) break;
            allSuggestions.add(s);
            otherAdded++;
        }

        // Fill remaining slots with leftovers
        List<TaskSuggestion> leftovers = new ArrayList<>();
        if (studyAdded < studySuggestions.size())
            leftovers.addAll(studySuggestions.subList(studyAdded, studySuggestions.size()));
        if (wellnessAdded < wellnessSuggestions.size())
            leftovers.addAll(wellnessSuggestions.subList(wellnessAdded, wellnessSuggestions.size()));
        if (otherAdded < otherSuggestions.size())
            leftovers.addAll(otherSuggestions.subList(otherAdded, otherSuggestions.size()));

        leftovers.sort(Comparator.comparingInt(TaskSuggestion::getScore).reversed());
        for (TaskSuggestion s : leftovers) {
            if (allSuggestions.size() >= remainingTaskSlots) break;
            allSuggestions.add(s);
        }

        // Final sort
        allSuggestions.sort(Comparator.comparingInt(TaskSuggestion::getScore).reversed());

        List<TaskSuggestion> finalSuggestions = allSuggestions.stream()
                .limit(remainingTaskSlots)
                .collect(Collectors.toList());

        log.info("✨ Final: {} suggestions (study={}, wellness={}, other={}, slots={})",
                finalSuggestions.size(), studyAdded, wellnessAdded,
                otherAdded, remainingTaskSlots);
        finalSuggestions.forEach(s -> log.info("   → [{}] {} | {} | {}m | score={}",
                s.getTaskType(), s.getTitle(), s.getReasonLabel(),
                s.getEstimatedMinutes(), s.getScore()));
        log.info("══════════════════════════════════════════════════════════");

        return ScheduleRecommendationResponse.builder()
                .blockedWindows(blockedWindows)
                .upcomingExams(upcomingExams)
                .suggestions(finalSuggestions)
                .preferredStudyTime(preferredStudyTime)
                .busySlots(todayBusySlots)
                .build();
    }

    // ─────────────────────────────────────────────────────────────────────────
    // CONSECUTIVE STUDY DAYS
    // ─────────────────────────────────────────────────────────────────────────

    private int countConsecutiveStudyDays(Long studentId, String dayOfWeek,
                                          List<ScheduleTask> weekTasks) {
        int todayIdx = DAYS_ORDER.indexOf(dayOfWeek);
        if (todayIdx < 0) return 0;
        int count = 0;
        // Check up to 6 preceding days (to count consecutive days wrapping around the weekly cycle)
        for (int i = 1; i <= 6; i++) {
            int prevIdx = (todayIdx - i + 7) % 7;
            String prevDay = DAYS_ORDER.get(prevIdx);
            boolean hadStudy = weekTasks.stream()
                    .filter(t -> prevDay.equalsIgnoreCase(t.getDayOfWeek()))
                    .anyMatch(t -> "study".equalsIgnoreCase(t.getDetectedType()));
            if (hadStudy) {
                count++;
            } else {
                break;
            }
        }
        return count;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BLOCKED WINDOWS
    // ─────────────────────────────────────────────────────────────────────────

    private List<SchoolTimingResponse> getBlockedWindows(
            Long schoolId, String dayOfWeek, String className) {
        if (schoolId == null || className == null) return new ArrayList<>();
        int targetClassNum = extractClassNumber(className);

        return schoolTimingRepository.findBySchoolId(schoolId).stream()
                .filter(t -> t.getDayOfWeek().equalsIgnoreCase(dayOfWeek))
                .filter(t -> {
                    if (t.getClassName() == null) return false;
                    int tClassNum = extractClassNumber(t.getClassName());
                    return (targetClassNum != -1 && tClassNum != -1)
                            ? targetClassNum == tClassNum
                            : className.equalsIgnoreCase(t.getClassName());
                })
                .map(t -> SchoolTimingResponse.builder()
                        .id(t.getId()).className(t.getClassName())
                        .dayOfWeek(t.getDayOfWeek())
                        .startTime(t.getStartTime()).endTime(t.getEndTime())
                        .build())
                .collect(Collectors.toCollection(ArrayList::new));
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
                    long   days    = ChronoUnit.DAYS.between(today, e.getExamDate());
                    String urgency = days <= 7 ? "URGENT"
                            : days <= 14 ? "UPCOMING" : "NORMAL";
                    return ExamDateResponse.builder()
                            .id(e.getId()).className(e.getClassName())
                            .subjectName(e.getSubjectName())
                            .examDate(e.getExamDate()).daysRemaining(days)
                            .urgency(urgency).build();
                })
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private int toMins(String time) {
        if (time == null || !time.contains(":")) return 0;
        String[] parts = time.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    private List<BusySlotDTO> deserializeBusySlots(String json) {
        if (json == null || json.isBlank() || json.equals("[]"))
            return Collections.emptyList();
        try {
            return objectMapper.readValue(json,
                    new TypeReference<List<BusySlotDTO>>() {});
        } catch (Exception e) {
            log.error("Failed to deserialize busy slots", e);
            return Collections.emptyList();
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: School timings
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public List<SchoolTimingResponse> saveSchoolTimings(
            Long schoolId, List<SchoolTimingRequest> requests) {
        schoolTimingRepository.deleteBySchoolId(schoolId);
        List<SchoolTiming> saved = requests.stream()
                .map(r -> SchoolTiming.builder()
                        .schoolId(schoolId).className(r.getClassName())
                        .dayOfWeek(r.getDayOfWeek())
                        .startTime(r.getStartTime()).endTime(r.getEndTime())
                        .build())
                .map(schoolTimingRepository::save)
                .collect(Collectors.toList());
        return saved.stream()
                .map(t -> SchoolTimingResponse.builder()
                        .id(t.getId()).className(t.getClassName())
                        .dayOfWeek(t.getDayOfWeek())
                        .startTime(t.getStartTime()).endTime(t.getEndTime())
                        .build())
                .collect(Collectors.toList());
    }

    @Override
    public List<SchoolTimingResponse> getSchoolTimings(Long schoolId) {
        return schoolTimingRepository.findBySchoolId(schoolId).stream()
                .map(t -> SchoolTimingResponse.builder()
                        .id(t.getId()).className(t.getClassName())
                        .dayOfWeek(t.getDayOfWeek())
                        .startTime(t.getStartTime()).endTime(t.getEndTime())
                        .build())
                .collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ADMIN: Exam dates
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public ExamDateResponse saveExamDate(ExamDateRequest request) {
        ExamDate saved = examDateRepository.save(ExamDate.builder()
                .schoolId(request.getSchoolId()).className(request.getClassName())
                .subjectName(request.getSubjectName()).examDate(request.getExamDate())
                .build());
        long days = ChronoUnit.DAYS.between(LocalDate.now(), saved.getExamDate());
        return ExamDateResponse.builder()
                .id(saved.getId()).className(saved.getClassName())
                .subjectName(saved.getSubjectName())
                .examDate(saved.getExamDate()).daysRemaining(days)
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
                            .id(e.getId()).className(e.getClassName())
                            .subjectName(e.getSubjectName())
                            .examDate(e.getExamDate()).daysRemaining(days)
                            .urgency(days <= 7 ? "URGENT"
                                    : days <= 14 ? "UPCOMING" : "NORMAL")
                            .build();
                })
                .collect(Collectors.toList());
    }
}