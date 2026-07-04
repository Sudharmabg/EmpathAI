package com.mymercurie.rewards.repository;

import com.mymercurie.rewards.entity.Badge;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

import java.util.List;

@Repository
public interface BadgeRepository extends JpaRepository<Badge, Long> {

    /** Used by the auto-award logic to find all badges for a given trigger type. */
    List<Badge> findByTriggerType(String triggerType);
}