-- Insert Assessment/Question Groups
INSERT INTO question_groups (name, color, class_name, is_default, created_at, updated_at, deleted) VALUES 
('Daily Check-in', 'purple', 'Daily Check-in', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 1st Standard', 'pink', '1st Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 2nd Standard', 'orange', '2nd Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 3rd Standard', 'yellow', '3rd Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 4th Standard', 'green', '4th Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 5th Standard', 'teal', '5th Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 6th Standard', 'blue', '6th Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 7th Standard', 'indigo', '7th Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 8th Standard', 'green', '8th Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 9th Standard', 'blue', '9th Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 10th Standard', 'indigo', '10th Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 11th Standard', 'red', '11th Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false),
('Class 12th Standard', 'purple', '12th Standard', false, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP, false)
ON CONFLICT (name) DO NOTHING;

-- Insert Schedule Class Configs
INSERT INTO schedule_class_config (class_group, weekday_cap_mins, weekend_cap_mins, session_max_mins, grade_patterns) VALUES 
('Class 1-2', 60, 90, 30, '1st,2nd,class 1,class 2,grade 1,grade 2'),
('Class 3-4', 90, 120, 30, '3rd,4th,class 3,class 4,grade 3,grade 4'),
('Class 5-6', 120, 180, 45, '5th,6th,class 5,class 6,grade 5,grade 6'),
('Class 7-8', 180, 240, 60, '7th,8th,class 7,class 8,grade 7,grade 8'),
('Class 9-10', 240, 300, 75, '9th,10th,class 9,class 10,grade 9,grade 10'),
('Class 11-12', 300, 360, 90, '11th,12th,class 11,class 12,grade 11,grade 12')
ON CONFLICT (class_group) DO NOTHING;

-- Insert Schedule Rules
INSERT INTO schedule_rules (rule_id, rule_name, priority, applies_to, block_type, is_active, parameters) VALUES
('R06', 'Min Task Duration', 1, 'ALL', 'HARD', true, '{"min_minutes":15}'),
('R11', 'After 11 PM Grace Rule', 2, 'ALL', 'CONDITIONAL', true, '{"grace_minutes":15}'),
('R05', 'Time Boundary 6AM to 11PM', 3, 'ALL', 'HARD', true, '{"start_boundary":360,"end_boundary":1380}'),
('R01', 'No Overlapping Tasks', 4, 'ALL', 'HARD', true, '{}'),
('R09', 'No Duplicate Task Names Same Day', 5, 'ALL', 'HARD', true, '{}'),
('R10', 'Max 8 Tasks Per Day', 6, 'ALL', 'HARD', true, '{"max_tasks":8}'),
('R02', 'Max Daily Study Time By Class', 7, 'STUDY', 'HARD', true, '{"source":"class_config"}'),
('R03', 'Max Single Session Length By Class', 8, 'STUDY', 'HARD', true, '{"source":"class_config"}'),
('R04', 'Min Break Between Study Sessions', 9, 'STUDY', 'HARD', true, '{"min_break_mins":10}'),
('R07', 'Max 3 Study Sessions Per Day', 10, 'STUDY', 'HARD', true, '{"max_sessions":3}'),
('R08', 'Wellness Task Reminder', 11, 'STUDY', 'SOFT', true, '{}'),
('R12', '3 Consecutive Study Days Warning', 12, 'STUDY', 'SOFT', true, '{"consecutive_days":3}')
ON CONFLICT (rule_id) DO NOTHING;

-- Phase 1 & 2 DDL Commands for Curriculum Intelligence Platform
CREATE TABLE IF NOT EXISTS chapters (
    id                    BIGSERIAL PRIMARY KEY,
    board                 VARCHAR(50)   NOT NULL DEFAULT 'CBSE',
    grade                 VARCHAR(30)   NOT NULL,
    subject               VARCHAR(100)  NOT NULL,
    title                 VARCHAR(300)  NOT NULL,
    raw_content           TEXT          NOT NULL,
    processing_status     VARCHAR(50)   NOT NULL DEFAULT 'PENDING',
    topics                JSONB,
    subtopics             JSONB,
    concepts              JSONB,
    learning_objectives   JSONB,
    blooms_levels         JSONB,
    difficulty_level      VARCHAR(20),
    keywords              JSONB,
    definitions           JSONB,
    formulae              JSONB,
    common_misconceptions JSONB,
    prerequisites         JSONB,
    next_concepts         JSONB,
    estimated_reading_time INTEGER,
    created_by            VARCHAR(100),
    published_by          VARCHAR(100),
    published_at          TIMESTAMP,
    created_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at            TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS curriculum_chunks (
    id           BIGSERIAL PRIMARY KEY,
    chapter_id   BIGINT NOT NULL,
    chunk_text   TEXT NOT NULL,
    chunk_type   VARCHAR(50) NOT NULL,
    topic        VARCHAR(300),
    subtopic     VARCHAR(300),
    metadata     JSONB,
    pgvector_id  BIGINT,
    created_at   TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS ai_generated_content (
    id            BIGSERIAL PRIMARY KEY,
    chapter_id    BIGINT NOT NULL,
    task_type     VARCHAR(50) NOT NULL,
    topic         VARCHAR(300) DEFAULT NULL,
    content       TEXT NOT NULL,
    is_approved   BOOLEAN NOT NULL DEFAULT TRUE,
    created_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at    TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE,
    UNIQUE (task_type, chapter_id, topic)
);
