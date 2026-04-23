package com.empathai.user.entity;

import com.empathai.user.entity.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "teachers")
@Getter
@Setter
@NoArgsConstructor
public class Teacher extends User {

    @Column(name = "phone_number")
    private String phoneNumber;


    @Column(name = "subjects", columnDefinition = "TEXT")
    private String subjects;


    @Column(name = "classes_covered", columnDefinition = "TEXT")
    private String classesCovered;

    @Column(name = "school_id")
    private Long schoolId;

    public Teacher(String email, String password, String name) {
        super(email, password, name, UserRole.TEACHER);
    }
}