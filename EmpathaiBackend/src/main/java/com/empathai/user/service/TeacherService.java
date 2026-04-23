package com.empathai.user.service;

import com.empathai.user.dto.teacher.TeacherRequest;
import com.empathai.user.dto.teacher.TeacherResponse;
import org.springframework.data.domain.Page;

public interface TeacherService {

    TeacherResponse createTeacher(TeacherRequest request);

    TeacherResponse updateTeacher(Long id, TeacherRequest request);

    void deleteTeacher(Long id);

    TeacherResponse getTeacherById(Long id);

    Page<TeacherResponse> getTeacherPage(String school, String search, int page, int size);


    void resetPassword(Long id, String newRawPassword);
}