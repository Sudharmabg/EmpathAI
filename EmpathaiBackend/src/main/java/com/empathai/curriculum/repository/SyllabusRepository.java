package com.empathai.curriculum.repository;

import com.empathai.curriculum.entity.Syllabus;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface SyllabusRepository extends JpaRepository<Syllabus, Long> {
    List<Syllabus> findAllByOrderByIdAsc();
    List<Syllabus> findByClassLevel(String classLevel);

    @Query("SELECT s FROM Syllabus s WHERE " +
            "LOWER(s.classLevel) = LOWER(:classLevel) OR " +
            "LOWER(s.classLevel) = LOWER(:normalised) OR " +
            "LOWER(s.classLevel) LIKE LOWER(CONCAT('%', :normalised, '%'))")
    List<Syllabus> findByClassLevelFlexible(
            @Param("classLevel") String classLevel,
            @Param("normalised") String normalised);
}