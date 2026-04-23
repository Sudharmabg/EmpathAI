package com.empathai.user.entity;

import com.empathai.user.entity.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "students")
@Getter
@Setter
@NoArgsConstructor
public class Student extends User {

    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "class_name")
    private String className;

    @Column(name = "section")
    private String section;

    @Column(name = "parent_email")
    private String parentEmail;

    @Column(name = "parent_phone")
    private String parentPhone;

    @Column(name = "roll_no")
    private String rollNo;

    @Column(name = "gender")
    private String gender;

    @Column(name = "date_of_birth")
    private String dateOfBirth;



    @Column(name = "parent_name")
    private String parentName;

    /** Incremented every time this student successfully logs in. */
    @Column(name = "login_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer loginCount = 0;

    /** Incremented every time this student completes an intervention/counseling session. */
    @Column(name = "intervention_session_count", nullable = false, columnDefinition = "INT DEFAULT 0")
    private Integer interventionSessionCount = 0;

    /** Type of intervention assigned (e.g. Counselling, CBT, Group session). */
    @Column(name = "intervention")
    private String intervention;

    /** Total time spent on the platform in seconds. */
    @Column(name = "time_spent", nullable = false, columnDefinition = "BIGINT DEFAULT 0")
    private Long timeSpent = 0L;

    // ── Constructor ────────────────────────────────────────────────────────

    public Student(String email, String password, String name) {
        super(email, password, name, UserRole.STUDENT);
    }
}