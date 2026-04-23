package com.empathai.schedule.repository;

import com.empathai.schedule.entity.SchoolTiming;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.List;

public interface SchoolTimingRepository extends JpaRepository<SchoolTiming, Long> {

    List<SchoolTiming> findBySchoolId(Long schoolId);

    void deleteBySchoolId(Long schoolId);
}