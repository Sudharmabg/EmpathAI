-- ============================================================
-- Phase 6 Migration Script
-- Run this against the live PostgreSQL database ONCE
-- ============================================================

-- 1. Fix the archive constraint (root cause of ConstraintViolationException)
ALTER TABLE chapters DROP CONSTRAINT IF EXISTS chapters_processing_status_check;
ALTER TABLE chapters ADD CONSTRAINT chapters_processing_status_check
  CHECK (processing_status IN ('PENDING','PROCESSING','PROCESSED','FAILED','PUBLISHED','ARCHIVED'));

-- 2. Add missing columns to chapters table (safe, IF NOT EXISTS)
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS chapter_number INTEGER;
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS archived_by  VARCHAR(100);
ALTER TABLE chapters ADD COLUMN IF NOT EXISTS archived_at  TIMESTAMP;

-- 3. Migrate ai_generated_content table from boolean to enum approval_status
--    (Phase 5 migration — re-applied safely if already done)
ALTER TABLE ai_generated_content ADD COLUMN IF NOT EXISTS approval_status VARCHAR(20);
ALTER TABLE ai_generated_content ADD COLUMN IF NOT EXISTS approved_by     VARCHAR(100);
ALTER TABLE ai_generated_content ADD COLUMN IF NOT EXISTS approved_at     TIMESTAMP;
ALTER TABLE ai_generated_content ADD COLUMN IF NOT EXISTS edited_by       VARCHAR(100);

-- Set default for any NULLs (safe no-op if already populated)
ALTER TABLE ai_generated_content ALTER COLUMN approval_status SET DEFAULT 'PENDING';
UPDATE ai_generated_content SET approval_status = 'PENDING' WHERE approval_status IS NULL;

-- Add chapter_topics table if missing (Phase 5)
CREATE TABLE IF NOT EXISTS chapter_topics (
    id          BIGSERIAL PRIMARY KEY,
    chapter_id  BIGINT NOT NULL,
    topic_name  VARCHAR(300) NOT NULL,
    parent_id   BIGINT,
    sort_order  INTEGER DEFAULT 0,
    raw_content TEXT,
    created_by  VARCHAR(100),
    created_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at  TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (chapter_id) REFERENCES chapters(id) ON DELETE CASCADE
);

-- Done
SELECT 'Phase 6 migration completed successfully.' AS result;
