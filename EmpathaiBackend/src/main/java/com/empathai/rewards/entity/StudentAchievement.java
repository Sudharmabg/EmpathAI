package com.empathai.rewards.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "student_achievements",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "achievement_id"}))
@Data
@NoArgsConstructor
@AllArgsConstructor
public class StudentAchievement {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "achievement_id", nullable = false)
    private Achievement achievement;

    @Column(name = "earned_at", nullable = false)
    private LocalDateTime earnedAt;

    @PrePersist
    protected void onCreate() {
        this.earnedAt = LocalDateTime.now();
    }
}