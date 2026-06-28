package com.empathai.user.entity;

import com.empathai.user.entity.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@DiscriminatorValue("SCHOOL_ADMIN")
@Getter
@Setter
@NoArgsConstructor
public class SchoolAdmin extends User {
    
    @Column(name = "school_id")
    private Long schoolId;

    @Column(name = "phone_number")
    private String phoneNumber;

    public SchoolAdmin(String email, String password, String name) {
        super(email, password, name, UserRole.SCHOOL_ADMIN);
    }
}
