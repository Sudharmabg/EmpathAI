package com.mymercurie.schedule.service.impl;

import com.mymercurie.schedule.dto.*;
import com.mymercurie.schedule.entity.StudentSchedulePreference;
import com.mymercurie.schedule.entity.StudyIntensity;
import com.mymercurie.schedule.entity.ScheduleTask;
import com.mymercurie.schedule.repository.StudentSchedulePreferenceRepository;
import com.mymercurie.schedule.repository.ScheduleTaskRepository;
import com.mymercurie.schedule.repository.SchoolTimingRepository;
import com.mymercurie.schedule.service.IWeekScheduleService;
import com.mymercurie.schedule.service.IRecommendationService;
import com.mymercurie.schedule.service.ScheduleRuleEngine;
import com.mymercurie.user.entity.Student;
import com.mymercurie.user.exception.MyMercurieException;
import com.mymercurie.user.repository.StudentRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.temporal.TemporalAdjusters;
import java.util.*;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
@Slf4j
public class WeekScheduleServiceImpl implements IWeekScheduleService {

    private final StudentSchedulePreferenceRepository preferenceRepository;
    private final ScheduleTaskRepository taskRepository;
    private final SchoolTimingRepository schoolTimingRepository;
    private final StudentRepository studentRepository;
    private final IRecommendationService recommendationService;
    private final ScheduleRuleEngine ruleEngine;
    private final ObjectMapper objectMapper;

    private static final List<String> ALL_DAYS = List.of(
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
            "Saturday", "Sunday"
    );

    private static final Map<String, int[]> TIME_WINDOWS = Map.of(
            "MORNING",   new int[]{6,  12},
            "AFTERNOON", new int[]{12, 17},
            "EVENING",   new int[]{17, 21},
            "NIGHT",     new int[]{21, 23}
    );

    // NEW: Default study days if none provided
    private static final Set<String> DEFAULT_STUDY_DAYS = Set.of(
            "MONDAY", "TUESDAY", "WEDNESDAY", "THURSDAY", "FRIDAY"
    );

    // ─────────────────────────────────────────────────────────────────────────
    // SAVE PREFERENCES
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public StudentSchedulePreferenceResponse savePreferences(
            StudentSchedulePreferenceRequest request) {

        studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new MyMercurieException(
                        "Student not found: " + request.getStudentId(), "NOT_FOUND"));

        String busySlotsJson = serializeBusySlots(request.getBusySlots());

        StudentSchedulePreference preference = preferenceRepository
                .findByStudentId(request.getStudentId())
                .orElse(StudentSchedulePreference.builder()
                        .studentId(request.getStudentId())
                        .build());

        preference.setPreferredStudyTime(request.getPreferredStudyTime());
        preference.setBusySlots(busySlotsJson);
        preference.setOnboardingComplete(true);
        if (request.getLastRelaxActivity() != null) {
            preference.setLastRelaxActivity(request.getLastRelaxActivity());
        }

        // ═════════════════════════════════════════════════════════════════════
        // NEW: Save preferred study days (JSON string)
        // ═════════════════════════════════════════════════════════════════════
        try {
            Set<String> days = (request.getPreferredStudyDays() != null
                    && !request.getPreferredStudyDays().isEmpty())
                    ? normalizeDays(request.getPreferredStudyDays())
                    : DEFAULT_STUDY_DAYS;
            preference.setPreferredStudyDays(objectMapper.writeValueAsString(days));
        } catch (Exception e) {
            log.error("Failed to serialize preferred study days", e);
            preference.setPreferredStudyDays(
                    "[\"MONDAY\",\"TUESDAY\",\"WEDNESDAY\",\"THURSDAY\",\"FRIDAY\"]");
        }

        // ═════════════════════════════════════════════════════════════════════
        // NEW: Save daily study target hours (clamped 1–12)
        // ═════════════════════════════════════════════════════════════════════
        Integer hours = request.getDailyStudyTargetHours();
        if (hours == null) hours = 4;
        if (hours < 1) hours = 1;
        if (hours > 12) hours = 12;
        preference.setDailyStudyTargetHours(hours);

        // ═════════════════════════════════════════════════════════════════════
        // NEW: Save study intensity
        // ═════════════════════════════════════════════════════════════════════
        try {
            String intensity = request.getStudyIntensity();
            preference.setStudyIntensity(
                    (intensity != null && !intensity.isBlank())
                            ? StudyIntensity.valueOf(intensity.toUpperCase())
                            : StudyIntensity.MODERATE
            );
        } catch (IllegalArgumentException e) {
            log.warn("Invalid study intensity '{}', defaulting to MODERATE",
                    request.getStudyIntensity());
            preference.setStudyIntensity(StudyIntensity.MODERATE);
        }

        StudentSchedulePreference saved = preferenceRepository.save(preference);

