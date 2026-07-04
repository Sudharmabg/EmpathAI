package com.mymercurie.schedule.service.impl;

import com.mymercurie.activities.entity.StudentGoal;
import com.mymercurie.activities.repository.StudentGoalRepository;
import com.mymercurie.schedule.dto.*;
import com.mymercurie.schedule.entity.ExamDate;
import com.mymercurie.schedule.entity.SchoolTiming;
import com.mymercurie.schedule.entity.StudentSchedulePreference;
import com.mymercurie.schedule.repository.ExamDateRepository;
import com.mymercurie.schedule.repository.SchoolTimingRepository;
import com.mymercurie.schedule.repository.ScheduleTaskRepository;
import com.mymercurie.schedule.repository.StudentSchedulePreferenceRepository;
import com.mymercurie.schedule.entity.ScheduleTask;
import com.mymercurie.schedule.service.IRecommendationService;
import com.mymercurie.user.entity.Student;
import com.mymercurie.user.repository.StudentRepository;
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

        List<TaskSuggestion> finalSuggestions = new ArrayList<>();

        // 1. Study Suggestion
        finalSuggestions.add(TaskSuggestion.builder()
                .title("Study")
                .subjectName(null)
                .estimatedMinutes(45)
                .taskType("STUDY")
                .reasonLabel("Select subject & time")
                .score(100)
                .build());

        // 2. Relax Suggestion
        String relaxTitle = "Relax";
        if (prefOpt.isPresent() && prefOpt.get().getLastRelaxActivity() != null && !prefOpt.get().getLastRelaxActivity().isBlank()) {
            relaxTitle = prefOpt.get().getLastRelaxActivity();
        }
        finalSuggestions.add(TaskSuggestion.builder()
                .title(relaxTitle)
                .subjectName(null)
                .estimatedMinutes(30)
                .taskType("WELLNESS")
                .reasonLabel("Stay balanced")
                .score(90)
                .build());

        // 3. Intervention Suggestion
        finalSuggestions.add(TaskSuggestion.builder()
                .title("Activity")
                .subjectName(null)
                .estimatedMinutes(30)
                .taskType("INTERVENTION")
                .reasonLabel("Assigned by counselor")
                .score(80)
                .build());

        log.info("✨ Final: {} suggestions returned", finalSuggestions.size());

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