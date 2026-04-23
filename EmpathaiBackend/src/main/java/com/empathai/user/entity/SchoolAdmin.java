package com.empathai.user.entity;

import com.empathai.user.entity.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "school_admins")
@Getter
@Setter
@NoArgsConstructor
public class SchoolAdmin extends User {
    
    @Column(name = "school_id")
    private Long schoolId;

    public SchoolAdmin(String email, String password, String name) {
        super(email, password, name, UserRole.SCHOOL_ADMIN);
    }
}
