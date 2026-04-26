package com.empathai.schedule.service;

import com.empathai.schedule.dto.RuleResult;
import com.empathai.schedule.dto.TaskRequest;
import com.empathai.schedule.entity.ClassConfig;
import com.empathai.schedule.entity.ScheduleRule;
import com.empathai.schedule.entity.ScheduleTask;
import com.empathai.schedule.repository.ClassConfigRepository;
import com.empathai.schedule.repository.ScheduleRuleRepository;
import com.empathai.schedule.repository.ScheduleTaskRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;

import java.util.Arrays;
import java.util.List;
import java.util.Optional;
import java.util.stream.IntStream;

@Service
@RequiredArgsConstructor
@Slf4j
public class ScheduleRuleEngine {

    private final ScheduleRuleRepository ruleRepository;
    private final ScheduleTaskRepository taskRepository;
    private final ClassConfigRepository classConfigRepository;

    // ── Keywords that identify a task as a STUDY task ─────────────────────────
    private static final List<String> STUDY_KEYWORDS = Arrays.asList(
            // Core study actions
            "study", "revision", "revise", "session",
            // Subject names
            "math", "maths", "mathematics", "science", "english", "hindi", "sst",
            "history", "geography", "physics", "chemistry", "biology", "computer",
            // Academic tasks
            "exam", "test", "assignment", "lecture", "chapter", "worksheet", "essay",
            "homework",
            // Note-taking (specific phrases — "organise notes" is OTHER, "make notes"/"read notes" is STUDY)
            "make notes", "read notes", "write notes", "study notes", "take notes"
    );

    private static final List<String> WEEKEND_DAYS = Arrays.asList("Saturday", "Sunday");

    // ── Time constants in minutes ──────────────────────────────────────────────
    private static final int START_OF_DAY_MINS  = 6 * 60;    // 06:00 = 360 mins
    private static final int END_OF_DAY_MINS    = 23 * 60;   // 23:00 = 1380 mins
    private static final int GRACE_BOUNDARY     = 15;        // 15 mins past 11PM allowed
    private static final int MIN_BREAK_MINS     = 10;        // min break between study sessions
    private static final int MIN_DURATION_MINS  = 15;        // min task duration
    private static final int MAX_TASKS_PER_DAY  = 8;         // max tasks on any single day
    private static final int MAX_STUDY_SESSIONS = 3;         // max study sessions per day

    // ─────────────────────────────────────────────────────────────────────────
    // PUBLIC ENTRY POINT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Runs all 12 rules in priority order (from DB).
     * Returns RuleResult with errors (hard blocks) and warnings (soft).
     *
     * @param request      the task being added or edited
     * @param studentGrade the student's grade string from Student entity (e.g. "8th Standard")
     */
    public RuleResult validate(TaskRequest request, String studentGrade) {
        RuleResult result = RuleResult.builder().build();

        int startMins = toMins(request.getStartTime());
        int endMins   = toMins(request.getEndTime());
        int duration  = endMins - startMins;

        boolean isStudy   = isStudyTask(request.getTitle());
        boolean isWeekend = isWeekend(request.getDayOfWeek());

        List<ScheduleTask> dayTasks = taskRepository
                .findByStudentIdAndDayOfWeek(request.getStudentId(), request.getDayOfWeek());

        ClassConfig config = resolveClassConfig(studentGrade);

        // fetch rules ordered by priority from DB
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

                // ── Study-only rules ──────────────────────────────────────────
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

            // stop processing hard blocks early — no point running more rules
            if (result.hasErrors()) {
                // still run soft warnings even if hard errors exist, but skip other hard rules
                // by breaking here we return the first error immediately
                break;
            }
        }

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // RULE IMPLEMENTATIONS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Rule 6 — Min Duration (runs first, priority 1)
     * LET duration = toMins(endTime) - toMins(startTime)
     * IF duration < MIN_DURATION_MINS THEN block
     */
    private void applyRule06_MinDuration(RuleResult result, int duration) {
        if (duration < MIN_DURATION_MINS) {
            result.getErrors().add("Task must be at least " + MIN_DURATION_MINS + " minutes long.");
        }
    }

    /**
     * Rule 11 — After 11 PM Grace Rule (priority 2, runs before Rule 5)
     * LET overMins = toMins(endTime) - END_OF_DAY_MINS
     * IF overMins > 0 AND overMins <= GRACE_BOUNDARY THEN allow with warning
     * ELSE IF overMins > GRACE_BOUNDARY THEN block
     * Returns true if grace is granted (Rule 5 skips the after-11 check)
     */
    private boolean applyRule11_GraceRule(RuleResult result, int endMins) {
        int overMins = endMins - END_OF_DAY_MINS;
        if (overMins > 0) {
            if (overMins <= GRACE_BOUNDARY) {
                result.getWarnings().add(
                        "Task finishes just after 11:00 PM — allowed as a grace exception.");
                return true; // grace granted
            } else {
                result.getErrors().add(
                        "Task extends too far past 11:00 PM. Shorten it or move the rest to tomorrow.");
                return false;
            }
        }
        return false;
    }

