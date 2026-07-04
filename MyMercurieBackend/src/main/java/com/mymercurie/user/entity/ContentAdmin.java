package com.mymercurie.user.entity;

import com.mymercurie.user.entity.enums.UserRole;
import jakarta.persistence.Column;
import jakarta.persistence.DiscriminatorValue;
import jakarta.persistence.Entity;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

@Entity
@DiscriminatorValue("CONTENT_ADMIN")
@Getter
@Setter
@NoArgsConstructor
public class ContentAdmin extends User {

    @Column(name = "phone_number")
    private String phoneNumber;

    public ContentAdmin(String email, String password, String name) {
        super(email, password, name, UserRole.CONTENT_ADMIN);
    }
}