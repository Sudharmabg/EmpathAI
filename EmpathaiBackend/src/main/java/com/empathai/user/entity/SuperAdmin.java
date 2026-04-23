package com.empathai.user.entity;

import com.empathai.user.entity.enums.UserRole;
import jakarta.persistence.Entity;
import jakarta.persistence.Table;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@Table(name = "super_admins")
@Getter
@Setter
@NoArgsConstructor
public class SuperAdmin extends User {
    
    public SuperAdmin(String email, String password, String name) {
        super(email, password, name, UserRole.SUPER_ADMIN);
    }
}
