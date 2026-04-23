package com.empathai.user.service.impl;

import com.empathai.user.dto.teacher.TeacherRequest;
import com.empathai.user.dto.teacher.TeacherResponse;
import com.empathai.user.entity.School;
import com.empathai.user.entity.Teacher;
import com.empathai.user.repository.SchoolClassRepository;
import com.empathai.user.exception.EmpathaiException;
import com.empathai.user.repository.SchoolRepository;
import com.empathai.user.repository.TeacherRepository;
import com.empathai.user.service.TeacherService;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.Arrays;
import java.util.Collections;
import java.util.List;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class TeacherServiceImpl implements TeacherService {

    private final TeacherRepository teacherRepository;
    private final SchoolRepository  schoolRepository;
    private final PasswordEncoder   passwordEncoder;
    private final SchoolClassRepository schoolClassRepository;
    // ── helpers ──────────────────────────────────────────────────────────────
    private String listToCsv(List<String> list) {
        if (list == null || list.isEmpty()) return null;
        return list.stream()
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.joining(","));
    }

    private String intListToCsv(List<Integer> list) {
        if (list == null || list.isEmpty()) return null;
        return list.stream()
                .map(String::valueOf)
                .collect(Collectors.joining(","));
    }
    private List<Integer> csvToIntList(String csv) {
        if (csv == null || csv.isBlank()) return Collections.emptyList();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .map(Integer::parseInt)
                .collect(Collectors.toList());
    }

    private List<String> csvToList(String csv) {
        if (csv == null || csv.isBlank()) return Collections.emptyList();
        return Arrays.stream(csv.split(","))
                .map(String::trim)
                .filter(s -> !s.isBlank())
                .collect(Collectors.toList());
    }

    private Long resolveSchoolId(TeacherRequest request) {
        if (request.getSchoolId() != null) return request.getSchoolId();
        if (request.getSchool() != null && !request.getSchool().isBlank()) {
            return schoolRepository.findAll().stream()
                    .filter(s -> s.getName().equalsIgnoreCase(request.getSchool().trim()))
                    .map(School::getId)
                    .findFirst()
                    .orElse(null);
        }
        return null;
    }

    private TeacherResponse toResponse(Teacher t) {
        String schoolName = null;
        if (t.getSchoolId() != null) {
            schoolName = schoolRepository.findById(t.getSchoolId())
                    .map(School::getName)
                    .orElse(null);
        }
        return TeacherResponse.builder()
                .id(t.getId())
                .name(t.getName())
                .email(t.getEmail())
                .username(t.getUsername())
                .phoneNumber(t.getPhoneNumber())
                .active(true) // Always true since active field removed from User
                .subjects(csvToList(t.getSubjects()))
                .classesCovered(csvToIntList(t.getClassesCovered()))
                .schoolId(t.getSchoolId())
                .school(schoolName)
                .createdAt(t.getCreatedAt())
                .createdBy(t.getCreatedBy())
                .updatedAt(t.getUpdatedAt())
                .updatedBy(t.getUpdatedBy())
                .build();
    }

    // ── CRUD ─────────────────────────────────────────────────────────────────

    @Override
    @Transactional
    public TeacherResponse createTeacher(TeacherRequest request) {
        Teacher t = new Teacher(
                request.getEmail(),
                passwordEncoder.encode(request.getPassword()),
                request.getName());
        t.setUsername(request.getEmail());
        t.setPhoneNumber(request.getPhoneNumber());
        t.setSubjects(listToCsv(request.getSubjects()));
        t.setClassesCovered(intListToCsv(request.getClassesCovered()));
        t.setSchoolId(resolveSchoolId(request));
        return toResponse(teacherRepository.save(t));
    }

    @Override
    @Transactional
    public TeacherResponse updateTeacher(Long id, TeacherRequest request) {
        Teacher t = teacherRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("Teacher not found: " + id));

        if (request.getName() != null && !request.getName().isBlank())
            t.setName(request.getName());
        if (request.getPassword() != null && !request.getPassword().isBlank())
            t.setPassword(passwordEncoder.encode(request.getPassword()));
        if (request.getPhoneNumber() != null)
            t.setPhoneNumber(request.getPhoneNumber());
        if (request.getSubjects() != null)
            t.setSubjects(listToCsv(request.getSubjects()));
        if (request.getClassesCovered() != null)
            t.setClassesCovered(intListToCsv(request.getClassesCovered()));
        Long sid = resolveSchoolId(request);
        if (sid != null) t.setSchoolId(sid);

        return toResponse(teacherRepository.save(t));
    }

    @Override
    @Transactional
    public void resetPassword(Long id, String newRawPassword) {
        Teacher t = teacherRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("Teacher not found: " + id));
        t.setPassword(passwordEncoder.encode(newRawPassword));
        teacherRepository.save(t);
    }

    @Override
    @Transactional
    public void deleteTeacher(Long id) {
        if (!teacherRepository.existsById(id))
            throw new EmpathaiException("Teacher not found: " + id);
        teacherRepository.deleteById(id);
    }

    @Override
    public TeacherResponse getTeacherById(Long id) {
        return toResponse(teacherRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("Teacher not found: " + id)));
    }

    @Override
    public Page<TeacherResponse> getTeacherPage(String school, String search, int page, int size) {
        List<Teacher> all;

        if (search != null && !search.isBlank()) {
            all = teacherRepository
                    .findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(search, search);
        } else {
            all = teacherRepository.findAll();
        }

        if (school != null && !school.isBlank()) {
            Long schoolId = schoolRepository.findAll().stream()
                    .filter(s -> s.getName().equalsIgnoreCase(school.trim()))
                    .map(School::getId)
                    .findFirst()
                    .orElse(null);
            if (schoolId != null) {
                final Long sid = schoolId;
                all = all.stream()
                        .filter(t -> sid.equals(t.getSchoolId()))
                        .collect(Collectors.toList());
            }
        }

        List<TeacherResponse> responses = all.stream()
                .map(this::toResponse)
                .collect(Collectors.toList());

        int start = Math.min(page * size, responses.size());
        int end   = Math.min(start + size, responses.size());
        return new PageImpl<>(responses.subList(start, end),
                PageRequest.of(page, size), responses.size());
    }
}