package com.empathai.user.service;

import com.empathai.rewards.service.RewardsService;
import com.empathai.user.dto.user.*;
import com.empathai.user.entity.*;
import com.empathai.user.entity.enums.UserRole;
import com.empathai.user.exception.EmpathaiException;
import com.empathai.user.repository.SchoolRepository;
import com.empathai.user.repository.StudentRepository;
import com.empathai.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.PageImpl;
import org.springframework.data.domain.PageRequest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.UUID;
import java.util.stream.Collectors;

@Slf4j
@Service
@RequiredArgsConstructor
public class UserService {

    private final UserRepository userRepository;
    private final StudentRepository studentRepository;
    private final SchoolRepository schoolRepository;
    private final PasswordEncoder passwordEncoder;
    private final EmailService emailService;
    private final RewardsService rewardsService;

    // ─────────────────────────────────────────────────────────────
    // CREATE / UPDATE / DELETE
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public UserResponse createUser(UserRequest request) {
        if (request.getUsername() == null || request.getUsername().isBlank()) {
            request = UserRequest.builder()
                    .name(request.getName())
                    .email(request.getEmail())
                    .username(request.getEmail())
                    .password(request.getPassword())
                    .role(request.getRole())
                    .schoolId(resolveSchoolId(request))
                    .school(request.getSchool())
                    .className(request.getClassName())
                    .section(request.getSection())
                    .phoneNumber(request.getPhoneNumber())
                    .parentPhone(request.getParentPhone())
                    .parentEmail(request.getEmail())
                    .rollNo(request.getRollNo())
                    .dateOfBirth(request.getDateOfBirth())
                    .parentName(request.getParentName())
                    .gender(request.getGender())
                    .build();
        }

        Long schoolId = resolveSchoolId(request);

        if (userRepository.existsByEmail(request.getEmail())) {
            throw new EmpathaiException("Email already exists", "DUPLICATE_EMAIL");
        }
        if (userRepository.existsByUsername(request.getUsername())) {
            throw new EmpathaiException("Username already exists", "DUPLICATE_USERNAME");
        }

        boolean passwordProvided = request.getPassword() != null && !request.getPassword().isBlank();

        User user;

        switch (request.getRole()) {

            case SUPER_ADMIN -> {
                String encodedPassword = passwordEncoder.encode(
                        passwordProvided ? request.getPassword() : UUID.randomUUID().toString());
                user = new SuperAdmin(request.getEmail(), encodedPassword, request.getName());
            }

            case CONTENT_ADMIN -> {
                String encodedPassword = passwordEncoder.encode(
                        passwordProvided ? request.getPassword() : UUID.randomUUID().toString());
                ContentAdmin ca = new ContentAdmin(request.getEmail(), encodedPassword, request.getName());
                if (request.getPhoneNumber() != null) ca.setPhoneNumber(request.getPhoneNumber());
                user = ca;
            }

            case PSYCHOLOGIST -> {
                String encodedPassword = passwordEncoder.encode(
                        passwordProvided ? request.getPassword() : UUID.randomUUID().toString());
                Psychologist p = new Psychologist(request.getEmail(), encodedPassword, request.getName());
                if (request.getPhoneNumber() != null) p.setPhoneNumber(request.getPhoneNumber());
                user = p;
            }

            case SCHOOL_ADMIN -> {
                String encodedPassword = passwordEncoder.encode(
                        passwordProvided ? request.getPassword() : UUID.randomUUID().toString());
                SchoolAdmin sa = new SchoolAdmin(request.getEmail(), encodedPassword, request.getName());
                sa.setSchoolId(schoolId);
                user = sa;
            }

            case TEACHER -> {
                String encodedPassword = passwordEncoder.encode(
                        passwordProvided ? request.getPassword() : UUID.randomUUID().toString());
                Teacher t = new Teacher(request.getEmail(), encodedPassword, request.getName());
                if (request.getPhoneNumber() != null) t.setPhoneNumber(request.getPhoneNumber());
                if (schoolId != null) t.setSchoolId(schoolId);
                user = t;
            }

            case STUDENT -> {
                String encodedPassword = passwordEncoder.encode(
                        passwordProvided ? request.getPassword() : UUID.randomUUID().toString());
                Student s = new Student(request.getEmail(), encodedPassword, request.getName());
                s.setSchoolId(schoolId);
                s.setClassName(request.getClassName());
                s.setSection(request.getSection());
                s.setParentEmail(request.getEmail()); // parent_email mirrors the student's email
                s.setParentPhone(request.getParentPhone());
                s.setRollNo(request.getRollNo());
                s.setDateOfBirth(request.getDateOfBirth());
                s.setParentName(request.getParentName());
                s.setGender(request.getGender());
                user = s;
            }

            default -> throw new EmpathaiException("Invalid role provided");
        }

        user.setUsername(request.getUsername());
        User savedUser = userRepository.save(user);

        if (!passwordProvided) {
            emailService.sendPasswordSetupEmail(savedUser);
        }

        return mapToFullResponse(savedUser);
    }

