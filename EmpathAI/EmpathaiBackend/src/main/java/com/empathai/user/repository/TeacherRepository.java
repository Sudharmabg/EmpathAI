package com.empathai.user.repository;

import com.empathai.user.entity.Teacher;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface TeacherRepository extends JpaRepository<Teacher, Long> {

    List<Teacher> findBySchoolId(Long schoolId);

    List<Teacher> findByNameContainingIgnoreCaseOrEmailContainingIgnoreCase(
            String name, String email);
}
