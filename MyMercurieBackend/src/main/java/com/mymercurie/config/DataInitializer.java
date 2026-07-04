package com.mymercurie.config;

import com.mymercurie.assessment.entity.AssessmentGroup;
import com.mymercurie.assessment.repository.AssessmentGroupRepository;
import com.mymercurie.user.entity.*;
import com.mymercurie.user.repository.SchoolRepository;
import com.mymercurie.user.repository.UserRepository;
import com.mymercurie.schedule.entity.ClassConfig;
import com.mymercurie.schedule.entity.ScheduleRule;
import com.mymercurie.schedule.repository.ClassConfigRepository;
import com.mymercurie.schedule.repository.ScheduleRuleRepository;
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
    private final ClassConfigRepository classConfigRepository;
    private final ScheduleRuleRepository scheduleRuleRepository;
    private final AssessmentGroupRepository assessmentGroupRepository;

    @Value("${app.default-admin.email:admin@mymercurie.com}")
    private String adminEmail;

    @Value("${app.default-admin.password:MyMercurie@2025!}")
    private String adminPassword;

    @Value("${app.default-admin.name:Super Admin}")
    private String adminName;

    @Override
    public void run(String... args) {
        // Super Admin
        User existingAdmin = userRepository.findByEmail(adminEmail).orElse(null);
        if (existingAdmin == null) {
            SuperAdmin superAdmin = new SuperAdmin(adminEmail, passwordEncoder.encode(adminPassword), adminName);
            superAdmin.setUsername(adminEmail);
            userRepository.save(superAdmin);
            log.info("✅ Super Admin created: {}", adminEmail);
        }

        log.info("✅ SuperAdmin check complete. Other static data is initialized via data.sql.");
    }
}