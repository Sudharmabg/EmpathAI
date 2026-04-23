package com.empathai.chat.entity;

import jakarta.persistence.*;
import lombok.*;

import java.time.LocalDate;

@Entity
@Table(name = "chat_usage",
        uniqueConstraints = @UniqueConstraint(columnNames = {"student_id", "usage_date"}))
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@Builder
public class ChatUsage {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "student_id", nullable = false)
    private Long studentId;

    @Column(name = "usage_date", nullable = false)
    private LocalDate usageDate;

    @Column(name = "message_count")
    private int messageCount;
}
