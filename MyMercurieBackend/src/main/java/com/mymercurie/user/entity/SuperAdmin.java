package com.mymercurie.user.entity;

import com.mymercurie.user.entity.enums.UserRole;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@DiscriminatorValue("SUPER_ADMIN")
@Getter
@Setter
@NoArgsConstructor
public class SuperAdmin extends User {
    
    public SuperAdmin(String email, String password, String name) {
        super(email, password, name, UserRole.SUPER_ADMIN);
    }
}
