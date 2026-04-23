package com.empathai.user.controller;

import com.empathai.user.dto.school.ClassSummaryResponse;
import com.empathai.user.dto.school.SchoolRequest;
import com.empathai.user.dto.school.SchoolResponse;
import com.empathai.user.dto.school.SchoolSummaryResponse;
import com.empathai.user.dto.user.StudentDetailResponse;
import com.empathai.user.service.SchoolService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/schools")
@RequiredArgsConstructor
public class SchoolController {

    private final SchoolService schoolService;

    @PostMapping
    public ResponseEntity<SchoolResponse> createSchool(@Valid @RequestBody SchoolRequest request) {
        return new ResponseEntity<>(schoolService.createSchool(request), HttpStatus.CREATED);
    }

    /**
     * GET /api/schools
     * LEVEL 1 - School list: id, name, studentCount only.
     * Previously returned full SchoolResponse including audit fields.
     */
    @GetMapping
    public ResponseEntity<List<SchoolSummaryResponse>> getAllSchools() {
        return ResponseEntity.ok(schoolService.getAllSchoolSummaries());
    }

    /**
     * GET /api/schools/{id}
     * Full school detail for edit/view screens.
     */
    @GetMapping("/{id}")
    public ResponseEntity<SchoolResponse> getSchoolById(@PathVariable Long id) {
        return ResponseEntity.ok(schoolService.getSchoolById(id));
    }

    /**
     * GET /api/schools/{id}/classes
     * LEVEL 2 - Classes inside a school: className, studentCount only.
     * Frontend calls this when user drills into a school.
     */
    @GetMapping("/{id}/classes")
    public ResponseEntity<List<ClassSummaryResponse>> getClasses(@PathVariable Long id) {
        return ResponseEntity.ok(schoolService.getClassesBySchool(id));
    }

    /**
     * GET /api/schools/{id}/classes/{className}/students
     * LEVEL 3 - Full student detail inside a class. No audit fields.
     * Frontend calls this only when user drills into a specific class.
     */
    @GetMapping("/{id}/classes/{className}/students")
    public ResponseEntity<List<StudentDetailResponse>> getStudentsInClass(
            @PathVariable Long id,
            @PathVariable String className) {
        return ResponseEntity.ok(schoolService.getStudentsBySchoolAndClass(id, className));
    }

    @PutMapping("/{id}")
    public ResponseEntity<SchoolResponse> updateSchool(@PathVariable Long id,
                                                       @Valid @RequestBody SchoolRequest request) {
        return ResponseEntity.ok(schoolService.updateSchool(id, request));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<Void> deleteSchool(@PathVariable Long id) {
        schoolService.deleteSchool(id);
        return ResponseEntity.noContent().build();
    }
}
