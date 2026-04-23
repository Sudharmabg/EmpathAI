package com.empathai.schedule.entity;

import jakarta.persistence.*;
import lombok.*;

@Entity
@Table(name = "schedule_rules")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ScheduleRule {

    @Id
    @Column(name = "rule_id", length = 10)
    private String ruleId;           // e.g. "R01", "R02"

    @Column(name = "rule_name", nullable = false)
    private String ruleName;

    // lower number = runs first
    @Column(name = "priority", nullable = false)
    private int priority;

    // "ALL" or "STUDY"
    @Column(name = "applies_to", nullable = false, length = 10)
    private String appliesTo;

    // "HARD", "SOFT", "CONDITIONAL"
    @Column(name = "block_type", nullable = false, length = 15)
    private String blockType;

    @Column(name = "is_active", nullable = false, columnDefinition = "TINYINT(1) DEFAULT 1")
    private Boolean active;

    // JSON string storing configurable values e.g. {"min_minutes":15}
    @Column(name = "parameters", length = 1000)
    private String parameters;
}
