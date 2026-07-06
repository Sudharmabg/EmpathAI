package com.mymercurie.schedule.service;

import com.mymercurie.schedule.dto.RuleResult;
import com.mymercurie.schedule.dto.TaskRequest;
import com.mymercurie.schedule.entity.ClassConfig;
import com.mymercurie.schedule.entity.ScheduleRule;
import com.mymercurie.schedule.entity.ScheduleTask;
import com.mymercurie.schedule.repository.ClassConfigRepository;
import com.mymercurie.schedule.repository.ScheduleRuleRepository;
import com.mymercurie.schedule.repository.ScheduleTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.Arrays;
import java.util.List;
import java.util.Optional;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleRuleEngine {

    private final ScheduleRuleRepository ruleRepository;
    private final ScheduleTaskRepository taskRepository;
    private final ClassConfigRepository classConfigRepository;

    // ── Keywords that identify a task as a STUDY task ─────────────────────────
    private static final List<String> STUDY_KEYWORDS = Arrays.asList(
            "study", "revision", "revise", "session",
            "math", "maths", "mathematics", "science", "english", "hindi", "sst",
            "history", "geography", "physics", "chemistry", "biology", "computer",
            "exam", "test", "assignment", "lecture", "chapter", "worksheet", "essay",
            "homework",
            "make notes", "read notes", "write notes", "study notes", "take notes"
    );

    // ── Time constants in minutes ──────────────────────────────────────────────
    private static final int START_OF_DAY_MINS  = 6 * 60;
    private static final int END_OF_DAY_MINS    = 23 * 60;
    private static final int GRACE_BOUNDARY     = 15;
    private static final int MIN_BREAK_MINS     = 10;
    private static final int MIN_DURATION_MINS  = 15;
    private static final int MAX_TASKS_PER_DAY  = 8;
    private static final int MAX_STUDY_SESSIONS = 3;

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC ENTRY POINT
    // ─────────────────────────────────────────────────────────────────────────

    public RuleResult validate(TaskRequest request, String studentGrade) {
        RuleResult result = RuleResult.builder().build();

        int startMins = toMins(request.getStartTime());
        int endMins   = toMins(request.getEndTime());
        int duration  = endMins - startMins;

        boolean isStudy = isStudyTask(request.getTitle());

        LocalDate taskDate = request.getDate();
        boolean isWeekend = taskDate.getDayOfWeek() == DayOfWeek.SATURDAY
                || taskDate.getDayOfWeek() == DayOfWeek.SUNDAY;
        List<ScheduleTask> dayTasks = taskRepository
                .findByStudentIdAndTaskDate(request.getStudentId(), taskDate);

        ClassConfig config = resolveClassConfig(studentGrade);

        List<ScheduleRule> rules = ruleRepository.findByActiveTrueOrderByPriorityAsc();

        boolean gracePassed = false;

        for (ScheduleRule rule : rules) {
            switch (rule.getRuleId()) {

                case "R06" -> applyRule06_MinDuration(result, duration);

                case "R11" -> gracePassed = applyRule11_GraceRule(result, endMins);

                case "R05" -> applyRule05_TimeBoundary(result, startMins, endMins, gracePassed);

                case "R01" -> applyRule01_NoOverlap(result, request, startMins, endMins, dayTasks);

                case "R09" -> applyRule09_NoDuplicateNames(result, request, dayTasks);

                case "R10" -> applyRule10_MaxTasksPerDay(result, request, dayTasks);

                case "R02" -> {
                    if (isStudy) applyRule02_DailyStudyCap(result, request, duration, dayTasks, config, isWeekend);
                }
                case "R03" -> {
                    if (isStudy) applyRule03_MaxSessionLength(result, duration, config, studentGrade);
                }
                case "R04" -> {
                    if (isStudy) applyRule04_MinBreakBetweenSessions(result, request, startMins, endMins, dayTasks);
                }
                case "R07" -> {
                    if (isStudy) applyRule07_MaxStudySessions(result, request, dayTasks);
                }
                case "R08" -> {
                    if (isStudy) applyRule08_WellnessWarning(result, dayTasks, request);
                }
                case "R12" -> {
                    if (isStudy) applyRule12_ConsecutiveDaysWarning(result, request);
                }

                default -> log.warn("Unknown rule ID in DB: {}", rule.getRuleId());
            }

            if (result.hasErrors()) {
                break;
            }
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RULE IMPLEMENTATIONS
    // ─────────────────────────────────────────────────────────────────────────

    private void applyRule06_MinDuration(RuleResult result, int duration) {
        if (duration < MIN_DURATION_MINS) {
            result.getErrors().add("Task must be at least " + MIN_DURATION_MINS + " minutes long.");
        }
    }

    private boolean applyRule11_GraceRule(RuleResult result, int endMins) {
        int overMins = endMins - END_OF_DAY_MINS;
        if (overMins > 0) {
            if (overMins <= GRACE_BOUNDARY) {
                result.getWarnings().add(
                        "Task finishes just after 11:00 PM — allowed as a grace exception.");
                return true;
            } else {
                result.getErrors().add(
                        "Task extends too far past 11:00 PM. Shorten it or move the rest to tomorrow.");
                return false;
            }
        }
        return false;
    }

    private void applyRule05_TimeBoundary(RuleResult result, int startMins, int endMins, boolean gracePassed) {
        if (startMins < START_OF_DAY_MINS) {
            result.getErrors().add("Tasks cannot be scheduled before 6:00 AM.");
        }
        if (!gracePassed && endMins > END_OF_DAY_MINS) {
            result.getErrors().add("Tasks can only run until 11:00 PM.");
        }
    }

    private void applyRule01_NoOverlap(RuleResult result, TaskRequest request,
                                       int startMins, int endMins, List<ScheduleTask> dayTasks) {
        boolean overlaps = dayTasks.stream()
                .filter(t -> !t.getId().equals(request.getExcludeTaskId()))
                .anyMatch(t -> {
                    int tStart = toMins(t.getStartTime());
                    int tEnd   = toMins(t.getEndTime());
                    return startMins < tEnd && endMins > tStart;
                });

        if (overlaps) {
            result.getErrors().add("This time slot overlaps with an existing task.");
        }
    }

    private void applyRule09_NoDuplicateNames(RuleResult result, TaskRequest request,
                                              List<ScheduleTask> dayTasks) {
        boolean duplicate = dayTasks.stream()
                .filter(t -> !t.getId().equals(request.getExcludeTaskId()))
                .anyMatch(t -> t.getTitle().equalsIgnoreCase(request.getTitle()));

        if (duplicate) {
            result.getErrors().add("A task named \"" + request.getTitle() + "\" already exists today.");
        }
    }

    private void applyRule10_MaxTasksPerDay(RuleResult result, TaskRequest request,
                                            List<ScheduleTask> dayTasks) {
        long taskCount = dayTasks.stream()
                .filter(t -> !t.getId().equals(request.getExcludeTaskId()))
                .count();

        if (taskCount >= MAX_TASKS_PER_DAY) {
            result.getErrors().add(
                    "Daily limit of " + MAX_TASKS_PER_DAY + " tasks reached. Remove a task to add a new one.");
        }
    }

    private void applyRule02_DailyStudyCap(RuleResult result, TaskRequest request,
                                           int duration, List<ScheduleTask> dayTasks,
                                           ClassConfig config, boolean isWeekend) {
        if (config == null) return;

        int cap = isWeekend ? config.getWeekendCapMins() : config.getWeekdayCapMins();

        int studyMinsUsed = dayTasks.stream()
                .filter(t -> !t.getId().equals(request.getExcludeTaskId()))
                .filter(t -> "STUDY".equals(t.getDetectedType()))
                .mapToInt(t -> toMins(t.getEndTime()) - toMins(t.getStartTime()))
                .sum();

        if (studyMinsUsed + duration > cap) {
            String dayType = isWeekend ? "weekend" : "weekday";
            result.getErrors().add(
                    "Daily study limit of " + formatMins(cap) + " (" + dayType + ") reached. " +
                            "You have used " + formatMins(studyMinsUsed) + " already.");
        }
    }

    private void applyRule03_MaxSessionLength(RuleResult result, int duration,
                                              ClassConfig config, String studentGrade) {
        if (config == null) return;

        if (duration > config.getSessionMaxMins()) {
            result.getErrors().add(
                    "Single study session cannot exceed " + config.getSessionMaxMins() +
                            " minutes for your class. Break it into smaller sessions.");
        }
    }

    private void applyRule04_MinBreakBetweenSessions(RuleResult result, TaskRequest request,
                                                     int startMins, int endMins,
                                                     List<ScheduleTask> dayTasks) {
        List<ScheduleTask> studyTasks = dayTasks.stream()
                .filter(t -> !t.getId().equals(request.getExcludeTaskId()))
                .filter(t -> "STUDY".equals(t.getDetectedType()))
                .toList();

        Optional<ScheduleTask> prevStudy = studyTasks.stream()
                .filter(t -> toMins(t.getEndTime()) <= startMins)
                .max((a, b) -> Integer.compare(toMins(a.getEndTime()), toMins(b.getEndTime())));

        Optional<ScheduleTask> nextStudy = studyTasks.stream()
                .filter(t -> toMins(t.getStartTime()) >= endMins)
                .min((a, b) -> Integer.compare(toMins(a.getStartTime()), toMins(b.getStartTime())));

        if (prevStudy.isPresent()) {
            int gap = startMins - toMins(prevStudy.get().getEndTime());
            if (gap < MIN_BREAK_MINS) {
                result.getErrors().add(
                        "You need at least a " + MIN_BREAK_MINS +
                                " minute break after your previous study session.");
            }
        }

        if (nextStudy.isPresent()) {
            int gap = toMins(nextStudy.get().getStartTime()) - endMins;
            if (gap < MIN_BREAK_MINS) {
                result.getErrors().add(
                        "You need at least a " + MIN_BREAK_MINS +
                                " minute break before your next study session.");
            }
        }
    }

    private void applyRule07_MaxStudySessions(RuleResult result, TaskRequest request,
                                              List<ScheduleTask> dayTasks) {
        long studyCount = dayTasks.stream()
                .filter(t -> !t.getId().equals(request.getExcludeTaskId()))
                .filter(t -> "STUDY".equals(t.getDetectedType()))
                .count();

        if (studyCount >= MAX_STUDY_SESSIONS) {
            result.getErrors().add(
                    "Maximum " + MAX_STUDY_SESSIONS + " study sessions allowed per day.");
        }
    }

    private void applyRule08_WellnessWarning(RuleResult result, List<ScheduleTask> dayTasks,
                                             TaskRequest request) {
        boolean hasNonStudy = dayTasks.stream()
                .filter(t -> !t.getId().equals(request.getExcludeTaskId()))
                .anyMatch(t -> !"STUDY".equals(t.getDetectedType()));

        if (!hasNonStudy) {
            result.getWarnings().add(
                    "⚠ No break or wellness task found today. Consider adding one for better focus.");
        }
    }

    private static final java.util.Map<String, String> RULE_SUBJECT_MAP = new java.util.HashMap<>() {{
        put("math",              "Mathematics");
        put("maths",             "Mathematics");
        put("mathematics",       "Mathematics");
        put("algebra",           "Mathematics");
        put("geometry",          "Mathematics");
        put("arithmetic",        "Mathematics");
        put("trigonometry",      "Mathematics");
        put("calculus",          "Mathematics");
        put("science",           "Science");
        put("sci",               "Science");
        put("physics",           "Science");
        put("phy",               "Science");
        put("chemistry",         "Science");
        put("chem",              "Science");
        put("biology",           "Science");
        put("bio",               "Science");
        put("english",           "English");
        put("eng",               "English");
        put("grammar",           "English");
        put("literature",        "English");
        put("reading",           "English");
        put("writing",           "English");
        put("comprehension",     "English");
        put("hindi",             "Hindi");
        put("हिंदी",              "Hindi");
        put("sst",               "Social Studies");
        put("social",            "Social Studies");
        put("social studies",    "Social Studies");
        put("history",           "Social Studies");
        put("geography",         "Social Studies");
        put("geo",               "Social Studies");
        put("civics",            "Social Studies");
        put("economics",         "Social Studies");
        put("political science", "Social Studies");
    }};

    private String extractSubjectFromTitle(String title) {
        if (title == null) return null;
        String lower = title.toLowerCase().trim();
        for (java.util.Map.Entry<String, String> entry : RULE_SUBJECT_MAP.entrySet()) {
            if (lower.contains(entry.getKey())) {
                return entry.getValue();
            }
        }
        return null;
    }

    /**
     * Rule 12 — Soft Warning: Study same subject for 3 days in a week (priority 12)
     */
    private void applyRule12_ConsecutiveDaysWarning(RuleResult result, TaskRequest request) {
        String newSubject = extractSubjectFromTitle(request.getTitle());
        if (newSubject == null) return;

        LocalDate taskDate = request.getDate();
        LocalDate weekStart = taskDate.with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        LocalDate weekEnd = weekStart.plusDays(6);

        List<ScheduleTask> weekTasks = taskRepository.findByStudentIdAndTaskDateBetween(
                request.getStudentId(), weekStart, weekEnd);

        java.util.Map<String, java.util.Set<LocalDate>> subjectDays = new java.util.HashMap<>();
        subjectDays.computeIfAbsent(newSubject, k -> new java.util.HashSet<>()).add(taskDate);

        for (ScheduleTask task : weekTasks) {
            if (request.getExcludeTaskId() != null && task.getId().equals(request.getExcludeTaskId())) {
                continue;
            }
            if ("STUDY".equalsIgnoreCase(task.getDetectedType())) {
                String sub = extractSubjectFromTitle(task.getTitle());
                if (sub != null) {
                    subjectDays.computeIfAbsent(sub, k -> new java.util.HashSet<>()).add(task.getTaskDate());
                }
            }
        }

        java.util.Set<LocalDate> days = subjectDays.get(newSubject);
        if (days != null && days.size() >= 3) {
            result.getWarnings().add(
                    "⚠ " + newSubject + " should not be studied for 3 days in a week. Consider balancing your schedule with other subjects."
            );
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    public boolean isStudyTask(String title) {
        if (title == null) return false;
        String lower = title.toLowerCase();
        return STUDY_KEYWORDS.stream().anyMatch(lower::contains);
    }

    public String detectType(String title) {
        if (title == null) return "OTHER";
        String lower = title.toLowerCase();
        if (STUDY_KEYWORDS.stream().anyMatch(lower::contains)) return "STUDY";
        List<String> wellnessKeywords = List.of(
                "gym", "yoga", "walk", "run", "jog", "exercise", "workout", "sport",
                "swim", "cycle", "stretch",
                "sleep", "nap", "rest", "break", "relax", "free time",
                "meditation", "meditate", "breathing",
                "meal", "lunch", "dinner", "breakfast",
                "drink water");
        if (wellnessKeywords.stream().anyMatch(lower::contains)) return "WELLNESS";
        return "OTHER";
    }

    public int toMins(String time) {
        if (time == null || !time.contains(":")) return 0;
        String[] parts = time.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    public int toMins(java.time.LocalTime time) {
        if (time == null) return 0;
        return time.getHour() * 60 + time.getMinute();
    }

    private String formatMins(int mins) {
        int h = mins / 60;
        int m = mins % 60;
        if (h > 0 && m > 0) return h + "h " + m + "m";
        if (h > 0) return h + "h";
        return m + "m";
    }

    private ClassConfig resolveClassConfig(String studentGrade) {
        if (studentGrade == null) return null;

        java.util.regex.Matcher m = java.util.regex.Pattern
                .compile("(?:class|grade|std|standard)?\\s*(\\d{1,2})(?:st|nd|rd|th)?",
                        java.util.regex.Pattern.CASE_INSENSITIVE)
                .matcher(studentGrade.trim());

        if (m.find()) {
            int classNum = Integer.parseInt(m.group(1));
            String targetGroup;
            if      (classNum <= 2)  targetGroup = "Class 1-2";
            else if (classNum <= 4)  targetGroup = "Class 3-4";
            else if (classNum <= 6)  targetGroup = "Class 5-6";
            else if (classNum <= 8)  targetGroup = "Class 7-8";
            else if (classNum <= 10) targetGroup = "Class 9-10";
            else                     targetGroup = "Class 11-12";

            return classConfigRepository.findByClassGroup(targetGroup).orElse(null);
        }

        String gradeLower = studentGrade.toLowerCase();
        List<ClassConfig> allConfigs = classConfigRepository.findAll();
        for (ClassConfig config : allConfigs) {
            if (config.getGradePatterns() == null) continue;
            String[] patterns = config.getGradePatterns().split(",");
            for (String pattern : patterns) {
                if (gradeLower.contains(pattern.trim().toLowerCase())) {
                    return config;
                }
            }
        }

        log.warn("Could not resolve ClassConfig for grade '{}', falling back to Class 7-8", studentGrade);
        return classConfigRepository.findByClassGroup("Class 7-8").orElse(null);
    }
}