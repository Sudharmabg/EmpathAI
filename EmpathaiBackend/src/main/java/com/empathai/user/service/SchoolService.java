package com.empathai.user.service;

import com.empathai.user.dto.school.ClassSummaryResponse;
import com.empathai.user.dto.school.SchoolRequest;
import com.empathai.user.dto.school.SchoolResponse;
import com.empathai.user.dto.school.SchoolSummaryResponse;
import com.empathai.user.dto.user.StudentDetailResponse;
import com.empathai.user.entity.School;
import com.empathai.user.entity.Student;
import com.empathai.user.exception.EmpathaiException;
import com.empathai.user.repository.SchoolRepository;
import com.empathai.user.repository.StudentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
@RequiredArgsConstructor
public class SchoolService {

    private final SchoolRepository schoolRepository;
    private final StudentRepository studentRepository;

    @Transactional
    public SchoolResponse createSchool(SchoolRequest request) {
        if (schoolRepository.existsByName(request.getName())) {
            throw new EmpathaiException("School with name '" + request.getName() + "' already exists", "DUPLICATE_SCHOOL");
        }
        School school = School.builder()
                .name(request.getName())
                .address(request.getAddress())
                .contactNumber(request.getContactNumber())
                .contactName(request.getContactName())
                .email(request.getEmail())
                .active(true)
                .build();
        return mapToFullResponse(schoolRepository.save(school));
    }

    public List<SchoolSummaryResponse> getAllSchoolSummaries() {
        return schoolRepository.findAll().stream()
                .map(school -> SchoolSummaryResponse.builder()
                        .id(school.getId())
                        .name(school.getName())
                        .studentCount(studentRepository.countBySchoolId(school.getId()))
                        .build())
                .collect(Collectors.toList());
    }

    public List<ClassSummaryResponse> getClassesBySchool(Long schoolId) {
        schoolRepository.findById(schoolId)
                .orElseThrow(() -> new EmpathaiException("School not found with id: " + schoolId));

        List<Student> students = studentRepository.findBySchoolId(schoolId);

        Map<String, Long> classCounts = students.stream()
                .filter(s -> s.getClassName() != null && !s.getClassName().isBlank())
                .collect(Collectors.groupingBy(Student::getClassName, Collectors.counting()));

        return classCounts.entrySet().stream()
                .sorted(Map.Entry.comparingByKey())
                .map(e -> ClassSummaryResponse.builder()
                        .className(e.getKey())
                        .studentCount(e.getValue())
                        .build())
                .collect(Collectors.toList());
    }

    public List<StudentDetailResponse> getStudentsBySchoolAndClass(Long schoolId, String className) {
        String schoolName = schoolRepository.findById(schoolId)
                .map(School::getName)
                .orElseThrow(() -> new EmpathaiException("School not found with id: " + schoolId));

        return studentRepository.findBySchoolIdAndClassName(schoolId, className).stream()
                .map(s -> StudentDetailResponse.builder()
                        .id(s.getId())
                        .name(s.getName())
                        .email(s.getEmail())
                        .username(s.getUsername())
                        .parentPhone(s.getParentPhone())
                        .parentName(s.getParentName())
                        .active(true)
                        .schoolId(s.getSchoolId())
                        .school(schoolName)
                        .className(s.getClassName())
                        .section(s.getSection())
                        .rollNo(s.getRollNo())
                        .dateOfBirth(s.getDateOfBirth())
                        .gender(s.getGender())
                        .loginCount(s.getLoginCount())
                        .interventionSessionCount(s.getInterventionSessionCount())
                        .intervention(s.getIntervention())
                        .timeSpent(s.getTimeSpent())
                        .build())
                .collect(Collectors.toList());
    }
    public SchoolResponse getSchoolById(Long id) {
        School school = schoolRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("School not found with id: " + id));
        return mapToFullResponse(school);
    }

    @Transactional
    public SchoolResponse updateSchool(Long id, SchoolRequest request) {
        School school = schoolRepository.findById(id)
                .orElseThrow(() -> new EmpathaiException("School not found with id: " + id));

        if (!school.getName().equals(request.getName()) && schoolRepository.existsByName(request.getName())) {
            throw new EmpathaiException("School with name '" + request.getName() + "' already exists", "DUPLICATE_SCHOOL");
        }
        if (request.getName() != null && !request.getName().isBlank())
            school.setName(request.getName());
        if (request.getAddress() != null)
            school.setAddress(request.getAddress());
        if (request.getContactNumber() != null)
            school.setContactNumber(request.getContactNumber());
        if (request.getContactName() != null)
            school.setContactName(request.getContactName());
        if (request.getEmail() != null)
            school.setEmail(request.getEmail());

        return mapToFullResponse(schoolRepository.save(school));
    }

    @Transactional
    public void deleteSchool(Long id) {
        if (!schoolRepository.existsById(id)) {
            throw new EmpathaiException("School not found");
        }
        schoolRepository.deleteById(id);
    }

    public List<SchoolResponse> getAllSchools() {
        return schoolRepository.findAll().stream()
                .map(this::mapToFullResponse)
                .collect(Collectors.toList());
    }

    private SchoolResponse mapToFullResponse(School school) {
        return SchoolResponse.builder()
                .id(school.getId())
                .name(school.getName())
                .address(school.getAddress())
                .contactNumber(school.getContactNumber())
                .contactName(school.getContactName())
                .email(school.getEmail())
                .active(Boolean.TRUE.equals(school.getActive()))
                .build();
    }
}