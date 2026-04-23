package com.empathai.wellness.controller;

import com.empathai.wellness.entity.GratitudeEntry;
import com.empathai.wellness.entity.MoodEntry;
import com.empathai.wellness.entity.SleepEntry;
import com.empathai.wellness.repository.GratitudeEntryRepository;
import com.empathai.wellness.repository.MoodEntryRepository;
import com.empathai.wellness.repository.SleepEntryRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/wellness")
@RequiredArgsConstructor
public class WellnessController {

    private final MoodEntryRepository moodRepo;
    private final GratitudeEntryRepository gratitudeRepo;
    private final SleepEntryRepository sleepRepo;

    // ── MOOD ─────────────────────────────────────────────────────────────────

    @GetMapping("/mood/{studentId}")
    public ResponseEntity<List<MoodEntry>> getMoodEntries(@PathVariable Long studentId) {
        return ResponseEntity.ok(moodRepo.findByStudentIdOrderByLoggedAtDesc(studentId));
    }

    @GetMapping("/mood/{studentId}/latest")
    public ResponseEntity<MoodEntry> getLatestMood(@PathVariable Long studentId) {
        return moodRepo.findFirstByStudentIdOrderByLoggedAtDesc(studentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/mood")
    public ResponseEntity<MoodEntry> saveMood(@RequestBody Map<String, Object> body) {
        Long studentId = Long.valueOf(body.get("studentId").toString());
        String mood = (String) body.get("mood");
        String note = (String) body.getOrDefault("note", null);

        MoodEntry entry = MoodEntry.builder()
                .studentId(studentId)
                .mood(mood)
                .note(note)
                .loggedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(moodRepo.save(entry));
    }

    // ── GRATITUDE ────────────────────────────────────────────────────────────

    @GetMapping("/gratitude/{studentId}")
    public ResponseEntity<List<GratitudeEntry>> getGratitudeEntries(@PathVariable Long studentId) {
        return ResponseEntity.ok(gratitudeRepo.findByStudentIdOrderByLoggedAtDesc(studentId));
    }

    @PostMapping("/gratitude")
    public ResponseEntity<GratitudeEntry> saveGratitude(@RequestBody Map<String, Object> body) {
        Long studentId = Long.valueOf(body.get("studentId").toString());
        String text = (String) body.get("entryText");

        GratitudeEntry entry = GratitudeEntry.builder()
                .studentId(studentId)
                .entryText(text)
                .loggedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(gratitudeRepo.save(entry));
    }

    @DeleteMapping("/gratitude/{id}")
    public ResponseEntity<Void> deleteGratitude(@PathVariable Long id) {
        gratitudeRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }

    // ── SLEEP ────────────────────────────────────────────────────────────────

    @GetMapping("/sleep/{studentId}")
    public ResponseEntity<List<SleepEntry>> getSleepEntries(@PathVariable Long studentId) {
        return ResponseEntity.ok(sleepRepo.findByStudentIdOrderByLoggedAtDesc(studentId));
    }

    @GetMapping("/sleep/{studentId}/latest")
    public ResponseEntity<SleepEntry> getLatestSleep(@PathVariable Long studentId) {
        return sleepRepo.findFirstByStudentIdOrderByLoggedAtDesc(studentId)
                .map(ResponseEntity::ok)
                .orElse(ResponseEntity.noContent().build());
    }

    @PostMapping("/sleep")
    public ResponseEntity<SleepEntry> saveSleep(@RequestBody Map<String, Object> body) {
        Long studentId = Long.valueOf(body.get("studentId").toString());
        String bedtime = (String) body.get("bedtime");
        String wakeTime = (String) body.get("wakeTime");
        String quality = (String) body.get("quality");

        SleepEntry entry = SleepEntry.builder()
                .studentId(studentId)
                .bedtime(bedtime)
                .wakeTime(wakeTime)
                .quality(quality)
                .loggedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(sleepRepo.save(entry));
    }
}