    @Transactional
    public UserResponse updateUser(Long id, UserRequest request) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("User not found with id: " + id));

        if (request.getName() != null && !request.getName().isBlank())
            user.setName(request.getName());

        if (request.getPassword() != null && !request.getPassword().isBlank())
            user.setPassword(passwordEncoder.encode(request.getPassword()));

        Long schoolId = resolveSchoolId(request);

        if (user instanceof Student s) {
            if (request.getRollNo() != null) s.setRollNo(request.getRollNo());
            if (request.getClassName() != null) s.setClassName(request.getClassName());
            if (schoolId != null) s.setSchoolId(schoolId);
            if (request.getSection() != null) s.setSection(request.getSection());
            if (request.getParentPhone() != null) s.setParentPhone(request.getParentPhone());
            if (request.getDateOfBirth() != null) s.setDateOfBirth(request.getDateOfBirth());
            if (request.getParentName() != null) s.setParentName(request.getParentName());
            if (request.getGender() != null) s.setGender(request.getGender());
            // Keep parent_email in sync with the student's email
            s.setParentEmail(user.getEmail());
        } else if (user instanceof Psychologist p) {
            if (request.getPhoneNumber() != null) p.setPhoneNumber(request.getPhoneNumber());
        } else if (user instanceof ContentAdmin ca) {
            if (request.getPhoneNumber() != null) ca.setPhoneNumber(request.getPhoneNumber());
        } else if (user instanceof SchoolAdmin sa) {
            if (schoolId != null) sa.setSchoolId(schoolId);
        } else if (user instanceof Teacher t) {
            if (request.getPhoneNumber() != null) t.setPhoneNumber(request.getPhoneNumber());
            if (schoolId != null) t.setSchoolId(schoolId);
        }

        return mapToFullResponse(userRepository.save(user));
    }

    @Transactional
    public void resetPassword(Long id, String newPassword) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("User not found with id: " + id));
        user.setPassword(passwordEncoder.encode(newPassword));
        userRepository.save(user);
    }

    @Transactional
    public void deleteUser(Long id) {
        if (!userRepository.existsById(id)) {
            throw new EmpathaiException("User not found");
        }
        userRepository.deleteById(id);
    }

    // ─────────────────────────────────────────────────────────────
    // STUDENT ACTIVITY TRACKING
    // ─────────────────────────────────────────────────────────────

    @Transactional
    public void incrementTimeSpent(Long id, Long seconds) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("User not found with id: " + id));
        if (user instanceof Student s) {
            long current = s.getTimeSpent() != null ? s.getTimeSpent() : 0L;
            s.setTimeSpent(current + seconds);
            studentRepository.save(s);
        }
    }

    /**
     * Increments interventionSessionCount and awards intervention badges.
     */
    @Transactional
    public int incrementInterventionAndAwardBadges(Long id, String activityType) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("User not found with id: " + id));
        if (!(user instanceof Student s)) {
            throw new EmpathaiException("User is not a student", "INVALID_ROLE");
        }
        int current = s.getInterventionSessionCount() != null ? s.getInterventionSessionCount() : 0;
        int newCount = current + 1;
        s.setInterventionSessionCount(newCount);
        if (activityType != null && !activityType.isBlank()) {
            s.setIntervention(activityType);
        }
        studentRepository.save(s);

        // ── KEY FIX: check and award intervention badges ─────────────────────
        try {
            rewardsService.checkAndAwardInterventionBadges(id, newCount);
        } catch (Exception e) {
            log.warn("Failed to award intervention badge for student {}: {}", id, e.getMessage());
        }

        return newCount;
    }

    // ─────────────────────────────────────────────────────────────
    // ROLE-SPECIFIC LIST ENDPOINTS
    // ─────────────────────────────────────────────────────────────

    public Page<StudentSummaryResponse> getStudentPage(String school, String search, int page, int size) {
        Map<Long, String> schoolNameById = schoolRepository.findAll().stream()
                .collect(Collectors.toMap(School::getId, School::getName));

        List<StudentSummaryResponse> all = studentRepository.findAll().stream()
                .filter(s -> {
                    if (school == null) return true;
                    String schoolName = s.getSchoolId() != null
                            ? schoolNameById.getOrDefault(s.getSchoolId(), "") : "";
                    return school.equals(schoolName);
                })
                .filter(s -> search == null
                        || (s.getName() != null && s.getName().toLowerCase().contains(search.toLowerCase()))
                        || (s.getEmail() != null && s.getEmail().toLowerCase().contains(search.toLowerCase())))
                .map(s -> StudentSummaryResponse.builder()
                        .id(s.getId()).name(s.getName()).email(s.getEmail())
                        .username(s.getUsername()).active(true)
                        .className(s.getClassName()).rollNo(s.getRollNo())
                        .school(s.getSchoolId() != null ? schoolNameById.get(s.getSchoolId()) : null)
                        .build())
                .collect(Collectors.toList());

        int start = Math.min(page * size, all.size());
        int end = Math.min(start + size, all.size());
        return new PageImpl<>(all.subList(start, end), PageRequest.of(page, size), all.size());
    }

    public Page<SchoolAdminResponse> getSchoolAdminPage(String search, int page, int size) {
        Map<Long, String> schoolNameById = schoolRepository.findAll().stream()
                .collect(Collectors.toMap(School::getId, School::getName));

        List<SchoolAdminResponse> all = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.SCHOOL_ADMIN)
                .filter(u -> search == null
                        || (u.getName() != null && u.getName().toLowerCase().contains(search.toLowerCase())))
                .map(u -> {
                    SchoolAdmin sa = (SchoolAdmin) u;
                    return SchoolAdminResponse.builder()
                            .id(sa.getId()).name(sa.getName()).email(sa.getEmail())
                            .username(sa.getUsername()).active(true)
                            .schoolId(sa.getSchoolId())
                            .school(sa.getSchoolId() != null ? schoolNameById.get(sa.getSchoolId()) : null)
                            .build();
                }).collect(Collectors.toList());

        int start = Math.min(page * size, all.size());
        int end = Math.min(start + size, all.size());
        return new PageImpl<>(all.subList(start, end), PageRequest.of(page, size), all.size());
    }

    public Page<PsychologistResponse> getPsychologistPage(String search, int page, int size) {
        List<PsychologistResponse> all = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.PSYCHOLOGIST)
                .filter(u -> search == null
                        || (u.getName() != null && u.getName().toLowerCase().contains(search.toLowerCase())))
                .map(u -> {
                    Psychologist p = (Psychologist) u;
                    return PsychologistResponse.builder()
                            .id(p.getId()).name(p.getName()).email(p.getEmail())
                            .username(p.getUsername()).phoneNumber(p.getPhoneNumber())
                            .active(true).build();
                }).collect(Collectors.toList());

        int start = Math.min(page * size, all.size());
        int end = Math.min(start + size, all.size());
        return new PageImpl<>(all.subList(start, end), PageRequest.of(page, size), all.size());
    }

    public Page<ContentAdminResponse> getContentAdminPage(String search, int page, int size) {
        List<ContentAdminResponse> all = userRepository.findAll().stream()
                .filter(u -> u.getRole() == UserRole.CONTENT_ADMIN)
                .filter(u -> search == null
                        || (u.getName() != null && u.getName().toLowerCase().contains(search.toLowerCase())))
                .map(u -> {
                    ContentAdmin ca = (ContentAdmin) u;
                    return ContentAdminResponse.builder()
                            .id(ca.getId()).name(ca.getName()).email(ca.getEmail())
                            .username(ca.getUsername()).phoneNumber(ca.getPhoneNumber())
                            .active(true).build();
                }).collect(Collectors.toList());

        int start = Math.min(page * size, all.size());
        int end = Math.min(start + size, all.size());
        return new PageImpl<>(all.subList(start, end), PageRequest.of(page, size), all.size());
    }

    // ─────────────────────────────────────────────────────────────
    // DETAIL / INTERNAL USE
    // ─────────────────────────────────────────────────────────────

    public UserResponse getUserById(Long id) {
        User user = userRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("User not found with id: " + id));
        return mapToFullResponse(user);
    }

    public List<UserResponse> getAllUsers() {
        return userRepository.findAll().stream()
                .map(this::mapToFullResponse).collect(Collectors.toList());
    }

    public List<UserResponse> getUsersByRole(UserRole role) {
        if (role == UserRole.STUDENT) {
            return studentRepository.findAll().stream()
                    .map(this::mapToFullResponse).collect(Collectors.toList());
        }
        return userRepository.findAll().stream()
                .filter(u -> u.getRole() == role)
                .map(this::mapToFullResponse).collect(Collectors.toList());
    }

    // ─────────────────────────────────────────────────────────────
    // INTERNAL HELPERS
    // ─────────────────────────────────────────────────────────────

    private Long resolveSchoolId(UserRequest request) {
        if (request.getSchoolId() != null) return request.getSchoolId();
        if (request.getSchool() != null && !request.getSchool().isBlank()) {
            return schoolRepository.findByName(request.getSchool())
                    .map(School::getId).orElse(null);
        }
        return null;
    }

    public UserResponse mapToFullResponse(User user) {
        UserResponse.UserResponseBuilder builder = UserResponse.builder()
                .id(user.getId()).name(user.getName()).email(user.getEmail())
                .username(user.getUsername()).role(user.getRole())
                .active(true);

        if (user instanceof SchoolAdmin sa && sa.getSchoolId() != null) {
            builder.schoolId(sa.getSchoolId());
            schoolRepository.findById(sa.getSchoolId())
                    .ifPresent(s -> builder.school(s.getName()));
        } else if (user instanceof Psychologist p) {
            builder.phoneNumber(p.getPhoneNumber());
        } else if (user instanceof ContentAdmin ca) {
            builder.phoneNumber(ca.getPhoneNumber());
        } else if (user instanceof Student s) {
            if (s.getSchoolId() != null) {
                builder.schoolId(s.getSchoolId());
                schoolRepository.findById(s.getSchoolId())
                        .ifPresent(sc -> builder.school(sc.getName()));
            }
            builder.rollNo(s.getRollNo())
                    .className(s.getClassName())
                    .section(s.getSection())
                    .parentEmail(s.getParentEmail())
                    .parentPhone(s.getParentPhone())
                    .dateOfBirth(s.getDateOfBirth())
                    .parentName(s.getParentName())
                    .gender(s.getGender())
                    .loginCount(s.getLoginCount())
                    .interventionSessionCount(s.getInterventionSessionCount())
                    .intervention(s.getIntervention())
                    .timeSpent(s.getTimeSpent());
        }

        return builder.build();
    }
}