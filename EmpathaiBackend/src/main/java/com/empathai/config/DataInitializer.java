package com.empathai.config;

import com.empathai.assessment.entity.AssessmentGroup;
import com.empathai.assessment.repository.AssessmentGroupRepository;
import com.empathai.user.entity.*;
import com.empathai.user.repository.SchoolRepository;
import com.empathai.user.repository.UserRepository;
import com.empathai.schedule.entity.ClassConfig;
import com.empathai.schedule.entity.ScheduleRule;
import com.empathai.schedule.repository.ClassConfigRepository;
import com.empathai.schedule.repository.ScheduleRuleRepository;
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

    @Value("${app.default-admin.email:admin@empathai.com}")
    private String adminEmail;

    @Value("${app.default-admin.password:EmpathAI@2025!}")
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
        } else {
            existingAdmin.setPassword(passwordEncoder.encode(adminPassword));
            userRepository.save(existingAdmin);
            log.info("✅ Super Admin password synced/reset: {}", adminEmail);
        }

        log.info("✅ SuperAdmin check complete. Other static data is initialized via data.sql.");
    }
}