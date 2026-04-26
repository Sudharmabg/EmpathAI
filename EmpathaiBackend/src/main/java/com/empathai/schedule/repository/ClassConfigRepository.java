package com.empathai.schedule.repository;

import com.empathai.schedule.entity.ClassConfig;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.Optional;

@Repository
public interface ClassConfigRepository extends JpaRepository<ClassConfig, Long> {
    Optional<ClassConfig> findByClassGroup(String classGroup);
}
