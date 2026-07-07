package com.mymercurie.wellness.controller;

import com.mymercurie.wellness.entity.MindDumpEntry;
import com.mymercurie.wellness.repository.MindDumpEntryRepository;
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
public class MindDumpController {

    private final MindDumpEntryRepository mindDumpRepo;

    @GetMapping("/minddump/{studentId}")
    public ResponseEntity<List<MindDumpEntry>> getMindDumpEntries(@PathVariable Long studentId) {
        return ResponseEntity.ok(mindDumpRepo.findByStudentIdOrderByLoggedAtDesc(studentId));
    }

    @PostMapping("/minddump")
    public ResponseEntity<MindDumpEntry> saveMindDump(@RequestBody Map<String, Object> body) {
        Long studentId = Long.valueOf(body.get("studentId").toString());
        String promptText = (String) body.get("promptText");
        String entryText = (String) body.get("entryText");

        MindDumpEntry entry = MindDumpEntry.builder()
                .studentId(studentId)
                .promptText(promptText)
                .entryText(entryText)
                .loggedAt(LocalDateTime.now())
                .build();

        return ResponseEntity.status(HttpStatus.CREATED).body(mindDumpRepo.save(entry));
    }

    @DeleteMapping("/minddump/{id}")
    public ResponseEntity<Void> deleteMindDump(@PathVariable Long id) {
        mindDumpRepo.deleteById(id);
        return ResponseEntity.noContent().build();
    }
}