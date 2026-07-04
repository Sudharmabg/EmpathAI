package com.mymercurie.wellness.entity;

import com.mymercurie.user.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDateTime;

@Entity
@Table(name = "gratitude_entries", indexes = {
        @Index(name = "idx_gratitude_student", columnList = "student_id")
})
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class GratitudeEntry extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "entry_text", nullable = false, columnDefinition = "TEXT")
    private String entryText;

    @Column(name = "logged_at", nullable = false)
    private LocalDateTime loggedAt;

    @PrePersist
    public void prePersist() {
        if (loggedAt == null) loggedAt = LocalDateTime.now();
    }
}