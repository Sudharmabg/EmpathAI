package com.empathai.curriculum.repository;

import com.empathai.curriculum.entity.Module;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;
import java.util.List;

@Repository
public interface ModuleRepository extends JpaRepository<Module, Long> {
    List<Module> findBySyllabusIdOrderByIdAsc(Long syllabusId);
}