        log.info("Preferences saved for studentId={} preferredTime={} busySlots={} intensity={} hours={} days={}",
                request.getStudentId(),
                request.getPreferredStudyTime(),
                request.getBusySlots() != null ? request.getBusySlots().size() : 0,
                saved.getStudyIntensity(),
                saved.getDailyStudyTargetHours(),
                request.getPreferredStudyDays() != null ? request.getPreferredStudyDays().size() : 0);

        return toResponse(saved);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GET PREFERENCES
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public StudentSchedulePreferenceResponse getPreferences(Long studentId) {
        StudentSchedulePreference preference = preferenceRepository
                .findByStudentId(studentId)
                .orElse(null);

        if (preference == null) {
            return StudentSchedulePreferenceResponse.builder()
                    .studentId(studentId)
                    .onboardingComplete(false)
                    .busySlots(Collections.emptyList())
                    .preferredStudyDays(DEFAULT_STUDY_DAYS)          // NEW
                    .dailyStudyTargetHours(4)                        // NEW
                    .studyIntensity(StudyIntensity.MODERATE.name())  // NEW
                    .build();
        }

        return toResponse(preference);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HAS COMPLETED ONBOARDING
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    public boolean hasCompletedOnboarding(Long studentId) {
        return preferenceRepository.findByStudentId(studentId)
                .map(p -> Boolean.TRUE.equals(p.getOnboardingComplete()))
                .orElse(false);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE WEEK SCHEDULE
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public WeekScheduleResponseDTO generateWeekSchedule(WeekScheduleRequestDTO request) {

        Student student = studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new MyMercurieException(
                        "Student not found: " + request.getStudentId(), "NOT_FOUND"));

        LocalDate weekStart = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));

        String className  = student.getClassName();
        String studentGrade = className;

        List<String> targetDays = (request.getTargetDays() != null
                && !request.getTargetDays().isEmpty())
                ? request.getTargetDays()
                : ALL_DAYS;

        int[] window = TIME_WINDOWS.getOrDefault(
                request.getPreferredStudyTime(), new int[]{17, 21});
        int windowStartHour = window[0];
        int windowEndHour   = window[1];

        Map<String, List<BusySlotDTO>> busyByDay = groupBusySlotsByDay(
                request.getBusySlots());

        // ── Delete existing generated tasks for these days (by actual date now) ──
        for (String day : targetDays) {
            LocalDate date = dateForDay(weekStart, day);
            List<ScheduleTask> existing =
                    taskRepository.findByStudentIdAndTaskDate(request.getStudentId(), date);
            taskRepository.deleteAll(existing);
        }

        Map<String, List<TaskResponse>> weekSchedule = new LinkedHashMap<>();
        List<String> weekWarnings = new ArrayList<>();
        int totalStudyMinutes = 0;
        int activeDays = 0;

        for (String day : targetDays) {

            LocalDate date = dateForDay(weekStart, day);
            log.info("══ Generating schedule for day={} date={}", day, date);

            ScheduleRecommendationResponse rec =
                    recommendationService.getRecommendations(request.getStudentId(), day, date);

            List<TaskSuggestion> suggestions = rec.getSuggestions();
            List<SchoolTimingResponse> blocked = rec.getBlockedWindows();
            List<BusySlotDTO> busySlots = busyByDay.getOrDefault(day, Collections.emptyList());

            List<int[]> occupiedSlots = buildOccupiedSlots(blocked, busySlots);

            List<ScheduleTask> dayTasks = generateDayTasks(
                    request.getStudentId(), date, suggestions,
                    occupiedSlots, windowStartHour, windowEndHour,
                    studentGrade, weekWarnings, day
            );

            List<ScheduleTask> saved = taskRepository.saveAll(dayTasks);

            List<TaskResponse> dayResponses = saved.stream()
                    .map(t -> toTaskResponse(t, Collections.emptyList()))
                    .collect(Collectors.toList());

            weekSchedule.put(day, dayResponses);

            int dayStudyMins = saved.stream()
                    .filter(t -> "STUDY".equals(t.getDetectedType()))
                    .mapToInt(t -> ruleEngine.toMins(t.getEndTime())
                            - ruleEngine.toMins(t.getStartTime()))
                    .sum();

            totalStudyMinutes += dayStudyMins;
            if (!saved.isEmpty()) activeDays++;

            log.info("   ✓ day={} tasks={} studyMins={}", day, saved.size(), dayStudyMins);
        }

