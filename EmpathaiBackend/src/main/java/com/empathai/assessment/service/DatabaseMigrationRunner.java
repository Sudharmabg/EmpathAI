package com.empathai.assessment.service;

import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.boot.CommandLineRunner;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Component;

import java.util.Arrays;
import java.util.List;
import java.util.Map;

@Slf4j
@Component
@RequiredArgsConstructor
public class DatabaseMigrationRunner implements CommandLineRunner {

    private final JdbcTemplate jdbcTemplate;

    @Override
    public void run(String... args) throws Exception {
        log.info("Starting database migrations and normalization...");

        // 1. Class Name Normalization: student_responses
        try {
            List<String> classNames = jdbcTemplate.queryForList(
                    "SELECT DISTINCT class_name FROM student_responses WHERE class_name IS NOT NULL",
                    String.class
            );

            for (String raw : classNames) {
                String normalized = normalizeClassName(raw);
                if (normalized != null && !raw.equals(normalized)) {
                    log.info("Normalizing class_name in student_responses: '{}' -> '{}'", raw, normalized);
                    jdbcTemplate.update(
                            "UPDATE student_responses SET class_name = ? WHERE class_name = ?",
                            normalized, raw
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Could not normalize class_name in student_responses (table might not exist yet): {}", e.getMessage());
        }

        // 2. Class Name Normalization: assessment_reports
        try {
            List<String> reportClassNames = jdbcTemplate.queryForList(
                    "SELECT DISTINCT class_name FROM assessment_reports WHERE class_name IS NOT NULL",
                    String.class
            );

            for (String raw : reportClassNames) {
                String normalized = normalizeClassName(raw);
                if (normalized != null && !raw.equals(normalized)) {
                    log.info("Normalizing class_name in assessment_reports: '{}' -> '{}'", raw, normalized);
                    jdbcTemplate.update(
                            "UPDATE assessment_reports SET class_name = ? WHERE class_name = ?",
                            normalized, raw
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Could not normalize class_name in assessment_reports (table might not exist yet): {}", e.getMessage());
        }

        // 3. Option Index Migration for existing answer_options
        try {
            log.info("Ensuring option_index column exists in answer_options table...");
            jdbcTemplate.execute("ALTER TABLE answer_options ADD COLUMN IF NOT EXISTS option_index SMALLINT NOT NULL DEFAULT 0");

            List<Long> questionIds = jdbcTemplate.queryForList(
                    "SELECT DISTINCT question_id FROM answer_options",
                    Long.class
            );

            for (Long qId : questionIds) {
                List<Map<String, Object>> qList = jdbcTemplate.queryForList(
                        "SELECT option_a, option_b, option_c, option_d FROM questions WHERE id = ?",
                        qId
                );
                if (qList.isEmpty()) continue;
                Map<String, Object> q = qList.get(0);
                String optA = (String) q.get("option_a");
                String optB = (String) q.get("option_b");
                String optC = (String) q.get("option_c");
                String optD = (String) q.get("option_d");

                List<Map<String, Object>> options = jdbcTemplate.queryForList(
                        "SELECT id, option_label FROM answer_options WHERE question_id = ?",
                        qId
                );

                for (Map<String, Object> opt : options) {
                    Long optId = (Long) opt.get("id");
                    String label = (String) opt.get("option_label");
                    if (label == null) continue;
                    label = label.trim();

                    int index = 0;
                    if (optA != null && label.equalsIgnoreCase(optA.trim())) {
                        index = 0;
                    } else if (optB != null && label.equalsIgnoreCase(optB.trim())) {
                        index = 1;
                    } else if (optC != null && label.equalsIgnoreCase(optC.trim())) {
                        index = 2;
                    } else if (optD != null && label.equalsIgnoreCase(optD.trim())) {
                        index = 3;
                    }

                    jdbcTemplate.update(
                            "UPDATE answer_options SET option_index = ? WHERE id = ?",
                            index, optId
                    );
                }
            }
        } catch (Exception e) {
            log.warn("Could not migrate option_index in answer_options (table might not exist yet): {}", e.getMessage());
        }

        // 4. Update Unique Constraint on answer_options
        try {
            log.info("Updating unique constraints on answer_options...");
            jdbcTemplate.execute("ALTER TABLE answer_options DROP CONSTRAINT IF EXISTS uq_answer_option");

            Integer constraintExists = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM information_schema.constraint_column_usage " +
                            "WHERE table_name = 'answer_options' AND constraint_name = 'uq_answer_option_index'",
                    Integer.class
            );
            if (constraintExists == null || constraintExists == 0) {
                jdbcTemplate.execute(
                        "ALTER TABLE answer_options ADD CONSTRAINT uq_answer_option_index " +
                                "UNIQUE (question_id, option_index)"
                );
                log.info("Successfully added unique constraint uq_answer_option_index to answer_options");
            }
        } catch (Exception e) {
            log.warn("Could not update unique constraint on answer_options: {}", e.getMessage());
        }

        // 5. Add CHECK Constraint on student_responses class_name
        try {
            Integer constraintExists = jdbcTemplate.queryForObject(
                    "SELECT count(*) FROM information_schema.constraint_column_usage " +
                            "WHERE table_name = 'student_responses' AND constraint_name = 'chk_class_name_prefix'",
                    Integer.class
            );
            if (constraintExists == null || constraintExists == 0) {
                jdbcTemplate.execute(
                        "ALTER TABLE student_responses ADD CONSTRAINT chk_class_name_prefix " +
                                "CHECK (class_name IS NULL OR class_name LIKE 'Class %')"
                );
                log.info("Successfully added CHECK constraint chk_class_name_prefix to student_responses");
            }
        } catch (Exception e) {
            log.warn("Could not add CHECK constraint to student_responses: {}", e.getMessage());
        }

        // 6. Synchronize Database Sequences
        try {
            log.info("Synchronizing database sequences to prevent duplicate key violations...");
            List<String> tables = List.of(
                    "questions",
                    "answer_options",
                    "question_groups",
                    "student_responses",
                    "assessment_reports",
                    "assessment_report_history"
            );

            for (String table : tables) {
                try {
                    Long maxId = jdbcTemplate.queryForObject(
                            "SELECT COALESCE(MAX(id), 0) FROM " + table,
                            Long.class
                    );
                    if (maxId != null) {
                        String seq = jdbcTemplate.queryForObject(
                                "SELECT pg_get_serial_sequence(?, 'id')",
                                String.class,
                                table
                        );
                        if (seq != null) {
                            jdbcTemplate.execute("SELECT setval('" + seq + "', " + (maxId + 1) + ", false)");
                            log.info("Synchronized sequence '{}' to max(id)={}", seq, maxId);
                        } else {
                            String fallbackSeq = table + "_id_seq";
                            jdbcTemplate.execute("SELECT setval('" + fallbackSeq + "', " + (maxId + 1) + ", false)");
                            log.info("Synchronized fallback sequence '{}' to max(id)={}", fallbackSeq, maxId);
                        }
                    }
                } catch (Exception e) {
                    log.warn("Could not synchronize sequence for table {}: {}", table, e.getMessage());
                }
            }
        } catch (Exception e) {
            log.warn("Sequence synchronization failed: {}", e.getMessage());
        }

        log.info("Database migrations and normalization runner completed.");
    }

    private String normalizeClassName(String raw) {
        if (raw == null || raw.isBlank()) return raw;
        raw = raw.trim();

        if (raw.toLowerCase().startsWith("class ")) return raw;

        String cleaned = raw.replaceAll("(?i)\\s*standard\\s*$", "").trim();

        if (cleaned.matches("\\d+")) {
            int n = Integer.parseInt(cleaned);
            cleaned = n + ordinalSuffix(n);
        }

        return "Class " + cleaned;
    }

    private String ordinalSuffix(int n) {
        int v = n % 100;
        if (v >= 11 && v <= 13) return "th";
        switch (n % 10) {
            case 1:  return "st";
            case 2:  return "nd";
            case 3:  return "rd";
            default: return "th";
        }
    }
}
