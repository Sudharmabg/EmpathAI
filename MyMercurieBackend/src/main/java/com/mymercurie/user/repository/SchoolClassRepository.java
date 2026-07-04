package com.mymercurie.user.repository;

import com.mymercurie.user.entity.SchoolClass;
import org.springframework.data.jpa.repository.JpaRepository;

public interface SchoolClassRepository extends JpaRepository<SchoolClass, Integer> {
}