package com.empathai.config;

import com.empathai.user.entity.SuperAdmin;
import com.empathai.user.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
@RequiredArgsConstructor
@Slf4j
public class DataInitializer implements CommandLineRunner {

    private final UserRepository userRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${app.default-admin.email:admin@empathai.com}")
    private String adminEmail;

    @Value("${app.default-admin.password:EmpathAI@2025!}")
    private String adminPassword;

    @Value("${app.default-admin.name:Super Admin}")
    private String adminName;

    @Override
    public void run(String... args) {
        // Super Admin
        if (!userRepository.existsByEmail(adminEmail)) {
            SuperAdmin superAdmin = new SuperAdmin(adminEmail, passwordEncoder.encode(adminPassword), adminName);
            superAdmin.setUsername(adminEmail);
            userRepository.save(superAdmin);
            log.info("✅ Super Admin created: {}", adminEmail);
        } else {
            log.info("ℹ️  Super Admin already exists: {}", adminEmail);
        }
    }
}