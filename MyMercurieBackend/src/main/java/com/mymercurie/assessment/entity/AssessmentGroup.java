package com.mymercurie.assessment.entity;

import com.mymercurie.user.entity.BaseEntity;
import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "question_groups")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class AssessmentGroup extends BaseEntity {

    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true)
    private String name;

    @Column(name = "text")
    private String description;
    @Column(name = "color")
    private String color;

    @Builder.Default
    @Column(name = "is_default", nullable = false)
    private Boolean isDefault = false;


    @Column(name = "class_name")
    private String className;
}