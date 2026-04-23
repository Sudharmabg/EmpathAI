package com.empathai.schedule.repository;

import com.empathai.schedule.entity.ScheduleRule;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface ScheduleRuleRepository extends JpaRepository<ScheduleRule, String> {

    // returns all active rules sorted by priority ascending (lowest runs first)
    List<ScheduleRule> findByActiveTrueOrderByPriorityAsc();
}
