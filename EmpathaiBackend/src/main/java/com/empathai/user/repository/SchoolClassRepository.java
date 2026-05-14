package com.empathai.user.repository;

import com.empathai.user.entity.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Integer> {
}