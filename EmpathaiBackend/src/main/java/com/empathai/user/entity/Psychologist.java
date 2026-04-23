package com.empathai.user.entity;

import com.empathai.user.entity.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "psychologists")
@Getter
@Setter
@NoArgsConstructor
public class Psychologist extends User {

    @Column(name = "phone_number")
    private String phoneNumber;

    public Psychologist(String email, String password, String name) {
        super(email, password, name, UserRole.PSYCHOLOGIST);
    }
}