        return WeekScheduleResponseDTO.builder()
                .weekSchedule(weekSchedule)
                .weekWarnings(weekWarnings)
                .totalStudyMinutes(totalStudyMinutes)
                .activeDays(activeDays)
                .build();
    }

    private LocalDate dateForDay(LocalDate weekStart, String day) {
        int offset = ALL_DAYS.indexOf(day);
        return offset >= 0 ? weekStart.plusDays(offset) : weekStart;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE TASKS FOR ONE DAY
    // ─────────────────────────────────────────────────────────────────────────

    private List<ScheduleTask> generateDayTasks(
            Long studentId,
            LocalDate date,
            List<TaskSuggestion> suggestions,
            List<int[]> occupiedSlots,
            int windowStartHour,
            int windowEndHour,
            String studentGrade,
            List<String> weekWarnings,
            String dayLabel) {

        List<ScheduleTask> result = new ArrayList<>();

        List<int[]> usedSlots = new ArrayList<>(occupiedSlots);
        usedSlots.sort(Comparator.comparingInt(s -> s[0]));

        for (TaskSuggestion suggestion : suggestions) {

            int durationMins = suggestion.getEstimatedMinutes();

            int[] slot = findFreeSlot(
                    usedSlots, durationMins,
                    windowStartHour * 60,
                    windowEndHour * 60
            );

            if (slot == null) {
                slot = findFreeSlot(usedSlots, durationMins, 6 * 60, 23 * 60);
            }

            if (slot == null) {
                weekWarnings.add(dayLabel + ": Could not fit \"" + suggestion.getTitle()
                        + "\" — no available slot found.");
                log.warn("   ✗ No slot for '{}' on {}", suggestion.getTitle(), dayLabel);
                continue;
            }

            String startTime = minsToTime(slot[0]);
            String endTime   = minsToTime(slot[1]);

            TaskRequest taskRequest = new TaskRequest();
            taskRequest.setStudentId(studentId);
            taskRequest.setDate(date);
            taskRequest.setTitle(suggestion.getTitle());
            taskRequest.setStartTime(startTime);
            taskRequest.setEndTime(endTime);
            taskRequest.setNotes(suggestion.getReasonLabel());
            taskRequest.setExcludeTaskId(null);

            RuleResult ruleResult = ruleEngine.validate(taskRequest, studentGrade);

            if (ruleResult.hasErrors()) {
                log.warn("   ✗ Rule rejected '{}' on {}: {}",
                        suggestion.getTitle(), dayLabel, ruleResult.getErrors().get(0));
                weekWarnings.add(dayLabel + ": \"" + suggestion.getTitle()
                        + "\" skipped — " + ruleResult.getErrors().get(0));
                continue;
            }

            if (!ruleResult.getWarnings().isEmpty()) {
                ruleResult.getWarnings().forEach(w -> weekWarnings.add(dayLabel + ": " + w));
            }

            int breakGap = "STUDY".equals(suggestion.getTaskType()) ? 10 : 0;
            insertSorted(usedSlots, new int[]{slot[0], slot[1] + breakGap});

            String detectedType = ruleEngine.detectType(suggestion.getTitle());

            ScheduleTask task = ScheduleTask.builder()
                    .studentId(studentId)
                    .taskDate(date)
                    .title(suggestion.getTitle())
                    .startTime(startTime != null ? java.time.LocalTime.parse(startTime) : null)
                    .endTime(endTime != null ? java.time.LocalTime.parse(endTime) : null)
                    .notes(suggestion.getReasonLabel())
                    .detectedType(detectedType)
                    .completed(false)
                    .build();

            result.add(task);

            log.info("   ✓ Placed '{}' at {}-{} on {}",
                    suggestion.getTitle(), startTime, endTime, dayLabel);
        }

        result.sort(Comparator.comparing(ScheduleTask::getStartTime));

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FIND FREE SLOT
    // ─────────────────────────────────────────────────────────────────────────

    private int[] findFreeSlot(List<int[]> occupiedSlots, int durationMins,
                               int windowStart, int windowEnd) {

        int cursor = windowStart;

        for (int[] slot : occupiedSlots) {
            int slotStart = slot[0];
            int slotEnd   = slot[1];

            if (slotEnd <= cursor) continue;

            int gapEnd = Math.min(slotStart, windowEnd);

            if (gapEnd - cursor >= durationMins) {
                return new int[]{cursor, cursor + durationMins};
            }

            if (slotEnd > cursor) {
                cursor = slotEnd;
            }
        }

        if (windowEnd - cursor >= durationMins) {
            return new int[]{cursor, cursor + durationMins};
        }

        return null;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // BUILD OCCUPIED SLOTS
    // ─────────────────────────────────────────────────────────────────────────

    private List<int[]> buildOccupiedSlots(List<SchoolTimingResponse> blocked,
                                           List<BusySlotDTO> busySlots) {
        List<int[]> occupied = new ArrayList<>();

        if (blocked != null) {
            for (SchoolTimingResponse b : blocked) {
                occupied.add(new int[]{
                        ruleEngine.toMins(b.getStartTime()),
                        ruleEngine.toMins(b.getEndTime())
                });
            }
        }

        if (busySlots != null) {
            for (BusySlotDTO b : busySlots) {
                occupied.add(new int[]{
                        ruleEngine.toMins(b.getStartTime()),
                        ruleEngine.toMins(b.getEndTime())
                });
            }
        }

        return occupied;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // HELPERS
    // ─────────────────────────────────────────────────────────────────────────

    private Map<String, List<BusySlotDTO>> groupBusySlotsByDay(List<BusySlotDTO> busySlots) {
        if (busySlots == null || busySlots.isEmpty()) return Collections.emptyMap();
        return busySlots.stream()
                .collect(Collectors.groupingBy(BusySlotDTO::getDay));
    }

    private String serializeBusySlots(List<BusySlotDTO> slots) {
        if (slots == null || slots.isEmpty()) return "[]";
        try {
            return objectMapper.writeValueAsString(slots);
        } catch (Exception e) {
            log.error("Failed to serialize busy slots", e);
            return "[]";
        }
    }

    private List<BusySlotDTO> deserializeBusySlots(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) {
            return Collections.emptyList();
        }
        try {
            return objectMapper.readValue(json,
                    new TypeReference<List<BusySlotDTO>>() {});
        } catch (Exception e) {
            log.error("Failed to deserialize busy slots", e);
            return Collections.emptyList();
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // NEW: Deserialize preferred study days
    // ═════════════════════════════════════════════════════════════════════════
    private Set<String> deserializeStudyDays(String json) {
        if (json == null || json.isBlank() || json.equals("[]")) {
            return new HashSet<>(DEFAULT_STUDY_DAYS);
        }
        try {
            return objectMapper.readValue(json,
                    new TypeReference<Set<String>>() {});
        } catch (Exception e) {
            log.error("Failed to deserialize preferred study days", e);
            return new HashSet<>(DEFAULT_STUDY_DAYS);
        }
    }

    // ═════════════════════════════════════════════════════════════════════════
    // NEW: Normalize day strings against DayOfWeek enum
    // ═════════════════════════════════════════════════════════════════════════
    private Set<String> normalizeDays(Set<String> days) {
        Set<String> normalized = new HashSet<>();
        for (String day : days) {
            if (day != null && !day.isBlank()) {
                try {
                    normalized.add(DayOfWeek.valueOf(day.toUpperCase()).name());
                } catch (IllegalArgumentException e) {
                    log.warn("Invalid day skipped: {}", day);
                }
            }
        }
        return normalized.isEmpty() ? new HashSet<>(DEFAULT_STUDY_DAYS) : normalized;
    }

    private String minsToTime(int totalMins) {
        int h = totalMins / 60;
        int m = totalMins % 60;
        return String.format("%02d:%02d", h, m);
    }

    // ─────────────────────────────────────────────────────────────────────────
    // ENTITY → RESPONSE  (updated to include new fields)
    // ─────────────────────────────────────────────────────────────────────────

    private StudentSchedulePreferenceResponse toResponse(StudentSchedulePreference pref) {
        return StudentSchedulePreferenceResponse.builder()
                .id(pref.getId())
                .studentId(pref.getStudentId())
                .preferredStudyTime(pref.getPreferredStudyTime())
                .busySlots(deserializeBusySlots(pref.getBusySlots()))
                .onboardingComplete(pref.getOnboardingComplete())
                .lastRelaxActivity(pref.getLastRelaxActivity())

                // ═════════════════════════════════════════════════════════════
                // NEW: Include Study Goals fields
                // ═════════════════════════════════════════════════════════════
                .preferredStudyDays(deserializeStudyDays(pref.getPreferredStudyDays()))
                .dailyStudyTargetHours(pref.getDailyStudyTargetHours() != null
                        ? pref.getDailyStudyTargetHours() : 4)
                .studyIntensity(pref.getStudyIntensity() != null
                        ? pref.getStudyIntensity().name()
                        : StudyIntensity.MODERATE.name())
                .build();
    }

    private TaskResponse toTaskResponse(ScheduleTask task, List<String> warnings) {
        return TaskResponse.builder()
                .id(task.getId())
                .studentId(task.getStudentId())
                .date(task.getTaskDate())
                .dayOfWeek(task.getDayOfWeek())
                .title(task.getTitle())
                .startTime(task.getStartTime() != null ? task.getStartTime().toString() : "")
                .endTime(task.getEndTime() != null ? task.getEndTime().toString() : "")
                .notes(task.getNotes())
                .completed(task.isCompleted())
                .detectedType(task.getDetectedType())
                .warnings(warnings)
                .build();
    }

    private void insertSorted(List<int[]> list, int[] newSlot) {
        int index = 0;
        while (index < list.size() && list.get(index)[0] < newSlot[0]) {
            index++;
        }
        list.add(index, newSlot);
    }
}