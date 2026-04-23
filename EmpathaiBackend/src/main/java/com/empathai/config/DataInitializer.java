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
    private final SchoolRepository schoolRepository;
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
        if (!userRepository.existsByEmail(adminEmail)) {
            SuperAdmin superAdmin = new SuperAdmin(adminEmail, passwordEncoder.encode(adminPassword), adminName);
            superAdmin.setUsername(adminEmail);
            userRepository.save(superAdmin);
            log.info("✅ Super Admin created: {}", adminEmail);
        } else {
            log.info("ℹ️  Super Admin already exists: {}", adminEmail);
        }

        // Seed Schools
        School tigps    = seedSchool("TIGPS",    "Tirupati, Andhra Pradesh",   "9000000001", "TIGPS Admin",    "tigps@empathai.com");
        School falakata = seedSchool("FALAKATA", "Falakata, West Bengal",       "9000000002", "Falakata Admin", "falakata@empathai.com");
        School dav      = seedSchool("DAV",       "Delhi",                       "9000000003", "DAV Admin",      "dav@empathai.com");

        // School Admins
        seedSchoolAdmin("tigps.admin@empathai.com",    "Tigps@2025!",    "TIGPS Admin",    tigps.getId());
        seedSchoolAdmin("falakata.admin@empathai.com", "Falakata@2025!", "Falakata Admin", falakata.getId());
        seedSchoolAdmin("dav.admin@empathai.com",      "Dav@2025!",      "DAV Admin",      dav.getId());

        // Content Admin
        seedContentAdmin("content@empathai.com", "Content@2025!", "Content Admin");

        // Psychologist
        seedPsychologist("psycho@empathai.com", "Psycho@2025!", "Dr. Ananya Rao");

        // Sample Students
        seedStudent("Aarav Sharma",  "aarav@empathai.com",  "GGgvwM5Gazn4", tigps.getId(),    "4th Standard", null);
        seedStudent("Rohan Gupta",   "rohan@empathai.com",  "TempPass123",  tigps.getId(),    "6th Standard", null);
        seedStudent("Ishaan Kumar",  "ishaan@empathai.com", "TempPass789",  tigps.getId(),    "5th Standard", null);
        seedStudent("Priya Das",     "priya@empathai.com",  "TempPass321",  falakata.getId(), "7th Standard", null);
        seedStudent("Rahul Mondal",  "rahul@empathai.com",  "TempPass654",  falakata.getId(), "8th Standard", null);

        // Schedule: class configs and rules
        seedClassConfigs();
        seedScheduleRules();


        seedQuestionGroups();

        log.info("✅ Data seeding complete.");
    }
    // ── Feelings Explorer — Default Question Groups ────────────────────────────
    private void seedQuestionGroups() {




        if (assessmentGroupRepository.count() > 0) {
            log.info("ℹ️  Question groups already seeded or managed by user.");
            return;
        }


        seedGroup("Daily Check-in",       "purple", "Daily Check-in");
        seedGroup("Class 1st Standard",   "pink",   "1st Standard");
        seedGroup("Class 2nd Standard",   "orange", "2nd Standard");
        seedGroup("Class 3rd Standard",   "yellow", "3rd Standard");
        seedGroup("Class 4th Standard",   "green",  "4th Standard");
        seedGroup("Class 5th Standard",   "teal",   "5th Standard");
        seedGroup("Class 6th Standard",   "blue",   "6th Standard");
        seedGroup("Class 7th Standard",   "indigo", "7th Standard");
        seedGroup("Class 8th Standard",   "green",  "8th Standard");
        seedGroup("Class 9th Standard",   "blue",   "9th Standard");
        seedGroup("Class 10th Standard",  "indigo", "10th Standard");
        seedGroup("Class 11th Standard",  "red",    "11th Standard");
        seedGroup("Class 12th Standard",  "purple", "12th Standard");

        log.info("✅ Question groups seeded.");
    }

    private void seedGroup(String name, String color, String className) {
        assessmentGroupRepository.save(
                AssessmentGroup.builder()
                        .name(name)
                        .color(color)
                        .isDefault(false)
                        .className(className)
                        .build()
        );
        log.info("✅ Question group created: {}", name);
    }
    // ── Schedule Class Configs ─────────────────────────────────────────────────
    private void seedClassConfigs() {
        if (classConfigRepository.count() > 0) {
            log.info("ℹ️  Class configs already seeded.");
            return;
        }
        classConfigRepository.save(ClassConfig.builder()
                .classGroup("Class 1-2").weekdayCapMins(60).weekendCapMins(90).sessionMaxMins(30)
                .gradePatterns("1st,2nd,class 1,class 2,grade 1,grade 2").build());
        classConfigRepository.save(ClassConfig.builder()
                .classGroup("Class 3-4").weekdayCapMins(90).weekendCapMins(120).sessionMaxMins(30)
                .gradePatterns("3rd,4th,class 3,class 4,grade 3,grade 4").build());
        classConfigRepository.save(ClassConfig.builder()
                .classGroup("Class 5-6").weekdayCapMins(120).weekendCapMins(180).sessionMaxMins(45)
                .gradePatterns("5th,6th,class 5,class 6,grade 5,grade 6").build());
        classConfigRepository.save(ClassConfig.builder()
                .classGroup("Class 7-8").weekdayCapMins(180).weekendCapMins(240).sessionMaxMins(60)
                .gradePatterns("7th,8th,class 7,class 8,grade 7,grade 8").build());
        classConfigRepository.save(ClassConfig.builder()
                .classGroup("Class 9-10").weekdayCapMins(240).weekendCapMins(300).sessionMaxMins(75)
                .gradePatterns("9th,10th,class 9,class 10,grade 9,grade 10").build());
        classConfigRepository.save(ClassConfig.builder()
                .classGroup("Class 11-12").weekdayCapMins(300).weekendCapMins(360).sessionMaxMins(90)
                .gradePatterns("11th,12th,class 11,class 12,grade 11,grade 12").build());
        log.info("✅ Schedule class configs seeded.");
    }

    // ── Schedule Rules (12 rules, DB-configurable) ────────────────────────────
    private void seedScheduleRules() {
        if (scheduleRuleRepository.count() > 0) {
            log.info("ℹ️  Schedule rules already seeded.");
            return;
        }
        // Priority order: lower = runs first
        // R06 first — min duration (fastest sanity check)
        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R06").ruleName("Min Task Duration").priority(1)
                .appliesTo("ALL").blockType("HARD").active(true)
                .parameters("{\"min_minutes\":15}").build());

        // R11 before R05 — grace check must run before time boundary
        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R11").ruleName("After 11 PM Grace Rule").priority(2)
                .appliesTo("ALL").blockType("CONDITIONAL").active(true)
                .parameters("{\"grace_minutes\":15}").build());

        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R05").ruleName("Time Boundary 6AM to 11PM").priority(3)
                .appliesTo("ALL").blockType("HARD").active(true)
                .parameters("{\"start_boundary\":360,\"end_boundary\":1380}").build());

        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R01").ruleName("No Overlapping Tasks").priority(4)
                .appliesTo("ALL").blockType("HARD").active(true)
                .parameters("{}").build());

        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R09").ruleName("No Duplicate Task Names Same Day").priority(5)
                .appliesTo("ALL").blockType("HARD").active(true)
                .parameters("{}").build());

        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R10").ruleName("Max 8 Tasks Per Day").priority(6)
                .appliesTo("ALL").blockType("HARD").active(true)
                .parameters("{\"max_tasks\":8}").build());

        // Study-only rules
        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R02").ruleName("Max Daily Study Time By Class").priority(7)
                .appliesTo("STUDY").blockType("HARD").active(true)
                .parameters("{\"source\":\"class_config\"}").build());

        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R03").ruleName("Max Single Session Length By Class").priority(8)
                .appliesTo("STUDY").blockType("HARD").active(true)
                .parameters("{\"source\":\"class_config\"}").build());

        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R04").ruleName("Min Break Between Study Sessions").priority(9)
                .appliesTo("STUDY").blockType("HARD").active(true)
                .parameters("{\"min_break_mins\":10}").build());

        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R07").ruleName("Max 3 Study Sessions Per Day").priority(10)
                .appliesTo("STUDY").blockType("HARD").active(true)
                .parameters("{\"max_sessions\":3}").build());

        // Soft warnings — always run last
        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R08").ruleName("Wellness Task Reminder").priority(11)
                .appliesTo("STUDY").blockType("SOFT").active(true)
                .parameters("{}").build());

        scheduleRuleRepository.save(ScheduleRule.builder()
                .ruleId("R12").ruleName("3 Consecutive Study Days Warning").priority(12)
                .appliesTo("STUDY").blockType("SOFT").active(true)
                .parameters("{\"consecutive_days\":3}").build());

        log.info("✅ Schedule rules seeded (12 rules).");
    }

    private School seedSchool(String name, String address, String contact, String contactName, String email) {
        if (!schoolRepository.existsByName(name)) {
            School school = School.builder()
                    .name(name).address(address).contactNumber(contact)
                    .contactName(contactName).email(email).active(true)
                    .build();
            School saved = schoolRepository.save(school);
            log.info("✅ School created: {}", name);
            return saved;
        }
        log.info("ℹ️  School already exists: {}", name);
        return schoolRepository.findByName(name).orElseThrow();
    }

    private void seedSchoolAdmin(String email, String password, String name, Long schoolId) {
        if (!userRepository.existsByEmail(email)) {
            SchoolAdmin sa = new SchoolAdmin(email, passwordEncoder.encode(password), name);
            sa.setUsername(email);
            sa.setSchoolId(schoolId);
            userRepository.save(sa);
            log.info("✅ School Admin created: {}", email);
        }
    }

    private void seedContentAdmin(String email, String password, String name) {
        if (!userRepository.existsByEmail(email)) {
            ContentAdmin ca = new ContentAdmin(email, passwordEncoder.encode(password), name);
            ca.setUsername(email);
            userRepository.save(ca);
            log.info("✅ Content Admin created: {}", email);
        }
    }

    private void seedPsychologist(String email, String password, String name) {
        if (!userRepository.existsByEmail(email)) {
            Psychologist p = new Psychologist(email, passwordEncoder.encode(password), name);
            p.setUsername(email);
            userRepository.save(p);
            log.info("✅ Psychologist created: {}", email);
        }
    }

    private void seedStudent(String name, String email, String password, Long schoolId, String grade, String parentPhone) {
        if (!userRepository.existsByEmail(email)) {
            Student s = new Student(email, passwordEncoder.encode(password), name);
            s.setUsername(email);
            s.setSchoolId(schoolId);
            s.setClassName(grade);
            s.setParentPhone(parentPhone);
            userRepository.save(s);
            log.info("✅ Student created: {}", name);
        }
    }
}