package com.mymercurie.user.entity;

import com.mymercurie.user.entity.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@DiscriminatorValue("PSYCHOLOGIST")
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