    /**
     * Rule 5 — Time Boundary 6 AM to 11 PM (priority 3)
     * IF gracePassed = false
     *   IF startMins < START_OF_DAY_MINS THEN block
     *   IF endMins > END_OF_DAY_MINS THEN block
     */
    private void applyRule05_TimeBoundary(RuleResult result, int startMins, int endMins, boolean gracePassed) {
        if (startMins < START_OF_DAY_MINS) {
            result.getErrors().add("Tasks cannot be scheduled before 6:00 AM.");
        }
        if (!gracePassed && endMins > END_OF_DAY_MINS) {
            result.getErrors().add("Tasks can only run until 11:00 PM.");
        }
    }

    /**
     * Rule 1 — No Overlapping Tasks (priority 4)
     * FOR EACH existingTask in dayTasks
     *   IF existingTask.id != excludeTaskId
     *   AND startMins < toMins(existingTask.endTime)
     *   AND endMins > toMins(existingTask.startTime)
     *   THEN block
     */
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

    /**
     * Rule 9 — No Duplicate Task Names on Same Day (priority 5)
     * FOR EACH existingTask in dayTasks
     *   IF existingTask.id != excludeTaskId
     *   AND existingTask.title.toLowerCase() == newTitle.toLowerCase()
     *   THEN block
     */
    private void applyRule09_NoDuplicateNames(RuleResult result, TaskRequest request,
                                              List<ScheduleTask> dayTasks) {
        boolean duplicate = dayTasks.stream()
                .filter(t -> !t.getId().equals(request.getExcludeTaskId()))
                .anyMatch(t -> t.getTitle().equalsIgnoreCase(request.getTitle()));

        if (duplicate) {
            result.getErrors().add("A task named \"" + request.getTitle() + "\" already exists today.");
        }
    }

    /**
     * Rule 10 — Max 8 Tasks Per Day (priority 6)
     * LET taskCount = COUNT of tasks excluding the one being edited
     * IF taskCount >= MAX_TASKS_PER_DAY THEN block
     */
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

    /**
     * Rule 2 — Max Daily Study Time by Class, Weekday vs Weekend (priority 7)
     * LET cap = isWeekend ? config.weekendCapMins : config.weekdayCapMins
     * LET studyMinsUsed = SUM of durations of existing study tasks
     * IF studyMinsUsed + duration > cap THEN block
     */
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

    /**
     * Rule 3 — Max Single Study Session Length by Class (priority 8)
     * LET sessionMax = config.sessionMaxMins
     * IF duration > sessionMax THEN block
     */
    private void applyRule03_MaxSessionLength(RuleResult result, int duration,
                                              ClassConfig config, String studentGrade) {
        if (config == null) return;

        if (duration > config.getSessionMaxMins()) {
            result.getErrors().add(
                    "Single study session cannot exceed " + config.getSessionMaxMins() +
                            " minutes for your class. Break it into smaller sessions.");
        }
    }

