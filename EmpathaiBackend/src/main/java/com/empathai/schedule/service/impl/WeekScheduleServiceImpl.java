package com.empathai.schedule.service.impl;

import com.empathai.schedule.dto.*;
import com.empathai.schedule.entity.StudentSchedulePreference;
import com.empathai.schedule.entity.ScheduleTask;
import com.empathai.schedule.repository.StudentSchedulePreferenceRepository;
import com.empathai.schedule.repository.ScheduleTaskRepository;
import com.empathai.schedule.repository.SchoolTimingRepository;
import com.empathai.schedule.service.IWeekScheduleService;
import com.empathai.schedule.service.IRecommendationService;
import com.empathai.schedule.service.ScheduleRuleEngine;
import com.empathai.user.entity.Student;
import com.empathai.user.exception.EmpathaiException;
import com.empathai.user.repository.StudentRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

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

    // ── Days in order ─────────────────────────────────────────────────────────
    private static final List<String> ALL_DAYS = List.of(
            "Monday", "Tuesday", "Wednesday", "Thursday", "Friday",
            "Saturday", "Sunday"
    );

    // ── Preferred study time → start/end hour (24hr) ──────────────────────────
    private static final Map<String, int[]> TIME_WINDOWS = Map.of(
            "MORNING",   new int[]{6,  12},
            "AFTERNOON", new int[]{12, 17},
            "EVENING",   new int[]{17, 21},
            "NIGHT",     new int[]{21, 23}
    );

    // ─────────────────────────────────────────────────────────────────────────
    // SAVE PREFERENCES
    // ─────────────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public StudentSchedulePreferenceResponse savePreferences(
            StudentSchedulePreferenceRequest request) {

        // Validate student exists
        studentRepository.findById(request.getStudentId())
                .orElseThrow(() -> new EmpathaiException(
                        "Student not found: " + request.getStudentId(), "NOT_FOUND"));

        // Serialize busy slots to JSON
        String busySlotsJson = serializeBusySlots(request.getBusySlots());

        // Upsert preference
        StudentSchedulePreference preference = preferenceRepository
                .findByStudentId(request.getStudentId())
                .orElse(StudentSchedulePreference.builder()
                        .studentId(request.getStudentId())
                        .build());

        preference.setPreferredStudyTime(request.getPreferredStudyTime());
        preference.setBusySlots(busySlotsJson);
        preference.setOnboardingComplete(true);

        StudentSchedulePreference saved = preferenceRepository.save(preference);

        log.info("Preferences saved for studentId={} preferredTime={} busySlots={}",
                request.getStudentId(), request.getPreferredStudyTime(),
                request.getBusySlots() != null ? request.getBusySlots().size() : 0);

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
            // Return empty response — onboarding not done yet
            return StudentSchedulePreferenceResponse.builder()
                    .studentId(studentId)
                    .onboardingComplete(false)
                    .busySlots(Collections.emptyList())
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
                .orElseThrow(() -> new EmpathaiException(
                        "Student not found: " + request.getStudentId(), "NOT_FOUND"));

        String className  = student.getClassName();
        Long   schoolId   = student.getSchoolId();
        String studentGrade = className;

        List<String> targetDays = (request.getTargetDays() != null
                && !request.getTargetDays().isEmpty())
                ? request.getTargetDays()
                : ALL_DAYS;

        // Preferred window hours
        int[] window = TIME_WINDOWS.getOrDefault(
                request.getPreferredStudyTime(), new int[]{17, 21});
        int windowStartHour = window[0];
        int windowEndHour   = window[1];

        // Parse busy slots for quick lookup
        Map<String, List<BusySlotDTO>> busyByDay = groupBusySlotsByDay(
                request.getBusySlots());

        // ── Delete existing generated tasks for these days ────────────────────
        // Only delete tasks for target days so manual tasks on other days are safe
        for (String day : targetDays) {
            List<ScheduleTask> existing =
                    taskRepository.findByStudentIdAndDayOfWeek(request.getStudentId(), day);
            taskRepository.deleteAll(existing);
        }

        Map<String, List<TaskResponse>> weekSchedule = new LinkedHashMap<>();
        List<String> weekWarnings = new ArrayList<>();
        int totalStudyMinutes = 0;
        int activeDays = 0;

        for (String day : targetDays) {

            log.info("══ Generating schedule for day={}", day);

            // Get recommendations for this day (reuses existing engine)
            ScheduleRecommendationResponse rec =
                    recommendationService.getRecommendations(request.getStudentId(), day);

            List<TaskSuggestion> suggestions = rec.getSuggestions();

            // School blocked windows for this day
            List<SchoolTimingResponse> blocked = rec.getBlockedWindows();

            // Student busy slots for this day
            List<BusySlotDTO> busySlots = busyByDay.getOrDefault(day, Collections.emptyList());

            // Build list of already-occupied intervals (school + busy)
            List<int[]> occupiedSlots = buildOccupiedSlots(blocked, busySlots);

            // Generate tasks for this day
            List<ScheduleTask> dayTasks = generateDayTasks(
                    request.getStudentId(), day, suggestions,
                    occupiedSlots, windowStartHour, windowEndHour,
                    studentGrade, weekWarnings
            );

            // Save all tasks for this day
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

    // ─────────────────────────────────────────────────────────────────────────
    // GENERATE TASKS FOR ONE DAY
    // ─────────────────────────────────────────────────────────────────────────

    private List<ScheduleTask> generateDayTasks(
            Long studentId,
            String day,
            List<TaskSuggestion> suggestions,
            List<int[]> occupiedSlots,
            int windowStartHour,
            int windowEndHour,
            String studentGrade,
            List<String> weekWarnings) {

        List<ScheduleTask> result = new ArrayList<>();

        // Track slots used in this day's generation (to avoid internal overlaps)
        List<int[]> usedSlots = new ArrayList<>(occupiedSlots);
        usedSlots.sort(Comparator.comparingInt(s -> s[0]));


        for (TaskSuggestion suggestion : suggestions) {

            int durationMins = suggestion.getEstimatedMinutes();

            // Find a free slot in preferred window first, then full day
            int[] slot = findFreeSlot(
                    usedSlots, durationMins,
                    windowStartHour * 60,
                    windowEndHour * 60
            );

            // If no slot in preferred window → try full day
            if (slot == null) {
                slot = findFreeSlot(usedSlots, durationMins, 6 * 60, 23 * 60);
            }

            // If still no slot → skip this suggestion, add warning
            if (slot == null) {
                weekWarnings.add(day + ": Could not fit \"" + suggestion.getTitle()
                        + "\" — no available slot found.");
                log.warn("   ✗ No slot for '{}' on {}", suggestion.getTitle(), day);
                continue;
            }

            String startTime = minsToTime(slot[0]);
            String endTime   = minsToTime(slot[1]);

            // Validate against rule engine before saving
            TaskRequest taskRequest = new TaskRequest();
            taskRequest.setStudentId(studentId);
            taskRequest.setDayOfWeek(day);
            taskRequest.setTitle(suggestion.getTitle());
            taskRequest.setStartTime(startTime);
            taskRequest.setEndTime(endTime);
            taskRequest.setNotes(suggestion.getReasonLabel());
            taskRequest.setExcludeTaskId(null);

            RuleResult ruleResult = ruleEngine.validate(taskRequest, studentGrade);

            if (ruleResult.hasErrors()) {
                // Rule engine rejected — try next suggestion
                log.warn("   ✗ Rule rejected '{}' on {}: {}",
                        suggestion.getTitle(), day, ruleResult.getErrors().get(0));
                weekWarnings.add(day + ": \"" + suggestion.getTitle()
                        + "\" skipped — " + ruleResult.getErrors().get(0));
                continue;
            }

            // Collect soft warnings
            if (!ruleResult.getWarnings().isEmpty()) {
                ruleResult.getWarnings().forEach(w -> weekWarnings.add(day + ": " + w));
            }

            // Mark slot as used (with 10-min break gap after study tasks)
            int breakGap = "STUDY".equals(suggestion.getTaskType()) ? 10 : 0;
            insertSorted(usedSlots, new int[]{slot[0], slot[1] + breakGap});


            String detectedType = ruleEngine.detectType(suggestion.getTitle());

            ScheduleTask task = ScheduleTask.builder()
                    .studentId(studentId)
                    .dayOfWeek(day)
                    .title(suggestion.getTitle())
                    .startTime(startTime)
                    .endTime(endTime)
                    .notes(suggestion.getReasonLabel())
                    .detectedType(detectedType)
                    .completed(false)
                    .build();

            result.add(task);

            log.info("   ✓ Placed '{}' at {}-{} on {}",
                    suggestion.getTitle(), startTime, endTime, day);
        }

        // Sort by start time
        result.sort(Comparator.comparing(ScheduleTask::getStartTime));

        return result;
    }

    // ─────────────────────────────────────────────────────────────────────────
    // FIND FREE SLOT
    // ─────────────────────────────────────────────────────────────────────────

    /**
     * Finds the first available time slot of the given duration
     * within [windowStart, windowEnd] that doesn't overlap any occupied slot.
     *
     * @param occupiedSlots list of [startMins, endMins] already taken
     * @param durationMins  how long the task needs
     * @param windowStart   search window start in minutes
     * @param windowEnd     search window end in minutes
     * @return [startMins, endMins] of free slot, or null if none found
     */
    private int[] findFreeSlot(List<int[]> occupiedSlots, int durationMins,
                               int windowStart, int windowEnd) {

        int cursor = windowStart;

        for (int[] slot : occupiedSlots) {
            int slotStart = slot[0];
            int slotEnd   = slot[1];

            // Skip slots entirely before window
            if (slotEnd <= cursor) continue;

            // Gap before this occupied slot
            int gapEnd = Math.min(slotStart, windowEnd);

            if (gapEnd - cursor >= durationMins) {
                return new int[]{cursor, cursor + durationMins};
            }

            // Move cursor past this occupied slot
            if (slotEnd > cursor) {
                cursor = slotEnd;
            }
        }

        // Check remaining time after all occupied slots
        if (windowEnd - cursor >= durationMins) {
            return new int[]{cursor, cursor + durationMins};
        }

        return null; // no slot found
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

    private String minsToTime(int totalMins) {
        int h = totalMins / 60;
        int m = totalMins % 60;
        return String.format("%02d:%02d", h, m);
    }

    private StudentSchedulePreferenceResponse toResponse(StudentSchedulePreference pref) {
        return StudentSchedulePreferenceResponse.builder()
                .id(pref.getId())
                .studentId(pref.getStudentId())
                .preferredStudyTime(pref.getPreferredStudyTime())
                .busySlots(deserializeBusySlots(pref.getBusySlots()))
                .onboardingComplete(pref.getOnboardingComplete())
                .build();
    }

    private TaskResponse toTaskResponse(ScheduleTask task, List<String> warnings) {
        return TaskResponse.builder()
                .id(task.getId())
                .studentId(task.getStudentId())
                .dayOfWeek(task.getDayOfWeek())
                .title(task.getTitle())
                .startTime(task.getStartTime())
                .endTime(task.getEndTime())
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