package com.empathai.rewards.entity;

import jakarta.persistence.*;
import lombok.*;
import java.time.LocalDateTime;

@Entity
@Table(name = "badges")
@Data
@NoArgsConstructor
@AllArgsConstructor
public class Badge {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false)
    private String title;

    @Column(name = "image", columnDefinition = "LONGBLOB")
    private byte[] image;

    @Column(name = "image_type")
    private String imageType;

    /**
     * Trigger type — one of:
     *   "video"        → awarded when a specific curriculum video is completed
     *   "module"       → awarded when a specific curriculum module is completed
     *   "login"        → awarded at a login count milestone (triggerValue = milestone number)
     *   "intervention" → awarded at an intervention session milestone (triggerValue = milestone number)
     */
    @Column(name = "trigger_type", nullable = false)
    private String triggerType;

    /** Human-readable label for the trigger (video/module title, or e.g. "1st Login"). */
    @Column(name = "trigger_title", nullable = false)
    private String triggerTitle;

    /**
     * Numeric milestone value used by login/intervention badges.
     * Examples: "1", "5", "10", "25", "50", "100" for login badges;
     *           "1", "3", "5", "10" for intervention badges.
     * Null / empty for video / module trigger types.
     */
    @Column(name = "trigger_value")
    private String triggerValue;

    @Column(name = "created_at", updatable = false)
    private LocalDateTime createdAt;

    @Column(name = "modified_at")
    private LocalDateTime modifiedAt;

    @PrePersist
    protected void onCreate() {
        this.createdAt = LocalDateTime.now();
        this.modifiedAt = LocalDateTime.now();
    }

    @PreUpdate
    protected void onUpdate() {
        this.modifiedAt = LocalDateTime.now();
    }
}