    /**
     * Rule 4 — Min 10 Min Break Between Study Sessions (priority 9)
     * LET prevStudy = last study task where endTime <= startTime
     * LET nextStudy = first study task where startTime >= endTime
     * IF gap between prevStudy.end and newTask.start < MIN_BREAK_MINS THEN block
     * IF gap between newTask.end and nextStudy.start < MIN_BREAK_MINS THEN block
     */
    private void applyRule04_MinBreakBetweenSessions(RuleResult result, TaskRequest request,
                                                     int startMins, int endMins,
                                                     List<ScheduleTask> dayTasks) {
        List<ScheduleTask> studyTasks = dayTasks.stream()
                .filter(t -> !t.getId().equals(request.getExcludeTaskId()))
                .filter(t -> "STUDY".equals(t.getDetectedType()))
                .toList();

        // nearest study task that ends before this task starts
        Optional<ScheduleTask> prevStudy = studyTasks.stream()
                .filter(t -> toMins(t.getEndTime()) <= startMins)
                .max((a, b) -> Integer.compare(toMins(a.getEndTime()), toMins(b.getEndTime())));

        // nearest study task that starts after this task ends
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

    /**
     * Rule 7 — Max 3 Study Sessions Per Day (priority 10)
     * LET studyCount = COUNT of study tasks excluding this one
     * IF studyCount >= MAX_STUDY_SESSIONS THEN block
     */
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

    /**
     * Rule 8 — Soft Warning: No Wellness/Break Task Exists (priority 11)
     * LET hasNonStudy = any task on day where detectedType != STUDY
     * IF hasNonStudy = false THEN warn
     */
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

    /**
     * Rule 12 — Soft Warning: 3 Consecutive Study Days (priority 12)
     * LET prev3Days = 3 days before current day
     * IF ALL of prev3Days had at least one study task THEN warn
     */
    private void applyRule12_ConsecutiveDaysWarning(RuleResult result, TaskRequest request) {
        List<String> weekOrder = List.of(
                "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday");

        int todayIdx = weekOrder.indexOf(request.getDayOfWeek());
        if (todayIdx < 0) return;

        boolean alreadyWarned = false;
        int consecutiveCount = 0;


        List<String> prevDays = IntStream.rangeClosed(1, 3)
                .mapToObj(i -> weekOrder.get((todayIdx - i + 7) % 7))
                .toList();

        List<ScheduleTask> prevWeekTasks = taskRepository
                .findByStudentIdAndDayOfWeekInAndDetectedType(
                        request.getStudentId(), prevDays, "STUDY");

        for (int i = 1; i <= 3; i++) {
            String prevDay = weekOrder.get((todayIdx - i + 7) % 7);
            boolean hasStudy = prevWeekTasks.stream()
                    .anyMatch(t -> t.getDayOfWeek().equals(prevDay));
            if (hasStudy) {
                consecutiveCount++;
            } else {
                break;
            }
        }

        if (consecutiveCount >= 3) {
            result.getWarnings().add(
                    "⚠ You've studied 3 days in a row. Consider a lighter day today for better retention.");
        }
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPER METHODS
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Detects if a task title contains study-related keywords.
     * Used to silently assign STUDY type without showing it on the frontend.
     */
    public boolean isStudyTask(String title) {
        if (title == null) return false;
        String lower = title.toLowerCase();
        return STUDY_KEYWORDS.stream().anyMatch(lower::contains);
    }

    /**
     * Auto-detects task type from title keywords.
     * Returns "STUDY", "WELLNESS", or "OTHER".
     * Stored in DB but never shown on frontend.
     */
    public String detectType(String title) {
        if (title == null) return "OTHER";
        String lower = title.toLowerCase();
        if (STUDY_KEYWORDS.stream().anyMatch(lower::contains)) return "STUDY";
        List<String> wellnessKeywords = List.of(
                // Physical activity
                "gym", "yoga", "walk", "run", "jog", "exercise", "workout", "sport",
                "swim", "cycle", "stretch",
                // Rest & recovery — matches AI suggestion titles
                "sleep", "nap", "rest", "break", "relax", "free time",
                // Mindfulness
                "meditation", "meditate", "breathing",
                // Meals
                "meal", "lunch", "dinner", "breakfast",
                // Water
                "drink water");
        if (wellnessKeywords.stream().anyMatch(lower::contains)) return "WELLNESS";
        return "OTHER";
    }

    /**
     * Converts "HH:MM" string to total minutes since midnight.
     */
    public int toMins(String time) {
        if (time == null || !time.contains(":")) return 0;
        String[] parts = time.split(":");
        return Integer.parseInt(parts[0]) * 60 + Integer.parseInt(parts[1]);
    }

    /**
     * Checks if the given day is Saturday or Sunday.
     */
    private boolean isWeekend(String day) {
        return WEEKEND_DAYS.contains(day);
    }

    /**
     * Formats minutes into a human-readable string like "3h" or "1h 30m".
     */
    private String formatMins(int mins) {
        int h = mins / 60;
        int m = mins % 60;
        if (h > 0 && m > 0) return h + "h " + m + "m";
        if (h > 0) return h + "h";
        return m + "m";
    }

    /**
     * Resolves the ClassConfig for a student based on their grade string.
     *
     * Strategy: First extract the numeric class number from the grade string
     * (handles "10th Standard", "Class 10", "Grade 10", "10" etc.), then
     * map that number to the correct ClassConfig group. This avoids substring
     * false-positives (e.g. "10th" matching pattern "1st" or "Class 10"
     * matching pattern "class 1").
     *
     * Falls back to pattern matching for non-numeric grade strings, and
     * finally to Class 7-8 if nothing matches.
     */
    private ClassConfig resolveClassConfig(String studentGrade) {
        if (studentGrade == null) return null;

        // ── Step 1: Extract the leading class number from the grade string ──
        // Matches patterns like: "10th Standard", "Class 10", "Grade 10", "10"
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

        // ── Step 2: Fallback — pattern matching for non-numeric grade strings ──
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

        // ── Step 3: Last resort default ──
        log.warn("Could not resolve ClassConfig for grade '{}', falling back to Class 7-8", studentGrade);
        return classConfigRepository.findByClassGroup("Class 7-8").orElse(null);
    }
}