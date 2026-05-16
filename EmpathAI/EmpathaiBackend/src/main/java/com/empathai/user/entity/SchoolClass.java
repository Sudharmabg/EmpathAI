package com.empathai.user.entity;

import jakarta.persistence.*;
import lombok.*;
import lombok.experimental.SuperBuilder;

@Entity
@Table(name = "school_classes")
@Getter
@Setter
@NoArgsConstructor
@AllArgsConstructor
@SuperBuilder
public class SchoolClass extends BaseEntity {

    @Id
    private Integer id;

    @Column(name = "name", nullable = false)
    private String name;
}